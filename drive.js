/* drive.js — Google Identity Services auth + Google Drive storage backend.
   Layout on Drive:
     Things GTD/                  (root)
       Inbox/                     loose to-dos (no area/project)
       <Area>/_area.md            area marker + metadata
       <Area>/<Project>/_project.md
       <Area>/<Project>/<task>.md one md file per to-do
       _service/state.json        settings, tags, app state
       _service/Trash/            trashed to-dos
*/
'use strict';

const ROOT_NAME = 'Things GTD';
const SERVICE_NAME = '_service';
const INBOX_NAME = 'Inbox';
const TRASH_NAME = 'Trash';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

window.DriveState = { connected:false, busy:0, error:null };

function driveNotify(){
  if(window.onDriveState) window.onDriveState(DriveState);
}

const Drive = {
  token: null,
  tokenExp: 0,
  tokenClient: null,
  rootId: null, serviceId: null, inboxId: null, trashId: null,
  fileIds: {},    // entityId -> fileId (tasks, '_p:'+projectId, '_a:'+areaId => folder ids handled below)
  folderIds: {},  // 'a:'+areaId / 'p:'+projectId -> folderId
  fileMeta: {},   // fileId -> {name, parentId}
  stateFileId: null,
  chain: Promise.resolve(),

  get clientId(){ return localStorage.getItem('things.clientId') || ''; },
  set clientId(v){ localStorage.setItem('things.clientId', v || ''); },
  get wasGranted(){ return localStorage.getItem('things.driveGranted') === '1'; },
  set wasGranted(v){ localStorage.setItem('things.driveGranted', v ? '1' : '0'); },

  /* ---------- auth ---------- */

  loadGis(){
    if(window.google && google.accounts) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = res; s.onerror = () => rej(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(s);
    });
  },

  async getToken(interactive){
    if(this.token && Date.now() < this.tokenExp - 60000) return this.token;
    await this.loadGis();
    if(!this.clientId) throw new Error('No Google Client ID configured');
    if(!this.tokenClient){
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.clientId, scope: SCOPE, callback: () => {}
      });
    }
    return new Promise((res, rej) => {
      this.tokenClient.callback = (resp) => {
        if(resp.error) return rej(new Error(resp.error));
        this.token = resp.access_token;
        this.tokenExp = Date.now() + (resp.expires_in ? resp.expires_in*1000 : 3500000);
        res(this.token);
      };
      try{
        this.tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
      }catch(e){ rej(e); }
    });
  },

  /* ---------- REST ---------- */

  async req(url, opts = {}, retry = true){
    const token = await this.getToken(false);
    const headers = Object.assign({ Authorization: 'Bearer ' + token }, opts.headers || {});
    const r = await fetch(url, Object.assign({}, opts, { headers }));
    if(r.status === 401 && retry){
      this.token = null;
      return this.req(url, opts, false);
    }
    if(!r.ok){
      const txt = await r.text().catch(()=> '');
      throw new Error('Drive API ' + r.status + ': ' + txt.slice(0, 300));
    }
    return r;
  },

  async list(q, fields = 'files(id,name,mimeType,parents,modifiedTime)'){
    const files = [];
    let pageToken = '';
    do{
      const url = 'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
        q, fields: 'nextPageToken,' + fields, pageSize: '1000', spaces: 'drive',
        ...(pageToken ? { pageToken } : {})
      });
      const r = await this.req(url);
      const j = await r.json();
      files.push(...(j.files || []));
      pageToken = j.nextPageToken || '';
    }while(pageToken);
    return files;
  },

  async getContent(fileId){
    const r = await this.req(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    return r.text();
  },

  async createFolder(name, parentId){
    const r = await this.req('https://www.googleapis.com/drive/v3/files', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: parentId ? [parentId] : [] })
    });
    return (await r.json()).id;
  },

  async ensureFolder(name, parentId){
    const safe = name.replace(/'/g, "\\'");
    const found = await this.list(`name = '${safe}' and mimeType = '${FOLDER_MIME}' and '${parentId || 'root'}' in parents and trashed = false`);
    if(found.length) return found[0].id;
    return this.createFolder(name, parentId);
  },

  async uploadContent(fileId, name, parentId, content, mime = 'text/markdown'){
    const boundary = '=xthingsx=';
    const meta = fileId ? { name } : { name, parents: [parentId], mimeType: mime };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` + JSON.stringify(meta) +
      `\r\n--${boundary}\r\nContent-Type: ${mime}; charset=UTF-8\r\n\r\n` + content + `\r\n--${boundary}--`;
    const url = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const r = await this.req(url, {
      method: fileId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body
    });
    return r.json();
  },

  async moveRename(fileId, { name, addParent, removeParent }){
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const params = new URLSearchParams();
    if(addParent) params.set('addParents', addParent);
    if(removeParent) params.set('removeParents', removeParent);
    const qs = params.toString();
    if(qs) url += '?' + qs;
    await this.req(url, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(name ? { name } : {})
    });
  },

  async remove(fileId){
    await this.req(`https://www.googleapis.com/drive/v3/files/${fileId}`, { method: 'DELETE' });
  },

  /* ---------- op queue ---------- */

  enqueue(fn){
    DriveState.busy++; driveNotify();
    this.chain = this.chain
      .then(fn)
      .catch(e => {
        console.error('Drive sync error:', e);
        DriveState.error = e.message || String(e);
      })
      .finally(() => {
        DriveState.busy = Math.max(0, DriveState.busy - 1);
        driveNotify();
      });
    return this.chain;
  },

  /* ---------- structure ---------- */

  async ensureRoot(){
    if(!this.rootId) this.rootId = await this.ensureFolder(ROOT_NAME, 'root');
    if(!this.serviceId) this.serviceId = await this.ensureFolder(SERVICE_NAME, this.rootId);
    if(!this.trashId) this.trashId = await this.ensureFolder(TRASH_NAME, this.serviceId);
    if(!this.inboxId) this.inboxId = await this.ensureFolder(INBOX_NAME, this.rootId);
  },

  async areaFolder(areaId){
    const k = 'a:' + areaId;
    if(this.folderIds[k]) return this.folderIds[k];
    const a = Store.getArea(areaId);
    const id = await this.ensureFolder(a ? a.title : 'Area', this.rootId);
    this.folderIds[k] = id;
    return id;
  },

  async projectFolder(projectId){
    const k = 'p:' + projectId;
    if(this.folderIds[k]) return this.folderIds[k];
    const p = Store.getProject(projectId);
    const parent = p && p.areaId ? await this.areaFolder(p.areaId) : this.rootId;
    const id = await this.ensureFolder(p ? p.title : 'Project', parent);
    this.folderIds[k] = id;
    return id;
  },

  async parentForTask(t){
    if(t.status === 'trashed') return this.trashId;
    if(t.projectId && Store.getProject(t.projectId)) return this.projectFolder(t.projectId);
    if(t.areaId && Store.getArea(t.areaId)) return this.areaFolder(t.areaId);
    return this.inboxId;
  },

  taskFileName(t){ return slug(t.title) + '--' + t.id + '.md'; },

  /* ---------- entity ops (called via Sync hooks) ---------- */

  async saveTask(t){
    await this.ensureRoot();
    const wantParent = await this.parentForTask(t);
    const wantName = this.taskFileName(t);
    const fileId = this.fileIds[t.id];
    const content = taskToMd(t);
    if(!fileId){
      const f = await this.uploadContent(null, wantName, wantParent, content);
      this.fileIds[t.id] = f.id;
      this.fileMeta[f.id] = { name: wantName, parentId: wantParent };
    }else{
      const meta = this.fileMeta[fileId] || {};
      if(meta.parentId !== wantParent || meta.name !== wantName){
        await this.moveRename(fileId, {
          name: wantName,
          addParent: meta.parentId !== wantParent ? wantParent : null,
          removeParent: meta.parentId !== wantParent ? meta.parentId : null
        });
        this.fileMeta[fileId] = { name: wantName, parentId: wantParent };
      }
      await this.uploadContent(fileId, wantName, null, content);
    }
  },

  async removeTask(t){
    const fileId = this.fileIds[t.id];
    if(!fileId) return;
    delete this.fileIds[t.id];
    delete this.fileMeta[fileId];
    await this.remove(fileId).catch(()=>{});
  },

  async saveProject(p){
    await this.ensureRoot();
    const k = 'p:' + p.id;
    if(p.status === 'trashed'){ return; } // handled by removeProject
    const wantParent = p.areaId ? await this.areaFolder(p.areaId) : this.rootId;
    let folderId = this.folderIds[k];
    if(!folderId){
      folderId = await this.ensureFolder(p.title, wantParent);
      this.folderIds[k] = folderId;
      this.fileMeta[folderId] = { name: p.title, parentId: wantParent };
    }else{
      const meta = this.fileMeta[folderId] || {};
      if(meta.name !== p.title || meta.parentId !== wantParent){
        await this.moveRename(folderId, {
          name: p.title,
          addParent: meta.parentId !== wantParent ? wantParent : null,
          removeParent: meta.parentId !== wantParent ? meta.parentId : null
        });
        this.fileMeta[folderId] = { name: p.title, parentId: wantParent };
      }
    }
    // _project.md
    const mdKey = '_pmd:' + p.id;
    const content = projectToMd(p);
    if(this.fileIds[mdKey]){
      await this.uploadContent(this.fileIds[mdKey], '_project.md', null, content);
    }else{
      const f = await this.uploadContent(null, '_project.md', folderId, content);
      this.fileIds[mdKey] = f.id;
    }
  },

  async removeProject(p){
    const k = 'p:' + p.id;
    const folderId = this.folderIds[k];
    delete this.folderIds[k];
    delete this.fileIds['_pmd:' + p.id];
    if(folderId) await this.remove(folderId).catch(()=>{});
  },

  async saveArea(a){
    await this.ensureRoot();
    const k = 'a:' + a.id;
    let folderId = this.folderIds[k];
    if(!folderId){
      folderId = await this.ensureFolder(a.title, this.rootId);
      this.folderIds[k] = folderId;
      this.fileMeta[folderId] = { name: a.title, parentId: this.rootId };
    }else{
      const meta = this.fileMeta[folderId] || {};
      if(meta.name !== a.title){
        await this.moveRename(folderId, { name: a.title });
        this.fileMeta[folderId] = { name: a.title, parentId: this.rootId };
      }
    }
    const mdKey = '_amd:' + a.id;
    const content = areaToMd(a);
    if(this.fileIds[mdKey]){
      await this.uploadContent(this.fileIds[mdKey], '_area.md', null, content);
    }else{
      const f = await this.uploadContent(null, '_area.md', folderId, content);
      this.fileIds[mdKey] = f.id;
    }
  },

  async removeArea(a){
    const k = 'a:' + a.id;
    const folderId = this.folderIds[k];
    delete this.folderIds[k];
    delete this.fileIds['_amd:' + a.id];
    if(folderId) await this.remove(folderId).catch(()=>{});
  },

  async saveState(){
    await this.ensureRoot();
    const db = Store.db();
    const content = JSON.stringify({ tags: db.tags, meta: db.meta, savedAt: Date.now() }, null, 2);
    if(this.stateFileId){
      await this.uploadContent(this.stateFileId, 'state.json', null, content, 'application/json');
    }else{
      const f = await this.uploadContent(null, 'state.json', this.serviceId, content, 'application/json');
      this.stateFileId = f.id;
    }
  },

  /* ---------- full sync ---------- */

  async pull(){
    await this.ensureRoot();
    const newDb = { v:1, tasks:[], projects:[], areas:[], tags:[], meta:{} };
    this.fileIds = {}; this.folderIds = {}; this.fileMeta = {};

    // state.json
    const stateFiles = await this.list(`name = 'state.json' and '${this.serviceId}' in parents and trashed = false`);
    if(stateFiles.length){
      this.stateFileId = stateFiles[0].id;
      try{
        const st = JSON.parse(await this.getContent(this.stateFileId));
        newDb.tags = Array.isArray(st.tags) ? st.tags : [];
        newDb.meta = st.meta || {};
      }catch(e){ console.warn('state.json parse failed', e); }
    }

    // BFS over folder tree
    const mdFiles = []; // {file, folderId}
    const folders = [ { id: this.rootId, path: [] } ];
    const folderInfo = {}; // folderId -> {name, parentId, classified: 'area'|'project'|'inbox'|null, entityId}
    while(folders.length){
      const cur = folders.shift();
      const children = await this.list(`'${cur.id}' in parents and trashed = false`);
      for(const f of children){
        if(f.mimeType === FOLDER_MIME){
          if(cur.id === this.rootId && f.name === SERVICE_NAME) continue;
          folderInfo[f.id] = { name: f.name, parentId: cur.id };
          if(cur.id === this.rootId && f.name === INBOX_NAME){
            this.inboxId = f.id;
            folderInfo[f.id].classified = 'inbox';
          }
          folders.push({ id: f.id });
        }else if(/\.md$/i.test(f.name)){
          mdFiles.push({ file: f, folderId: cur.id });
        }
      }
    }

    // fetch contents with limited concurrency
    const results = [];
    const queue = mdFiles.slice();
    const workers = Array.from({ length: 6 }, async () => {
      while(queue.length){
        const item = queue.shift();
        try{
          const text = await this.getContent(item.file.id);
          results.push({ ...item, text });
        }catch(e){ console.warn('fetch failed', item.file.name, e); }
      }
    });
    await Promise.all(workers);

    // classify: markers first
    for(const r of results){
      if(r.file.name === '_area.md'){
        const a = mdToArea(r.text);
        if(a){
          newDb.areas.push(a);
          this.folderIds['a:' + a.id] = r.folderId;
          this.fileIds['_amd:' + a.id] = r.file.id;
          if(folderInfo[r.folderId]){ folderInfo[r.folderId].classified = 'area'; folderInfo[r.folderId].entityId = a.id; }
          this.fileMeta[r.folderId] = { name: folderInfo[r.folderId] ? folderInfo[r.folderId].name : a.title, parentId: this.rootId };
        }
      }else if(r.file.name === '_project.md'){
        const p = mdToProject(r.text);
        if(p){
          newDb.projects.push(p);
          this.folderIds['p:' + p.id] = r.folderId;
          this.fileIds['_pmd:' + p.id] = r.file.id;
          if(folderInfo[r.folderId]){ folderInfo[r.folderId].classified = 'project'; folderInfo[r.folderId].entityId = p.id; }
          const fi = folderInfo[r.folderId];
          this.fileMeta[r.folderId] = { name: fi ? fi.name : p.title, parentId: fi ? fi.parentId : this.rootId };
        }
      }
    }

    // tasks
    for(const r of results){
      if(r.file.name.startsWith('_')) continue;
      const t = mdToTask(r.text);
      if(!t) continue;
      newDb.tasks.push(t);
      this.fileIds[t.id] = r.file.id;
      this.fileMeta[r.file.id] = { name: r.file.name, parentId: r.folderId };
      (t.tags || []).forEach(tag => { if(!newDb.tags.includes(tag)) newDb.tags.push(tag); });
    }
    newDb.tags.sort((a,b)=>a.localeCompare(b));
    return newDb;
  },

  async pushAll(){
    const db = Store.db();
    for(const a of db.areas) await this.saveArea(a);
    for(const p of db.projects.filter(p => p.status !== 'trashed')) await this.saveProject(p);
    for(const t of db.tasks) await this.saveTask(t);
    await this.saveState();
  },

  async fullSync(){
    await this.ensureRoot();
    const remote = await this.pull();
    const local = Store.db();
    const remoteEmpty = !remote.tasks.length && !remote.projects.length && !remote.areas.length;
    const localHasData = local.tasks.length || local.projects.length || local.areas.length;
    if(remoteEmpty && localHasData){
      await this.pushAll();  // first connection: migrate local data up
    }else{
      remote.meta = Object.assign({}, local.meta, remote.meta);
      Store.replaceDB(remote);
    }
  },

  /* ---------- public API ---------- */

  async connect(interactive = true){
    DriveState.error = null;
    await this.getToken(interactive);
    DriveState.connected = true;
    this.wasGranted = true;
    this.installHooks();
    driveNotify();
    await this.enqueue(() => this.fullSync());
    if(window.onDriveSynced) window.onDriveSynced();
  },

  disconnect(){
    DriveState.connected = false;
    this.wasGranted = false;
    this.token = null;
    Sync.enabled = false;
    Sync.taskSaved = Sync.taskRemoved = Sync.projectSaved = Sync.projectRemoved =
      Sync.areaSaved = Sync.areaRemoved = Sync.metaSaved = () => {};
    driveNotify();
  },

  syncNow(){
    if(!DriveState.connected) return Promise.resolve();
    return this.enqueue(() => this.fullSync()).then(() => {
      if(window.onDriveSynced) window.onDriveSynced();
    });
  },

  installHooks(){
    const stateDeb = debounce(() => this.enqueue(() => this.saveState()), 1500);
    // per-task debounce so fast typing doesn't spam the API
    const taskTimers = {};
    Sync.enabled = true;
    Sync.taskSaved = (t, moved) => {
      const snapshot = t.id;
      if(moved){
        clearTimeout(taskTimers[t.id]);
        delete taskTimers[t.id];
        this.enqueue(() => { const cur = Store.getTask(snapshot); return cur ? this.saveTask(cur) : null; });
      }else{
        clearTimeout(taskTimers[t.id]);
        taskTimers[t.id] = setTimeout(() => {
          delete taskTimers[t.id];
          this.enqueue(() => { const cur = Store.getTask(snapshot); return cur ? this.saveTask(cur) : null; });
        }, 1200);
      }
    };
    Sync.taskRemoved = (t) => this.enqueue(() => this.removeTask(t));
    Sync.projectSaved = (p) => this.enqueue(() => this.saveProject(p));
    Sync.projectRemoved = (p) => this.enqueue(() => this.removeProject(p));
    Sync.areaSaved = (a) => this.enqueue(() => this.saveArea(a));
    Sync.areaRemoved = (a) => this.enqueue(() => this.removeArea(a));
    Sync.metaSaved = () => stateDeb();
  }
};

window.Drive = Drive;
