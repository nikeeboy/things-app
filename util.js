/* util.js — helpers */
'use strict';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function uid(p){ return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

const pad2 = n => String(n).padStart(2,'0');

function toISO(d){ return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); }
function fromISO(s){ const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function todayISO(){ return toISO(new Date()); }

function addDaysISO(iso, n){ const d = fromISO(iso); d.setDate(d.getDate()+n); return toISO(d); }
function addMonthsISO(iso, n){
  const d = fromISO(iso); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth()+n);
  const last = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}
function addYearsISO(iso, n){ const d = fromISO(iso); d.setFullYear(d.getFullYear()+n); return toISO(d); }

function daysUntil(iso){
  const a = fromISO(todayISO()), b = fromISO(iso);
  return Math.round((b - a) / 86400000);
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function humanDate(iso){
  if(!iso) return '';
  const n = daysUntil(iso);
  if(n === 0) return 'Today';
  if(n === 1) return 'Tomorrow';
  if(n === -1) return 'Yesterday';
  const d = fromISO(iso);
  if(n > 1 && n < 7) return DOWS[d.getDay()];
  const y = d.getFullYear() === new Date().getFullYear() ? '' : ' ' + d.getFullYear();
  return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0,3) + y;
}

function upcomingHeader(iso){
  const d = fromISO(iso); const n = daysUntil(iso);
  const num = d.getDate();
  let label;
  if(n === 1) label = 'Tomorrow';
  else if(n < 7) label = DOWS[d.getDay()];
  else label = MONTHS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  return {num, label, monthKey: iso.slice(0,7)};
}

function relDeadline(iso){
  const n = daysUntil(iso);
  if(n === 0) return 'today';
  if(n < 0) return (-n) + 'd overdue';
  if(n === 1) return 'tomorrow';
  return n + ' days left';
}

function logGroupLabel(ts){
  const iso = toISO(new Date(ts));
  const n = daysUntil(iso);
  if(n === 0) return 'Today';
  if(n === -1) return 'Yesterday';
  const d = fromISO(iso);
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
}

function debounce(fn, ms){
  let t = null;
  const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  f.flush = (...a) => { clearTimeout(t); fn(...a); };
  return f;
}

function slug(s){
  const r = String(s || '').trim().toLowerCase()
    .replace(/[\\/:*?"<>|#\[\]]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  return r || 'untitled';
}

function autoGrow(el){
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function clampPop(el){
  const r = el.getBoundingClientRect();
  if(r.right > innerWidth - 8)  el.style.left = Math.max(8, innerWidth - r.width - 8) + 'px';
  if(r.bottom > innerHeight - 8) el.style.top = Math.max(8, innerHeight - r.height - 8) + 'px';
  if(r.left < 8) el.style.left = '8px';
  if(r.top < 8) el.style.top = '8px';
}
