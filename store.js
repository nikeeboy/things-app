/* store.js — data model, GTD queries, markdown serialization, repeat logic, local persistence */
'use strict';

/* ---------- Database ---------- */

let DB = {
  v: 1,
  tasks: [],     // {id,title,notes,status:'open'|'done'|'canceled'|'trashed',when,evening,deadline,tags[],checklist[],projectId,areaId,headingId,repeat,created,completed,order,prevStatus}
  projects: [],  // {id,title,notes,status:'open'|'done'|'trashed',areaId,tags[],when,deadline,headings:[{id,title,order}],order,completed}
  areas: [],     // {id,title,order}
  tags: [],      // ['home','work',...]
  meta: {}       // misc app state
};

/* when: null | 'today' | 'anytime' | 'someday' | {date:'YYYY-MM-DD'} */
/* repeat: null | {unit:'day'|'week'|'month'|'year', interval:int, mode:'fixed'|'after'} */

const LS_KEY = 'things.db';

/* Sync hooks — overridden by drive.js when connected. */
window.Sync = {
  enabled: false,
  taskSaved(){}, taskRemoved(){},
  projectSaved(){}, projectRemoved(){},
  areaSaved(){}, areaRemoved(){},
  metaSaved(){}
};

const saveLocal = debounce(() => {
  try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }catch(e){ console.warn('localStorage save failed', e); }
}, 250);

function loadLocal(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){ DB = Object.assign(DB, JSON.parse(raw)); }
  }catch(e){ console.warn('localStorage load failed', e); }
}

let orderSeq = Date.now();
function nextOrder(){ return ++orderSeq; }

/* ---------- Store ---------- */

const Store = {

  init(){
    loadLocal();
    if(!Array.isArray(DB.tags)) DB.tags = [];
  },

  replaceDB(newDb){
    DB = Object.assign({ v:1, tasks:[], projects:[], areas:[], tags:[], meta:{} }, newDb);
    saveLocal.flush();
  },
  db(){ return DB; },

  getTask: id => DB.tasks.find(t => t.id === id),
  getProject: id => DB.projects.find(p => p.id === id),
  getArea: id => DB.areas.find(a => a.id === id),

  /* ----- tasks ----- */

  newTask(preset = {}){
    const t = Object.assign({
      id: uid('t'), title: '', notes: '', status: 'open',
      when: null, evening: false, deadline: null,
      tags: [], checklist: [],
      projectId: null, areaId: null, headingId: null,
      repeat: null, created: Date.now(), completed: null, order: nextOrder()
    }, preset);
    DB.tasks.push(t);
    this.touchTask(t);
    return t;
  },

  patchTask(id, patch){
    const t = this.getTask(id); if(!t) return null;
    const oldParent = parentKey(t);
    Object.assign(t, patch);
    if('when' in patch){
      if(t.when !== 'today' && !(t.when && t.when.date)) t.evening = false;
    }
    if(t.tags) this.ensureTags(t.tags);
    this.touchTask(t, oldParent !== parentKey(t));
    return t;
  },

  toggleDone(id){
    const t = this.getTask(id); if(!t) return;
    if(t.status === 'open') this.completeTask(t, 'done');
    else if(t.status === 'done' || t.status === 'canceled'){
      t.status = 'open'; t.completed = null; this.touchTask(t);
    }
  },

  cancelTask(id){
    const t = this.getTask(id); if(!t) return;
    if(t.status === 'open') this.completeTask(t, 'canceled');
  },

  completeTask(t, status){
    if(t.repeat){
      // log a completed copy, reschedule the repeating task itself
      const done = Object.assign({}, t, {
        id: uid('t'), repeat: null, status,
        completed: Date.now(),
        checklist: (t.checklist||[]).map(c => ({...c})),
        tags: (t.tags||[]).slice(),
        order: nextOrder()
      });
      DB.tasks.push(done);
      this.touchTask(done);
      const oldWhen = (t.when && t.when.date) ? t.when.date : todayISO();
      const next = nextRepeatDate(t);
      if(t.deadline){
        const shift = daysUntil(next) - daysUntil(oldWhen);
        t.deadline = addDaysISO(t.deadline, shift);
      }
      t.when = { date: next };
      t.checklist = (t.checklist||[]).map(c => ({...c, done:false}));
      this.touchTask(t);
    }else{
      t.status = status; t.completed = Date.now();
      this.touchTask(t);
    }
  },

  trashTask(id){
    const t = this.getTask(id); if(!t) return;
    t.prevStatus = t.status;
    t.status = 'trashed';
    this.touchTask(t, true);
  },

  restoreTask(id){
    const t = this.getTask(id); if(!t) return;
    t.status = t.prevStatus && t.prevStatus !== 'trashed' ? t.prevStatus : 'open';
    delete t.prevStatus;
    this.touchTask(t, true);
  },

  deleteTaskForever(id){
    const i = DB.tasks.findIndex(t => t.id === id);
    if(i < 0) return;
    const [t] = DB.tasks.splice(i, 1);
    saveLocal(); Sync.taskRemoved(t);
  },

  emptyTrash(){
    const trashed = DB.tasks.filter(t => t.status === 'trashed');
    DB.tasks = DB.tasks.filter(t => t.status !== 'trashed');
    saveLocal();
    trashed.forEach(t => Sync.taskRemoved(t));
  },

  touchTask(t, moved = false){
    saveLocal();
    Sync.taskSaved(t, moved);
  },

  /* checklist */
  addChecklistItem(taskId, text = ''){
    const t = this.getTask(taskId); if(!t) return null;
    const c = { id: uid('c'), text, done: false };
    (t.checklist = t.checklist || []).push(c);
    this.touchTask(t);
    return c;
  },

  /* ----- ordering / moving ----- */

  reorderTask(id, targetId, after){
    const t = this.getTask(id), tgt = this.getTask(targetId);
    if(!t || !tgt || t === tgt) return;
    // adopt target's grouping
    const oldParent = parentKey(t);
    t.projectId = tgt.projectId; t.areaId = tgt.areaId; t.headingId = tgt.headingId;
    const siblings = DB.tasks.filter(x => x !== t).sort((a,b) => a.order - b.order);
    const i = siblings.indexOf(tgt);
    const prev = after ? tgt : siblings[i-1];
    const next = after ? siblings[i+1] : tgt;
    const lo = prev ? prev.order : (next ? next.order - 2000 : 0);
    const hi = next ? next.order : (prev ? prev.order + 2000 : 2000);
    t.order = (lo + hi) / 2;
    this.touchTask(t, oldParent !== parentKey(t));
  },

  moveTaskTo(id, dest){
    // dest: {view:'inbox'|'today'|'anytime'|'someday'} | {projectId} | {areaId} | {projectId,headingId}
    const t = this.getTask(id); if(!t) return;
    const patch = {};
    if(dest.view){
      if(dest.view === 'inbox'){ patch.projectId = null; patch.areaId = null; patch.headingId = null; patch.when = null; }
      if(dest.view === 'today') patch.when = 'today';
      if(dest.view === 'anytime') patch.when = 'anytime';
      if(dest.view === 'someday') patch.when = 'someday';
      if(dest.view === 'upcoming') patch.when = { date: addDaysISO(todayISO(), 1) };
    }else if(dest.projectId !== undefined){
      patch.projectId = dest.projectId; patch.headingId = dest.headingId || null;
      const p = this.getProject(dest.projectId);
      patch.areaId = p ? p.areaId : null;
      if(!t.when || t.when === null) patch.when = 'anytime';
    }else if(dest.areaId !== undefined){
      patch.areaId = dest.areaId; patch.projectId = null; patch.headingId = null;
      if(!t.when) patch.when = 'anytime';
    }
    patch.order = nextOrder();
    this.patchTask(id, patch);
  },

  /* ----- projects ----- */

  newProject(preset = {}){
    const p = Object.assign({
      id: uid('p'), title: 'New Project', notes: '', status: 'open',
      areaId: null, tags: [], when: null, deadline: null,
      headings: [], order: nextOrder(), completed: null
    }, preset);
    DB.projects.push(p);
    saveLocal(); Sync.projectSaved(p, true);
    return p;
  },

  patchProject(id, patch){
    const p = this.getProject(id); if(!p) return null;
    const moved = ('areaId' in patch && patch.areaId !== p.areaId) || ('title' in patch && patch.title !== p.title);
    Object.assign(p, patch);
    saveLocal(); Sync.projectSaved(p, moved);
    if(moved && 'areaId' in patch){
      // tasks follow their project's area
      DB.tasks.filter(t => t.projectId === id).forEach(t => { t.areaId = p.areaId; Sync.taskSaved(t, false); });
      saveLocal();
    }
    return p;
  },

  completeProject(id, status = 'done'){
    const p = this.getProject(id); if(!p) return;
    p.status = status; p.completed = Date.now();
    DB.tasks.filter(t => t.projectId === id && t.status === 'open')
      .forEach(t => { t.status = status; t.completed = Date.now(); Sync.taskSaved(t, false); });
    saveLocal(); Sync.projectSaved(p, false);
  },

  reopenProject(id){
    const p = this.getProject(id); if(!p) return;
    p.status = 'open'; p.completed = null;
    saveLocal(); Sync.projectSaved(p, false);
  },

  trashProject(id){
    const p = this.getProject(id); if(!p) return;
    DB.tasks.filter(t => t.projectId === id).forEach(t => {
      if(t.status !== 'trashed'){ t.prevStatus = t.status; t.status = 'trashed'; Sync.taskSaved(t, true); }
    });
    p.status = 'trashed';
    saveLocal(); Sync.projectRemoved(p);
  },

  newHeading(projectId, title){
    const p = this.getProject(projectId); if(!p) return null;
    const h = { id: uid('h'), title, order: nextOrder() };
    (p.headings = p.headings || []).push(h);
    saveLocal(); Sync.projectSaved(p, false);
    return h;
  },

  renameHeading(projectId, hid, title){
    const p = this.getProject(projectId); if(!p) return;
    const h = (p.headings||[]).find(x => x.id === hid); if(!h) return;
    h.title = title;
    saveLocal(); Sync.projectSaved(p, false);
  },

  deleteHeading(projectId, hid){
    const p = this.getProject(projectId); if(!p) return;
    p.headings = (p.headings||[]).filter(x => x.id !== hid);
    DB.tasks.filter(t => t.headingId === hid).forEach(t => { t.headingId = null; Sync.taskSaved(t, false); });
    saveLocal(); Sync.projectSaved(p, false);
  },

  /* ----- areas ----- */

  newArea(preset = {}){
    const a = Object.assign({ id: uid('a'), title: 'New Area', order: nextOrder() }, preset);
    DB.areas.push(a);
    saveLocal(); Sync.areaSaved(a, true);
    return a;
  },

  patchArea(id, patch){
    const a = this.getArea(id); if(!a) return null;
    const renamed = 'title' in patch && patch.title !== a.title;
    Object.assign(a, patch);
    saveLocal(); Sync.areaSaved(a, renamed);
    return a;
  },

  deleteArea(id){
    const a = this.getArea(id); if(!a) return;
    DB.projects.filter(p => p.areaId === id).forEach(p => this.trashProject(p.id));
    DB.tasks.filter(t => t.areaId === id && !t.projectId).forEach(t => {
      if(t.status !== 'trashed'){ t.prevStatus = t.status; t.status = 'trashed'; Sync.taskSaved(t, true); }
    });
    DB.areas = DB.areas.filter(x => x.id !== id);
    saveLocal(); Sync.areaRemoved(a);
  },

  /* ----- tags ----- */

  ensureTags(names){
    let changed = false;
    (names||[]).forEach(n => {
      n = String(n).trim(); if(!n) return;
      if(!DB.tags.includes(n)){ DB.tags.push(n); changed = true; }
    });
    if(changed){ DB.tags.sort((a,b)=>a.localeCompare(b)); saveLocal(); Sync.metaSaved(); }
  },

  /* ----- queries ----- */

  counts(){
    return {
      inbox: DB.tasks.filter(inInbox).length,
      today: DB.tasks.filter(inTodayOpen).length
    };
  },

  projectProgress(p){
    const ts = DB.tasks.filter(t => t.projectId === p.id && t.status !== 'trashed');
    if(!ts.length) return 0;
    return ts.filter(t => t.status === 'done' || t.status === 'canceled').length / ts.length;
  },

  openCountFor(ref){
    if(ref.projectId) return DB.tasks.filter(t => t.projectId === ref.projectId && t.status === 'open').length;
    if(ref.areaId) return DB.tasks.filter(t => t.areaId === ref.areaId && t.status === 'open').length;
    return 0;
  },

  viewSections(view, tagFilter){
    const secs = viewSections(view);
    if(tagFilter){
      secs.forEach(s => s.tasks = s.tasks.filter(t => (t.tags||[]).includes(tagFilter)));
    }
    return secs.filter(s => s.tasks.length || s.keep);
  },

  allTagsIn(sections){
    const set = new Set();
    sections.forEach(s => s.tasks.forEach(t => (t.tags||[]).forEach(x => set.add(x))));
    return [...set].sort((a,b)=>a.localeCompare(b));
  },

  searchAll(q){
    q = q.trim().toLowerCase();
    if(!q) return [];
    const res = [];
    const has = s => s && String(s).toLowerCase().includes(q);
    DB.areas.forEach(a => { if(has(a.title)) res.push({ type:'area', item:a }); });
    DB.projects.filter(p => p.status === 'open').forEach(p => { if(has(p.title) || has(p.notes)) res.push({ type:'project', item:p }); });
    DB.tags.forEach(tg => { if(has(tg)) res.push({ type:'tag', item:tg }); });
    DB.tasks.filter(t => t.status !== 'trashed').forEach(t => {
      if(has(t.title) || has(t.notes) || (t.tags||[]).some(has) || (t.checklist||[]).some(c => has(c.text)))
        res.push({ type:'task', item:t });
    });
    return res.slice(0, 40);
  }
};

/* ---------- predicates ---------- */

function isFutureScheduled(t){ return !!(t.when && t.when.date && t.when.date > todayISO()); }

function inTodayOpen(t){
  if(t.status !== 'open') return false;
  if(t.when === 'today') return true;
  if(t.when && t.when.date && t.when.date <= todayISO()) return true;
  if(t.deadline && t.deadline <= todayISO() && t.when !== 'someday') return true;
  return false;
}

function inInbox(t){
  return t.status === 'open' && !t.projectId && !t.areaId && !t.when;
}

function inAnytime(t){
  return t.status === 'open' && !inInbox(t) && t.when !== 'someday' && !isFutureScheduled(t) && !inHiddenProject(t);
}

function inHiddenProject(t){
  if(!t.projectId) return false;
  const p = Store.getProject(t.projectId);
  return !p || p.status !== 'open';
}

function parentKey(t){ return (t.projectId||'') + '/' + (t.areaId||''); }

function byOrder(a,b){ return a.order - b.order; }

function parentLabel(t){
  if(t.projectId){ const p = Store.getProject(t.projectId); return p ? p.title : ''; }
  if(t.areaId){ const a = Store.getArea(t.areaId); return a ? a.title : ''; }
  return '';
}

/* group tasks by parent (project/area) */
function groupByParent(tasks){
  const groups = new Map();
  tasks.sort(byOrder).forEach(t => {
    const k = parentKey(t);
    if(!groups.has(k)) groups.set(k, { key:k, title: parentLabel(t), ref: t.projectId ? {projectId:t.projectId} : (t.areaId ? {areaId:t.areaId} : null), tasks: [] });
    groups.get(k).tasks.push(t);
  });
  return [...groups.values()].sort((a,b) => (a.title?1:0) - (b.title?1:0) || a.title.localeCompare(b.title));
}

/* ---------- view sections ---------- */

function viewSections(view){
  const open = DB.tasks.filter(t => t.status === 'open');

  switch(view.type){

    case 'inbox':
      return [{ key:'inbox', title:'', tasks: open.filter(inInbox).sort(byOrder), keep:true }];

    case 'today': {
      const doneToday = DB.tasks.filter(t => (t.status==='done'||t.status==='canceled') && t.completed && toISO(new Date(t.completed)) === todayISO());
      const all = open.filter(inTodayOpen).concat(doneToday);
      const day = all.filter(t => !t.evening);
      const eve = all.filter(t => t.evening);
      const secs = groupByParent(day).map(g => ({ key:'g'+g.key, title:g.title, ref:g.ref, tasks:g.tasks }));
      if(!secs.length) secs.push({ key:'today', title:'', tasks:[], keep:true });
      if(eve.length) secs.push({ key:'evening', title:'This Evening', evening:true, tasks: eve.sort(byOrder) });
      return secs;
    }

    case 'upcoming': {
      const fut = open.filter(isFutureScheduled);
      const byDate = new Map();
      fut.forEach(t => {
        const d = t.when.date;
        if(!byDate.has(d)) byDate.set(d, []);
        byDate.get(d).push(t);
      });
      return [...byDate.keys()].sort().map(d => ({
        key:'d'+d, dateHeader:d, title:'', tasks: byDate.get(d).sort(byOrder)
      }));
    }

    case 'anytime': {
      const secs = groupByParent(open.filter(inAnytime)).map(g => ({ key:'g'+g.key, title:g.title, ref:g.ref, tasks:g.tasks }));
      return secs.length ? secs : [{ key:'any', title:'', tasks:[], keep:true }];
    }

    case 'someday': {
      const secs = groupByParent(open.filter(t => t.when === 'someday' && !inHiddenProject(t))).map(g => ({ key:'g'+g.key, title:g.title, ref:g.ref, tasks:g.tasks }));
      return secs.length ? secs : [{ key:'sd', title:'', tasks:[], keep:true }];
    }

    case 'logbook': {
      const done = DB.tasks.filter(t => (t.status==='done'||t.status==='canceled'))
        .sort((a,b) => (b.completed||0) - (a.completed||0));
      const groups = new Map();
      done.forEach(t => {
        const k = logGroupLabel(t.completed || t.created);
        if(!groups.has(k)) groups.set(k, []);
        groups.get(k).push(t);
      });
      const secs = [...groups.entries()].map(([k, tasks]) => ({ key:'lg'+k, title:k, log:true, tasks }));
      // completed projects appear in logbook too
      const doneProjects = DB.projects.filter(p => p.status==='done').sort((a,b)=>(b.completed||0)-(a.completed||0));
      if(doneProjects.length) secs.push({ key:'lgp', title:'Completed Projects', log:true, projects:doneProjects, tasks:[] , keep:true});
      return secs.length ? secs : [{ key:'lg', title:'', tasks:[], keep:true }];
    }

    case 'trash': {
      const tr = DB.tasks.filter(t => t.status === 'trashed').sort((a,b)=>b.order-a.order);
      return [{ key:'trash', title:'', trash:true, tasks:tr, keep:true }];
    }

    case 'project': {
      const p = Store.getProject(view.id);
      if(!p) return [];
      const mine = open.filter(t => t.projectId === p.id);
      const doneToday = DB.tasks.filter(t => t.projectId===p.id && (t.status==='done'||t.status==='canceled') && t.completed && toISO(new Date(t.completed)) === todayISO());
      const ready = mine.filter(t => t.when !== 'someday').concat(doneToday);
      const sd  = mine.filter(t => t.when === 'someday');
      const secs = [];
      const noHead = ready.filter(t => !t.headingId).sort(byOrder);
      secs.push({ key:'ph-none', title:'', tasks:noHead, keep:true, headingDrop:{projectId:p.id, headingId:null} });
      (p.headings||[]).sort(byOrder).forEach(h => {
        secs.push({ key:'ph'+h.id, title:h.title, heading:h, tasks: ready.filter(t => t.headingId === h.id).sort(byOrder), keep:true, headingDrop:{projectId:p.id, headingId:h.id} });
      });
      if(sd.length) secs.push({ key:'ph-sd', title:'Someday', someday:true, tasks: sd.sort(byOrder) });
      return secs;
    }

    case 'area': {
      const a = Store.getArea(view.id);
      if(!a) return [];
      const secs = [];
      const direct = open.filter(t => t.areaId === a.id && !t.projectId && t.when !== 'someday' && !isFutureScheduled(t));
      secs.push({ key:'ad', title:'', tasks: direct.sort(byOrder), keep:true });
      DB.projects.filter(p => p.areaId === a.id && p.status === 'open').sort(byOrder).forEach(p => {
        secs.push({ key:'ap'+p.id, title:p.title, ref:{projectId:p.id}, project:p,
          tasks: open.filter(t => t.projectId === p.id && t.when !== 'someday' && !isFutureScheduled(t)).sort(byOrder), keep:true });
      });
      return secs;
    }

    case 'tag': {
      const tg = view.id;
      const tagged = DB.tasks.filter(t => t.status==='open' && (t.tags||[]).includes(tg));
      return groupByParent(tagged).map(g => ({ key:'g'+g.key, title:g.title, ref:g.ref, tasks:g.tasks }));
    }
  }
  return [];
}

/* ---------- repeats ---------- */

function nextRepeatDate(t){
  const r = t.repeat;
  const base = (r.mode === 'after' || !(t.when && t.when.date)) ? todayISO() : t.when.date;
  const add = iso => r.unit === 'day' ? addDaysISO(iso, r.interval)
    : r.unit === 'week' ? addDaysISO(iso, 7*r.interval)
    : r.unit === 'month' ? addMonthsISO(iso, r.interval)
    : addYearsISO(iso, r.interval);
  let next = add(base);
  while(next <= todayISO()) next = add(next); // catch up fixed schedules
  return next;
}

function repeatLabel(r){
  if(!r) return 'Repeat';
  const u = r.interval > 1 ? `${r.interval} ${r.unit}s` : r.unit;
  return `Every ${u}` + (r.mode === 'after' ? ' after completion' : '');
}

/* ---------- markdown (de)serialization ---------- */

function whenToStr(when){
  if(!when) return null;
  if(typeof when === 'string') return when;
  if(when.date) return when.date;
  return null;
}
function strToWhen(s){
  if(!s) return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s };
  if(['today','anytime','someday'].includes(s)) return s;
  return null;
}

function fmVal(v){
  if(typeof v === 'string' && !/[\n:#]/.test(v) && v === v.trim() && v !== '' && !/^[\[{"]/.test(v) && !/^\d+$/.test(v) === false) return JSON.stringify(v);
  return JSON.stringify(v);
}

function buildFrontmatter(obj){
  const lines = ['---'];
  for(const [k,v] of Object.entries(obj)){
    if(v === null || v === undefined) continue;
    if(Array.isArray(v) && !v.length) continue;
    lines.push(`${k}: ${JSON.stringify(v)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

function parseFrontmatter(text){
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if(!m) return { fm:{}, body:text };
  const fm = {};
  m[1].split(/\r?\n/).forEach(line => {
    const i = line.indexOf(':');
    if(i < 0) return;
    const k = line.slice(0,i).trim();
    const raw = line.slice(i+1).trim();
    try{ fm[k] = JSON.parse(raw); }catch(e){ fm[k] = raw; }
  });
  return { fm, body: text.slice(m[0].length) };
}

function taskToMd(t){
  const fm = buildFrontmatter({
    id: t.id, type: 'task', title: t.title || 'New To-Do',
    status: t.status,
    when: whenToStr(t.when),
    evening: t.evening || null,
    deadline: t.deadline,
    tags: t.tags && t.tags.length ? t.tags : null,
    project: t.projectId, area: t.areaId, heading: t.headingId,
    repeat: t.repeat,
    created: t.created, completed: t.completed,
    order: t.order,
    prevStatus: t.prevStatus || null
  });
  let body = (t.notes || '').trim();
  if(t.checklist && t.checklist.length){
    body += (body ? '\n\n' : '') + '## Checklist\n' +
      t.checklist.map(c => `- [${c.done?'x':' '}] ${c.text}`).join('\n');
  }
  return fm + '\n' + (body ? '\n' + body + '\n' : '');
}

function mdToTask(text){
  const { fm, body } = parseFrontmatter(text);
  if(!fm.id) return null;
  let notes = body || '';
  const checklist = [];
  const clM = /(^|\n)## Checklist\s*\n([\s\S]*)$/.exec(notes);
  if(clM){
    notes = notes.slice(0, clM.index).trim();
    clM[2].split(/\n/).forEach(line => {
      const im = /^- \[( |x)\] (.*)$/.exec(line.trim());
      if(im) checklist.push({ id: uid('c'), done: im[1] === 'x', text: im[2] });
    });
  }else notes = notes.trim();
  return {
    id: fm.id, title: fm.title || '', notes, status: fm.status || 'open',
    when: strToWhen(fm.when), evening: !!fm.evening, deadline: fm.deadline || null,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    checklist,
    projectId: fm.project || null, areaId: fm.area || null, headingId: fm.heading || null,
    repeat: (fm.repeat && typeof fm.repeat === 'object') ? fm.repeat : null,
    created: fm.created || Date.now(), completed: fm.completed || null,
    order: typeof fm.order === 'number' ? fm.order : nextOrder(),
    prevStatus: fm.prevStatus || undefined
  };
}

function projectToMd(p){
  const fm = buildFrontmatter({
    id: p.id, type: 'project', title: p.title, status: p.status,
    area: p.areaId,
    tags: p.tags && p.tags.length ? p.tags : null,
    when: whenToStr(p.when), deadline: p.deadline,
    headings: p.headings && p.headings.length ? p.headings : null,
    order: p.order, completed: p.completed
  });
  return fm + '\n' + (p.notes ? '\n' + p.notes.trim() + '\n' : '');
}

function mdToProject(text){
  const { fm, body } = parseFrontmatter(text);
  if(!fm.id) return null;
  return {
    id: fm.id, title: fm.title || 'Project', notes: (body||'').trim(), status: fm.status || 'open',
    areaId: fm.area || null,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    when: strToWhen(fm.when), deadline: fm.deadline || null,
    headings: Array.isArray(fm.headings) ? fm.headings : [],
    order: typeof fm.order === 'number' ? fm.order : nextOrder(),
    completed: fm.completed || null
  };
}

function areaToMd(a){
  return buildFrontmatter({ id: a.id, type: 'area', title: a.title, order: a.order }) + '\n';
}

function mdToArea(text){
  const { fm } = parseFrontmatter(text);
  if(!fm.id) return null;
  return { id: fm.id, title: fm.title || 'Area', order: typeof fm.order === 'number' ? fm.order : nextOrder() };
}
