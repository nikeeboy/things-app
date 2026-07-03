/* ui.js — Things 3 style interface: sidebar, views, editor, popovers, quick entry, quick find, DnD, keyboard */
'use strict';

const UI = {
  view: { type: 'today' },
  editingId: null,
  tagFilter: null,
  kbsel: null,
  visible: [],        // visible task ids (keyboard nav)
  searchQ: ''
};

/* ================= icons ================= */

function icStroke(path, color, w = 1.8, vb = 24){
  return `<svg viewBox="0 0 ${vb} ${vb}" width="100%" height="100%" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
const ICONS = {
  inbox: c => icStroke('<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5a4 4 0 008 0h5"/>', c),
  today: c => `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="${c}"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3-5.7-3.1-5.7 3.1 1.2-6.3L2.8 9.3l6.4-.8z"/></svg>`,
  upcoming: c => icStroke('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 2.8v4M16 2.8v4"/>', c),
  anytime: c => `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="${c}"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6" opacity=".45"/></svg>`,
  someday: c => icStroke('<path d="M3.5 9.5L12 4l8.5 5.5v9a1.5 1.5 0 01-1.5 1.5H5a1.5 1.5 0 01-1.5-1.5z"/><path d="M3.5 9.5h17"/>', c),
  logbook: c => `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9.5" fill="${c}"/><path d="M7.6 12.3l3 3 5.6-6.4" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trash: c => icStroke('<path d="M4 7h16M9 7V4.8A.8.8 0 019.8 4h4.4a.8.8 0 01.8.8V7M6.5 7l1 13h9l1-13"/>', c),
  area: c => icStroke('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M3.5 12h17M12 3.5v17" opacity=".55"/>', c),
  cal: c => icStroke('<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5"/>', c),
  flag: c => icStroke('<path d="M5.5 21V4.5c4.5-2.5 8.5 2.5 13 0V14c-4.5 2.5-8.5-2.5-13 0"/>', c),
  note: c => icStroke('<path d="M6 4.5h12v15H6zM9 9h6M9 12.5h6"/>', c, 1.5),
  cl: c => icStroke('<path d="M4 6.5l1.5 1.5L8 5.5M4 12.5l1.5 1.5L8 11.5M4 18.5l1.5 1.5L8 17.5M11 7h9M11 13h9M11 19h9"/>', c, 1.5),
  repeat: c => icStroke('<path d="M17 3.5l3 3-3 3"/><path d="M20 6.5H8a5 5 0 00-5 5M7 20.5l-3-3 3-3"/><path d="M4 17.5h12a5 5 0 005-5"/>', c, 1.7),
  tag: c => icStroke('<path d="M3.5 12V4.5a1 1 0 011-1H12l8.5 8.5-8 8z"/><circle cx="8" cy="8" r="1.4" fill="'+c+'" stroke="none"/>', c),
  search: c => icStroke('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>', c, 2),
  plus: c => icStroke('<path d="M12 5v14M5 12h14"/>', c, 2),
  more: c => `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="${c}"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>`,
  move: c => icStroke('<path d="M4 8h11M4 12h8M4 16h6M17 10v8M17 18l-3-3M17 18l3-3"/>', c, 1.7),
  gear: c => icStroke('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/>', c, 1.7),
  heading: c => icStroke('<path d="M4 5v14M13 5v14M4 12h9M17 9l3-2v12"/>', c, 1.7),
  arrow: c => icStroke('<path d="M9 6l6 6-6 6"/>', c, 2),
  star: c => `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="${c}"><path d="M12 3l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16l-5.1 2.7 1.1-5.7-4.3-4 5.8-.7z"/></svg>`,
  box: c => icStroke('<path d="M3.5 9.5L12 4l8.5 5.5v9a1.5 1.5 0 01-1.5 1.5H5a1.5 1.5 0 01-1.5-1.5z"/><path d="M3.5 9.5h17"/>', c, 1.6),
  cloud: c => icStroke('<path d="M7 18.5a4.5 4.5 0 01-.4-9A6 6 0 0118.3 11a3.8 3.8 0 01-.8 7.5z"/>', c, 1.7)
};

function pieSvg(frac, color = 'var(--blue)', size = 14){
  const r = 4.4, c = 2 * Math.PI * r;
  return `<span class="pie" style="width:${size}px;height:${size}px;border-color:${color}">
    <svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="none" stroke="${color}" stroke-width="8.8"
      stroke-dasharray="${(Math.max(0.001,frac))*c} ${c}" transform="rotate(-90 6 6)" style="stroke-width:${r*2}px" /></svg>
  </span>`.replace(/\n\s*/g,'');
}

const VIEWS = {
  inbox:   { name:'Inbox',    color:'var(--inbox)',   icon:'inbox',   empty:'Inbox is empty' },
  today:   { name:'Today',    color:'var(--today)',   icon:'today',   empty:'Nothing due today. Enjoy!' },
  upcoming:{ name:'Upcoming', color:'var(--upcoming)',icon:'upcoming',empty:'Nothing scheduled' },
  anytime: { name:'Anytime',  color:'var(--anytime)', icon:'anytime', empty:'No to-dos here' },
  someday: { name:'Someday',  color:'var(--someday)', icon:'someday', empty:'No to-dos here' },
  logbook: { name:'Logbook',  color:'var(--logbook)', icon:'logbook', empty:'No completed to-dos yet' },
  trash:   { name:'Trash',    color:'var(--trashc)',  icon:'trash',   empty:'Trash is empty' }
};

/* ================= render ================= */

function render(){
  renderSidebar();
  renderMain();
}

function closeDrawer(){ document.body.classList.remove('sb-open'); }

function setView(v){
  UI.view = v; UI.editingId = null; UI.tagFilter = null; UI.kbsel = null;
  localStorage.setItem('things.view', JSON.stringify(v));
  closeDrawer();
  render();
  $('#main').scrollTop = 0;
}

/* ----- sidebar ----- */

function renderSidebar(){
  const c = Store.counts();
  const active = (t, id) => UI.view.type === t && (id === undefined || UI.view.id === id) ? ' active' : '';
  let h = '<div class="sb-scroll">';
  const item = (id, extra='') => {
    const v = VIEWS[id];
    const cnt = id === 'inbox' ? c.inbox : id === 'today' ? c.today : 0;
    return `<div class="sb-item${active(id)}" data-nav="${id}" data-drop-view="${id}" ${extra}>
      <span class="ic">${ICONS[v.icon](v.color)}</span><span class="lbl">${v.name}</span>
      ${cnt ? `<span class="cnt">${cnt}</span>` : ''}</div>`;
  };
  h += item('inbox') + '<div class="sb-sep"></div>' + item('today') + item('upcoming') + item('anytime') + item('someday') + '<div class="sb-sep"></div>' + item('logbook') + item('trash');

  const db = Store.db();
  const looseProjects = db.projects.filter(p => !p.areaId && p.status === 'open').sort((a,b)=>a.order-b.order);
  if(looseProjects.length) h += '<div class="sb-sep"></div>';
  looseProjects.forEach(p => { h += sbProject(p, active); });

  db.areas.slice().sort((a,b)=>a.order-b.order).forEach(a => {
    h += `<div class="sb-area-h${active('area', a.id)}" data-nav="area:${a.id}" data-drop-area="${a.id}">
      <span class="ic" style="width:16px;height:16px">${ICONS.area('#8e8e93')}</span><span class="lbl">${esc(a.title)}</span></div>`;
    db.projects.filter(p => p.areaId === a.id && p.status === 'open').sort((x,y)=>x.order-y.order)
      .forEach(p => { h += sbProject(p, active, true); });
  });

  h += '</div>';
  h += `<div class="sb-footer">
    <button data-act="settings" title="Settings">${'<span class="ic" style="width:15px;height:15px;display:inline-block">'+ICONS.gear('#8e8e93')+'</span>'}</button>
    <button data-act="sync" title="${DriveState.connected ? 'Synced with Google Drive — click to sync now' : 'Not connected to Google Drive'}">
      <span id="syncDot" class="${DriveState.connected ? (DriveState.busy ? 'busy' : (DriveState.error ? 'err' : 'ok')) : ''}"></span>
    </button>
    <span class="grow"></span>
    <button data-act="newlist">${'<span class="ic" style="width:13px;height:13px;display:inline-block">'+ICONS.plus('#8e8e93')+'</span>'} New List</button>
  </div>`;
  $('#sidebar').innerHTML = h;
}

function sbProject(p, active, indent){
  const prog = Store.projectProgress(p);
  return `<div class="sb-item sb-proj${active('project', p.id)}" ${indent?'':''} data-nav="project:${p.id}" data-drop-project="${p.id}">
    <span class="ic">${pieSvg(prog)}</span><span class="lbl">${esc(p.title) || 'New Project'}</span></div>`;
}

/* ----- main ----- */

function renderMain(){
  const main = $('#main');
  const v = UI.view;
  UI.visible = [];
  let h = '<div class="main-inner">';

  if(v.type === 'project') h += projectHead(v.id);
  else if(v.type === 'area') h += areaHead(v.id);
  else if(v.type === 'tag'){
    h += `<div class="view-head"><span class="ic">${ICONS.tag('#8e8e93')}</span><h1 class="view-title">${esc(v.id)}</h1></div>`;
  }else if(v.type === 'search'){
    h += `<div class="view-head"><span class="ic">${ICONS.search('#8e8e93')}</span><h1 class="view-title">“${esc(UI.searchQ)}”</h1></div>`;
  }else{
    const vd = VIEWS[v.type];
    h += `<div class="view-head"><span class="ic">${ICONS[vd.icon](vd.color)}</span><h1 class="view-title">${vd.name}</h1>
      ${v.type === 'trash' ? '<button class="head-btn" data-act="empty-trash" style="font-size:13px">Empty Trash</button>' : ''}
    </div>`;
  }

  const sections = Store.viewSections(v.type === 'search' ? {type:'searchlist'} : v, UI.tagFilter);

  /* tag filter bar */
  const allTags = Store.allTagsIn(Store.viewSections(v, null));
  if(allTags.length && v.type !== 'logbook' && v.type !== 'trash'){
    h += '<div class="tagbar">' + allTags.map(t =>
      `<span class="tchip${UI.tagFilter === t ? ' on' : ''}" data-tagf="${esc(t)}">${esc(t)}</span>`).join('') + '</div>';
  }

  let total = 0;
  sections.forEach(s => total += s.tasks.length + (s.projects ? s.projects.length : 0));

  if(v.type === 'search'){
    h += renderSearchResults();
  }else if(!total && !UI.editingId){
    const vd = VIEWS[v.type];
    h += `<div class="empty-view"><div class="big" style="width:54px;height:54px;margin:0 auto 12px;opacity:.35">${vd ? ICONS[vd.icon]('#b5b5ba') : ICONS.search('#b5b5ba')}</div>${vd ? vd.empty : 'Nothing found'}</div>`;
  }else{
    sections.forEach(s => { h += sectionHtml(s, v); });
  }

  h += '</div>';
  main.innerHTML = h;

  if(UI.editingId){
    const host = $('#ed-host');
    if(host) mountEditor(host, UI.editingId);
    else { UI.editingId = null; }
  }
  // autosize view notes
  const vn = $('#view-notes'); if(vn) autoGrow(vn);
}

function sectionHtml(s, view){
  let h = '<div class="sect">';
  if(s.dateHeader){
    const u = upcomingHeader(s.dateHeader);
    h += `<div class="sect-h date-h"><span class="t">${u.num}</span><span class="d">${esc(u.label)}</span></div>`;
  }else if(s.heading){
    h += `<div class="sect-h heading-h" data-heading="${s.heading.id}"><span class="t">${esc(s.heading.title)}</span>
      <span class="grow" style="flex:1"></span><button class="hbtn" data-act="heading-menu" data-hid="${s.heading.id}">•••</button></div>`;
  }else if(s.title){
    const link = s.ref ? ` link" data-navref="${s.ref.projectId ? 'project:'+s.ref.projectId : 'area:'+s.ref.areaId}` : '';
    h += `<div class="sect-h"><span class="t${link}">${esc(s.title)}</span></div>`;
  }
  const ctx = {
    log: !!s.log, trash: !!s.trash,
    showWhen: ['project','area','tag','someday','anytime','inbox'].includes(view.type) || s.evening,
    showCrumb: !!s.log || !!s.trash || view.type === 'upcoming'
  };
  s.tasks.forEach(t => {
    if(t.id === UI.editingId){ h += '<div id="ed-host"></div>'; return; }
    UI.visible.push(t.id);
    h += rowHtml(t, ctx);
  });
  (s.projects || []).forEach(p => {
    h += `<div class="task-row" data-navref="project:${p.id}">
      <span style="width:16px;margin-top:3px">${pieSvg(1, 'var(--logbook)', 15)}</span>
      <div class="body"><div class="t-title" style="color:var(--text-ter)">${esc(p.title)}</div></div>
      <span class="log-date">${p.completed ? logGroupLabel(p.completed) : ''}</span></div>`;
  });
  h += '</div>';
  return h;
}

function rowHtml(t, ctx = {}){
  const done = t.status === 'done', canceled = t.status === 'canceled';
  const cls = ['task-row']; if(done) cls.push('done'); if(canceled) cls.push('canceled');
  if(t.id === UI.kbsel) cls.push('kbsel');
  let meta = '';
  (t.tags||[]).forEach(tag => meta += `<span class="mini-tag">${esc(tag)}</span>`);
  if(t.notes) meta += `<span class="mini-note" style="width:12px;height:12px">${ICONS.note('#bcbcc2')}</span>`;
  if(t.checklist && t.checklist.length){
    const d = t.checklist.filter(c=>c.done).length;
    meta += `<span class="mini-cl">${d}/${t.checklist.length}</span>`;
  }
  if(t.repeat) meta += `<span class="mini-note" style="width:12px;height:12px">${ICONS.repeat('#bcbcc2')}</span>`;
  if(ctx.showCrumb){
    const pl = parentLabel(t); if(pl) meta += `<span class="t-proj-crumb">${esc(pl)}</span>`;
  }

  let whenBadge = '';
  if(ctx.showWhen && t.status === 'open'){
    if(t.when === 'today' || (t.when && t.when.date && t.when.date <= todayISO()))
      whenBadge = `<span class="t-star" style="width:13px;height:13px;display:inline-flex">${ICONS.star('var(--today)')}</span>`;
    else if(t.when && t.when.date)
      whenBadge = `<span class="t-when"><span style="width:12px;height:12px;display:inline-flex">${ICONS.cal('#8e8e93')}</span>${humanDate(t.when.date)}</span>`;
    else if(t.when === 'someday' && UI.view.type !== 'someday')
      whenBadge = `<span class="t-when"><span style="width:12px;height:12px;display:inline-flex">${ICONS.box('#8e8e93')}</span></span>`;
  }

  let right = '';
  if(ctx.log || ctx.trash){
    right = `<span class="log-date">${t.completed ? logGroupLabel(t.completed) : ''}${ctx.trash ? '<button data-act="restore" data-id="'+t.id+'" style="color:var(--blue);font-size:12px;margin-left:8px">Restore</button>' : ''}</span>`;
  }else if(t.deadline){
    const od = t.deadline <= todayISO();
    right = `<span class="t-dl${od ? ' overdue' : ''}"><span style="width:12px;height:12px;display:inline-flex">${ICONS.flag(od ? 'var(--red)' : '#8e8e93')}</span>${relDeadline(t.deadline)}</span>`;
  }

  const chkCls = done ? 'chk on' : canceled ? 'chk cancel' : 'chk';
  return `<div class="${cls.join(' ')}" data-task="${t.id}" draggable="true">
    <span class="${chkCls}" data-chk="${t.id}"></span>
    <div class="body">
      <div class="t-title">${whenBadge ? whenBadge + ' ' : ''}${esc(t.title) || '<span style="color:var(--text-ter)">New To-Do</span>'}</div>
      <div class="t-meta">${meta}</div>
    </div>${right}</div>`;
}

/* ----- project / area heads ----- */

function projectHead(id){
  const p = Store.getProject(id);
  if(!p) return '';
  const prog = Store.projectProgress(p);
  let chips = '';
  if(p.deadline){
    const od = p.deadline <= todayISO();
    chips += `<span class="wchip dl${od?' overdue':''}">${'<span style="width:13px;height:13px;display:inline-flex">'+ICONS.flag(od?'var(--red)':'#8e8e93')+'</span>'} ${relDeadline(p.deadline)}</span>`;
  }
  (p.tags||[]).forEach(tg => chips += `<span class="mini-tag">${esc(tg)}</span>`);
  return `<div class="view-head">
      <span class="ic" style="width:22px;height:22px;cursor:pointer" data-act="proj-complete" title="Complete project">${pieSvg(prog, 'var(--blue)', 22)}</span>
      <input class="view-title" id="proj-title" value="${esc(p.title)}" placeholder="New Project">
      <button class="head-btn" data-act="proj-menu" style="width:26px;height:26px">${ICONS.more('#bcbcc2')}</button>
    </div>
    ${chips ? `<div class="tagbar" style="margin-left:36px">${chips}</div>` : ''}
    <textarea class="view-notes" id="view-notes" data-proj-notes="${p.id}" placeholder="Notes" rows="1">${esc(p.notes||'')}</textarea>`;
}

function areaHead(id){
  const a = Store.getArea(id);
  if(!a) return '';
  return `<div class="view-head">
    <span class="ic" style="width:24px;height:24px">${ICONS.area('#4cb8b2')}</span>
    <input class="view-title" id="area-title" value="${esc(a.title)}" placeholder="New Area">
    <button class="head-btn" data-act="area-menu" style="width:26px;height:26px">${ICONS.more('#bcbcc2')}</button>
  </div>`;
}

/* ----- search results ----- */

function renderSearchResults(){
  const res = Store.searchAll(UI.searchQ);
  if(!res.length) return '<div class="empty-view">Nothing found</div>';
  let h = '<div class="sect">';
  res.forEach(r => {
    if(r.type === 'task'){ UI.visible.push(r.item.id); h += rowHtml(r.item, { showWhen:true, showCrumb:true }); }
    else if(r.type === 'project') h += `<div class="task-row" data-navref="project:${r.item.id}"><span style="width:16px;margin-top:3px">${pieSvg(Store.projectProgress(r.item))}</span><div class="body"><div class="t-title">${esc(r.item.title)}</div></div></div>`;
    else if(r.type === 'area') h += `<div class="task-row" data-navref="area:${r.item.id}"><span class="ic" style="width:16px;height:16px;margin-top:3px">${ICONS.area('#8e8e93')}</span><div class="body"><div class="t-title">${esc(r.item.title)}</div></div></div>`;
    else if(r.type === 'tag') h += `<div class="task-row" data-navref="tag:${esc(r.item)}"><span class="ic" style="width:16px;height:16px;margin-top:3px">${ICONS.tag('#8e8e93')}</span><div class="body"><div class="t-title">${esc(r.item)}</div></div></div>`;
  });
  return h + '</div>';
}

/* ================= editor ================= */

function discardIfEmpty(id){
  const t = Store.getTask(id);
  if(t && !t.title.trim() && !(t.notes||'').trim() && !(t.checklist||[]).length){
    Store.deleteTaskForever(t.id);
  }
}

function openEditor(id){
  if(UI.editingId && UI.editingId !== id) discardIfEmpty(UI.editingId);
  UI.editingId = id; UI.kbsel = null;
  render();
  const ta = $('#ed-title');
  if(ta){ ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; }
}

function closeEditor(){
  if(!UI.editingId) return;
  discardIfEmpty(UI.editingId);
  UI.editingId = null;
  render();
}

function mountEditor(host, id){
  const t = Store.getTask(id);
  if(!t){ UI.editingId = null; return; }
  host.outerHTML = editorHtml(t);
  wireEditor(id);
}

function editorHtml(t){
  const chkCls = t.status === 'done' ? 'chk on' : t.status === 'canceled' ? 'chk cancel' : 'chk';
  let cl = '';
  (t.checklist||[]).forEach(c => {
    cl += `<div class="cl-item${c.done ? ' done' : ''}" data-cl="${c.id}">
      <span class="chk${c.done ? ' on' : ''}" data-clchk="${c.id}"></span>
      <input value="${esc(c.text)}" data-clin="${c.id}" placeholder="Checklist item">
      <button class="rm" data-clrm="${c.id}">✕</button></div>`;
  });
  let tags = '';
  (t.tags||[]).forEach(tg => tags += `<span class="tag-pill">${esc(tg)}<span class="x" data-tagrm="${esc(tg)}">✕</span></span>`);

  let chips = '';
  const whenLbl = t.when === 'today' ? (t.evening ? 'This Evening' : 'Today')
    : t.when === 'someday' ? 'Someday'
    : t.when === 'anytime' ? 'Anytime'
    : (t.when && t.when.date) ? humanDate(t.when.date) + (t.evening ? ' · Evening' : '')
    : null;
  if(whenLbl){
    const ic = (t.when === 'today' || (t.when && t.when.date && t.when.date <= todayISO()))
      ? ICONS.star('var(--today)') : t.when === 'someday' ? ICONS.box('#8e8e93') : ICONS.cal('#8e8e93');
    chips += `<span class="wchip" data-ed="when"><span style="width:13px;height:13px;display:inline-flex">${ic}</span>${whenLbl}<span class="x" data-clear="when">✕</span></span>`;
  }
  if(t.deadline){
    const od = t.deadline <= todayISO();
    chips += `<span class="wchip dl${od?' overdue':''}" data-ed="deadline"><span style="width:13px;height:13px;display:inline-flex">${ICONS.flag(od?'var(--red)':'#8e8e93')}</span>Deadline: ${relDeadline(t.deadline)}<span class="x" data-clear="deadline">✕</span></span>`;
  }
  if(t.repeat){
    chips += `<span class="wchip" data-ed="repeat"><span style="width:13px;height:13px;display:inline-flex">${ICONS.repeat('#8e8e93')}</span>${repeatLabel(t.repeat)}<span class="x" data-clear="repeat">✕</span></span>`;
  }

  return `<div class="editor-card" id="editor" data-eid="${t.id}">
    <div class="ed-top">
      <span class="${chkCls}" data-edchk="1" style="margin-top:4px"></span>
      <textarea class="ed-title" id="ed-title" rows="1" placeholder="New To-Do">${esc(t.title)}</textarea>
    </div>
    <textarea class="ed-notes" id="ed-notes" rows="1" placeholder="Notes">${esc(t.notes||'')}</textarea>
    <div class="ed-checklist" id="ed-cl">${cl}</div>
    <div class="ed-tags" id="ed-tags">${tags}
      <input class="ed-tag-in" id="ed-tag-in" placeholder="${tags ? '' : 'Add tags'}" list="tags-dl">
      <datalist id="tags-dl">${Store.db().tags.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
    </div>
    <div class="ed-when-line">${chips}</div>
    <div class="ed-footer">
      <button class="ft-btn" data-ed="when" title="When"><span style="width:15px;height:15px;display:inline-flex">${ICONS.cal('#7c7c83')}</span></button>
      <button class="ft-btn" data-ed="deadline" title="Deadline"><span style="width:15px;height:15px;display:inline-flex">${ICONS.flag('#7c7c83')}</span></button>
      <button class="ft-btn" data-ed="repeat" title="Repeat"><span style="width:15px;height:15px;display:inline-flex">${ICONS.repeat('#7c7c83')}</span></button>
      <button class="ft-btn" data-ed="checklist" title="Add checklist"><span style="width:15px;height:15px;display:inline-flex">${ICONS.cl('#7c7c83')}</span></button>
      <button class="ft-btn" data-ed="tags" title="Tags"><span style="width:15px;height:15px;display:inline-flex">${ICONS.tag('#7c7c83')}</span></button>
      <span class="grow"></span>
      <button class="ft-btn" data-ed="move" title="Move"><span style="width:15px;height:15px;display:inline-flex">${ICONS.move('#7c7c83')}</span></button>
      <button class="ft-btn" data-ed="more" title="More"><span style="width:15px;height:15px;display:inline-flex">${ICONS.more('#7c7c83')}</span></button>
      <button class="ft-btn" data-ed="trash" title="Delete"><span style="width:15px;height:15px;display:inline-flex">${ICONS.trash('#7c7c83')}</span></button>
    </div>
  </div>`;
}

function wireEditor(id){
  const ed = $('#editor');
  const title = $('#ed-title'), notes = $('#ed-notes');
  autoGrow(title); autoGrow(notes);
  title.addEventListener('input', () => { autoGrow(title); Store.patchTask(id, { title: title.value }); renderSidebar(); });
  title.addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); closeEditor(); }
  });
  notes.addEventListener('input', () => { autoGrow(notes); Store.patchTask(id, { notes: notes.value }); });

  /* checklist */
  const wireCl = () => {
    $$('#ed-cl [data-clin]').forEach(inp => {
      if(inp._wired) return; inp._wired = true;
      inp.addEventListener('input', () => {
        const t = Store.getTask(id);
        const c = t.checklist.find(x => x.id === inp.dataset.clin);
        if(c){ c.text = inp.value; Store.touchTask(t); }
      });
      inp.addEventListener('keydown', e => {
        const t = Store.getTask(id);
        const idx = t.checklist.findIndex(x => x.id === inp.dataset.clin);
        if(e.key === 'Enter'){
          e.preventDefault();
          const c = { id: uid('c'), text:'', done:false };
          t.checklist.splice(idx+1, 0, c); Store.touchTask(t);
          refreshEditor(id, () => { const el = document.querySelector(`[data-clin="${c.id}"]`); if(el) el.focus(); });
        }else if(e.key === 'Backspace' && !inp.value){
          e.preventDefault();
          t.checklist.splice(idx, 1); Store.touchTask(t);
          refreshEditor(id, () => {
            const prev = t.checklist[Math.max(0, idx-1)];
            const el = prev && document.querySelector(`[data-clin="${prev.id}"]`);
            if(el) el.focus(); else $('#ed-notes').focus();
          });
        }
      });
    });
  };
  wireCl();

  ed.addEventListener('click', e => {
    const t = Store.getTask(id);
    const clchk = e.target.closest('[data-clchk]');
    if(clchk){
      const c = t.checklist.find(x => x.id === clchk.dataset.clchk);
      if(c){ c.done = !c.done; Store.touchTask(t); refreshEditor(id); }
      return;
    }
    const clrm = e.target.closest('[data-clrm]');
    if(clrm){
      t.checklist = t.checklist.filter(x => x.id !== clrm.dataset.clrm);
      Store.touchTask(t); refreshEditor(id); return;
    }
    const tagrm = e.target.closest('[data-tagrm]');
    if(tagrm){
      Store.patchTask(id, { tags: t.tags.filter(x => x !== tagrm.dataset.tagrm) });
      refreshEditor(id); return;
    }
    const clear = e.target.closest('[data-clear]');
    if(clear){
      e.stopPropagation();
      const k = clear.dataset.clear;
      if(k === 'when') Store.patchTask(id, { when: null, evening:false });
      if(k === 'deadline') Store.patchTask(id, { deadline: null });
      if(k === 'repeat') Store.patchTask(id, { repeat: null });
      refreshEditor(id); renderSidebar(); return;
    }
    if(e.target.closest('[data-edchk]')){
      Store.toggleDone(id); UI.editingId = null; render(); return;
    }
    const btn = e.target.closest('[data-ed]');
    if(btn){
      const k = btn.dataset.ed;
      if(k === 'when') whenPopover(btn, id);
      else if(k === 'deadline') deadlinePopover(btn, id);
      else if(k === 'repeat') repeatPopover(btn, id);
      else if(k === 'move') movePopover(btn, id);
      else if(k === 'more') morePopover(btn, id);
      else if(k === 'tags') $('#ed-tag-in').focus();
      else if(k === 'checklist'){
        const c = Store.addChecklistItem(id);
        refreshEditor(id, () => { const el = document.querySelector(`[data-clin="${c.id}"]`); if(el) el.focus(); });
      }
      else if(k === 'trash'){ Store.trashTask(id); UI.editingId = null; render(); toast('To-Do deleted', () => { Store.restoreTask(id); render(); }); }
    }
  });

  /* tags input */
  const tin = $('#ed-tag-in');
  const commitTag = () => {
    const v = tin.value.trim().replace(/,$/,'');
    if(!v) return;
    const t = Store.getTask(id);
    if(!(t.tags||[]).includes(v)){
      Store.patchTask(id, { tags: [...(t.tags||[]), v] });
      refreshEditor(id, () => $('#ed-tag-in').focus());
    }else tin.value = '';
  };
  tin.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ','){ e.preventDefault(); commitTag(); }
    else if(e.key === 'Backspace' && !tin.value){
      const t = Store.getTask(id);
      if((t.tags||[]).length){
        Store.patchTask(id, { tags: t.tags.slice(0,-1) });
        refreshEditor(id, () => $('#ed-tag-in').focus());
      }
    }
  });
  tin.addEventListener('change', commitTag);
}

function refreshEditor(id, after){
  const ed = $('#editor');
  if(!ed) return;
  ed.outerHTML = editorHtml(Store.getTask(id));
  wireEditor(id);
  if(after) after();
}

/* ================= popovers ================= */

function closePops(){ $$('.pop').forEach(p => p.remove()); }

function openPop(html, anchor, width){
  closePops();
  const el = document.createElement('div');
  el.className = 'pop';
  if(width) el.style.width = width + 'px';
  el.innerHTML = html;
  const r = anchor.getBoundingClientRect();
  el.style.left = r.left + 'px';
  el.style.top = (r.bottom + 6) + 'px';
  $('#overlays').appendChild(el);
  clampPop(el);
  return el;
}

/* ----- calendar ----- */

function calHtml(ym, sel, allowPast){
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m-1, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday first
  const daysIn = new Date(y, m, 0).getDate();
  const today = todayISO();
  let cells = '';
  ['M','T','W','T','F','S','S'].forEach(d => cells += `<span class="dow">${d}</span>`);
  for(let i = 0; i < startDow; i++) cells += '<span></span>';
  for(let d = 1; d <= daysIn; d++){
    const iso = `${y}-${pad2(m)}-${pad2(d)}`;
    const cls = ['day'];
    if(iso === today) cls.push('today');
    if(iso === sel) cls.push('sel');
    if(!allowPast && iso < today) cls.push('past');
    cells += `<span class="${cls.join(' ')}" data-date="${iso}">${d}</span>`;
  }
  return `<div class="cal" data-ym="${y}-${pad2(m)}">
    <div class="cal-head"><button data-calnav="-1">‹</button><span class="m">${MONTHS[m-1]} ${y}</span><button data-calnav="1">›</button></div>
    <div class="cal-grid">${cells}</div></div>`;
}

function wireCal(pop, sel, onPick, allowPast){
  pop.addEventListener('click', e => {
    const nav = e.target.closest('[data-calnav]');
    if(nav){
      const cal = pop.querySelector('.cal');
      const [y, m] = cal.dataset.ym.split('-').map(Number);
      const nm = addMonthsISO(`${y}-${pad2(m)}-01`, Number(nav.dataset.calnav)).slice(0,7);
      cal.outerHTML = calHtml(nm, sel, allowPast);
      return;
    }
    const day = e.target.closest('[data-date]');
    if(day){ onPick(day.dataset.date); }
  });
}

/* ----- when ----- */

function whenPopover(anchor, taskId){
  const t = Store.getTask(taskId);
  const selDate = t.when && t.when.date ? t.when.date : null;
  const ym = (selDate || todayISO()).slice(0,7);
  const opt = (ic, label, val, sub='') =>
    `<button class="pop-item" data-when="${val}"><span class="ic" style="width:16px;height:16px">${ic}</span>${label}${sub?`<span class="sub">${sub}</span>`:''}</button>`;
  const sat = (() => { let d = todayISO(); do{ d = addDaysISO(d,1); }while(fromISO(d).getDay() !== 6); return d; })();
  const mon = (() => { let d = todayISO(); do{ d = addDaysISO(d,1); }while(fromISO(d).getDay() !== 1); return d; })();
  const html = `<div class="pop-title">When</div>` +
    opt(ICONS.star('var(--today)'), 'Today', 'today') +
    opt(ICONS.star('#7f6ee0'), 'This Evening', 'evening') +
    opt(ICONS.cal('#8e8e93'), 'Tomorrow', addDaysISO(todayISO(),1)) +
    opt(ICONS.cal('#8e8e93'), 'This Weekend', sat, DOWS[6].slice(0,3)) +
    opt(ICONS.cal('#8e8e93'), 'Next Week', mon, 'Mon') +
    opt(ICONS.box('#c7a97e'), 'Someday', 'someday') +
    opt(ICONS.anytime('#49b8b2'), 'Anytime', 'anytime') +
    '<div class="pop-sep"></div>' + calHtml(ym, selDate, false) +
    (t.when ? '<div class="pop-sep"></div><button class="pop-item" data-when="clear" style="color:var(--red)">Clear</button>' : '');
  const pop = openPop(html, anchor);
  const apply = (when, evening) => {
    Store.patchTask(taskId, { when, evening: !!evening });
    closePops();
    if(UI.editingId === taskId) refreshEditor(taskId); else render();
    renderSidebar();
  };
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-when]');
    if(b){
      const v = b.dataset.when;
      if(v === 'today') apply('today', false);
      else if(v === 'evening') apply('today', true);
      else if(v === 'someday') apply('someday');
      else if(v === 'anytime') apply('anytime');
      else if(v === 'clear') apply(null);
      else apply({ date: v });
      return;
    }
  });
  wireCal(pop, selDate, iso => apply({ date: iso }, t.evening), false);
}

/* ----- deadline ----- */

function deadlinePopover(anchor, taskId, isProject){
  const get = () => isProject ? Store.getProject(taskId) : Store.getTask(taskId);
  const cur = get().deadline;
  const html = `<div class="pop-title">Deadline</div>` + calHtml((cur || todayISO()).slice(0,7), cur, false) +
    (cur ? '<div class="pop-sep"></div><button class="pop-item" data-dlclear="1" style="color:var(--red)">Remove Deadline</button>' : '');
  const pop = openPop(html, anchor);
  const apply = dl => {
    if(isProject) Store.patchProject(taskId, { deadline: dl });
    else Store.patchTask(taskId, { deadline: dl });
    closePops();
    if(UI.editingId === taskId) refreshEditor(taskId); else render();
  };
  pop.addEventListener('click', e => { if(e.target.closest('[data-dlclear]')) apply(null); });
  wireCal(pop, cur, apply, false);
}

/* ----- repeat ----- */

function repeatPopover(anchor, taskId){
  const t = Store.getTask(taskId);
  const r = t.repeat || { unit:'week', interval:1, mode:'fixed' };
  const html = `<div class="pop-title">Repeat</div>
    <div class="rep-row">Every <input type="number" id="rep-n" min="1" max="365" value="${r.interval}">
      <select id="rep-u">
        ${['day','week','month','year'].map(u => `<option value="${u}"${r.unit===u?' selected':''}>${u}(s)</option>`).join('')}
      </select></div>
    <div class="rep-row"><label><input type="radio" name="repm" value="fixed"${r.mode!=='after'?' checked':''}> On a fixed schedule</label></div>
    <div class="rep-row"><label><input type="radio" name="repm" value="after"${r.mode==='after'?' checked':''}> After completion</label></div>
    <div class="pop-sep"></div>
    <div style="display:flex;gap:6px;padding:4px 8px 6px">
      <button class="btn primary" id="rep-ok" style="flex:1">Apply</button>
      ${t.repeat ? '<button class="btn danger" id="rep-rm">Remove</button>' : ''}
    </div>`;
  const pop = openPop(html, anchor, 250);
  pop.querySelector('#rep-ok').addEventListener('click', () => {
    const rule = {
      unit: pop.querySelector('#rep-u').value,
      interval: Math.max(1, Number(pop.querySelector('#rep-n').value) || 1),
      mode: pop.querySelector('input[name=repm]:checked').value
    };
    const patch = { repeat: rule };
    const cur = Store.getTask(taskId);
    if(!(cur.when && cur.when.date) && cur.when !== 'today') patch.when = 'today';
    Store.patchTask(taskId, patch);
    closePops();
    if(UI.editingId === taskId) refreshEditor(taskId); else render();
  });
  const rm = pop.querySelector('#rep-rm');
  if(rm) rm.addEventListener('click', () => {
    Store.patchTask(taskId, { repeat: null });
    closePops();
    if(UI.editingId === taskId) refreshEditor(taskId); else render();
  });
}

/* ----- move ----- */

function movePopover(anchor, taskId){
  const db = Store.db();
  let html = `<div class="pop-title">Move to</div>
    <button class="pop-item" data-mv="inbox"><span class="ic" style="width:16px;height:16px">${ICONS.inbox('var(--inbox)')}</span>Inbox</button>`;
  const projBtn = p => `<button class="pop-item" data-mvp="${p.id}"><span class="ic">${pieSvg(Store.projectProgress(p))}</span>${esc(p.title)}</button>`;
  db.projects.filter(p => !p.areaId && p.status==='open').forEach(p => html += projBtn(p));
  db.areas.slice().sort((a,b)=>a.order-b.order).forEach(a => {
    html += `<button class="pop-item" data-mva="${a.id}"><span class="ic" style="width:15px;height:15px">${ICONS.area('#8e8e93')}</span><b>${esc(a.title)}</b></button>`;
    db.projects.filter(p => p.areaId === a.id && p.status==='open').forEach(p => html += projBtn(p));
  });
  const pop = openPop(html, anchor, 260);
  pop.addEventListener('click', e => {
    const b = e.target.closest('.pop-item');
    if(!b) return;
    if(b.dataset.mv === 'inbox') Store.moveTaskTo(taskId, { view:'inbox' });
    else if(b.dataset.mvp) Store.moveTaskTo(taskId, { projectId: b.dataset.mvp });
    else if(b.dataset.mva) Store.moveTaskTo(taskId, { areaId: b.dataset.mva });
    closePops();
    if(UI.editingId === taskId) refreshEditor(taskId); else render();
    renderSidebar();
  });
}

/* ----- more (editor) ----- */

function morePopover(anchor, taskId){
  const t = Store.getTask(taskId);
  const html =
    `<button class="pop-item" data-mm="cancel">${t.status==='canceled' ? 'Mark as Open' : 'Mark as Canceled'}</button>
     <button class="pop-item" data-mm="dup">Duplicate To-Do</button>
     <button class="pop-item" data-mm="convert">Convert to Project</button>`;
  const pop = openPop(html, anchor, 220);
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-mm]'); if(!b) return;
    closePops();
    if(b.dataset.mm === 'cancel'){
      if(t.status === 'canceled'){ t.status='open'; t.completed=null; Store.touchTask(t); }
      else Store.cancelTask(taskId);
      UI.editingId = null; render();
    }else if(b.dataset.mm === 'dup'){
      const copy = Object.assign({}, t, { id: undefined, created: undefined, order: undefined,
        checklist: (t.checklist||[]).map(c => ({...c, id: uid('c')})), tags: (t.tags||[]).slice() });
      delete copy.id; delete copy.created; delete copy.order;
      const nt = Store.newTask(copy);
      UI.editingId = nt.id; render();
    }else if(b.dataset.mm === 'convert'){
      const p = Store.newProject({ title: t.title || 'New Project', notes: t.notes || '', areaId: t.areaId, deadline: t.deadline, tags: (t.tags||[]).slice() });
      (t.checklist||[]).forEach(c => Store.newTask({ title: c.text, projectId: p.id, areaId: p.areaId, when:'anytime', status: c.done ? 'done' : 'open', completed: c.done ? Date.now() : null }));
      Store.deleteTaskForever(t.id);
      UI.editingId = null;
      setView({ type:'project', id: p.id });
    }
  });
}

/* ----- project menu ----- */

function projectMenu(anchor, pid){
  const p = Store.getProject(pid);
  const html =
    `<button class="pop-item" data-pm="complete"><span class="ic" style="width:15px;height:15px">${ICONS.logbook('var(--logbook)')}</span>${p.status==='open' ? 'Complete Project' : 'Reopen Project'}</button>
     <button class="pop-item" data-pm="heading"><span class="ic" style="width:15px;height:15px">${ICONS.heading('#8e8e93')}</span>Add Heading</button>
     <button class="pop-item" data-pm="when"><span class="ic" style="width:15px;height:15px">${ICONS.cal('#8e8e93')}</span>When…</button>
     <button class="pop-item" data-pm="deadline"><span class="ic" style="width:15px;height:15px">${ICONS.flag('#8e8e93')}</span>Deadline…</button>
     <button class="pop-item" data-pm="move"><span class="ic" style="width:15px;height:15px">${ICONS.move('#8e8e93')}</span>Move to Area…</button>
     <div class="pop-sep"></div>
     <button class="pop-item" data-pm="delete" style="color:var(--red)"><span class="ic" style="width:15px;height:15px">${ICONS.trash('var(--red)')}</span>Delete Project</button>`;
  const pop = openPop(html, anchor, 230);
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-pm]'); if(!b) return;
    const k = b.dataset.pm;
    if(k === 'complete'){
      closePops();
      if(p.status === 'open') Store.completeProject(pid); else Store.reopenProject(pid);
      render();
    }else if(k === 'heading'){
      closePops();
      const name = prompt('Heading name:');
      if(name && name.trim()){ Store.newHeading(pid, name.trim()); render(); }
    }else if(k === 'deadline'){
      deadlinePopover(anchor, pid, true);
    }else if(k === 'when'){
      projectWhenPopover(anchor, pid);
    }else if(k === 'move'){
      const db = Store.db();
      let h = '<div class="pop-title">Move to Area</div><button class="pop-item" data-a="">No Area</button>';
      db.areas.forEach(a => h += `<button class="pop-item" data-a="${a.id}">${esc(a.title)}</button>`);
      const pp = openPop(h, anchor, 220);
      pp.addEventListener('click', ev => {
        const bb = ev.target.closest('[data-a]'); if(!bb) return;
        Store.patchProject(pid, { areaId: bb.dataset.a || null });
        closePops(); render();
      });
    }else if(k === 'delete'){
      closePops();
      Store.trashProject(pid);
      setView({ type:'today' });
      toast('Project deleted');
    }
  });
}

function projectWhenPopover(anchor, pid){
  const p = Store.getProject(pid);
  const html = `<div class="pop-title">When</div>
    <button class="pop-item" data-w="today"><span class="ic" style="width:15px;height:15px">${ICONS.star('var(--today)')}</span>Today</button>
    <button class="pop-item" data-w="someday"><span class="ic" style="width:15px;height:15px">${ICONS.box('#c7a97e')}</span>Someday</button>
    <button class="pop-item" data-w="anytime"><span class="ic" style="width:15px;height:15px">${ICONS.anytime('#49b8b2')}</span>Anytime</button>
    ${p.when ? '<div class="pop-sep"></div><button class="pop-item" data-w="clear" style="color:var(--red)">Clear</button>' : ''}`;
  const pop = openPop(html, anchor, 200);
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-w]'); if(!b) return;
    Store.patchProject(pid, { when: b.dataset.w === 'clear' ? null : b.dataset.w });
    closePops(); render();
  });
}

/* ----- area menu ----- */

function areaMenu(anchor, aid){
  const html =
    `<button class="pop-item" data-am="newproj"><span class="ic">${pieSvg(0)}</span>New Project in Area</button>
     <div class="pop-sep"></div>
     <button class="pop-item" data-am="delete" style="color:var(--red)"><span class="ic" style="width:15px;height:15px">${ICONS.trash('var(--red)')}</span>Delete Area</button>`;
  const pop = openPop(html, anchor, 220);
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-am]'); if(!b) return;
    closePops();
    if(b.dataset.am === 'newproj'){
      const p = Store.newProject({ areaId: aid });
      setView({ type:'project', id: p.id });
      setTimeout(() => { const el = $('#proj-title'); if(el){ el.focus(); el.select(); } }, 30);
    }else if(b.dataset.am === 'delete'){
      if(confirm('Delete this area and everything in it?')){
        Store.deleteArea(aid);
        setView({ type:'today' });
      }
    }
  });
}

/* ----- heading menu ----- */

function headingMenu(anchor, hid){
  const pid = UI.view.id;
  const html = `<button class="pop-item" data-hm="rename">Rename Heading</button>
    <button class="pop-item" data-hm="delete" style="color:var(--red)">Delete Heading</button>`;
  const pop = openPop(html, anchor, 190);
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-hm]'); if(!b) return;
    closePops();
    if(b.dataset.hm === 'rename'){
      const p = Store.getProject(pid);
      const h = (p.headings||[]).find(x => x.id === hid);
      const name = prompt('Heading name:', h ? h.title : '');
      if(name && name.trim()){ Store.renameHeading(pid, hid, name.trim()); render(); }
    }else{
      Store.deleteHeading(pid, hid); render();
    }
  });
}

/* ----- new list ----- */

function newListPopover(anchor){
  const html =
    `<button class="pop-item" data-nl="project"><span class="ic">${pieSvg(0)}</span><div><div>New Project</div><div style="font-size:12px;color:var(--text-sec)">Define a goal, then work towards it one to-do at a time.</div></div></button>
     <div class="pop-sep"></div>
     <button class="pop-item" data-nl="area"><span class="ic" style="width:16px;height:16px">${ICONS.area('#4cb8b2')}</span><div><div>New Area</div><div style="font-size:12px;color:var(--text-sec)">Group projects and to-dos by responsibility.</div></div></button>`;
  const pop = openPop(html, anchor, 300);
  pop.style.top = ''; pop.style.bottom = '46px';
  clampPop(pop);
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-nl]'); if(!b) return;
    closePops();
    if(b.dataset.nl === 'project'){
      const p = Store.newProject({});
      setView({ type:'project', id: p.id });
      setTimeout(() => { const el = $('#proj-title'); if(el){ el.focus(); el.select(); } }, 30);
    }else{
      const a = Store.newArea({});
      setView({ type:'area', id: a.id });
      setTimeout(() => { const el = $('#area-title'); if(el){ el.focus(); el.select(); } }, 30);
    }
  });
}

/* ================= modals ================= */

function closeModals(){
  $$('.backdrop, .modal').forEach(x => x.remove());
}

function openModal(html, cls = ''){
  closeModals(); closePops();
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.addEventListener('mousedown', e => { if(e.target === bd) closeModals(); });
  const m = document.createElement('div');
  m.className = 'modal ' + cls;
  m.innerHTML = html;
  $('#overlays').append(bd, m);
  return m;
}

/* ----- quick entry ----- */

let qeState = null;

function quickEntry(){
  qeState = { when: null, evening: false, tags: [], dest: 'inbox' };
  const db = Store.db();
  let destOpts = '<option value="inbox">Inbox</option>';
  db.projects.filter(p => p.status==='open').forEach(p => destOpts += `<option value="p:${p.id}">${esc(p.title)}</option>`);
  db.areas.forEach(a => destOpts += `<option value="a:${a.id}">${esc(a.title)}</option>`);
  const m = openModal(`<div class="qe">
    <div class="ed-top">
      <span class="chk" style="margin-top:5px"></span>
      <textarea class="ed-title" id="qe-title" rows="1" placeholder="New To-Do"></textarea>
    </div>
    <textarea class="ed-notes" id="qe-notes" rows="1" placeholder="Notes"></textarea>
    <div class="ed-tags" style="margin-left:26px">
      <input class="ed-tag-in" id="qe-tags" placeholder="Tags (comma separated)" list="tags-dl2">
      <datalist id="tags-dl2">${db.tags.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
    </div>
    <div class="qe-foot">
      <button class="wchip" id="qe-when"><span style="width:13px;height:13px;display:inline-flex">${ICONS.cal('#8e8e93')}</span><span id="qe-when-lbl">When</span></button>
      <select id="qe-dest" style="border:1px solid #d8d8de;border-radius:6px;padding:4px 6px;font-size:13px;background:#fff">${destOpts}</select>
      <span class="grow"></span>
      <button class="btn plain" id="qe-cancel">Cancel</button>
      <button class="btn primary" id="qe-save">Save</button>
    </div>
  </div>`);
  const title = m.querySelector('#qe-title'), notes = m.querySelector('#qe-notes');
  title.focus();
  [title, notes].forEach(x => x.addEventListener('input', () => autoGrow(x)));
  m.querySelector('#qe-when').addEventListener('click', e => {
    const anchor = e.currentTarget;
    const sat = (() => { let d = todayISO(); do{ d = addDaysISO(d,1); }while(fromISO(d).getDay() !== 6); return d; })();
    const html = `<div class="pop-title">When</div>
      <button class="pop-item" data-w="today">Today</button>
      <button class="pop-item" data-w="evening">This Evening</button>
      <button class="pop-item" data-w="${addDaysISO(todayISO(),1)}">Tomorrow</button>
      <button class="pop-item" data-w="${sat}">This Weekend</button>
      <button class="pop-item" data-w="someday">Someday</button>
      <button class="pop-item" data-w="anytime">Anytime</button>
      <div class="pop-sep"></div>` + calHtml(todayISO().slice(0,7), null, false);
    const pop = openPop(html, anchor, 250);
    const setw = (w, ev) => {
      qeState.when = w; qeState.evening = !!ev;
      m.querySelector('#qe-when-lbl').textContent =
        w === 'today' ? (ev ? 'This Evening' : 'Today') : w === 'someday' ? 'Someday' : w === 'anytime' ? 'Anytime' : w && w.date ? humanDate(w.date) : 'When';
      closePops();
    };
    pop.addEventListener('click', ev => {
      const b = ev.target.closest('[data-w]'); if(!b) return;
      const v = b.dataset.w;
      if(v === 'today') setw('today');
      else if(v === 'evening') setw('today', true);
      else if(v === 'someday' || v === 'anytime') setw(v);
      else setw({ date: v });
    });
    wireCal(pop, null, iso => setw({ date: iso }), false);
  });
  const save = () => {
    const tt = title.value.trim();
    if(!tt){ closeModals(); return; }
    const preset = { title: tt, notes: notes.value.trim(), when: qeState.when, evening: qeState.evening };
    preset.tags = m.querySelector('#qe-tags').value.split(',').map(s=>s.trim()).filter(Boolean);
    const dest = m.querySelector('#qe-dest').value;
    if(dest.startsWith('p:')){
      preset.projectId = dest.slice(2);
      const p = Store.getProject(preset.projectId);
      preset.areaId = p ? p.areaId : null;
      if(!preset.when) preset.when = 'anytime';
    }else if(dest.startsWith('a:')){
      preset.areaId = dest.slice(2);
      if(!preset.when) preset.when = 'anytime';
    }
    Store.newTask(preset);
    Store.ensureTags(preset.tags);
    closeModals(); render();
    toast('To-Do added');
  };
  m.querySelector('#qe-save').addEventListener('click', save);
  m.querySelector('#qe-cancel').addEventListener('click', closeModals);
  title.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); save(); } });
}

/* ----- quick find ----- */

function quickFind(){
  const m = openModal(`<div class="qf">
    <input class="qf-in" id="qf-in" placeholder="Quick Find" autocomplete="off">
    <div class="qf-results" id="qf-res"></div>
  </div>`);
  const inp = m.querySelector('#qf-in'), res = m.querySelector('#qf-res');
  inp.focus();
  let items = [], sel = 0;

  const draw = () => {
    const q = inp.value.trim();
    items = [];
    if(!q){
      // default: navigation
      Object.keys(VIEWS).forEach(k => items.push({ type:'view', id:k }));
    }else{
      Store.searchAll(q).forEach(r => items.push(r));
    }
    sel = 0;
    res.innerHTML = items.length ? items.map((r, i) => qfRow(r, i === sel)).join('') : '<div class="qf-empty">Nothing found</div>';
  };

  const qfRow = (r, selected) => {
    const c = selected ? ' sel' : '';
    if(r.type === 'view'){
      const v = VIEWS[r.id];
      return `<div class="qf-row${c}" data-i="${r.id}"><span class="ic" style="width:16px;height:16px">${ICONS[v.icon](v.color)}</span>${v.name}</div>`;
    }
    if(r.type === 'task') return `<div class="qf-row${c}"><span class="ic"><span class="chk" style="margin:0;width:13px;height:13px"></span></span>${esc(r.item.title)}<span class="crumb">${esc(parentLabel(r.item))}</span></div>`;
    if(r.type === 'project') return `<div class="qf-row${c}"><span class="ic">${pieSvg(Store.projectProgress(r.item))}</span>${esc(r.item.title)}</div>`;
    if(r.type === 'area') return `<div class="qf-row${c}"><span class="ic" style="width:15px;height:15px">${ICONS.area('#8e8e93')}</span>${esc(r.item.title)}</div>`;
    if(r.type === 'tag') return `<div class="qf-row${c}"><span class="ic" style="width:15px;height:15px">${ICONS.tag('#8e8e93')}</span>${esc(r.item)}</div>`;
    return '';
  };

  const go = r => {
    closeModals();
    if(!r) return;
    if(r.type === 'view') setView({ type: r.id });
    else if(r.type === 'project') setView({ type:'project', id: r.item.id });
    else if(r.type === 'area') setView({ type:'area', id: r.item.id });
    else if(r.type === 'tag') setView({ type:'tag', id: r.item });
    else if(r.type === 'task'){
      const t = r.item;
      if(t.projectId) setView({ type:'project', id: t.projectId });
      else if(inInbox(t)) setView({ type:'inbox' });
      else if(t.when === 'someday') setView({ type:'someday' });
      else if(isFutureScheduled(t)) setView({ type:'upcoming' });
      else if(inTodayOpen(t)) setView({ type:'today' });
      else if(t.areaId) setView({ type:'area', id: t.areaId });
      else if(t.status !== 'open') setView({ type:'logbook' });
      else setView({ type:'anytime' });
      if(t.status === 'open') openEditor(t.id);
    }
  };

  inp.addEventListener('input', draw);
  inp.addEventListener('keydown', e => {
    if(e.key === 'ArrowDown'){ e.preventDefault(); sel = Math.min(items.length-1, sel+1); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); sel = Math.max(0, sel-1); }
    else if(e.key === 'Enter'){ e.preventDefault(); go(items[sel]); return; }
    else if(e.key === 'Escape'){ closeModals(); return; }
    else return;
    res.innerHTML = items.map((r, i) => qfRow(r, i === sel)).join('');
    const s = res.querySelector('.sel'); if(s) s.scrollIntoView({ block:'nearest' });
  });
  res.addEventListener('click', e => {
    const row = e.target.closest('.qf-row');
    if(!row) return;
    const i = [...res.children].indexOf(row);
    go(items[i]);
  });
  draw();
}

/* ----- settings ----- */

function settingsModal(){
  const m = openModal(`<div class="settings">
    <h2>Settings</h2>
    <div class="set-row">
      <label>Google OAuth Client ID</label>
      <input type="text" id="set-cid" value="${esc(Drive.clientId)}" placeholder="xxxxxxxx.apps.googleusercontent.com">
      <div class="hint">Create a Web OAuth client in Google Cloud Console with this page's origin (e.g. http://localhost:8000) as an authorized JavaScript origin, and enable the Google Drive API. See README.md for a step-by-step guide.</div>
    </div>
    <div class="set-status" id="set-status">${DriveState.connected ? '✓ Connected to Google Drive. Tasks are stored as Markdown files in the “Things GTD” folder.' : 'Not connected — data is stored locally in this browser.'}
    ${DriveState.error ? '<br><span style="color:var(--red)">Last error: ' + esc(DriveState.error) + '</span>' : ''}</div>
    <div class="set-actions">
      ${DriveState.connected
        ? '<button class="btn primary" id="set-sync">Sync Now</button><button class="btn danger" id="set-disc">Disconnect</button>'
        : '<button class="btn primary" id="set-conn">Connect Google Drive</button>'}
      <span class="grow" style="flex:1"></span>
      <button class="btn plain" id="set-export">Export JSON</button>
      <button class="btn plain" id="set-import">Import JSON</button>
      <button class="btn plain" id="set-close">Close</button>
    </div>
  </div>`);
  const cid = m.querySelector('#set-cid');
  cid.addEventListener('change', () => { Drive.clientId = cid.value.trim(); });
  const conn = m.querySelector('#set-conn');
  if(conn) conn.addEventListener('click', async () => {
    Drive.clientId = cid.value.trim();
    if(!Drive.clientId){ alert('Enter your Google OAuth Client ID first (see README.md).'); return; }
    conn.textContent = 'Connecting…'; conn.disabled = true;
    try{
      await Drive.connect(true);
      closeModals(); render();
      toast('Connected — synced with Google Drive');
    }catch(e){
      conn.textContent = 'Connect Google Drive'; conn.disabled = false;
      m.querySelector('#set-status').innerHTML = '<span style="color:var(--red)">' + esc(e.message || String(e)) + '</span>';
    }
  });
  const disc = m.querySelector('#set-disc');
  if(disc) disc.addEventListener('click', () => { Drive.disconnect(); closeModals(); render(); });
  const syncb = m.querySelector('#set-sync');
  if(syncb) syncb.addEventListener('click', () => { closeModals(); Drive.syncNow(); toast('Syncing…'); });
  m.querySelector('#set-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(Store.db(), null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'things-backup-' + todayISO() + '.json';
    a.click();
  });
  m.querySelector('#set-import').addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = () => {
      const f = inp.files[0]; if(!f) return;
      f.text().then(txt => {
        try{
          const db = JSON.parse(txt);
          if(!Array.isArray(db.tasks)) throw new Error('Invalid backup file');
          Store.replaceDB(db);
          closeModals(); render();
          toast('Backup imported');
          if(DriveState.connected) Drive.enqueue(() => Drive.pushAll());
        }catch(e){ alert('Import failed: ' + e.message); }
      });
    };
    inp.click();
  });
  m.querySelector('#set-close').addEventListener('click', closeModals);
}

/* ----- toast ----- */

let toastTimer = null;
function toast(msg, undo){
  $$('.toast').forEach(x => x.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = esc(msg) + (undo ? '<button id="toast-undo">Undo</button>' : '');
  document.body.appendChild(el);
  if(undo) el.querySelector('#toast-undo').addEventListener('click', () => { el.remove(); undo(); });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 4000);
}

/* ================= new task ================= */

function newTaskInView(){
  const v = UI.view;
  let preset = {};
  if(v.type === 'today') preset = { when:'today' };
  else if(v.type === 'upcoming') preset = { when:{ date: addDaysISO(todayISO(),1) } };
  else if(v.type === 'anytime') preset = { when:'anytime' };
  else if(v.type === 'someday') preset = { when:'someday' };
  else if(v.type === 'project'){
    const p = Store.getProject(v.id);
    preset = { projectId: v.id, areaId: p ? p.areaId : null, when:'anytime' };
  }
  else if(v.type === 'area') preset = { areaId: v.id, when:'anytime' };
  else if(v.type === 'tag') preset = { when:'anytime', tags:[v.id] };
  else if(v.type === 'logbook' || v.type === 'trash' || v.type === 'search'){
    setView({ type:'inbox' });
  }
  if(UI.editingId) closeEditor();
  const t = Store.newTask(preset);
  openEditor(t.id);
}

/* ================= drag & drop ================= */

let dragId = null;

function wireDnd(){
  document.addEventListener('dragstart', e => {
    const row = e.target.closest && e.target.closest('.task-row[data-task]');
    if(!row){ e.preventDefault(); return; }
    dragId = row.dataset.task;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try{ e.dataTransfer.setData('text/plain', dragId); }catch(err){}
  });
  document.addEventListener('dragend', () => {
    dragId = null;
    $$('.dragging').forEach(x => x.classList.remove('dragging'));
    $$('.dropbefore,.dropafter').forEach(x => x.classList.remove('dropbefore','dropafter'));
    $$('.dropover').forEach(x => x.classList.remove('dropover'));
  });
  document.addEventListener('dragover', e => {
    if(!dragId) return;
    const row = e.target.closest && e.target.closest('.task-row[data-task]');
    const sb = e.target.closest && e.target.closest('[data-drop-view],[data-drop-project],[data-drop-area]');
    $$('.dropbefore,.dropafter').forEach(x => x.classList.remove('dropbefore','dropafter'));
    $$('.dropover').forEach(x => x.classList.remove('dropover'));
    if(row && row.dataset.task !== dragId){
      e.preventDefault();
      const r = row.getBoundingClientRect();
      row.classList.add(e.clientY > r.top + r.height/2 ? 'dropafter' : 'dropbefore');
    }else if(sb){
      e.preventDefault();
      sb.classList.add('dropover');
    }
  });
  document.addEventListener('drop', e => {
    if(!dragId) return;
    const id = dragId; dragId = null;
    const row = e.target.closest && e.target.closest('.task-row[data-task]');
    const sb = e.target.closest && e.target.closest('[data-drop-view],[data-drop-project],[data-drop-area]');
    if(row && row.dataset.task !== id){
      e.preventDefault();
      const r = row.getBoundingClientRect();
      Store.reorderTask(id, row.dataset.task, e.clientY > r.top + r.height/2);
      render();
    }else if(sb){
      e.preventDefault();
      if(sb.dataset.dropView){
        if(sb.dataset.dropView === 'logbook' || sb.dataset.dropView === 'trash'){
          if(sb.dataset.dropView === 'trash') Store.trashTask(id);
        }else Store.moveTaskTo(id, { view: sb.dataset.dropView });
      }
      else if(sb.dataset.dropProject) Store.moveTaskTo(id, { projectId: sb.dataset.dropProject });
      else if(sb.dataset.dropArea) Store.moveTaskTo(id, { areaId: sb.dataset.dropArea });
      render();
    }
  });
}

/* ================= global events ================= */

function wireGlobal(){

  /* sidebar clicks */
  $('#sidebar').addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]');
    if(nav){
      const [type, id] = nav.dataset.nav.split(':');
      setView(id ? { type, id } : { type });
      return;
    }
    const act = e.target.closest('[data-act]');
    if(act){
      if(act.dataset.act === 'settings') settingsModal();
      else if(act.dataset.act === 'newlist') newListPopover(act);
      else if(act.dataset.act === 'sync'){
        if(DriveState.connected){ Drive.syncNow(); toast('Syncing…'); }
        else settingsModal();
      }
    }
  });

  /* main clicks (delegated) */
  $('#main').addEventListener('click', e => {
    const chk = e.target.closest('[data-chk]');
    if(chk){
      const id = chk.dataset.chk;
      const t = Store.getTask(id);
      if(t && t.status === 'open' && !t.repeat){
        // animate then re-render
        chk.classList.add('on');
        const row = chk.closest('.task-row');
        if(row && UI.view.type !== 'today') row.classList.add('fading');
        Store.toggleDone(id);
        setTimeout(() => render(), UI.view.type === 'today' ? 120 : 700);
      }else{
        Store.toggleDone(id);
        render();
      }
      renderSidebar();
      return;
    }
    const restore = e.target.closest('[data-act="restore"]');
    if(restore){ Store.restoreTask(restore.dataset.id); render(); return; }

    const navref = e.target.closest('[data-navref]');
    if(navref){
      const [type, id] = navref.dataset.navref.split(':');
      setView({ type, id });
      return;
    }
    const tagf = e.target.closest('[data-tagf]');
    if(tagf){
      UI.tagFilter = UI.tagFilter === tagf.dataset.tagf ? null : tagf.dataset.tagf;
      render();
      return;
    }
    const act = e.target.closest('[data-act]');
    if(act){
      const k = act.dataset.act;
      if(k === 'empty-trash'){ if(confirm('Permanently delete everything in the Trash?')){ Store.emptyTrash(); render(); } }
      else if(k === 'proj-menu') projectMenu(act, UI.view.id);
      else if(k === 'area-menu') areaMenu(act, UI.view.id);
      else if(k === 'heading-menu') headingMenu(act, act.dataset.hid);
      else if(k === 'proj-complete'){
        const p = Store.getProject(UI.view.id);
        if(p){
          if(p.status === 'open'){ Store.completeProject(p.id); toast('Project completed', () => { Store.reopenProject(p.id); render(); }); }
          else Store.reopenProject(p.id);
          render();
        }
      }
      return;
    }
    const row = e.target.closest('.task-row[data-task]');
    if(row){
      if(UI.editingId === row.dataset.task) return;
      openEditor(row.dataset.task);
    }
  });

  /* project/area title + notes editing */
  $('#main').addEventListener('input', e => {
    if(e.target.id === 'proj-title') Store.patchProject(UI.view.id, { title: e.target.value });
    else if(e.target.id === 'area-title') Store.patchArea(UI.view.id, { title: e.target.value });
    else if(e.target.dataset && e.target.dataset.projNotes){ autoGrow(e.target); Store.patchProject(UI.view.id, { notes: e.target.value }); }
  });
  $('#main').addEventListener('keydown', e => {
    if((e.target.id === 'proj-title' || e.target.id === 'area-title') && e.key === 'Enter'){
      e.preventDefault(); e.target.blur(); renderSidebar();
    }
  });
  $('#main').addEventListener('focusout', e => {
    if(e.target.id === 'proj-title' || e.target.id === 'area-title') renderSidebar();
  });

  /* magic plus */
  $('#magicPlus').addEventListener('click', newTaskInView);

  /* mobile drawer */
  $('#sbToggle').addEventListener('click', e => {
    e.stopPropagation();
    document.body.classList.toggle('sb-open');
  });
  $('#sbBackdrop').addEventListener('click', closeDrawer);

  /* outside click: close pops & editor.
     NB: mousedown fires before click; render() would detach the click target,
     so row/checkbox interactions are resolved here when an editor is open. */
  document.addEventListener('mousedown', e => {
    if(e.target.closest('.pop') || e.target.closest('.modal')) return;
    closePops();
    if(!UI.editingId) return;
    if(e.target.closest('.editor-card') || e.target.closest('.backdrop')) return;
    const chk = e.target.closest('[data-chk]');
    if(chk){
      e.preventDefault();
      const id = chk.dataset.chk;
      discardIfEmpty(UI.editingId); UI.editingId = null;
      Store.toggleDone(id);
      render(); renderSidebar();
      return;
    }
    const row = e.target.closest('.task-row[data-task]');
    if(row && row.dataset.task !== UI.editingId){
      e.preventDefault();
      openEditor(row.dataset.task);
      return;
    }
    closeEditor();
  });

  /* keyboard */
  document.addEventListener('keydown', e => {
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    const mod = e.metaKey || e.ctrlKey;

    if(e.key === 'Escape'){
      if($$('.pop').length){ closePops(); return; }
      if($$('.modal').length){ closeModals(); return; }
      if(document.body.classList.contains('sb-open')){ closeDrawer(); return; }
      if(UI.editingId){ closeEditor(); return; }
      if(UI.tagFilter){ UI.tagFilter = null; render(); return; }
      return;
    }
    if(mod && e.key === 'Enter' && UI.editingId){ e.preventDefault(); closeEditor(); return; }
    if(mod && (e.key === 'k' || e.key === 'K')){ e.preventDefault(); quickFind(); return; }
    if(mod && e.key === 'f'){ e.preventDefault(); quickFind(); return; }
    if(e.ctrlKey && e.code === 'Space'){ e.preventDefault(); quickEntry(); return; }
    if(mod && e.shiftKey && (e.key === 'n' || e.key === 'N')){
      e.preventDefault();
      const p = Store.newProject(UI.view.type === 'area' ? { areaId: UI.view.id } : {});
      setView({ type:'project', id: p.id });
      setTimeout(() => { const el = $('#proj-title'); if(el){ el.focus(); el.select(); } }, 30);
      return;
    }
    if(mod && (e.key === 'n' || e.key === 'N')){ e.preventDefault(); newTaskInView(); return; }
    if(mod && e.key === 's'){ e.preventDefault(); if(DriveState.connected){ Drive.syncNow(); toast('Syncing…'); } return; }
    if(mod && e.key >= '1' && e.key <= '7'){
      e.preventDefault();
      setView({ type: ['inbox','today','upcoming','anytime','someday','logbook','trash'][Number(e.key)-1] });
      return;
    }

    if(typing) return;

    if(e.key === '/'){ e.preventDefault(); quickFind(); return; }
    if(e.key === 'n'){ e.preventDefault(); newTaskInView(); return; }

    /* list navigation */
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      if(!UI.visible.length) return;
      e.preventDefault();
      let i = UI.visible.indexOf(UI.kbsel);
      i = e.key === 'ArrowDown' ? Math.min(UI.visible.length-1, i+1) : Math.max(0, i <= 0 ? 0 : i-1);
      UI.kbsel = UI.visible[i];
      $$('.task-row.kbsel').forEach(x => x.classList.remove('kbsel'));
      const row = document.querySelector(`.task-row[data-task="${UI.kbsel}"]`);
      if(row){ row.classList.add('kbsel'); row.scrollIntoView({ block:'nearest' }); }
      return;
    }
    if(e.key === 'Enter' && UI.kbsel){ e.preventDefault(); openEditor(UI.kbsel); return; }
    if((e.key === ' ' || (mod && e.key === '.')) && UI.kbsel){
      e.preventDefault();
      Store.toggleDone(UI.kbsel);
      render();
      return;
    }
    if((e.key === 'Backspace' || e.key === 'Delete') && UI.kbsel){
      e.preventDefault();
      const id = UI.kbsel; UI.kbsel = null;
      Store.trashTask(id);
      render();
      toast('To-Do deleted', () => { Store.restoreTask(id); render(); });
      return;
    }
  });

  /* sidebar resize */
  const rez = $('#sb-resizer');
  let rezOn = false;
  rez.addEventListener('mousedown', () => { rezOn = true; document.body.style.cursor = 'col-resize'; });
  document.addEventListener('mousemove', e => {
    if(!rezOn) return;
    $('#sidebar').style.width = Math.min(400, Math.max(190, e.clientX)) + 'px';
  });
  document.addEventListener('mouseup', () => { if(rezOn){ rezOn = false; document.body.style.cursor = ''; } });

  /* drive state → footer dot */
  window.onDriveState = () => {
    const dot = $('#syncDot');
    if(dot) dot.className = DriveState.connected ? (DriveState.busy ? 'busy' : (DriveState.error ? 'err' : 'ok')) : '';
  };
  window.onDriveSynced = () => render();

  /* refresh Today at date change */
  let lastDay = todayISO();
  setInterval(() => {
    if(todayISO() !== lastDay){ lastDay = todayISO(); render(); }
  }, 60000);
}

/* ================= seed & init ================= */

function seedWelcome(){
  const db = Store.db();
  if(db.meta.seeded || db.tasks.length || db.projects.length) return;
  db.meta.seeded = true;
  const a = Store.newArea({ title:'Personal' });
  const p = Store.newProject({ title:'Get Started with Things', areaId: a.id });
  Store.newTask({ title:'Create your first to-do', notes:'Press N or click the blue + button.', projectId:p.id, areaId:a.id, when:'today' });
  Store.newTask({ title:'Schedule a to-do', notes:'Open a to-do and pick a date with the calendar button — it will appear in Upcoming.', projectId:p.id, areaId:a.id, when:'anytime' });
  Store.newTask({ title:'Try Quick Find', notes:'Press ⌘K (or /) to search and jump anywhere.', projectId:p.id, areaId:a.id, when:'anytime' });
  Store.newTask({ title:'Connect Google Drive', notes:'Open Settings (gear icon, bottom-left) and connect your Google account. Your to-dos become Markdown files in a “Things GTD” folder.', projectId:p.id, areaId:a.id, when:'anytime' });
  Store.newTask({ title:'Capture an idea to the Inbox', when:null });
}

function init(){
  Store.init();
  seedWelcome();
  try{
    const saved = localStorage.getItem('things.view');
    if(saved) UI.view = JSON.parse(saved);
    // validate
    if(UI.view.type === 'project' && !Store.getProject(UI.view.id)) UI.view = { type:'today' };
    if(UI.view.type === 'area' && !Store.getArea(UI.view.id)) UI.view = { type:'today' };
  }catch(e){ UI.view = { type:'today' }; }
  wireGlobal();
  wireDnd();
  render();
  // silent reconnect to Drive
  if(Drive.wasGranted && Drive.clientId){
    Drive.connect(false).catch(e => {
      console.warn('Silent Drive reconnect failed:', e.message);
      DriveState.error = null;
      renderSidebar();
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
