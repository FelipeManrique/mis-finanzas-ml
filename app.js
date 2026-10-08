/* Mis Finanzas — Copyright (c) 2026 Felipe Manrique. Todos los derechos reservados. Ver LICENSE. */
/* Mis Finanzas ML — organizada según el manual de educación financiera (presupuesto, semáforo, 50/30/20, metas, deudas). Datos en localStorage de este dispositivo. */
(function () {
  'use strict';

  const KEY = 'mf-ml:v1';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayIso = () => isoDate(new Date());
  const monthOf = (iso) => iso.slice(0, 7);
  const parseIso = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d || 1); };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const ICON = {
    google: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#fff" opacity=".85" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#fff" opacity=".7" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"/><path fill="#fff" opacity=".85" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 19V12M12 19V6M18 19v-9"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4M12 17v.01"/></svg>',
    quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/></svg>'
  };

  // ---------- Estado ----------
  const DEFAULT_SETTINGS = () => ({
    lang: 'es-AR',
    autoSave: false,
    defaultMethod: 'Efectivo',
    defaultCurrency: 'ARS',
    theme: 'auto',
    glass: 0.35,
    plan: null,
    metas: [],
    deudas: [],
    bigText: false,
    methods: ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'Mercado Pago'],
    initialBalances: {},
    categories: clone(Parser.DEFAULT_CATEGORIES),
    lastBackup: null
  });

  let db = load();
  const ui = { tab: 'movs', month: monthOf(todayIso()), q: '', type: 'all', cat: null };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const settings = Object.assign(DEFAULT_SETTINGS(), d.settings || {});
        const NEW = { '#007AFF': '#0088FF', '#FF3B30': '#FF383C', '#FF9500': '#FF8D28', '#5856D6': '#6155F5', '#AF52DE': '#CB30E0',
          '#30B0C7': '#00C3D0', '#64D2FF': '#00C0E8', '#A2845E': '#AC7F5E', '#D4A017': '#FFCC00', '#FF6482': '#FF2D55' };
        ['gasto', 'ingreso'].forEach((t) => (settings.categories[t] || []).forEach((c) => { if (NEW[c.color]) c.color = NEW[c.color]; }));
        ['gasto', 'ingreso', 'ahorro', 'deuda'].forEach((t) => { if (!Array.isArray(settings.categories[t])) settings.categories[t] = clone(Parser.DEFAULT_CATEGORIES[t]); });
        return { movs: Array.isArray(d.movs) ? d.movs : [], settings, deleted: Array.isArray(d.deleted) ? d.deleted : [], sharedAt: d.sharedAt || 0 };
      }
    } catch (e) { console.warn('No pude leer los datos guardados', e); }
    return { movs: [], settings: DEFAULT_SETTINGS(), deleted: [], sharedAt: 0 };
  }

  // ---------- Datos compartidos (familia): cada cambio lleva fecha y los borrados dejan constancia ----------
  // Ajustes de cada teléfono que NO se comparten con la otra persona:
  const LOCAL_KEYS = ['theme', 'glass', 'bigText', 'lang', 'autoSave', 'lastBackup', 'firstUse', 'quien', 'defaultMethod'];
  const sharedSettings = (st) => { const o = {}; Object.keys(st).forEach((k) => { if (!LOCAL_KEYS.includes(k) && k !== 'metas' && k !== 'deudas') o[k] = st[k]; }); return o; };
  const strip = (o) => { const c = Object.assign({}, o); delete c.updatedAt; return JSON.stringify(c); };
  function snapshot(d) {
    const m = new Map();
    d.movs.forEach((x) => m.set('m:' + x.id, strip(x)));
    (d.settings.metas || []).forEach((x) => m.set('meta:' + x.id, strip(x)));
    (d.settings.deudas || []).forEach((x) => m.set('deuda:' + x.id, strip(x)));
    m.set('shared', JSON.stringify(sharedSettings(d.settings)));
    return m;
  }
  let lastSnap = snapshot(db);
  // Marca qué cambió desde el último guardado (nuevo, editado o borrado).
  function stamp() {
    const now = Date.now(), cur = snapshot(db), tomb = new Map(db.deleted.map((t) => [t.k, t]));
    const touch = (key, obj) => {
      if (lastSnap.get(key) !== cur.get(key)) obj.updatedAt = now;
      else if (!obj.updatedAt) obj.updatedAt = obj.createdAt || now;
      tomb.delete(key);
    };
    db.movs.forEach((x) => touch('m:' + x.id, x));
    (S().metas || []).forEach((x) => touch('meta:' + x.id, x));
    (S().deudas || []).forEach((x) => touch('deuda:' + x.id, x));
    if (lastSnap.get('shared') !== cur.get('shared')) db.sharedAt = now;
    lastSnap.forEach((_, key) => { if (key !== 'shared' && !cur.has(key) && !tomb.has(key)) tomb.set(key, { k: key, at: now }); });
    const limit = now - 400 * 864e5;
    db.deleted = [...tomb.values()].filter((t) => t.at > limit);
    lastSnap = cur;
  }
  // Fusión: por cada elemento gana la versión más nueva; un borrado gana si es posterior a la última edición.
  function mergeData(local, remote) {
    const tomb = new Map();
    [].concat(local.deleted || [], remote.deleted || []).forEach((t) => { const p = tomb.get(t.k); if (!p || t.at > p.at) tomb.set(t.k, t); });
    const pick = (a, b, prefix) => {
      const map = new Map();
      [].concat(a || [], b || []).forEach((x) => {
        const p = map.get(x.id);
        if (!p || (x.updatedAt || x.createdAt || 0) > (p.updatedAt || p.createdAt || 0)) map.set(x.id, x);
      });
      return [...map.values()].filter((x) => { const t = tomb.get(prefix + x.id); return !t || t.at < (x.updatedAt || x.createdAt || 0); });
    };
    const remoteNewer = (remote.sharedAt || 0) > (local.sharedAt || 0);
    const base = remoteNewer ? Object.assign({}, remote.settings || {}) : sharedSettings(local.settings);
    const settings = Object.assign(DEFAULT_SETTINGS(), sharedSettings(base));
    LOCAL_KEYS.forEach((k) => { if (k in local.settings) settings[k] = local.settings[k]; });
    settings.metas = pick(local.settings.metas, (remote.settings || {}).metas, 'meta:');
    settings.deudas = pick(local.settings.deudas, (remote.settings || {}).deudas, 'deuda:');
    ['gasto', 'ingreso', 'ahorro', 'deuda'].forEach((t) => { if (!Array.isArray((settings.categories || {})[t])) { settings.categories = settings.categories || {}; settings.categories[t] = clone(Parser.DEFAULT_CATEGORIES[t]); } });
    return {
      movs: pick(local.movs, remote.movs, 'm:'), settings, deleted: [...tomb.values()],
      sharedAt: Math.max(local.sharedAt || 0, remote.sharedAt || 0)
    };
  }
  const fingerprint = (d) => JSON.stringify([d.movs.map((x) => x.id + ':' + (x.updatedAt || 0)).sort(), (d.settings.metas || []).map((x) => x.id + ':' + (x.updatedAt || 0)).sort(),
    (d.settings.deudas || []).map((x) => x.id + ':' + (x.updatedAt || 0)).sort(), d.sharedAt || 0, (d.deleted || []).length]);
  function replaceLocal(next) {
    db = next;
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* sin espacio */ }
    lastSnap = snapshot(db);
  }

  let persistAsked = false;
  function save() {
    stamp();
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      toast('No pude guardar en este dispositivo. Exportá una copia desde Ajustes.');
      return false;
    }
    if (!persistAsked && navigator.storage && navigator.storage.persist) { persistAsked = true; navigator.storage.persist().catch(() => {}); }
    scheduleSync();
    return true;
  }
  const S = () => db.settings;

  // ---------- Formato ----------
  const fmtCache = {};
  function money(v, cur = 'ARS', signed = false) {
    const k = cur + (v % 1 ? 'd' : 'i');
    if (!fmtCache[k]) {
      fmtCache[k] = new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
    }
    const s = fmtCache[k].format(Math.abs(v)).replace(/ /g, ' ').replace('US$', 'US$ ').replace('  ', ' ');
    if (signed && v) return (v < 0 ? '−' : '+') + s;
    return v < 0 ? '−' + s : s;
  }
  const monthName = (ym) => { const d = parseIso(ym + '-01'); return d.toLocaleDateString('es-AR', { month: 'long' }) + ' ' + d.getFullYear(); };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const monthShort = (ym) => parseIso(ym + '-01').toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
  function dayLabel(iso) {
    const t = todayIso();
    if (iso === t) return 'Hoy';
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (iso === isoDate(y)) return 'Ayer';
    const d = parseIso(iso);
    const opts = { weekday: 'short', day: 'numeric', month: 'short' };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString('es-AR', opts).replace(/[.,]/g, '');
  }
  function shiftMonth(ym, n) { const d = parseIso(ym + '-01'); d.setMonth(d.getMonth() + n); return monthOf(isoDate(d)); }
  function parseAmount(s) {
    if (typeof s === 'number') return s;
    s = String(s || '').replace(/[^\d.,]/g, '');
    if (!s) return NaN;
    const v = Parser.parseDigits(s);
    return v === null ? NaN : v;
  }
  function amountInputValue(v) {
    if (!v && v !== 0) return '';
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(v);
  }

  function catInfo(type, name) {
    const list = S().categories[type] || [];
    return list.find((c) => c.name === name) || { name: name || 'Sin categoría', color: '#8E8E93', kw: [] };
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg, undo) {
    const el = $('#toast');
    $('#toast-msg').textContent = msg;
    const b = $('#toast-btn');
    b.hidden = !undo;
    b.onclick = () => { if (undo) undo(); el.classList.remove('show'); };
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 5000 : 3000);
  }

  // ---------- Hoja inferior ----------
  const sheet = { onClose: null };
  function openSheet({ title, left = 'Cancelar', right = '', onLeft, onRight, render, onClose }) {
    const sh = $('#sheet'), sc = $('#scrim');
    $('#sheet-title').textContent = title;
    const l = $('#sheet-left'), r = $('#sheet-right');
    l.textContent = left; l.hidden = !left;
    r.textContent = right; r.hidden = !right; r.disabled = false;
    l.onclick = () => (onLeft ? onLeft() : closeSheet());
    r.onclick = () => onRight && onRight();
    if (sheet.onClose && sheet.onClose !== onClose) { const f = sheet.onClose; sheet.onClose = null; f(); }
    sheet.onClose = onClose || null;
    const body = $('#sheet-body');
    body.innerHTML = '';
    body.scrollTop = 0;
    render(body);
    if (sh.hidden) {
      sh.hidden = false; sc.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => { sh.classList.add('open'); sc.classList.add('open'); }));
      document.body.style.overflow = 'hidden';
    }
  }
  function closeSheet() {
    const sh = $('#sheet'), sc = $('#scrim');
    if (sheet.onClose) { const f = sheet.onClose; sheet.onClose = null; f(); }
    sh.classList.remove('open'); sc.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { if (!sh.classList.contains('open')) { sh.hidden = true; sc.hidden = true; $('#sheet-body').innerHTML = ''; } }, 380);
  }
  const sheetOpen = () => !$('#sheet').hidden && $('#sheet').classList.contains('open');

  // ---------- Cálculos ----------
  const TYPES = ['gasto', 'ingreso', 'ahorro', 'deuda'];
  const TYPE_LABEL = { gasto: 'Gasto', ingreso: 'Ingreso', ahorro: 'Ahorro', deuda: 'Deuda' };
  const REG_LABEL = { fijo: 'Fijo', variable: 'Variable', imprevisto: 'Imprevisto' };
  const NAT_LABEL = { imprescindible: 'Imprescindible', necesario: 'Necesario', deseo: 'Deseo', hormiga: 'Hormiga' };
  const DEBT_LABEL = { productiva: 'Productiva', consumo: 'De consumo', urgencia: 'Por urgencia' };
  const typeClass = (t) => ({ ingreso: 'in', ahorro: 'sav', deuda: 'debt' }[t] || 'out');
  const signed = (m) => (m.type === 'ingreso' ? m.amount : -m.amount);
  const catDef = (m) => (S().categories.gasto || []).find((c) => c.name === m.category) || {};
  const natOf = (m) => m.naturaleza || catDef(m).nat || 'necesario';
  const regOf = (m) => m.regularidad || catDef(m).reg || 'variable';
  const P = (x) => Math.round(x * 100) + '%';
  const sum = (arr) => arr.reduce((s, m) => s + m.amount, 0);

  function totals(movs) {
    const blank = () => ({ in: 0, out: 0, gasto: 0, ahorro: 0, deuda: 0 });
    const t = { ARS: blank(), USD: blank() };
    for (const m of movs) {
      const c = t[m.currency] || (t[m.currency] = blank());
      if (m.type === 'ingreso') c.in += m.amount; else { c.out += m.amount; c[m.type] = (c[m.type] || 0) + m.amount; }
    }
    return t;
  }
  const movsOfMonth = (ym) => db.movs.filter((m) => monthOf(m.date) === ym);
  const sortMovs = (arr) => arr.sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt || 0) - (a.createdAt || 0));

  // Diagnóstico del mes y semáforo financiero (verde / amarillo / rojo), según el manual.
  const SEM = {
    verde: { label: 'Verde', text: 'Situación equilibrada' },
    amarillo: { label: 'Amarillo', text: 'Señal de alerta' },
    rojo: { label: 'Rojo', text: 'Hay que tomar decisiones' },
    none: { label: 'Sin datos', text: 'Cargá tus movimientos para verlo' }
  };
  function diagnose(ym) {
    const ms = movsOfMonth(ym).filter((m) => m.currency === 'ARS');
    const t = totals(ms).ARS;
    const g = ms.filter((m) => m.type === 'gasto');
    const byNat = (n) => sum(g.filter((m) => natOf(m) === n));
    const byReg = (r) => sum(g.filter((m) => regOf(m) === r));
    const d = {
      I: t.in, G: t.gasto, A: t.ahorro, D: t.deuda, saldo: t.in - t.out, count: ms.length,
      fijos: byReg('fijo'), variables: byReg('variable'), imprevistos: byReg('imprevisto'),
      imprescindible: byNat('imprescindible'), necesario: byNat('necesario'), deseo: byNat('deseo'), hormiga: byNat('hormiga'),
      hormigaMovs: g.filter((m) => natOf(m) === 'hormiga')
    };
    d.necesidades = d.imprescindible + d.necesario;
    d.deseos = d.deseo + d.hormiga;
    const R = [];
    if (!d.count) return Object.assign(d, { level: 'none', reasons: R });
    const pct = (x) => (d.I ? x / d.I : 0);
    if (!d.I) {
      R.push(['amarillo', 'Todavía no registraste ingresos este mes. Cargalos para completar el diagnóstico.']);
    } else {
      if (d.saldo < 0) R.push(['rojo', `Los gastos superan a los ingresos por ${money(Math.round(-d.saldo))}.`]);
      else R.push(['verde', `Los ingresos alcanzan para cubrir todo (quedan ${money(Math.round(d.saldo))}).`]);
      const pa = pct(d.A);
      if (pa >= 0.10) R.push(['verde', `Ahorrás el ${P(pa)} de tus ingresos.`]);
      else if (d.A > 0) R.push(['amarillo', `Ahorrás el ${P(pa)} de tus ingresos: es poco (la guía sugiere entre 10% y 20%).`]);
      else R.push([d.saldo < 0 ? 'rojo' : 'amarillo', 'No registraste ahorro este mes.']);
      const pd = pct(d.D);
      if (pd > 0.35) R.push(['rojo', `Las deudas se llevan el ${P(pd)} de tus ingresos.`]);
      else if (pd > 0.20) R.push(['amarillo', `Las deudas se llevan el ${P(pd)} de tus ingresos y empiezan a pesar.`]);
      else if (d.D > 0) R.push(['verde', `Deudas controladas: ${P(pd)} de tus ingresos.`]);
      if (pct(d.necesidades) > 0.60) R.push(['amarillo', `Las necesidades ocupan el ${P(pct(d.necesidades))} de tus ingresos (la guía es 50%).`]);
      if (pct(d.deseos) > 0.35) R.push(['amarillo', `Los deseos ocupan el ${P(pct(d.deseos))} de tus ingresos (la guía es 30%).`]);
    }
    if (d.G && d.hormiga / d.G > 0.10) R.push(['amarillo', `Los gastos hormiga son el ${P(d.hormiga / d.G)} de tus gastos.`]);
    const level = R.some((r) => r[0] === 'rojo') ? 'rojo' : R.some((r) => r[0] === 'amarillo') ? 'amarillo' : 'verde';
    return Object.assign(d, { level, reasons: R });
  }

  // ---------- Render: selector de mes ----------
  function renderMonthSwitch() {
    const cur = monthOf(todayIso());
    $$('[data-month-switch]').forEach((el) => {
      el.innerHTML = `<button data-m="-1" aria-label="Mes anterior">${ICON.left}</button>
        <span class="label">${esc(cap(monthName(ui.month)))}</span>
        <button data-m="1" aria-label="Mes siguiente" ${ui.month >= cur ? 'disabled' : ''}>${ICON.right}</button>
        ${ui.month !== cur ? '<button class="today-link" data-m="0">Este mes</button>' : ''}`;
    });
  }

  // ---------- Render: movimientos ----------
  function renderSummary() {
    const t = totals(movsOfMonth(ui.month));
    const d = diagnose(ui.month);
    const bal = t.ARS.in - t.ARS.out;
    const sem = SEM[d.level];
    let html = `<div><div class="caption">Saldo final de ${esc(monthName(ui.month).split(' ')[0])}</div>
      <div class="balance num ${bal < 0 ? 'neg' : ''}">${money(Math.round(bal))}</div></div>
      <div class="split four">
        <div class="in"><span class="caption">Ingresos</span><span class="v num">${money(Math.round(t.ARS.in))}</span></div>
        <div class="out"><span class="caption">Gastos</span><span class="v num">${money(Math.round(t.ARS.gasto))}</span></div>
        <div class="sav"><span class="caption">Ahorro</span><span class="v num">${money(Math.round(t.ARS.ahorro))}</span></div>
        <div class="debt"><span class="caption">Deudas</span><span class="v num">${money(Math.round(t.ARS.deuda))}</span></div>
      </div>
      <button class="sem-pill" id="sem-pill" data-level="${d.level}"><span class="sem-dot" data-level="${d.level}"></span>
        <span class="grow"><strong>Semáforo: ${sem.label}</strong> · ${sem.text}</span>${ICON.right}</button>`;
    if (t.USD.in || t.USD.out) html += `<div class="usd-line num">Dólares: ingresos ${money(t.USD.in, 'USD')} · salidas ${money(t.USD.out, 'USD')}</div>`;
    $('#summary').innerHTML = html;
    $('#sem-pill').onclick = () => go('stats');
  }

  function renderBackupBanner() {
    const el = $('#backup-banner');
    if (driveOn()) {
      const st = driveState();
      if (st.level === 'error') {
        el.innerHTML = `<div class="banner">${ICON.warn}<div>Copia en Drive: ${esc(st.text)} <button id="bk-fix">Revisar</button></div></div>`;
        $('#bk-fix').onclick = () => go('settings');
      } else el.innerHTML = '';
      return;
    }
    const n = db.movs.length;
    const last = S().lastBackup ? new Date(S().lastBackup) : null;
    // sin cuenta: recordatorio semanal de copia manual
    const since = last || (S().firstUse ? new Date(S().firstUse) : null);
    const stale = since && (Date.now() - since.getTime()) > 7 * 864e5;
    if (n >= 3 && stale) {
      el.innerHTML = `<div class="banner">${ICON.warn}<div>Tus datos están sólo en este teléfono. ${last ? 'Tu última copia es de hace más de una semana.' : 'Todavía no guardaste ninguna copia.'} <button id="bk-now">Guardar copia</button> · <button id="bk-g">Conectar Google</button></div></div>`;
      $('#bk-now').onclick = exportJSON;
      $('#bk-g').onclick = openDriveConnect;
    } else el.innerHTML = '';
  }

  function filteredMovs() {
    const q = Parser.norm(ui.q.trim());
    let arr = q ? db.movs.slice() : movsOfMonth(ui.month);
    if (ui.type !== 'all') arr = arr.filter((m) => m.type === ui.type);
    if (ui.cat) arr = arr.filter((m) => m.category === ui.cat);
    if (q) {
      arr = arr.filter((m) => {
        const hay = Parser.norm([m.description, m.category, m.method, m.amount, amountInputValue(m.amount)].join(' '));
        return q.split(/\s+/).every((w) => hay.includes(w));
      });
    }
    return sortMovs(arr);
  }

  function rowHtml(m) {
    const c = catInfo(m.type, m.category);
    const meta = m.type === 'ahorro' && m.metaId ? (S().metas || []).find((x) => x.id === m.metaId) : null;
    const debt = m.type === 'deuda' && m.deudaId ? (S().deudas || []).find((x) => x.id === m.deudaId) : null;
    const sub = [m.category, m.type === 'gasto' ? REG_LABEL[regOf(m)] : null, m.type === 'gasto' && natOf(m) === 'hormiga' ? 'Hormiga' : null,
      meta ? 'Meta: ' + meta.nombre : null, debt ? debt.acreedor : null, m.method, m.installments ? m.installments + ' cuotas' : null,
      m.autor && m.autor !== S().quien ? 'Cargó ' + m.autor : null].filter(Boolean).join(' · ');
    return `<button class="row" data-id="${esc(m.id)}">
      <span class="badge" style="--c:${esc(c.color)}" aria-hidden="true">${esc((m.category || '?').charAt(0).toUpperCase())}</span>
      <span class="mid"><span class="t">${esc(m.description || m.category)}</span>
      <span class="s">${m.source === 'voz' ? `<span class="mic-tag" title="Cargado con la voz">${ICON.quote}</span>` : ''}${esc(sub)}</span></span>
      <span class="amt num ${typeClass(m.type)}">${money(signed(m), m.currency, m.type === 'ingreso')}</span>
    </button>`;
  }

  function renderList() {
    const list = $('#list');
    const cf = $('#cat-filter');
    if (ui.cat) { cf.hidden = false; cf.innerHTML = `Categoría: <strong>${esc(ui.cat)}</strong> <button id="clear-cat">Quitar filtro</button>`; $('#clear-cat').onclick = () => { ui.cat = null; renderMovs(); }; }
    else cf.hidden = true;

    const arr = filteredMovs();
    if (!db.movs.length) {
      const ex = ['Cobré 850 mil de sueldo por transferencia', 'Pagué 380 mil de alquiler y 1.500 en el kiosco', 'Ahorré 50 mil para el fondo de emergencia'];
      list.innerHTML = `<div class="empty"><h2>Registrá todo lo que entra y sale</h2>
        <p>Tocá el micrófono y hablá con naturalidad. La app reconoce si es un ingreso, un gasto, un ahorro o el pago de una deuda, y clasifica cada gasto en fijo, variable o imprevisto.</p>
        <div class="examples">${ex.map((e) => `<button data-ex="${esc(e)}">${ICON.quote}<span>“${esc(e)}”</span></button>`).join('')}</div>
        <p class="hint">Tocá un ejemplo para ver cómo lo interpreta. No se guarda nada hasta que confirmes.</p></div>`;
      $$('[data-ex]', list).forEach((b) => (b.onclick = () => openReview(b.dataset.ex, 'ejemplo')));
      return;
    }
    if (!arr.length) {
      list.innerHTML = `<div class="empty"><p>${ui.q ? 'Ningún movimiento coincide con la búsqueda.' : 'No hay movimientos en ' + esc(monthName(ui.month)) + '.'}</p></div>`;
      return;
    }
    const days = new Map();
    for (const m of arr) { if (!days.has(m.date)) days.set(m.date, []); days.get(m.date).push(m); }
    let html = ui.q ? `<p class="footnote">${arr.length} resultado${arr.length === 1 ? '' : 's'} en todos los meses</p>` : '';
    for (const [d, ms] of days) {
      const net = ms.filter((m) => m.currency === 'ARS').reduce((s, m) => s + signed(m), 0);
      html += `<div class="day"><div class="day-head"><span>${esc(dayLabel(d))}</span><span class="num">${net ? money(net, 'ARS', true) : ''}</span></div>
        <div class="group">${ms.map(rowHtml).join('')}</div></div>`;
    }
    list.innerHTML = html;
    $$('.row', list).forEach((r) => (r.onclick = () => openEditor(db.movs.find((m) => m.id === r.dataset.id))));
  }

  function renderMovs() {
    renderMonthSwitch(); renderSummary(); renderBackupBanner(); renderList();
    $$('#type-filter button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === ui.type)));
  }

  // ---------- Render: presupuesto (diagnóstico, semáforo, presupuesto, 50/30/20, hormiga) ----------
  const PLAN_ROWS = [
    ['ingresos', 'Ingresos estimados', (d) => d.I, true],
    ['fijos', 'Gastos fijos', (d) => d.fijos],
    ['variables', 'Gastos variables', (d) => d.variables],
    ['imprevistos', 'Imprevistos', (d) => d.imprevistos],
    ['ahorro', 'Ahorro programado', (d) => d.A, true],
    ['deudas', 'Pago de deudas', (d) => d.D]
  ];
  const planOf = () => S().plan || null;
  const planSaldo = (p) => (+p.ingresos || 0) - (+p.fijos || 0) - (+p.variables || 0) - (+p.imprevistos || 0) - (+p.ahorro || 0) - (+p.deudas || 0);

  function renderStats() {
    renderMonthSwitch();
    const el = $('#stats');
    const d = diagnose(ui.month);
    const sem = SEM[d.level];
    const plan = planOf();
    const groups = { rojo: 'Requiere atención urgente', amarillo: 'Necesita cambios', verde: 'Funciona bien' };

    let html = `<div class="card semaforo" data-level="${d.level}">
        <div class="sem-lights" aria-hidden="true"><i class="r"></i><i class="y"></i><i class="g"></i></div>
        <div class="sem-text"><div class="caption">Semáforo financiero de ${esc(monthName(ui.month).split(' ')[0])}</div>
          <div class="sem-title">${sem.label}</div><div class="sem-sub">${sem.text}</div></div>
      </div>`;
    if (d.reasons.length) {
      html += `<div class="card sem-reasons">${['rojo', 'amarillo', 'verde'].filter((l) => d.reasons.some((r) => r[0] === l)).map((l) => `
        <div class="sem-group"><p class="sem-h">${groups[l]}</p>${d.reasons.filter((r) => r[0] === l).map((r) => `<div class="sem-reason"><span class="sem-dot" data-level="${l}"></span><span>${esc(r[1])}</span></div>`).join('')}</div>`).join('')}</div>
        <p class="footnote">El semáforo no mide cuánto ganás, sino cómo usás tu dinero.</p>`;
    }

    // Presupuesto del mes: lo estimado contra lo real
    html += `<h2 class="section-title">Presupuesto del mes</h2>`;
    if (!plan) {
      html += `<div class="card cta-card"><p><strong>“Presupuestar es decidir antes de gastar.”</strong> Anotá cuánto esperás cobrar y cuánto pensás destinar a gastos fijos, variables, ahorro y deudas. Después la app lo compara con lo que realmente pasó.</p>
        <button class="btn" id="plan-edit">Armar mi presupuesto</button></div>`;
    } else {
      html += `<div class="card budget-table">${PLAN_ROWS.map(([k, label, real, good]) => {
        const p = +plan[k] || 0, r = real(d);
        const ratio = p ? r / p : 0;
        const state = !p ? '' : good ? (ratio >= 1 ? 'ok' : '') : (ratio > 1 ? 'over' : ratio > 0.85 ? 'near' : '');
        return `<div class="bt-row ${state}"><div class="bt-top"><span>${label}</span><span class="num"><strong>${money(Math.round(r))}</strong><small>de ${money(p)}</small></span></div>
          <div class="bar"><i style="width:${Math.min(100, ratio * 100)}%"></i></div></div>`;
      }).join('')}
        <div class="bt-total"><span>Saldo final</span><span class="num"><strong class="${d.saldo < 0 ? 'neg' : ''}">${money(Math.round(d.saldo))}</strong> <small>estimado ${money(planSaldo(plan))}</small></span></div>
      </div>
      <button class="btn tinted" id="plan-edit">Editar presupuesto</button>
      <p class="footnote">“Un presupuesto no nos dice que no podemos gastar; muestra cuánto podemos gastar sin poner en riesgo nuestros objetivos.”</p>`;
    }

    // Método 50/30/20
    const parts = [
      ['Necesidades', d.necesidades, 50, 'var(--accent)', 'Vivienda, alimentación, servicios, transporte, salud'],
      ['Deseos y estilo de vida', d.deseos, 30, 'var(--warn-fill)', 'Salidas, ropa, entretenimiento, gastos hormiga'],
      ['Ahorro y deudas', d.A + d.D, 20, 'var(--income-fill)', 'Fondo de emergencia, metas, cuotas y préstamos']
    ];
    html += `<h2 class="section-title">Método 50/30/20</h2><div class="card rule">${d.I ? parts.map(([n, v, target, color, hint]) => {
      const pc = (v / d.I) * 100;
      return `<div class="rule-row"><div class="bt-top"><span>${n}</span><span class="num"><strong>${Math.round(pc)}%</strong> <small>guía ${target}%</small></span></div>
        <div class="rule-bar"><i style="width:${Math.min(100, pc)}%;background:${color}"></i><b style="left:${target}%" title="Guía ${target}%"></b></div>
        <div class="rule-hint">${hint} · ${money(Math.round(v))}</div></div>`;
    }).join('') : '<p class="footnote" style="margin:0">Cargá tus ingresos del mes para ver cómo se reparte tu dinero.</p>'}</div>
      <p class="footnote">No es una regla obligatoria: es una guía para comparar tu reparto real con uno equilibrado.</p>`;

    // Gastos hormiga
    const hm = d.hormigaMovs;
    const top = Object.entries(hm.reduce((o, m) => { const k = m.description || m.category; o[k] = (o[k] || 0) + m.amount; return o; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3);
    html += `<h2 class="section-title">Gastos hormiga</h2><div class="card hormiga">${hm.length ? `
        <div class="h-big num">${money(Math.round(d.hormiga))}</div>
        <div class="h-sub">${hm.length} pequeño${hm.length === 1 ? '' : 's'} gasto${hm.length === 1 ? '' : 's'} este mes${d.G ? ` · ${P(d.hormiga / d.G)} de tus gastos` : ''}</div>
        <div class="h-year">Si se repite todos los meses, en un año son <strong class="num">${money(Math.round(d.hormiga * 12))}</strong>.</div>
        ${top.length ? `<div class="h-top">${top.map(([n, v]) => `<div><span>${esc(n)}</span><span class="num">${money(Math.round(v))}</span></div>`).join('')}</div>` : ''}`
      : '<p class="footnote" style="margin:0">Sin gastos hormiga registrados este mes: snacks, golosinas, delivery, suscripciones y compras chiquitas.</p>'}</div>`;

    // Radiografía de los últimos 7 días
    const from = isoDate(new Date(Date.now() - 6 * 864e5));
    const week = db.movs.filter((m) => m.currency === 'ARS' && m.date >= from && m.date <= todayIso());
    const wt = totals(week).ARS;
    const wh = sum(week.filter((m) => m.type === 'gasto' && natOf(m) === 'hormiga'));
    html += `<h2 class="section-title">Radiografía de la semana</h2><div class="stats">
        <div class="stat"><span class="k">Entró</span><span class="v num">${money(Math.round(wt.in))}</span><span class="d">últimos 7 días</span></div>
        <div class="stat"><span class="k">Salió</span><span class="v num">${money(Math.round(wt.out))}</span><span class="d">gastos, ahorro y deudas</span></div>
        <div class="stat"><span class="k">Hormiga</span><span class="v num">${money(Math.round(wh))}</span><span class="d">pequeños consumos</span></div>
        <div class="stat"><span class="k">Movimientos</span><span class="v num">${week.length}</span><span class="d">registrados</span></div>
      </div>
      <p class="footnote">Registrá absolutamente todo durante una semana: es la mejor forma de descubrir en qué se va el dinero.</p>`;

    // Gastos por categoría y por regularidad
    const ms = movsOfMonth(ui.month).filter((m) => m.currency === 'ARS');
    const block = (type, title) => {
      const items = ms.filter((m) => m.type === type);
      const total = sum(items);
      if (!total) return '';
      const by = {};
      items.forEach((m) => (by[m.category] = (by[m.category] || 0) + m.amount));
      const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
      const max = rows[0][1];
      return `<h2 class="section-title">${title}</h2><div class="card catbars">${rows.map(([name, v]) => {
        const c = catInfo(type, name);
        return `<button class="catbar" data-cat="${esc(name)}" data-type="${type}">
          <span class="n"><span class="dot" style="background:${esc(c.color)}"></span><span>${esc(name)}</span></span>
          <span class="v num">${money(Math.round(v))}<small>${Math.round((v / total) * 100)}%</small></span>
          <span class="track"><i style="width:${(v / max) * 100}%;background:${esc(c.color)}"></i></span></button>`;
      }).join('')}</div>`;
    };
    html += block('gasto', 'Gastos por categoría');
    html += block('ingreso', 'Ingresos por fuente');
    html += `<h2 class="section-title">Últimos 6 meses</h2><div class="card chart">${barChart()}
      <div class="legend"><span><i style="background:var(--income-fill)"></i>Ingresos</span><span><i style="background:var(--expense-fill)"></i>Salidas</span></div></div>
      <p class="footnote">Salidas = gastos + ahorro + pago de deudas. Montos en pesos.</p>`;

    el.innerHTML = html;
    $('#plan-edit').onclick = editPlan;
    $$('.catbar', el).forEach((b) => (b.onclick = () => { ui.cat = b.dataset.cat; ui.type = b.dataset.type; ui.q = ''; $('#q').value = ''; go('movs'); }));
  }

  function editPlan() {
    const p = Object.assign({ ingresos: 0, fijos: 0, variables: 0, imprevistos: 0, ahorro: 0, deudas: 0 }, planOf() || {});
    const debtCuotas = (S().deudas || []).reduce((s, x) => s + (+x.cuota || 0), 0);
    openSheet({
      title: 'Presupuesto mensual', right: 'Guardar',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Primero los ingresos estimados, después lo que ya sabés que vas a gastar. Lo que queda es tu saldo.</p>
          <div class="field-group">${PLAN_ROWS.map(([k, label]) => `<div class="field"><label for="pl-${k}">${label}</label><input id="pl-${k}" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+p[k] || ''))}"></div>`).join('')}</div>
          <div class="said" style="font-size:15px"><span>Saldo estimado</span><strong class="num" id="pl-saldo" style="font-size:22px;color:var(--label)"></strong></div>
          <button class="btn tinted" id="pl-503020">Sugerir con el método 50/30/20</button>
          <p class="footnote" style="margin-top:-6px">Usa tus ingresos estimados: 50% necesidades (fijos y parte de variables), 30% deseos, 20% ahorro y deudas${debtCuotas ? ' (con tus cuotas de deudas)' : ''}.</p>`;
        const read = () => { const o = {}; PLAN_ROWS.forEach(([k]) => (o[k] = parseAmount($('#pl-' + k).value) || 0)); return o; };
        const upd = () => { const s = planSaldo(read()); const el = $('#pl-saldo'); el.textContent = money(Math.round(s)); el.style.color = s < 0 ? 'var(--expense)' : 'var(--label)'; };
        PLAN_ROWS.forEach(([k]) => ($('#pl-' + k).oninput = upd));
        upd();
        $('#pl-503020').onclick = () => {
          const I = parseAmount($('#pl-ingresos').value) || 0;
          if (!I) { toast('Primero poné tus ingresos estimados'); $('#pl-ingresos').focus(); return; }
          const deudas = Math.min(debtCuotas, I * 0.20);
          const set = (k, v) => ($('#pl-' + k).value = amountInputValue(Math.round(v)));
          set('fijos', I * 0.35); set('variables', I * 0.40); set('imprevistos', I * 0.05);
          set('deudas', deudas); set('ahorro', I * 0.20 - deudas);
          upd();
        };
      },
      onRight() {
        const o = {}; PLAN_ROWS.forEach(([k]) => (o[k] = parseAmount($('#pl-' + k).value) || 0));
        if (!o.ingresos) { toast('Poné al menos tus ingresos estimados'); return; }
        S().plan = o; save(); closeSheet(); renderAll(); toast('Presupuesto guardado');
      }
    });
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function shortMoney(v) {
    if (v >= 1e6) return '$' + (v / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M';
    if (v >= 1e3) return '$' + (v / 1e3).toLocaleString('es-AR', { maximumFractionDigits: 0 }) + ' mil';
    return '$' + v;
  }
  function barChart() {
    const months = [];
    for (let i = 5; i >= 0; i--) months.push(shiftMonth(ui.month, -i));
    const data = months.map((ym) => ({ ym, ...totals(movsOfMonth(ym).filter((m) => m.currency === 'ARS')).ARS }));
    const max = niceMax(Math.max(...data.map((d) => Math.max(d.in, d.out))));
    const W = 340, H = 180, L = 52, B = 22, T = 8, R = 4;
    const ch = H - B - T, cw = (W - L - R) / months.length;
    const bw = Math.min(16, cw / 3);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos 6 meses">`;
    [0, 0.5, 1].forEach((f) => {
      const y = T + ch - ch * f;
      s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--separator)" stroke-width="${f === 0 ? 1 : 0.5}"/>`;
      s += `<text x="${L - 6}" y="${y + 4}" text-anchor="end">${esc(shortMoney(max * f))}</text>`;
    });
    data.forEach((d, i) => {
      const cx = L + cw * i + cw / 2;
      const hi = (d.in / max) * ch, ho = (d.out / max) * ch;
      if (hi > 0) s += `<rect x="${cx - bw - 1}" y="${T + ch - hi}" width="${bw}" height="${hi}" rx="3" fill="var(--income-fill)"><title>${esc(monthName(d.ym))} · ingresos ${esc(money(d.in))}</title></rect>`;
      if (ho > 0) s += `<rect x="${cx + 1}" y="${T + ch - ho}" width="${bw}" height="${ho}" rx="3" fill="var(--expense-fill)"><title>${esc(monthName(d.ym))} · gastos ${esc(money(d.out))}</title></rect>`;
      s += `<text x="${cx}" y="${H - 6}" text-anchor="middle" style="${d.ym === ui.month ? 'font-weight:600;fill:var(--label)' : ''}">${esc(monthShort(d.ym))}</text>`;
    });
    return s + '</svg>';
  }

  // ---------- Render: plan (metas = plan de acción, deudas, cuentas) ----------
  const monthsBetween = (fromIso, toIso) => {
    const a = parseIso(fromIso), b = parseIso(toIso);
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1);
  };
  function metaProgress(meta) {
    const ahorrado = (+meta.inicial || 0) + sum(db.movs.filter((m) => m.type === 'ahorro' && m.metaId === meta.id && m.currency === 'ARS'));
    const falta = Math.max(0, (+meta.monto || 0) - ahorrado);
    const pct = meta.monto ? Math.min(1, ahorrado / meta.monto) : 0;
    let meses = null, porMes = null, plazoTxt = 'Sin plazo';
    if (meta.plazo) {
      meses = Math.max(0, monthsBetween(todayIso(), meta.plazo));
      const vencida = meta.plazo < todayIso();
      plazoTxt = vencida ? 'Venció el plazo' : meses < 1 ? 'Vence este mes' : `Faltan ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
      porMes = falta / Math.max(1, meses + (vencida ? 0 : 1));
    }
    return { ahorrado, falta, pct, meses, porMes, plazoTxt };
  }
  function debtProgress(dd) {
    const pagado = (+dd.pagadoInicial || 0) + sum(db.movs.filter((m) => m.type === 'deuda' && m.deudaId === dd.id && m.currency === 'ARS'));
    const restante = Math.max(0, (+dd.total || 0) - pagado);
    const cuotasRest = dd.cuota > 0 ? Math.ceil(restante / dd.cuota) : null;
    return { pagado, restante, cuotasRest, pct: dd.total ? Math.min(1, pagado / dd.total) : 0 };
  }

  function renderAccounts() {
    const el = $('#accounts');
    const st = S();
    st.metas = st.metas || []; st.deudas = st.deudas || [];
    const d = diagnose(monthOf(todayIso()));

    // Metas
    let html = `<h2 class="section-title" style="margin-top:8px">Mis metas</h2>`;
    html += st.metas.length ? `<div class="metas">${st.metas.map((mt) => {
      const pr = metaProgress(mt);
      return `<button class="card meta" data-meta="${esc(mt.id)}">
        <div class="bt-top"><span class="meta-name">${esc(mt.nombre)}</span><span class="num"><strong>${Math.round(pr.pct * 100)}%</strong></span></div>
        <div class="bar ${pr.pct >= 1 ? 'done' : ''}"><i style="width:${pr.pct * 100}%"></i></div>
        <div class="meta-sub num">${money(Math.round(pr.ahorrado))} de ${money(+mt.monto || 0)} · ${pr.plazoTxt}</div>
        ${pr.falta <= 0 ? '<div class="meta-tip ok">¡Meta cumplida!</div>' : pr.porMes ? `<div class="meta-tip">Para llegar: <strong class="num">${money(Math.round(pr.porMes))}</strong> por mes</div>` : ''}
      </button>`;
    }).join('')}</div>` : `<div class="card cta-card"><p><strong>¿Qué querés lograr?</strong> Un objetivo claro, con monto y plazo. Por ejemplo: “Ahorrar $200.000 para una notebook en 3 meses”.</p></div>`;
    html += `<button class="btn tinted" id="meta-new">Nueva meta</button>
      <p class="footnote">Cuando ahorres para una meta, decilo: “ahorré 20 mil para la notebook”. La app lo suma a su progreso.</p>`;

    // Deudas
    const pd = d.I ? d.D / d.I : 0;
    const debtLevel = !d.D ? '' : pd > 0.35 ? 'rojo' : pd > 0.20 ? 'amarillo' : 'verde';
    html += `<h2 class="section-title">Mis deudas</h2>`;
    if (d.D) html += `<div class="card sem-pill static" data-level="${debtLevel}"><span class="sem-dot" data-level="${debtLevel}"></span><span class="grow">Este mes destinás <strong>${d.I ? P(pd) : money(Math.round(d.D))}</strong>${d.I ? ' de tus ingresos' : ''} a pagar deudas.</span></div>`;
    html += st.deudas.length ? `<div class="metas">${st.deudas.map((dd) => {
      const pr = debtProgress(dd);
      return `<button class="card meta debt-card" data-deuda="${esc(dd.id)}">
        <div class="bt-top"><span class="meta-name">${esc(dd.acreedor)}${dd.descripcion ? ` <small>· ${esc(dd.descripcion)}</small>` : ''}</span><span class="chip">${esc(DEBT_LABEL[dd.tipo] || 'Deuda')}</span></div>
        <div class="bar debt ${pr.pct >= 1 ? 'done' : ''}"><i style="width:${pr.pct * 100}%"></i></div>
        <div class="meta-sub num">Debés ${money(Math.round(pr.restante))} de ${money(+dd.total || 0)}${dd.tasa ? ` · ${dd.tasa}% anual` : ''}</div>
        ${pr.restante <= 0 ? '<div class="meta-tip ok">¡Deuda cancelada!</div>' : pr.cuotasRest ? `<div class="meta-tip">Cuota ${money(+dd.cuota)} · terminás en <strong>${pr.cuotasRest} ${pr.cuotasRest === 1 ? 'mes' : 'meses'}</strong></div>` : '<div class="meta-tip">Sin cuota definida: armá un plan para terminar de pagarla.</div>'}
      </button>`;
    }).join('')}</div>` : `<div class="card cta-card"><p>Tener deudas no siempre es malo: lo importante es que estén bajo control. Anotá a quién le debés, cuánto y cuánto pagás por mes.</p></div>`;
    html += `<button class="btn tinted" id="deuda-new">Agregar deuda</button>
      <p class="footnote">“Endeudarse sin planificación es hipotecar decisiones futuras.”</p>`;

    // Cuentas (saldo por medio de pago)
    const ym = monthOf(todayIso());
    const rows = st.methods.map((name) => {
      const all = db.movs.filter((m) => m.method === name && m.currency === 'ARS');
      const net = all.reduce((s, m) => s + signed(m), 0);
      const month = all.filter((m) => monthOf(m.date) === ym).reduce((s, m) => s + signed(m), 0);
      const init = +st.initialBalances[name] || 0;
      return { name, bal: init + net, month, init };
    });
    const total = rows.reduce((s, r) => s + r.bal, 0);
    const usd = db.movs.filter((m) => m.currency === 'USD').reduce((s, m) => s + signed(m), 0) + (+st.initialBalances.__USD || 0);
    const chev = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg>';
    html += `<h2 class="section-title">Mis cuentas</h2>
      <div class="list"><div class="item"><span class="grow">Total en pesos</span><span class="val num" style="color:${total < 0 ? 'var(--expense)' : 'var(--label)'};font-weight:600">${money(Math.round(total))}</span></div>
      ${rows.map((r) => `<button class="item" data-acc="${esc(r.name)}"><span class="grow">${esc(r.name)}<span class="sub num">Este mes ${money(Math.round(r.month), 'ARS', true)}${r.init ? ' · inicial ' + money(r.init) : ''}</span></span>
        <span class="val num" style="color:${r.bal < 0 ? 'var(--expense)' : 'var(--label)'}">${money(Math.round(r.bal))}</span>${chev}</button>`).join('')}
        <button class="item" data-acc="__USD"><span class="grow">Dólares<span class="sub">Todos los movimientos en USD</span></span><span class="val num">${money(usd, 'USD')}</span>${chev}</button></div>
      <p class="footnote">Saldo = saldo inicial + ingresos − gastos, ahorro y pagos hechos con ese medio. Tocá una cuenta para fijar con cuánto arrancaste.</p>`;

    el.innerHTML = html;
    $('#meta-new').onclick = () => editMeta(null);
    $('#deuda-new').onclick = () => editDeuda(null);
    $$('[data-meta]', el).forEach((b) => (b.onclick = () => editMeta(st.metas.find((x) => x.id === b.dataset.meta))));
    $$('[data-deuda]', el).forEach((b) => (b.onclick = () => editDeuda(st.deudas.find((x) => x.id === b.dataset.deuda))));
    $$('[data-acc]', el).forEach((b) => (b.onclick = () => editInitial(b.dataset.acc)));
  }

  function editMeta(meta) {
    const st = S();
    const m = meta ? clone(meta) : { nombre: '', monto: 0, plazo: '', inicial: 0, acciones: '', recursos: '' };
    openSheet({
      title: meta ? 'Meta' : 'Nueva meta', right: 'Guardar',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Un objetivo concreto, con monto y plazo, y las acciones para lograrlo.</p>
          <div class="field-group">
            <div class="field"><label for="mt-nombre">Objetivo</label><input id="mt-nombre" value="${esc(m.nombre)}" placeholder="Ej: Notebook" autocomplete="off"></div>
            <div class="field"><label for="mt-monto">Monto</label><input id="mt-monto" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+m.monto || ''))}"></div>
            <div class="field"><label for="mt-plazo">Plazo</label><input id="mt-plazo" type="date" value="${esc(m.plazo || '')}" min="${todayIso()}"></div>
            <div class="field"><label for="mt-ini">Ya tengo</label><input id="mt-ini" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+m.inicial || ''))}"></div>
          </div>
          <p class="label-sm">Acciones</p>
          <div class="text-entry"><textarea id="mt-acc" placeholder="Ej: ahorrar una parte del sueldo cada mes, evitar compras impulsivas, reducir delivery">${esc(m.acciones || '')}</textarea></div>
          <p class="label-sm">Recursos</p>
          <div class="text-entry"><textarea id="mt-rec" style="min-height:60px" placeholder="Ej: caja de ahorro aparte, esta app, una planilla">${esc(m.recursos || '')}</textarea></div>
          ${meta ? `<div class="said"><span>Progreso</span><strong class="num" style="color:var(--label)">${money(Math.round(metaProgress(meta).ahorrado))} ahorrados</strong></div><button class="btn danger" id="mt-del">Eliminar meta</button>` : ''}
          <p class="footnote">Revisá el plan todos los meses y valorá los avances, aunque sean pequeños.</p>`;
        const del = $('#mt-del');
        if (del) del.onclick = () => {
          if (!del.classList.contains('armed')) { del.classList.add('armed'); del.textContent = 'Tocá de nuevo para eliminar'; return; }
          st.metas = st.metas.filter((x) => x.id !== meta.id); save(); closeSheet(); renderAll(); toast('Meta eliminada');
        };
        if (!meta) setTimeout(() => $('#mt-nombre') && $('#mt-nombre').focus(), 420);
      },
      onRight() {
        const nombre = $('#mt-nombre').value.trim(), monto = parseAmount($('#mt-monto').value);
        if (!nombre) { toast('Escribí el objetivo'); $('#mt-nombre').focus(); return; }
        if (!(monto > 0)) { toast('Poné cuánto necesitás'); $('#mt-monto').focus(); return; }
        Object.assign(m, { nombre, monto, plazo: $('#mt-plazo').value || '', inicial: parseAmount($('#mt-ini').value) || 0, acciones: $('#mt-acc').value.trim(), recursos: $('#mt-rec').value.trim() });
        if (meta) Object.assign(st.metas.find((x) => x.id === meta.id), m);
        else st.metas.push(Object.assign(m, { id: uid(), creada: todayIso() }));
        save(); closeSheet(); renderAll(); toast('Meta guardada');
      }
    });
  }

  function editDeuda(dd) {
    const st = S();
    const x = dd ? clone(dd) : { acreedor: '', descripcion: '', tipo: 'consumo', total: 0, cuota: 0, tasa: '', pagadoInicial: 0 };
    openSheet({
      title: dd ? 'Deuda' : 'Nueva deuda', right: 'Guardar',
      render(body) {
        body.innerHTML = `<div class="field-group">
            <div class="field"><label for="dd-acr">¿A quién?</label><input id="dd-acr" value="${esc(x.acreedor)}" placeholder="Ej: Banco, tarjeta Visa, mi hermano" autocomplete="off"></div>
            <div class="field"><label for="dd-desc">¿Por qué?</label><input id="dd-desc" value="${esc(x.descripcion || '')}" placeholder="Ej: heladera en cuotas" autocomplete="off"></div>
            <div class="field"><label for="dd-tipo">Tipo</label><select id="dd-tipo">${Object.entries(DEBT_LABEL).map(([k, v]) => `<option value="${k}" ${x.tipo === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
            <div class="field"><label for="dd-total">Total que debés</label><input id="dd-total" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+x.total || ''))}"></div>
            <div class="field"><label for="dd-cuota">Cuota por mes</label><input id="dd-cuota" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+x.cuota || ''))}"></div>
            <div class="field"><label for="dd-tasa">Interés anual %</label><input id="dd-tasa" inputmode="decimal" placeholder="—" value="${esc(x.tasa || '')}"></div>
            <div class="field"><label for="dd-pag">Ya pagado</label><input id="dd-pag" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+x.pagadoInicial || ''))}"></div>
          </div>
          <p class="footnote"><strong>Productiva:</strong> genera beneficios futuros (estudiar, herramientas de trabajo). <strong>De consumo:</strong> bienes o servicios, como un electrodoméstico en cuotas. <strong>Por urgencia:</strong> un imprevisto que obligó a pedir prestado.</p>
          ${dd ? '<button class="btn danger" id="dd-del">Eliminar deuda</button>' : ''}`;
        const del = $('#dd-del');
        if (del) del.onclick = () => {
          if (!del.classList.contains('armed')) { del.classList.add('armed'); del.textContent = 'Tocá de nuevo para eliminar'; return; }
          st.deudas = st.deudas.filter((y) => y.id !== dd.id); save(); closeSheet(); renderAll(); toast('Deuda eliminada');
        };
        if (!dd) setTimeout(() => $('#dd-acr') && $('#dd-acr').focus(), 420);
      },
      onRight() {
        const acreedor = $('#dd-acr').value.trim(), total = parseAmount($('#dd-total').value);
        if (!acreedor) { toast('Escribí a quién le debés'); $('#dd-acr').focus(); return; }
        if (!(total > 0)) { toast('Poné cuánto debés en total'); $('#dd-total').focus(); return; }
        Object.assign(x, { acreedor, total, descripcion: $('#dd-desc').value.trim(), tipo: $('#dd-tipo').value,
          cuota: parseAmount($('#dd-cuota').value) || 0, tasa: $('#dd-tasa').value.trim(), pagadoInicial: parseAmount($('#dd-pag').value) || 0 });
        if (dd) Object.assign(st.deudas.find((y) => y.id === dd.id), x);
        else st.deudas.push(Object.assign(x, { id: uid() }));
        save(); closeSheet(); renderAll(); toast('Deuda guardada');
      }
    });
  }

  function editInitial(name) {
    const isUsd = name === '__USD';
    openSheet({
      title: isUsd ? 'Dólares' : name, right: 'Guardar',
      render(body) {
        body.innerHTML = `<p class="footnote">¿Cuánto tenías en ${isUsd ? 'dólares' : esc(name)} antes de empezar a registrar? Los movimientos se suman a este número.</p>
          <div class="field-group"><div class="field"><label for="init-amt">Saldo inicial</label><input id="init-amt" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+S().initialBalances[name] || 0))}"></div></div>
          <label class="field-group field" style="justify-content:space-between"><span>Es negativo (deuda)</span><span class="switch"><input type="checkbox" id="init-neg" ${(+S().initialBalances[name] || 0) < 0 ? 'checked' : ''}><span></span></span></label>`;
      },
      onRight() {
        let v = parseAmount($('#init-amt').value) || 0;
        v = Math.abs(v) * ($('#init-neg').checked ? -1 : 1);
        S().initialBalances[name] = v; save(); closeSheet(); renderAccounts(); toast('Saldo inicial actualizado');
      }
    });
  }

  // ---------- Render: ajustes ----------
  function renderSettings() {
    const st = S();
    const el = $('#settings');
    const last = st.lastBackup ? new Date(st.lastBackup).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'nunca';
    const sr = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    el.innerHTML = `
      <h2 class="section-title">Voz</h2>
      <div class="list">
        <label class="item"><span class="grow">Acento del reconocimiento</span>
          <select id="set-lang">${[['es-AR', 'Argentina'], ['es-UY', 'Uruguay'], ['es-CL', 'Chile'], ['es-MX', 'México'], ['es-ES', 'España'], ['es-US', 'EE. UU.'], ['es-CO', 'Colombia']].map(([v, n]) => `<option value="${v}" ${st.lang === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="item"><span class="grow">Guardar sin revisar<span class="sub">Si la app entendió todo bien, guarda directo</span></span><span class="switch"><input type="checkbox" id="set-auto" ${st.autoSave ? 'checked' : ''}><span></span></span></label>
        <button class="item link" id="set-try">Probar escribiendo una frase</button>
      </div>
      <p class="footnote">${sr ? 'El reconocimiento de voz lo hace tu navegador y necesita conexión a internet.' : 'Este navegador no reconoce voz directamente. Usá el micrófono del teclado para dictar: la app interpreta el texto igual. En iPhone funciona en Safari y en Android en Chrome.'}</p>

      <h2 class="section-title">Preferencias</h2>
      <div class="list">
        <label class="item"><span class="grow">Tu nombre<span class="sub">Para saber quién cargó cada movimiento</span></span>
          <input type="text" class="inline" id="set-quien" placeholder="Ej: Mamá" value="${esc(st.quien || '')}" autocomplete="off"></label>
        <label class="item"><span class="grow">Medio por defecto<span class="sub">Si no decís con qué pagaste</span></span>
          <select id="set-method">${st.methods.map((m) => `<option ${st.defaultMethod === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
        <label class="item"><span class="grow">Apariencia</span>
          <select id="set-theme"><option value="auto" ${st.theme === 'auto' ? 'selected' : ''}>Automática</option><option value="light" ${st.theme === 'light' ? 'selected' : ''}>Clara</option><option value="dark" ${st.theme === 'dark' ? 'selected' : ''}>Oscura</option></select></label>
        <div class="item stack"><span>Vidrio<span class="sub">Más transparente o más fácil de leer</span></span>
          <label class="range-row"><span>Transparente</span><input type="range" id="set-glass" min="0" max="1" step="0.05" value="${+st.glass}" aria-label="Transparencia del vidrio"><span>Opaco</span></label></div>
        <label class="item"><span class="grow">Letra grande<span class="sub">Agranda textos y botones</span></span><span class="switch"><input type="checkbox" id="set-big" ${st.bigText ? 'checked' : ''}><span></span></span></label>
      </div>

      <h2 class="section-title">Cómo se organiza tu dinero</h2>
      <div class="list"><button class="item" id="set-guide"><span class="grow">Método 50/30/20<span class="sub">50% necesidades, 30% deseos y 20% ahorro y deudas. Así clasifica la app cada gasto y arma el semáforo.</span></span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button></div>

      <h2 class="section-title">Categorías y medios</h2>
      <div class="list">
        <button class="item" id="set-cat-g"><span class="grow">Categorías de gastos</span><span class="val">${st.categories.gasto.length}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
        <button class="item" id="set-cat-i"><span class="grow">Fuentes de ingreso</span><span class="val">${st.categories.ingreso.length}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
        <button class="item" id="set-cat-a"><span class="grow">Tipos de ahorro</span><span class="val">${st.categories.ahorro.length}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
        <button class="item" id="set-cat-d"><span class="grow">Tipos de deuda</span><span class="val">${st.categories.deuda.length}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
        <button class="item" id="set-methods"><span class="grow">Medios de pago</span><span class="val">${st.methods.length}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
      </div>
      <p class="footnote">Cada categoría tiene palabras clave. Si decís una de esas palabras, el movimiento cae en esa categoría.</p>

      ${driveSettingsHtml()}

      <h2 class="section-title">Tus datos</h2>
      <div class="list">
        <button class="item link" id="set-export-json">Guardar copia en el teléfono</button>
        <button class="item link" id="set-export-csv">Exportar a planilla (CSV)</button>
        <button class="item link" id="set-import">Importar copia o CSV</button>
        <button class="item danger" id="set-wipe">Borrar todos los datos</button>
      </div>
      <p class="footnote">${db.movs.length} movimientos guardados sólo en este dispositivo y navegador. Última copia: ${esc(last)}. Si borrás los datos del navegador o cambiás de teléfono, los recuperás importando una copia.</p>
      <h2 class="section-title">Versión</h2>
      <div class="list"><div class="item"><span class="grow">Mis Finanzas ML<span class="sub" id="set-ver">Versión ${APP_VERSION}</span></span>
        <button class="btn tinted small" id="set-update">Buscar actualización</button></div></div>
      <p class="footnote" style="text-align:center;margin-top:24px">© 2026 Felipe Manrique. Todos los derechos reservados.<br><a href="privacidad.html" target="_blank" rel="noopener" style="color:var(--accent)">Privacidad y condiciones</a></p>`;

    $('#set-lang').onchange = (e) => { st.lang = e.target.value; save(); };
    $('#set-auto').onchange = (e) => { st.autoSave = e.target.checked; save(); };
    $('#set-method').onchange = (e) => { st.defaultMethod = e.target.value; save(); };
    $('#set-quien').onchange = (e) => { st.quien = e.target.value.trim(); save(); };
    $('#set-theme').onchange = (e) => { st.theme = e.target.value; save(); applyTheme(); };
    $('#set-glass').oninput = (e) => { st.glass = +e.target.value; applyTheme(); };
    $('#set-glass').onchange = () => save();
    $('#set-big').onchange = (e) => { st.bigText = e.target.checked; save(); applyTheme(); };
    $('#set-try').onclick = () => openVoice({ textMode: true });
    $('#set-cat-g').onclick = () => manageCategories('gasto');
    $('#set-cat-i').onclick = () => manageCategories('ingreso');
    $('#set-cat-a').onclick = () => manageCategories('ahorro');
    $('#set-cat-d').onclick = () => manageCategories('deuda');
    $('#set-methods').onclick = manageMethods;
    $('#set-export-json').onclick = exportJSON;
    $('#set-export-csv').onclick = exportCSV;
    $('#set-import').onclick = () => $('#import-file').click();
    bindDriveSettings();
    $('#set-wipe').onclick = wipeAll;
    $('#set-update').onclick = (e) => checkUpdate(e.currentTarget);
    $('#set-guide').onclick = openGuide;
  }

  function applyTheme() {
    const t = S().theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const root = document.documentElement.style;
    root.setProperty('--glass-tint', String(Math.min(1, Math.max(0, S().glass ?? 0.35))));
    root.setProperty('--ui-zoom', S().bigText ? '1.15' : '1');
    const meta = document.querySelectorAll('meta[name="theme-color"]');
    meta.forEach((m) => m.setAttribute('content', /dark/.test(m.media) ? '#05070F' : '#EEF3FA'));
  }

  // ---------- Categorías ----------
  function manageCategories(type) {
    const list = S().categories[type];
    openSheet({
      title: { gasto: 'Categorías de gastos', ingreso: 'Fuentes de ingreso', ahorro: 'Tipos de ahorro', deuda: 'Tipos de deuda' }[type], left: 'Listo', right: 'Nueva',
      onLeft() { closeSheet(); renderAll(); },
      onRight() { editCategory(type, null); },
      render(body) {
        body.innerHTML = `<div class="list">${list.map((c, i) => `<button class="item" data-i="${i}"><span class="badge" style="--c:${esc(c.color)};width:30px;height:30px;border-radius:9px;font-size:13px">${esc(c.name.charAt(0))}</span>
          <span class="grow">${esc(c.name)}<span class="sub">${type === 'gasto' ? esc(REG_LABEL[c.reg || 'variable'] + ' · ' + NAT_LABEL[c.nat || 'necesario']) + ' · ' : ''}${c.kw.length ? esc(c.kw.slice(0, 5).join(', ')) + (c.kw.length > 5 ? '…' : '') : 'Sin palabras clave'}</span></span>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>`).join('')}</div>
          <p class="footnote">La última categoría de la lista se usa cuando la app no reconoce ninguna palabra clave.</p>`;
        $$('[data-i]', body).forEach((b) => (b.onclick = () => editCategory(type, +b.dataset.i)));
      }
    });
  }

  function editCategory(type, idx) {
    const list = S().categories[type];
    const c = idx === null ? { name: '', color: '#6155F5', kw: [], reg: 'variable', nat: 'necesario' } : list[idx];
    const usedBy = idx === null ? 0 : db.movs.filter((m) => m.type === type && m.category === c.name).length;
    openSheet({
      title: idx === null ? 'Nueva categoría' : c.name, left: 'Atrás', right: 'Guardar',
      onLeft: () => manageCategories(type),
      render(body) {
        body.innerHTML = `<div class="field-group">
            <div class="field"><label for="c-name">Nombre</label><input id="c-name" value="${esc(c.name)}" placeholder="Ej: Gimnasio" autocomplete="off"></div>
            <div class="field"><label for="c-color">Color</label><input id="c-color" type="color" value="${esc(c.color)}" style="flex:none;width:44px;height:30px;padding:0;border-radius:8px"></div>
            ${type === 'gasto' ? `<div class="field"><label for="c-reg">Tipo de gasto</label><select id="c-reg">${Object.entries(REG_LABEL).map(([k, v]) => `<option value="${k}" ${(c.reg || 'variable') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
            <div class="field"><label for="c-nat">Naturaleza</label><select id="c-nat">${Object.entries(NAT_LABEL).map(([k, v]) => `<option value="${k}" ${(c.nat || 'necesario') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>` : ''}
          </div>
          ${type === 'gasto' ? '<p class="footnote" style="margin-top:-8px">Así se clasifican por defecto los gastos de esta categoría. En cada movimiento se puede cambiar.</p>' : ''}
          <p class="label-sm">Palabras clave</p>
          <div class="text-entry"><textarea id="c-kw" placeholder="Separadas por coma. Ej: gimnasio, gym, pileta">${esc(c.kw.join(', '))}</textarea></div>
          <p class="footnote" style="margin-top:-8px">Si en lo que dictás aparece alguna de estas palabras, el movimiento va a esta categoría.</p>
          ${idx !== null && list.length > 1 ? `<button class="btn danger" id="c-del">Eliminar categoría</button><p class="footnote" style="margin-top:-8px">${usedBy ? `Sus ${usedBy} movimientos pasan a “${esc(list[list.length - 1] === c ? list[list.length - 2].name : list[list.length - 1].name)}”.` : 'No tiene movimientos.'}</p>` : ''}`;
        const del = $('#c-del', body);
        if (del) del.onclick = () => {
          if (!del.classList.contains('armed')) { del.classList.add('armed'); del.textContent = 'Tocá de nuevo para eliminar'; return; }
          const fallback = list[list.length - 1] === c ? list[list.length - 2] : list[list.length - 1];
          db.movs.forEach((m) => { if (m.type === type && m.category === c.name) m.category = fallback.name; });
          list.splice(idx, 1); save(); toast('Categoría eliminada'); manageCategories(type);
        };
      },
      onRight() {
        const name = $('#c-name').value.trim();
        if (!name) { $('#c-name').focus(); toast('Poné un nombre para la categoría'); return; }
        if (list.some((x, i) => i !== idx && x.name.toLowerCase() === name.toLowerCase())) { toast('Ya existe una categoría con ese nombre'); return; }
        const kw = $('#c-kw').value.split(/[,\n;]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
        const color = $('#c-color').value;
        const extra = type === 'gasto' ? { reg: $('#c-reg').value, nat: $('#c-nat').value } : {};
        if (idx === null) list.splice(Math.max(0, list.length - 1), 0, Object.assign({ name, color, kw }, extra));
        else {
          if (c.name !== name) db.movs.forEach((m) => { if (m.type === type && m.category === c.name) m.category = name; });
          Object.assign(c, { name, color, kw }, extra);
        }
        save(); toast('Categoría guardada'); manageCategories(type);
      }
    });
  }

  // ---------- Medios de pago ----------
  function manageMethods() {
    const st = S();
    openSheet({
      title: 'Medios de pago', left: 'Listo', right: '',
      onLeft() { closeSheet(); renderAll(); },
      render(body) {
        const draw = () => {
          body.innerHTML = `<div class="list">${st.methods.map((m, i) => `<div class="item"><input class="grow" style="text-align:left;color:var(--label);max-width:none" data-i="${i}" value="${esc(m)}" aria-label="Nombre del medio">
            ${st.methods.length > 1 ? `<button class="icon-btn" data-del="${i}" aria-label="Eliminar ${esc(m)}" style="width:30px;height:30px;color:var(--expense)">${ICON.close}</button>` : ''}</div>`).join('')}</div>
            <div class="field-group"><div class="field"><input id="new-method" placeholder="Agregar otro (ej: Ualá, Naranja X)" style="text-align:left" autocomplete="off"><button class="link-btn" id="add-method">Agregar</button></div></div>
            <p class="footnote">Si decís el nombre de un medio (por ejemplo “con Ualá”), la app lo elige. Al borrar uno, sus movimientos pasan al medio por defecto.</p>`;
          $$('input[data-i]', body).forEach((inp) => (inp.onchange = () => {
            const i = +inp.dataset.i, old = st.methods[i], nw = inp.value.trim();
            if (!nw || st.methods.some((x, j) => j !== i && x === nw)) { inp.value = old; return; }
            st.methods[i] = nw;
            db.movs.forEach((m) => { if (m.method === old) m.method = nw; });
            if (st.defaultMethod === old) st.defaultMethod = nw;
            if (old in st.initialBalances) { st.initialBalances[nw] = st.initialBalances[old]; delete st.initialBalances[old]; }
            save();
          }));
          $$('[data-del]', body).forEach((b) => (b.onclick = () => {
            if (!b.classList.contains('armed')) { b.classList.add('armed'); b.style.background = 'var(--expense-fill)'; b.style.color = '#fff'; return; }
            const i = +b.dataset.del, old = st.methods[i];
            st.methods.splice(i, 1);
            if (st.defaultMethod === old) st.defaultMethod = st.methods[0];
            db.movs.forEach((m) => { if (m.method === old) m.method = st.defaultMethod; });
            delete st.initialBalances[old];
            save(); draw();
          }));
          const add = () => {
            const v = $('#new-method').value.trim();
            if (!v || st.methods.includes(v)) return;
            st.methods.push(v); save(); draw();
          };
          $('#add-method').onclick = add;
          $('#new-method').onkeydown = (e) => { if (e.key === 'Enter') add(); };
        };
        draw();
      }
    });
  }

  // ---------- Editor de movimiento ----------
  function movFields(m, prefix) {
    const st = S();
    const cats = st.categories[m.type] || [];
    const methods = st.methods.includes(m.method) ? st.methods : st.methods.concat(m.method ? [m.method] : []);
    return `<div class="field"><label for="${prefix}desc">Detalle</label><input id="${prefix}desc" value="${esc(m.description)}" placeholder="Ej: Supermercado" autocomplete="off"></div>
      <div class="field"><label for="${prefix}cat">Categoría</label><select id="${prefix}cat">${cats.map((c) => `<option ${c.name === m.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}${cats.some((c) => c.name === m.category) ? '' : `<option selected>${esc(m.category)}</option>`}</select></div>
      <div class="field"><label for="${prefix}method">Medio</label><select id="${prefix}method">${methods.map((x) => `<option ${x === m.method ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
      <div class="field"><label for="${prefix}date">Fecha</label><input id="${prefix}date" type="date" value="${esc(m.date)}" max="${todayIso()}"></div>
      <div class="field"><label for="${prefix}inst">Cuotas</label><input id="${prefix}inst" inputmode="numeric" placeholder="—" value="${m.installments || ''}"></div>
      ${typeFields(m, prefix)}`;
  }
  // Clasificación del manual: gastos (regularidad + naturaleza), ahorro → meta, pago → deuda.
  function typeFields(m, prefix) {
    const st = S();
    const sel = (id, label, opts, val) => `<div class="field"><label for="${prefix}${id}">${label}</label><select id="${prefix}${id}">${opts.map(([k, v]) => `<option value="${esc(k)}" ${k === val ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>`;
    if (m.type === 'gasto') return sel('reg', 'Tipo de gasto', Object.entries(REG_LABEL), regOf(m)) + sel('nat', 'Naturaleza', Object.entries(NAT_LABEL), natOf(m));
    if (m.type === 'ahorro') return sel('meta', 'Para la meta', [['', 'Ninguna']].concat((st.metas || []).map((x) => [x.id, x.nombre])), m.metaId || '');
    if (m.type === 'deuda') return sel('deuda', 'Deuda', [['', 'Sin asignar']].concat((st.deudas || []).map((x) => [x.id, x.acreedor + (x.descripcion ? ' · ' + x.descripcion : '')])), m.deudaId || '');
    return '';
  }
  const typeButtons = (t) => TYPES.map((k) => `<button data-t="${k}" aria-pressed="${t === k}">${TYPE_LABEL[k]}</button>`).join('');
  function readFields(prefix, root) {
    const v = (id) => $('#' + prefix + id, root).value;
    const opt = (id) => { const el = $('#' + prefix + id, root); return el ? el.value : undefined; };
    const inst = parseInt(v('inst'), 10);
    const out = { description: v('desc').trim(), category: v('cat'), method: v('method'), date: v('date') || todayIso(), installments: inst > 1 ? inst : null };
    if (opt('reg') !== undefined) { out.regularidad = opt('reg'); out.naturaleza = opt('nat'); }
    if (opt('meta') !== undefined) out.metaId = opt('meta') || null;
    if (opt('deuda') !== undefined) out.deudaId = opt('deuda') || null;
    return out;
  }
  function refillCats(select, type, keep) {
    const cats = S().categories[type];
    const guess = cats.find((c) => c.name === keep) ? keep : cats[cats.length - 1].name;
    select.innerHTML = cats.map((c) => `<option ${c.name === guess ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  }

  function openEditor(existing) {
    const st = S();
    const m = existing ? clone(existing) : { type: ui.type !== 'all' ? ui.type : 'gasto', amount: 0, currency: st.defaultCurrency, category: Parser.OTHER[ui.type !== 'all' ? ui.type : 'gasto'], method: st.defaultMethod, date: todayIso(), description: '', installments: null };
    if (!existing && ui.month !== monthOf(todayIso())) m.date = ui.month + '-01';
    openSheet({
      title: existing ? 'Movimiento' : 'Nuevo movimiento', right: 'Guardar',
      render(body) {
        body.innerHTML = `<div class="segmented four" id="e-type">${typeButtons(m.type)}</div>
          <div class="amount-field ${typeClass(m.type)}" id="e-amt-wrap"><button class="cur-btn" id="e-cur" aria-label="Cambiar moneda">${m.currency === 'USD' ? 'US$' : '$'}</button>
            <input id="e-amt" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(m.amount || ''))}" aria-label="Monto" autocomplete="off"></div>
          <div class="field-group" id="e-fields">${movFields(m, 'e-')}</div>
          ${existing && existing.transcript ? `<div class="said"><span>Lo que dijiste</span><q>${esc(existing.transcript)}</q></div>` : ''}
          ${existing ? '<button class="btn tinted" id="e-dup">Duplicar con fecha de hoy</button><button class="btn danger" id="e-del">Eliminar movimiento</button>' : ''}`;
        $$('#e-type button', body).forEach((b) => (b.onclick = () => {
          Object.assign(m, readFields('e-', body));
          m.type = b.dataset.t;
          const cats = st.categories[m.type] || [];
          if (!cats.some((c) => c.name === m.category)) m.category = Parser.detectCategory(Parser.norm(m.description || ''), m.type, st.categories) || Parser.OTHER[m.type];
          delete m.regularidad; delete m.naturaleza;
          $$('#e-type button', body).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          $('#e-amt-wrap').className = 'amount-field ' + typeClass(m.type);
          $('#e-fields').innerHTML = movFields(m, 'e-');
        }));
        $('#e-cur').onclick = () => { m.currency = m.currency === 'USD' ? 'ARS' : 'USD'; $('#e-cur').textContent = m.currency === 'USD' ? 'US$' : '$'; };
        if (!existing) setTimeout(() => $('#e-amt') && $('#e-amt').focus(), 420);
        const del = $('#e-del');
        if (del) del.onclick = () => {
          if (!del.classList.contains('armed')) { del.classList.add('armed'); del.textContent = 'Tocá de nuevo para eliminar'; return; }
          const i = db.movs.findIndex((x) => x.id === existing.id);
          const [removed] = db.movs.splice(i, 1);
          save(); closeSheet(); renderAll();
          toast('Movimiento eliminado', () => { db.movs.push(removed); save(); renderAll(); });
        };
        const dup = $('#e-dup');
        if (dup) dup.onclick = () => {
          const copy = Object.assign(clone(existing), { id: uid(), date: todayIso(), createdAt: Date.now(), source: 'manual', transcript: '' });
          db.movs.push(copy); save(); closeSheet(); ui.month = monthOf(copy.date); renderAll();
          toast('Movimiento duplicado', () => { db.movs = db.movs.filter((x) => x.id !== copy.id); save(); renderAll(); });
        };
      },
      onRight() {
        const amount = parseAmount($('#e-amt').value);
        if (!(amount > 0)) { $('#e-amt').focus(); toast('Ingresá un monto mayor a cero'); return; }
        const f = readFields('e-', $('#sheet-body'));
        const rec = Object.assign(m, f, { amount });
        if (!rec.description) rec.description = rec.category;
        if (existing) {
          const i = db.movs.findIndex((x) => x.id === existing.id);
          db.movs[i] = Object.assign(existing, rec);
        } else {
          Object.assign(rec, { id: uid(), createdAt: Date.now(), source: 'manual', autor: S().quien || '' });
          db.movs.push(rec);
        }
        save(); closeSheet(); ui.month = monthOf(rec.date); renderAll();
        toast(existing ? 'Cambios guardados' : 'Movimiento guardado');
      }
    });
  }

  // ---------- Voz ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;

  function mergeFinal(acc, t) {
    t = t.trim();
    if (!acc) return t;
    const a = Parser.norm(acc), b = Parser.norm(t);
    if (b.startsWith(a)) return t;      // Chrome Android a veces repite el texto acumulado
    if (a.endsWith(b)) return acc;
    return acc + ' ' + t;
  }

  function openVoice(opts = {}) {
    const textMode = opts.textMode || !SR;
    let state = { finalText: '', interim: '', error: null, cancelled: false, listening: false };
    let silenceTimer, capTimer;

    const stopRec = (abort) => { clearTimeout(silenceTimer); clearTimeout(capTimer); if (rec) { try { abort ? rec.abort() : rec.stop(); } catch (e) { /* ya detenido */ } } };

    openSheet({
      title: textMode ? 'Escribí el movimiento' : 'Cargar con la voz', left: 'Cancelar', right: '',
      onLeft() { state.cancelled = true; stopRec(true); closeSheet(); },
      onClose() { state.cancelled = true; stopRec(true); },
      render(body) {
        if (textMode) return renderText(body, opts.note || (!SR ? 'Este navegador no reconoce voz. Tocá el micrófono del teclado para dictar, o escribí.' : ''), opts.text || '');
        body.innerHTML = `<div class="listen">
            <button class="orb" id="orb" aria-label="Empezar o terminar de escuchar">${ICON.mic}</button>
            <div class="status" id="v-status">Preparando el micrófono…</div>
            <div class="transcript" id="v-text" aria-live="polite"></div>
            <div class="hint" id="v-hint">Decí el monto, en qué y con qué pagaste. Ej: “Gasté 12 mil en nafta con débito y 3.500 en un café”.</div>
          </div>
          <div class="btn-row"><button class="btn tinted" id="v-type">Escribir</button><button class="btn" id="v-done">Listo</button></div>`;
        $('#v-type').onclick = () => { state.cancelled = true; stopRec(true); openVoice({ textMode: true, text: (state.finalText + ' ' + state.interim).trim() }); };
        $('#v-done').onclick = () => { if (state.listening) stopRec(false); else finish(); };
        $('#orb').onclick = () => { if (state.listening) stopRec(false); else start(); };
        start();
      }
    });

    function setStatus(s) { const el = $('#v-status'); if (el) el.textContent = s; }
    function draw() {
      const el = $('#v-text'); if (!el) return;
      el.innerHTML = esc(state.finalText) + (state.interim ? ' <span class="interim">' + esc(state.interim) + '</span>' : '');
    }
    function setOrb(live) { const o = $('#orb'); if (o) { o.classList.toggle('live', live); o.classList.toggle('idle', !live); } }

    function start() {
      state.error = null;
      try {
        rec = new SR();
        rec.lang = S().lang || 'es-AR';
        rec.interimResults = true;
        rec.continuous = true;
        rec.maxAlternatives = 1;
      } catch (e) { return renderTextFallback('No pude iniciar el reconocimiento de voz en este navegador.'); }
      rec.onstart = () => { state.listening = true; setOrb(true); setStatus('Escuchando… tocá Listo cuando termines'); };
      rec.onresult = (e) => {
        let fin = '', interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) fin = mergeFinal(fin, r[0].transcript); else interim += r[0].transcript;
        }
        // en algunos navegadores cada sesión arranca de cero: no perder lo anterior
        state.finalText = state.base ? mergeFinal(state.base, fin) : fin;
        state.interim = interim.trim();
        draw();
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => stopRec(false), 2600);
      };
      rec.onerror = (e) => { state.error = e.error; };
      rec.onend = () => {
        state.listening = false; setOrb(false);
        clearTimeout(silenceTimer); clearTimeout(capTimer);
        if (state.cancelled) return;
        const text = (state.finalText + ' ' + state.interim).trim();
        if (text && !['not-allowed', 'service-not-allowed'].includes(state.error)) return finish();
        const msg = {
          'not-allowed': 'El navegador no me dejó usar el micrófono. Permitilo para este sitio (ícono del candado o “aA” en la barra de direcciones) o dictá con el teclado.',
          'service-not-allowed': 'El reconocimiento de voz no está disponible acá. Dictá con el micrófono del teclado o escribí.',
          'network': 'El reconocimiento de voz necesita internet. Sin conexión podés dictar con el micrófono del teclado.',
          'audio-capture': 'No encontré un micrófono en este dispositivo.',
          'language-not-supported': 'Este navegador no reconoce el acento elegido. Cambialo en Ajustes.'
        }[state.error];
        if (msg) return renderTextFallback(msg);
        setStatus('No te escuché. Tocá el micrófono para intentar de nuevo.');
      };
      try {
        state.base = state.finalText;
        rec.start();
        capTimer = setTimeout(() => stopRec(false), 45000);
      } catch (e) {
        setOrb(false);
        setStatus('Tocá el micrófono para empezar a hablar.');
      }
    }

    function finish() {
      const text = (state.finalText + ' ' + state.interim).trim();
      if (!text) { setStatus('No te escuché. Tocá el micrófono para intentar de nuevo.'); return; }
      state.cancelled = true;
      openReview(text, 'voz');
    }

    function renderTextFallback(note) {
      state.cancelled = true;
      openVoice({ textMode: true, note, text: (state.finalText + ' ' + state.interim).trim() });
    }

    function renderText(body, note, text) {
      body.innerHTML = `${note ? `<div class="banner" style="margin:0">${ICON.warn}<div>${esc(note)}</div></div>` : ''}
        <div class="text-entry"><textarea id="t-in" placeholder="Ej: Ayer pagué 4.500 de colectivo y 9 mil en la farmacia con débito">${esc(text)}</textarea>
        <button class="btn" id="t-go">Interpretar</button></div>
        <p class="hint" style="margin:0">Podés cargar varios movimientos juntos separándolos con “y”. La app detecta monto, tipo, categoría, medio de pago y fecha (“ayer”, “el lunes”, “el 3 de octubre”).</p>`;
      const ta = $('#t-in', body);
      setTimeout(() => ta.focus(), 420);
      const go = () => { const t = ta.value.trim(); if (!t) { ta.focus(); return; } openReview(t, 'manual'); };
      $('#t-go', body).onclick = go;
      ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } };
    }
  }

  // ---------- Revisión ----------
  function parseText(text) {
    const st = S();
    const items = Parser.parse(text, { categories: st.categories, methods: st.methods, defaultMethod: st.defaultMethod, defaultCurrency: st.defaultCurrency });
    const t = ' ' + Parser.norm(text) + ' ';
    const words = (x) => Parser.norm(x || '').split(/\s+/).filter((w) => w.length > 3 && !['para', 'ahorrar', 'comprar', 'pagar', 'deuda', 'meta', 'tarjeta'].includes(w));
    const hit = (x) => words(x).some((w) => t.includes(' ' + w + ' ') || t.includes(' ' + w + 's '));
    items.forEach((it) => {
      if (it.type === 'ahorro') { const mt = (st.metas || []).find((x) => hit(x.nombre)); if (mt) { it.metaId = mt.id; if (it.category === Parser.OTHER.ahorro) it.category = 'Metas personales'; } }
      if (it.type === 'deuda') { const dd = (st.deudas || []).find((x) => hit(x.acreedor + ' ' + (x.descripcion || ''))) || ((st.deudas || []).length === 1 ? st.deudas[0] : null); if (dd) it.deudaId = dd.id; }
    });
    return items;
  }

  function openReview(text, source) {
    let items = parseText(text);
    const st = S();
    if (source !== 'ejemplo' && st.autoSave && items.length && items.every((i) => i.confidence >= 0.8)) {
      return commit(items, text, source);
    }
    openSheet({
      title: items.length > 1 ? `Revisar ${items.length} movimientos` : 'Revisar', right: source === 'ejemplo' ? '' : 'Guardar',
      onRight() {
        const out = readReview();
        if (!out) return;
        commit(out, text, source);
      },
      render(body) { draw(body); }
    });

    function draw(body) {
      body = body || $('#sheet-body');
      const right = $('#sheet-right');
      right.textContent = items.length > 1 ? `Guardar ${items.length}` : 'Guardar';
      right.disabled = !items.length;
      right.hidden = source === 'ejemplo';
      body.innerHTML = `<div class="said"><span>${source === 'ejemplo' ? 'Ejemplo' : 'Entendí'}</span><q id="r-said">${esc(text)}</q>
          <div id="r-edit" hidden class="text-entry"><textarea id="r-text">${esc(text)}</textarea><button class="btn tinted" id="r-reparse">Volver a interpretar</button></div>
          <div style="display:flex;gap:12px"><button class="link-btn" id="r-toggle" style="padding:0">Corregir el texto</button>${SR ? '<button class="link-btn" id="r-again" style="padding:0">Hablar de nuevo</button>' : ''}</div></div>
        ${items.length ? '' : '<div class="banner" style="margin:0">' + ICON.warn + '<div>No encontré ningún monto. Probá con algo como “gasté 5 mil en el super”.</div></div>'}
        ${items.map((it, i) => reviewCard(it, i)).join('')}
        ${source === 'ejemplo' ? '<p class="hint" style="margin:0">Así se vería tu movimiento. Tocá el micrófono para cargar uno de verdad.</p><button class="btn" id="r-try">' + 'Probar con mi voz' + '</button>' : ''}`;
      $('#r-toggle').onclick = () => { $('#r-edit').hidden = !$('#r-edit').hidden; $('#r-said').hidden = !$('#r-edit').hidden; if (!$('#r-edit').hidden) $('#r-text').focus(); };
      $('#r-reparse').onclick = () => { text = $('#r-text').value.trim(); items = parseText(text); $('#sheet-title').textContent = items.length > 1 ? `Revisar ${items.length} movimientos` : 'Revisar'; draw(); };
      const again = $('#r-again'); if (again) again.onclick = () => openVoice();
      const tryBtn = $('#r-try'); if (tryBtn) tryBtn.onclick = () => openVoice();
      $$('.review-card', body).forEach((card) => {
        const i = +card.dataset.i;
        $$('.segmented button', card).forEach((b) => (b.onclick = () => {
          syncAll();
          const it = items[i];
          if (it.type === b.dataset.t) return;
          it.type = b.dataset.t;
          const cats = st.categories[it.type];
          it.category = Parser.detectCategory(Parser.norm(it.description || ''), it.type, st.categories) ||
            Parser.detectCategory(Parser.norm(text), it.type, st.categories) || cats[cats.length - 1].name;
          it.regularidad = it.naturaleza = null;
          draw();
        }));
        $('.rm', card).onclick = () => { syncAll(); items.splice(i, 1); $('#sheet-title').textContent = items.length > 1 ? `Revisar ${items.length} movimientos` : 'Revisar'; draw(); };
        $('.cur-btn', card).onclick = () => { syncAll(); items[i].currency = items[i].currency === 'USD' ? 'ARS' : 'USD'; draw(); };
      });
    }
    function syncItem(i) {
      const card = $(`.review-card[data-i="${i}"]`); if (!card) return;
      const it = items[i];
      const a = parseAmount($('.rc-amount input', card).value);
      it.amount = a > 0 ? a : 0;
      Object.assign(it, readFields(`r${i}-`, card));
    }
    function syncAll() { items.forEach((_, i) => syncItem(i)); }
    function readReview() {
      syncAll();
      const bad = items.findIndex((it) => !(it.amount > 0));
      if (bad >= 0) { toast('Falta el monto de un movimiento'); $(`.review-card[data-i="${bad}"] .rc-amount input`).focus(); return null; }
      return items;
    }
  }

  function reviewCard(it, i) {
    return `<div class="review-card ${typeClass(it.type)}" data-i="${i}">
      <div class="rc-head"><div class="segmented four">${typeButtons(it.type)}</div><button class="icon-btn rm" aria-label="Quitar este movimiento" style="width:30px;height:30px;color:var(--label-2)">${ICON.close}</button></div>
      <div class="rc-amount"><button class="cur-btn" aria-label="Cambiar moneda">${it.currency === 'USD' ? 'US$' : '$'}</button>
        <input inputmode="decimal" value="${esc(amountInputValue(it.amount))}" aria-label="Monto"></div>
      ${it.confidence < 0.7 ? '<div class="low-conf">Revisá estos datos: no estoy seguro de haber entendido todo.</div>' : ''}
      ${movFields(it, `r${i}-`)}
    </div>`;
  }

  function commit(items, text, source) {
    const now = Date.now();
    const recs = items.map((it, k) => ({
      id: uid(), type: it.type, amount: it.amount, currency: it.currency || 'ARS', category: it.category, method: it.method,
      date: it.date, description: it.description || it.category, installments: it.installments || null,
      regularidad: it.type === 'gasto' ? it.regularidad || null : undefined, naturaleza: it.type === 'gasto' ? it.naturaleza || null : undefined,
      metaId: it.type === 'ahorro' ? it.metaId || null : undefined, deudaId: it.type === 'deuda' ? it.deudaId || null : undefined,
      createdAt: now + k, source: source === 'manual' ? 'texto' : 'voz', transcript: text, autor: S().quien || ''
    }));
    db.movs.push(...recs);
    save(); closeSheet();
    ui.month = monthOf(recs[0].date); ui.q = ''; $('#q').value = ''; ui.cat = null;
    go('movs');
    const ids = new Set(recs.map((r) => r.id));
    const msg = recs.length === 1
      ? `Guardado: ${recs[0].description} ${money(signed(recs[0]), recs[0].currency, recs[0].type === 'ingreso')}`
      : `${recs.length} movimientos guardados`;
    toast(msg, () => { db.movs = db.movs.filter((m) => !ids.has(m.id)); save(); renderAll(); });
  }

  // ---------- Exportar / importar ----------
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  // En el teléfono abre el menú de compartir (Archivos, Drive, WhatsApp…); si no se puede, descarga el archivo.
  async function exportJSON() {
    const data = { app: 'mis-finanzas-ml', version: 1, exportedAt: new Date().toISOString(), movs: db.movs, settings: db.settings };
    const name = `finanzas-ml-copia-${todayIso()}.json`, json = JSON.stringify(data, null, 1);
    const done = () => { S().lastBackup = new Date().toISOString(); save(); renderAll(); };
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad|iPod/.test(navigator.userAgent)) {
        await navigator.share({ files: [file], title: 'Copia de Mis Finanzas ML' });
        done(); toast('Copia guardada');
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    download(name, json, 'application/json');
    done(); toast('Copia descargada. Guardala en tus archivos o en Drive.');
  }
  const CSV_COLS = ['Fecha', 'Tipo', 'Monto', 'Moneda', 'Categoría', 'Regularidad', 'Naturaleza', 'Meta', 'Deuda', 'Medio', 'Detalle', 'Cuotas', 'Origen', 'Texto dictado'];
  function exportCSV() {
    const q = (s) => { s = String(s ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const st = S();
    const rows = sortMovs(db.movs.slice()).map((m) => [m.date, TYPE_LABEL[m.type] || m.type, String(m.amount).replace('.', ','), m.currency, m.category,
      m.type === 'gasto' ? REG_LABEL[regOf(m)] : '', m.type === 'gasto' ? NAT_LABEL[natOf(m)] : '',
      ((st.metas || []).find((x) => x.id === m.metaId) || {}).nombre || '', ((st.deudas || []).find((x) => x.id === m.deudaId) || {}).acreedor || '',
      m.method, m.description, m.installments || '', m.source || '', m.transcript || ''].map(q).join(';'));
    download(`finanzas-ml-${todayIso()}.csv`, '﻿' + [CSV_COLS.join(';')].concat(rows).join('\r\n'), 'text/csv;charset=utf-8');
    toast('Planilla exportada');
  }
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const sep = (text.split('\n')[0].match(/;/g) || []).length >= (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cell = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch; }
      else if (ch === '"') inQ = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const head = rows.shift().map((h) => Parser.norm(h.trim()));
    const col = (n) => head.indexOf(Parser.norm(n));
    const iF = col('Fecha'), iT = col('Tipo'), iM = col('Monto');
    if (iF < 0 || iM < 0) throw new Error('El CSV necesita al menos las columnas Fecha y Monto.');
    return rows.filter((r) => r.length > 1 && r[iF]).map((r, k) => {
      let date = r[iF].trim();
      const dm = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (dm) date = `${dm[3].length === 2 ? '20' + dm[3] : dm[3]}-${pad(dm[2])}-${pad(dm[1])}`;
      let amount = parseAmount(r[iM]);
      const tv = iT >= 0 ? Parser.norm(r[iT]) : '';
      let type = /ingreso/.test(tv) ? 'ingreso' : /ahorro/.test(tv) ? 'ahorro' : /deuda/.test(tv) ? 'deuda' : 'gasto';
      if (/^-/.test(r[iM].trim()) && iT < 0) type = 'gasto';
      const g = (n) => (col(n) >= 0 ? (r[col(n)] || '').trim() : '');
      const regK = Object.keys(REG_LABEL).find((k) => Parser.norm(REG_LABEL[k]) === Parser.norm(g('Regularidad')));
      const natK = Object.keys(NAT_LABEL).find((k) => Parser.norm(NAT_LABEL[k]) === Parser.norm(g('Naturaleza')));
      return { id: uid(), type, amount, currency: g('Moneda') || 'ARS', category: g('Categoría') || Parser.OTHER[type], regularidad: regK || null, naturaleza: natK || null,
        method: g('Medio') || S().defaultMethod, date, description: g('Detalle') || g('Descripción'), installments: parseInt(g('Cuotas'), 10) || null,
        createdAt: Date.now() + k, source: 'importado', transcript: g('Texto dictado') };
    }).filter((m) => m.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(m.date));
  }
  function onImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let movs = [], settings = null;
      try {
        if (/\.json$/i.test(file.name) || /^\s*\{/.test(reader.result)) {
          const d = JSON.parse(reader.result);
          if (!Array.isArray(d.movs)) throw new Error('El archivo no es una copia de Mis Finanzas.');
          movs = d.movs.filter((m) => m && m.amount > 0 && m.date && m.type);
          settings = d.settings || null;
        } else movs = parseCSV(reader.result);
      } catch (e) { toast(e.message || 'No pude leer el archivo'); return; }
      if (!movs.length) { toast('El archivo no tiene movimientos para importar'); return; }
      const existing = new Set(db.movs.map((m) => m.id));
      const fresh = movs.filter((m) => !existing.has(m.id));
      openSheet({
        title: 'Importar', right: '',
        render(body) {
          body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label)">El archivo tiene <strong>${movs.length}</strong> movimientos${settings ? ' y tus ajustes' : ''}. ${fresh.length < movs.length ? `${movs.length - fresh.length} ya están cargados.` : ''}</p>
            <button class="btn" id="imp-add" ${fresh.length ? '' : 'disabled'}>Agregar ${fresh.length} a los actuales</button>
            <button class="btn danger" id="imp-rep">Reemplazar todo por el archivo</button>
            <p class="footnote" style="margin-top:-6px">Reemplazar borra los ${db.movs.length} movimientos actuales de este dispositivo.</p>`;
          $('#imp-add').onclick = () => { if (settings && !db.movs.length) db.settings = Object.assign(DEFAULT_SETTINGS(), settings); db.movs.push(...fresh); save(); applyTheme(); closeSheet(); renderAll(); toast(`${fresh.length} movimientos importados`); };
          const rep = $('#imp-rep');
          rep.onclick = () => {
            if (!rep.classList.contains('armed')) { rep.classList.add('armed'); rep.textContent = 'Tocá de nuevo para reemplazar'; return; }
            db.movs = movs; if (settings) db.settings = Object.assign(DEFAULT_SETTINGS(), settings);
            save(); applyTheme(); closeSheet(); renderAll(); toast('Datos reemplazados');
          };
        }
      });
    };
    reader.readAsText(file);
  }
  function wipeAll() {
    openSheet({
      title: 'Borrar todo', right: '',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label)">Se borran los ${db.movs.length} movimientos y los ajustes de <strong>este teléfono</strong>. ${driveOn() ? 'También se desconecta Google Drive. Los datos compartidos en Drive no se tocan: la otra persona los sigue viendo y podés volver a conectarte para recuperarlos.' : 'No se puede deshacer. Si querés conservarlos, exportá una copia antes.'}</p>
          <button class="btn tinted" id="w-bk">Exportar copia primero</button>
          <button class="btn danger" id="w-go">Borrar todos los datos</button>`;
        $('#w-bk').onclick = exportJSON;
        const b = $('#w-go');
        b.onclick = () => {
          if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Tocá de nuevo para borrar todo'; return; }
          // sólo este teléfono: sin dejar constancia de borrado, así no se propaga a la otra persona
          const wasOn = driveOn();
          (wasOn ? disconnectDrive() : Promise.resolve()).then(() => {
            replaceLocal({ movs: [], settings: DEFAULT_SETTINGS(), deleted: [], sharedAt: 0 });
            applyTheme(); closeSheet(); renderAll(); toast('Datos de este teléfono borrados');
          });
        };
      }
    });
  }

  // ---------- Copia cifrada en el Google Drive de cada persona ----------
  // Cada usuario entra con su cuenta de Google desde el teléfono. Permiso mínimo (drive.appdata): la app sólo ve
  // su propia carpeta oculta, no el resto del Drive. Lo que sube va cifrado con la contraseña de copias (vault.js).
  // El intermediario (Apps Script) sólo canjea el inicio de sesión porque el "client secret" no puede ir en una app pública;
  // nunca recibe los datos financieros.
  const GOOGLE_CLIENT_ID = '872037994128-cjgsu37c3mh7cdlsk9ic9l9f03f75agf.apps.googleusercontent.com';
  const BROKER_URL = 'https://script.google.com/macros/s/AKfycbzqMyt30WtQnaUyPxk6SOzmhvmL7Dzp_A6Y1QLTYwAUdyH89j1SoiD54lMbqLWtX_Sv/exec';
  const REDIRECT_URI = 'https://felipemanrique.github.io/mis-finanzas/oauth.html'; // registrada en Google Cloud y en el intermediario
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const DRIVE_KEY = 'mf-ml:cloud';
  const MAIN_FILE = 'mf-ml.enc.json';
  const DAILY_KEEP = 60;

  let drive = loadDrive();
  let access = null; // {token, exp} sólo en memoria
  let syncTimer = null, retryTimer = null, syncing = false, syncAgain = false, claimTimer = null;
  let vaultKey = null; // {key, salt, iter}

  function loadDrive() { try { return JSON.parse(localStorage.getItem(DRIVE_KEY)) || {}; } catch (e) { return {}; } }
  function saveDrive() {
    try { localStorage.setItem(DRIVE_KEY, JSON.stringify(drive)); } catch (e) { /* sin almacenamiento */ }
    renderDriveStatus();
  }
  const driveOn = () => !!drive.refreshToken;
  const driveReady = () => !!GOOGLE_CLIENT_ID;
  const backupPayload = () => ({ app: 'mis-finanzas-ml', version: 2, exportedAt: new Date().toISOString(), movs: db.movs, settings: db.settings, deleted: db.deleted || [], sharedAt: db.sharedAt || 0 });
  const randomId = () => btoa(String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // --- clave de cifrado guardada en el teléfono (IndexedDB, no exportable) ---
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('mis-finanzas-ml', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('keys');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbDo(mode, fn) {
    const d = await idb();
    return new Promise((res, rej) => {
      const tx = d.transaction('keys', mode);
      const req = fn(tx.objectStore('keys'));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
    });
  }
  async function getVaultKey() {
    if (vaultKey) return vaultKey;
    try { vaultKey = (await idbDo('readonly', (s) => s.get('vault'))) || null; } catch (e) { vaultKey = null; }
    return vaultKey;
  }
  async function setVaultKey(k) { vaultKey = k; try { await idbDo('readwrite', (s) => (k ? s.put(k, 'vault') : s.delete('vault'))); } catch (e) { /* queda en memoria */ } }

  // --- tokens ---
  async function broker(action, extra) {
    const res = await fetch(BROKER_URL, { method: 'POST', body: JSON.stringify(Object.assign({ action }, extra || {})) });
    try { return JSON.parse(await res.text()); } catch (e) { throw new Error('broker'); }
  }
  async function getToken() {
    if (access && access.exp - Date.now() > 60000) return access.token;
    const r = await broker('refresh', { refresh_token: drive.refreshToken });
    if (!r.ok) {
      if (r.error === 'invalid_grant') { drive.lastError = 'reauth'; saveDrive(); throw new Error('reauth'); }
      throw new Error('broker');
    }
    access = { token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 };
    return access.token;
  }
  async function gfetch(method, url, body, headers, retried) {
    const t = await getToken();
    const res = await fetch(url, { method, headers: Object.assign({ Authorization: 'Bearer ' + t }, headers || {}), body });
    if (res.status === 401 && !retried) { access = null; return gfetch(method, url, body, headers, true); }
    if (!res.ok) { const e = new Error('drive_' + res.status); e.status = res.status; throw e; }
    if (res.status === 204) return null;
    const txt = await res.text();
    try { return JSON.parse(txt); } catch (e) { return txt; }
  }

  // --- archivos en la carpeta oculta de la app ---
  const API = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  async function listFiles(q) {
    const u = `${API}?spaces=appDataFolder&pageSize=1000&fields=files(id,name,modifiedTime)&q=${encodeURIComponent(q || 'trashed=false')}`;
    return ((await gfetch('GET', u)) || {}).files || [];
  }
  async function findFile(name) { return (await listFiles(`name='${name}' and trashed=false`))[0] || null; }
  async function createFile(name, content) {
    const b = 'mf' + Math.random().toString(36).slice(2);
    const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: ['appDataFolder'] })}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${b}--`;
    return gfetch('POST', `${UPLOAD}?uploadType=multipart&fields=id`, body, { 'Content-Type': 'multipart/related; boundary=' + b });
  }
  const updateFile = (id, content) => gfetch('PATCH', `${UPLOAD}/${id}?uploadType=media&fields=id`, content, { 'Content-Type': 'application/json' });
  const readFile = (id) => gfetch('GET', `${API}/${id}?alt=media`);
  const deleteFile = (id) => gfetch('DELETE', `${API}/${id}`);

  async function writeMain(content) {
    if (drive.fileId) {
      try { await updateFile(drive.fileId, content); return; } catch (e) { if (e.status !== 404) throw e; drive.fileId = null; }
    }
    const f = await findFile(MAIN_FILE);
    if (f) { drive.fileId = f.id; await updateFile(f.id, content); } else drive.fileId = (await createFile(MAIN_FILE, content)).id;
  }
  async function readMain() {
    const f = drive.fileId ? { id: drive.fileId } : await findFile(MAIN_FILE);
    if (!f) return null;
    try { const env = await readFile(f.id); drive.fileId = f.id; return env; } catch (e) {
      if (e.status === 404 && drive.fileId) { drive.fileId = null; return readMain(); }
      throw e;
    }
  }
  async function writeDaily(content) {
    const day = todayIso();
    if (drive.lastDaily === day) return;
    const name = `mf-ml-${day}.enc.json`;
    const f = await findFile(name);
    if (f) await updateFile(f.id, content); else await createFile(name, content);
    drive.lastDaily = day;
    // borrar copias diarias viejas
    const limit = isoDate(new Date(Date.now() - DAILY_KEEP * 864e5));
    const old = (await listFiles("name contains 'mf-ml-2' and trashed=false")).filter((x) => (x.name.match(/\d{4}-\d{2}-\d{2}/) || [''])[0] < limit);
    for (const x of old) { try { await deleteFile(x.id); } catch (e) { /* se reintenta otro día */ } }
  }

  // --- sincronización ---
  function scheduleSync(delay = 2500) {
    if (!driveOn()) return;
    if (!drive.pending) { drive.pending = true; saveDrive(); }
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow(), delay);
  }

  // Sincroniza con la carpeta compartida: baja lo de Drive, lo fusiona con lo de este teléfono y sube el resultado.
  // Así dos personas conectadas a la misma cuenta cargan movimientos sin pisarse.
  async function syncNow(force) {
    if (!driveOn() || (!drive.pending && !force)) return;
    if (!navigator.onLine) { drive.lastError = 'offline'; saveDrive(); return; }
    if (syncing) { syncAgain = true; return; }
    const k = await getVaultKey();
    if (!k) { drive.lastError = 'nokey'; drive.pending = true; saveDrive(); return; }
    syncing = true; clearTimeout(retryTimer);
    drive.pending = false; renderDriveStatus();
    try {
      const remoteEnv = await readMain();
      let next = db;
      if (remoteEnv) {
        const remote = await Vault.open(k, remoteEnv);
        next = mergeData(db, remote);
        if (fingerprint(next) !== fingerprint(db)) { replaceLocal(next); applyTheme(); renderAll(); }
      }
      const env = await Vault.seal(k, backupPayload());
      env.savedAt = new Date().toISOString();
      const content = JSON.stringify(env);
      await writeMain(content);
      await writeDaily(content);
      drive.lastAt = env.savedAt; drive.lastError = null;
      drive.remoteTime = null;
    } catch (e) {
      drive.pending = true;
      drive.lastError = e.message === 'reauth' ? 'reauth' : e.message === 'bad_password' ? 'nokey' : navigator.onLine ? 'server' : 'offline';
    }
    syncing = false; saveDrive();
    if (syncAgain) { syncAgain = false; scheduleSync(500); }
    else if (drive.pending && drive.lastError === 'server') retryTimer = setTimeout(() => syncNow(), 60000);
  }

  // Trae lo que cargó la otra persona (sin subir nada si no hay cambios locales).
  let pulling = false;
  async function pullNow() {
    if (!driveOn() || syncing || pulling || drive.pending || !navigator.onLine || document.visibilityState !== 'visible') return;
    const k = await getVaultKey(); if (!k) return;
    pulling = true;
    try {
      const f = drive.fileId ? { id: drive.fileId } : await findFile(MAIN_FILE);
      if (!f) scheduleSync(300);
      if (f) {
        const meta = await gfetch('GET', `${API}/${f.id}?fields=id,modifiedTime`);
        drive.fileId = meta.id;
        if (meta.modifiedTime !== drive.remoteTime) {
          const remote = await Vault.open(k, await readFile(meta.id));
          const next = mergeData(db, remote);
          const changed = fingerprint(next) !== fingerprint(db);
          if (changed) { replaceLocal(next); applyTheme(); renderAll(); }
          // si este teléfono tenía algo que Drive no, lo sube
          const rf = fingerprint({ movs: remote.movs || [], settings: remote.settings || {}, deleted: remote.deleted || [], sharedAt: remote.sharedAt || 0 });
          if (fingerprint(next) !== rf) scheduleSync(300);
          drive.remoteTime = meta.modifiedTime; saveDrive();
        }
      }
    } catch (e) { /* se reintenta en el próximo ciclo */ }
    pulling = false;
  }

  function retryDrive() {
    if (drive.pendingSession) claimSession();
    if (!driveOn()) return;
    if (drive.pending || drive.lastError === 'server') syncNow();
    else pullNow();
  }

  function relTime(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'recién';
    if (s < 3600) return `hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
    return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '');
  }
  function driveState() {
    if (!driveOn()) return { level: 'off', text: '' };
    if (syncing) return { level: 'busy', text: 'Subiendo copia cifrada…' };
    const e = drive.lastError;
    if (e === 'reauth') return { level: 'error', text: 'Google cerró el acceso. Volvé a conectar tu cuenta.' };
    if (e === 'nokey') return { level: 'error', text: 'Falta tu contraseña de copias en este teléfono.' };
    if (drive.pending && e === 'offline') return { level: 'pending', text: 'Sin conexión. Se sube sola cuando vuelva internet.' };
    if (drive.pending && e === 'server') return { level: 'pending', text: 'No se pudo subir. Reintento en un minuto.' };
    if (drive.pending) return { level: 'pending', text: 'Hay cambios por subir.' };
    if (drive.lastAt) return { level: 'ok', text: `Copia cifrada al día · ${relTime(drive.lastAt)}` };
    return { level: 'ok', text: 'Conectado. La copia se sube con el próximo cambio.' };
  }
  function renderDriveStatus() {
    const st = driveState();
    const b = $('#btn-cloud');
    if (b) {
      b.hidden = st.level === 'off';
      b.dataset.level = st.level;
      b.setAttribute('aria-label', 'Copia en Drive: ' + st.text);
      b.title = st.text;
    }
    const s = $('#drv-status');
    if (s) s.textContent = st.text;
  }

  // --- conectar ---
  function authUrl(session) {
    const p = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code', scope: SCOPE,
      access_type: 'offline', prompt: 'consent', state: session
    });
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + p;
  }

  function passwordFields(confirm) {
    return `<div class="field-group">
        <div class="field"><label for="pw1">Contraseña</label><input id="pw1" type="password" autocomplete="${confirm ? 'new-password' : 'current-password'}" placeholder="mínimo 8 caracteres"></div>
        ${confirm ? '<div class="field"><label for="pw2">Repetila</label><input id="pw2" type="password" autocomplete="new-password"></div>' : ''}
      </div>`;
  }

  // Botón "Continuar con Google": un enlace real (en iPhone sólo así se abre Google desde la app instalada).
  function googleButton(id) {
    return `<a class="btn" id="${id}" href="#" role="button" style="display:flex;align-items:center;justify-content:center;gap:10px;text-decoration:none">${ICON.google}Continuar con Google</a>`;
  }
  function bindGoogleButton(el) {
    el.onclick = (e) => {
      if (!driveReady()) { e.preventDefault(); toast('La conexión con Google todavía no está configurada.'); return; }
      drive.pendingSession = randomId(); drive.sessionAt = Date.now(); saveDrive();
      el.href = authUrl(drive.pendingSession);
      el.target = '_blank'; el.rel = 'noopener';
      setTimeout(waitingSheet, 400);
      startClaimLoop();
    };
  }

  function openDriveConnect() {
    openSheet({
      title: 'Copia en Google Drive', right: '',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Cada cambio se guarda solo en tu Google Drive, cifrado con una contraseña que elegís después. Sin esa contraseña nadie puede leer las copias, ni siquiera Google.</p>
          ${googleButton('g-go')}
          <p class="footnote" style="margin-top:-6px">Google te pide permiso para que la app guarde sus propios datos en una carpeta oculta de tu Drive. La app no puede ver tus otros archivos.</p>`;
        bindGoogleButton($('#g-go'));
      }
    });
  }

  function waitingSheet() {
    openSheet({
      title: 'Conectando con Google', right: '',
      onLeft() { stopClaim(); drive.pendingSession = null; saveDrive(); closeSheet(); if (needsOnboarding()) setTimeout(openWelcome, 420); },
      render(body) {
        body.innerHTML = `<div class="listen"><div class="orb live" style="width:72px;height:72px">${ICON.cloud}</div>
          <div class="status">Elegí tu cuenta y tocá “Continuar” en la pantalla de Google. Cuando diga “Listo”, volvé a esta app.</div>
          <a class="link-btn" href="${esc(authUrl(drive.pendingSession))}" target="_blank" rel="noopener">Abrir Google de nuevo</a></div>`;
      }
    });
  }

  function stopClaim() { clearInterval(claimTimer); claimTimer = null; }
  function startClaimLoop() {
    stopClaim();
    claimTimer = setInterval(claimSession, 2500);
  }
  let claiming = false;
  async function claimSession() {
    if (!drive.pendingSession || claiming) return;
    if (Date.now() - (drive.sessionAt || 0) > 15 * 60000) { stopClaim(); drive.pendingSession = null; saveDrive(); return; }
    claiming = true;
    try {
      const r = await broker('claim', { session: drive.pendingSession });
      if (r.ok) {
        stopClaim();
        drive = { refreshToken: r.refresh_token };
        access = { token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 };
        saveDrive();
        await afterGoogle();
      }
    } catch (e) { /* sigue esperando */ }
    claiming = false;
  }

  // Después de Google: si ya hay copias, pide la contraseña con la que se crearon; si no, que elija una.
  async function afterGoogle() {
    try {
      const about = await gfetch('GET', 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
      drive.email = about && about.user && about.user.emailAddress; saveDrive();
    } catch (e) { /* el mail es sólo informativo */ }
    let env = null;
    try { env = await readMain(); } catch (e) { toast('No pude leer tu Drive. Probá de nuevo desde Ajustes.'); return; }
    askPassword(env);
  }

  // Si este teléfono perdió la clave: vuelve a pedirla (o a elegirla si todavía no hay copias).
  async function ensurePassword() {
    try { askPassword(await readMain()); } catch (e) { toast(e.message === 'reauth' ? 'Volvé a conectar tu cuenta de Google.' : 'No pude leer tu Drive. Revisá internet.'); }
  }

  function askPassword(env, wrong) {
    const first = !env;
    openSheet({
      title: first ? 'Último paso' : 'Tu contraseña de copias', right: 'Listo',
      onLeft() { closeSheet(); if (!needsOnboarding()) go('settings'); },
      render(body) {
        body.innerHTML = `${wrong ? `<div class="banner" style="margin:0">${ICON.warn}<div>Esa contraseña no abre tus copias. Probá de nuevo.</div></div>` : ''}
          ${drive.email ? `<p class="footnote" style="margin:0">Conectado como <strong>${esc(drive.email)}</strong></p>` : ''}
          <p class="footnote" style="font-size:15px;color:var(--label);margin:0">${first
            ? 'Elegí una contraseña para cifrar los datos. Si van a compartir las finanzas en familia, elijan una que conozcan todos: cada teléfono la pide una sola vez.'
            : `Esta cuenta ya tiene datos${env.savedAt ? ' (actualizados el ' + esc(new Date(env.savedAt).toLocaleDateString('es-AR')) + ')' : ''}. Ingresá la contraseña de copias: si te estás sumando a las finanzas de otra persona, es la que eligió ella.`}</p>
          ${first ? `<div class="banner" style="margin:0">${ICON.warn}<div><strong>¿Te estás sumando a las finanzas de otra persona?</strong> Tocá Cancelar: esta cuenta todavía no tiene datos. Pedile que abra la app en su teléfono (así se suben) y después entrá en Ajustes → Restaurar desde Drive.</div></div>` : ''}
          ${passwordFields(first)}
          ${first ? `<label class="field-group field" style="justify-content:space-between;gap:12px"><span style="font-size:15px">Entiendo que si la olvido, las copias no se pueden recuperar</span><span class="switch"><input type="checkbox" id="pw-ok"><span></span></span></label>
          <p class="footnote" style="margin-top:-8px">Guardala en el administrador de contraseñas del teléfono o anotala en un lugar seguro.</p>` : '<button class="link-btn" id="pw-reset" style="justify-self:start;padding:0;color:var(--expense)">La olvidé: empezar de cero</button>'}`;
        setTimeout(() => $('#pw1') && $('#pw1').focus(), 420);
        const reset = $('#pw-reset');
        if (reset) reset.onclick = () => resetCopies();
      },
      async onRight() {
        const p1 = $('#pw1').value;
        if (p1.length < 8) { toast('La contraseña tiene que tener al menos 8 caracteres'); return; }
        if (first) {
          if (p1 !== $('#pw2').value) { toast('Las contraseñas no coinciden'); return; }
          if (!$('#pw-ok').checked) { toast('Confirmá que entendés que no se puede recuperar'); return; }
          $('#sheet-right').disabled = true;
          await setVaultKey(await Vault.newKey(p1));
          drive.lastError = null; saveDrive();
          markOnboarded(); closeSheet(); go('movs');
          scheduleSync(200); // crea el archivo compartido aunque todavía no haya movimientos
          toast('Todo listo. Tocá el micrófono para cargar tu primer movimiento.');
          return;
        }
        $('#sheet-right').disabled = true;
        const k = await Vault.keyForEnvelope(p1, env);
        try {
          const remote = await Vault.open(k, env);
          await setVaultKey(k);
          if (drive.lastError === 'nokey') drive.lastError = null;
          saveDrive(); markOnboarded();
          chooseData(remote);
        } catch (e) { askPassword(env, true); }
      }
    });
  }

  // ---------- Bienvenida (una sola vez) ----------
  const ONB_KEY = 'mf-ml:onboarded';
  const isOnboarded = () => { try { return !!localStorage.getItem(ONB_KEY); } catch (e) { return true; } };
  function markOnboarded() { try { localStorage.setItem(ONB_KEY, new Date().toISOString()); } catch (e) { /* sin almacenamiento */ } }
  function needsOnboarding() { return !isOnboarded() && !driveOn() && !db.movs.length; }

  function installHint() {
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone) return '';
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return `<p class="footnote" style="text-align:center;margin:0">Tip: instalala como app. ${ios ? 'En Safari: Compartir → “Agregar a inicio”.' : 'En Chrome: menú ⋮ → “Instalar app”.'}</p>`;
  }

  function openWelcome() {
    openSheet({
      title: '', left: '', right: '',
      render(body) {
        body.innerHTML = `<div class="welcome">
            <img src="icons/icon.svg" alt="" class="welcome-logo" width="88" height="88">
            <h2>Te damos la bienvenida a Mis Finanzas ML</h2>
            <p>Registrá lo que entra y lo que sale hablando. La app lo ordena como un presupuesto: gastos fijos, variables e imprevistos, ahorro y deudas.</p>
          </div>
          <div class="welcome-points">
            <div><span class="wp-ic" style="background-color:var(--accent)">${ICON.mic}</span><span><strong>Hablá y listo.</strong> “Gasté 12 mil en nafta con débito.”</span></div>
            <div><span class="wp-ic" style="background-color:#34C759">${ICON.chart}</span><span><strong>Semáforo financiero.</strong> Verde, amarillo o rojo: sabé cómo estás de un vistazo.</span></div>
            <div><span class="wp-ic" style="background-color:#FF8D28">${ICON.target}</span><span><strong>Presupuesto y metas.</strong> Decidí antes de gastar y seguí tu plan de ahorro.</span></div>
            <div><span class="wp-ic" style="background-color:#6155F5">${ICON.lock}</span><span><strong>Tus datos son tuyos.</strong> Nada pasa por servidores ajenos.</span></div>
          </div>
          <div class="field-group"><div class="field"><label for="w-quien">Tu nombre</label><input id="w-quien" placeholder="Ej: Mamá" autocomplete="off" value="${esc(S().quien || '')}"></div></div>
          <p class="footnote" style="margin-top:-8px">Si comparten las finanzas en familia, cada uno pone su nombre y se ve quién cargó cada movimiento.</p>
          <p class="label-sm">¿Dónde guardamos tus datos?</p>
          ${googleButton('w-google')}
          <p class="footnote" style="margin-top:-6px">Copia automática y cifrada en Google Drive. Para llevar las finanzas en familia, conéctense todos con la misma cuenta y la misma contraseña de copias: lo que carga uno le aparece al otro.</p>
          <button class="btn tinted" id="w-local">Usar sin cuenta</button>
          ${installHint()}`;
        bindGoogleButton($('#w-google'));
        $('#w-quien').onchange = (e) => { S().quien = e.target.value.trim(); save(); };
        $('#w-local').onclick = openNoAccount;
      }
    });
  }

  function openNoAccount() {
    openSheet({
      title: 'Usar sin cuenta', left: 'Atrás', right: '',
      onLeft: openWelcome,
      render(body) {
        body.innerHTML = `<div class="banner" style="margin:0">${ICON.warn}<div><strong>Podés perder tus datos.</strong> Sin cuenta, todo queda guardado sólo en este teléfono.</div></div>
          <ul class="warn-list">
            <li>Si perdés o cambiás el teléfono, o se borran los datos del navegador, los movimientos se pierden.</li>
            <li>No se sincroniza con otros dispositivos.</li>
            <li>Las copias son manuales: Ajustes → “Guardar copia en el teléfono”. Te lo vamos a recordar cada semana.</li>
            <li>Podés conectar Google más adelante desde Ajustes, sin perder nada.</li>
          </ul>
          ${googleButton('n-google')}
          <button class="btn tinted" id="n-ok">Entiendo, seguir sin cuenta</button>`;
        bindGoogleButton($('#n-google'));
        $('#n-ok').onclick = () => { markOnboarded(); closeSheet(); go('movs'); toast('Listo. Tocá el micrófono para cargar tu primer movimiento.'); };
      }
    });
  }

  function resetCopies() {
    openSheet({
      title: 'Empezar de cero', right: '',
      onLeft() { closeSheet(); go('settings'); },
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Se borran todas las copias de tu Drive (no se pueden abrir sin la contraseña) y se crea una nueva con los ${db.movs.length} movimientos de este teléfono.</p>
          <p class="label-sm">Nueva contraseña de copias</p>${passwordFields(true)}
          <button class="btn danger" id="rs-go">Borrar copias y empezar de cero</button>`;
        const b = $('#rs-go');
        b.onclick = async () => {
          const p1 = $('#pw1').value;
          if (p1.length < 8 || p1 !== $('#pw2').value) { toast(p1.length < 8 ? 'Mínimo 8 caracteres' : 'Las contraseñas no coinciden'); return; }
          if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Tocá de nuevo para borrar las copias'; return; }
          b.disabled = true; b.textContent = 'Borrando…';
          try {
            for (const f of await listFiles("name contains 'mf-ml' and trashed=false")) await deleteFile(f.id);
            drive.fileId = null; drive.lastDaily = null;
            await setVaultKey(await Vault.newKey(p1));
            drive.lastError = null; saveDrive();
            await syncNow(true);
            closeSheet(); go('settings'); toast('Copias nuevas creadas');
          } catch (e) { b.disabled = false; b.textContent = 'Borrar copias y empezar de cero'; toast('No pude borrar las copias. Revisá internet.'); }
        };
      }
    });
  }

  // Tras abrir una copia: decidir qué datos quedan en el teléfono.
  // Tras abrir la copia compartida: se combinan los datos de este teléfono con los de Drive (nadie pierde nada).
  function chooseData(remote) {
    const before = db.movs.length;
    replaceLocal(mergeData(db, remote));
    const added = db.movs.length - before;
    applyTheme(); closeSheet(); go('movs');
    toast(before ? `Datos combinados: ${added} movimientos nuevos` : `${db.movs.length} movimientos sincronizados`);
    scheduleSync(300);
  }

  async function restoreFromDrive() {
    const k = await getVaultKey();
    let env;
    try { env = await readMain(); } catch (e) { toast(e.message === 'reauth' ? 'Volvé a conectar tu cuenta de Google.' : 'No pude leer tu Drive. Revisá internet.'); return; }
    if (!env) { toast('Todavía no hay copias en tu Drive.'); return; }
    if (!k) return askPassword(env);
    try { chooseData(await Vault.open(k, env)); } catch (e) { askPassword(env, true); }
  }

  function changePassword() {
    openSheet({
      title: 'Cambiar contraseña', right: 'Guardar',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Las copias se vuelven a cifrar con la contraseña nueva. Las copias diarias anteriores se borran, porque usan la vieja.</p>
          <p class="label-sm">Nueva contraseña</p>${passwordFields(true)}`;
      },
      async onRight() {
        const p1 = $('#pw1').value;
        if (p1.length < 8 || p1 !== $('#pw2').value) { toast(p1.length < 8 ? 'Mínimo 8 caracteres' : 'Las contraseñas no coinciden'); return; }
        $('#sheet-right').disabled = true;
        try {
          for (const f of await listFiles("name contains 'mf-ml-2' and trashed=false")) await deleteFile(f.id);
          drive.lastDaily = null;
          await setVaultKey(await Vault.newKey(p1));
          await syncNow(true);
          closeSheet(); renderSettings(); toast('Contraseña cambiada');
        } catch (e) { $('#sheet-right').disabled = false; toast('No pude cambiarla. Revisá internet.'); }
      }
    });
  }

  async function disconnectDrive() {
    const rt = drive.refreshToken;
    drive = {}; access = null; saveDrive(); await setVaultKey(null);
    if (rt) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(rt), { method: 'POST', mode: 'no-cors' }).catch(() => {});
  }

  function driveSettingsHtml() {
    if (!driveOn()) {
      return `<h2 class="section-title">Copia en Google Drive</h2>
        <div class="list"><button class="item link" id="drv-connect">Conectar con Google</button></div>
        <p class="footnote">Cada cambio se guarda solo en tu Google Drive, cifrado con tu contraseña. Si no hay internet, se sube cuando vuelva. Cada persona usa su propia cuenta.</p>`;
    }
    return `<h2 class="section-title">Copia en Google Drive</h2>
      <div class="list">
        <div class="item"><span class="grow">${esc(drive.email || 'Cuenta de Google')}<span class="sub" id="drv-status" style="white-space:normal"></span></span></div>
        <button class="item link" id="drv-now">Subir copia ahora</button>
        <button class="item link" id="drv-restore">Restaurar desde Drive</button>
        <button class="item link" id="drv-pass">Cambiar contraseña de copias</button>
        <button class="item danger" id="drv-off">Desconectar</button>
      </div>
      <p class="footnote">Las copias van cifradas a una carpeta oculta de tu Drive que sólo usa esta app: una siempre actualizada y una por día (últimos ${DAILY_KEEP} días). Para borrarlas: Drive → Configuración → Administrar apps → Mis Finanzas → Borrar datos ocultos (también borra las de la otra app Mis Finanzas si la usás con la misma cuenta).</p>`;
  }
  function bindDriveSettings() {
    const c = $('#drv-connect'); if (c) c.onclick = openDriveConnect;
    const n = $('#drv-now'); if (n) n.onclick = async () => {
      if (drive.lastError === 'reauth') { openDriveConnect(); return; }
      if (drive.lastError === 'nokey' || !(await getVaultKey())) { ensurePassword(); return; }
      drive.pending = true;
      await syncNow();
      toast(drive.lastError ? driveState().text : 'Copia subida a Drive');
    };
    const r = $('#drv-restore'); if (r) r.onclick = restoreFromDrive;
    const p = $('#drv-pass'); if (p) p.onclick = changePassword;
    const o = $('#drv-off'); if (o) o.onclick = async () => {
      if (!o.classList.contains('armed')) { o.classList.add('armed'); o.textContent = 'Tocá de nuevo para desconectar'; return; }
      await disconnectDrive(); renderSettings(); toast('Desconectado. Tus copias siguen en tu Drive.');
    };
    renderDriveStatus();
  }

  // ---------- Navegación ----------
  function go(tab) {
    ui.tab = tab;
    $$('[data-view]').forEach((v) => (v.hidden = v.dataset.view !== tab));
    $$('.tab').forEach((t) => (t.dataset.tab === tab ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
    try { history.replaceState(null, '', tab === 'movs' ? location.pathname : '#' + tab); } catch (e) { /* sin historial */ }
    renderAll();
    window.scrollTo(0, 0);
  }
  function renderAll() {
    if (ui.tab === 'movs') renderMovs();
    else if (ui.tab === 'stats') renderStats();
    else if (ui.tab === 'accounts') renderAccounts();
    else if (ui.tab === 'settings') renderSettings();
  }

  // ---------- Guía: el modelo de organización (manual de educación financiera) ----------
  function openGuide() {
    const st = S();
    const cats = (nats) => (st.categories.gasto || []).filter((c) => nats.includes(c.nat || 'necesario')).map((c) => c.name);
    const list = (arr) => arr.length ? arr.map(esc).join(', ') : '—';
    const I = (st.plan && +st.plan.ingresos) || 1000000;
    const ej = st.plan && +st.plan.ingresos ? 'tus ingresos estimados' : 'un ingreso de ejemplo';
    const block = (pct, color, title, text, items) => `<div class="guide-block" style="--g:${color}">
        <div class="guide-head"><span class="guide-pct num">${pct}%</span><span><strong>${title}</strong><span class="guide-amt num">${money(Math.round(I * pct / 100))} de ${ej}</span></span></div>
        <p>${text}</p>${items ? `<p class="guide-cats"><strong>En la app:</strong> ${items}</p>` : ''}</div>`;
    openSheet({
      title: 'Método 50/30/20', left: 'Listo', right: '',
      render(body) {
        body.innerHTML = `<div class="guide">
          <p class="guide-lead">Mis Finanzas ML ordena tu dinero como propone el manual de educación financiera: primero conocer la situación, después decidir antes de gastar.</p>
          <div class="guide-bar" aria-hidden="true"><i style="flex:50;background:var(--accent)"></i><i style="flex:30;background:var(--warn-fill)"></i><i style="flex:20;background:var(--income-fill)"></i></div>
          ${block(50, 'var(--accent)', 'Necesidades', 'Lo indispensable para vivir y mantener la rutina: no se puede dejar de pagar.', list(cats(['imprescindible', 'necesario'])))}
          ${block(30, 'var(--warn-fill)', 'Deseos y estilo de vida', 'Lo que mejora el bienestar aunque no sea indispensable. Acá también entran los gastos hormiga.', list(cats(['deseo', 'hormiga'])))}
          ${block(20, 'var(--income-fill)', 'Ahorro y deudas', 'Lo que se reserva desde el comienzo del mes: fondo de emergencia, metas y pago de deudas.', 'los movimientos de tipo Ahorro y Deuda')}
          <p class="footnote" style="margin:0">No es una regla obligatoria: es una guía para comparar tu reparto real con uno equilibrado y adaptarlo a tu realidad.</p>

          <h3>Cómo se clasifica cada gasto</h3>
          <div class="card guide-def">
            <p><strong>Según su regularidad</strong></p>
            <p><b>Fijo:</b> se repite todos los meses con un valor parecido (alquiler, servicios, cuotas).</p>
            <p><b>Variable:</b> cambia según el consumo (alimentos, ropa, salidas).</p>
            <p><b>Imprevisto:</b> aparece sin aviso (reparaciones, problemas de salud, emergencias).</p>
          </div>
          <div class="card guide-def">
            <p><strong>Según su naturaleza</strong></p>
            <p><b>Imprescindible:</b> esencial para vivir (alimentación, vivienda, medicamentos).</p>
            <p><b>Necesario:</b> mejora la calidad de vida y permite trabajar o estudiar (internet, transporte, educación).</p>
            <p><b>Deseo:</b> mejora el bienestar pero se puede postergar (salidas, ropa, entretenimiento).</p>
            <p><b>Hormiga:</b> pequeños consumos diarios que sumados pesan (snacks, delivery, suscripciones).</p>
          </div>
          <p class="footnote" style="margin:0">Cada categoría trae su clasificación por defecto y se puede cambiar en cada movimiento o en Ajustes → Categorías de gastos.</p>

          <h3>El semáforo financiero</h3>
          <div class="card guide-def">
            <p><span class="sem-dot" data-level="verde"></span> <b>Verde:</b> los ingresos cubren todo, ahorrás al menos el 10% y las deudas están controladas.</p>
            <p><span class="sem-dot" data-level="amarillo"></span> <b>Amarillo:</b> señal de alerta. Ahorro menor al 10%, deudas por encima del 20% de los ingresos, necesidades por encima del 60%, deseos por encima del 35% o gastos hormiga por encima del 10% de los gastos.</p>
            <p><span class="sem-dot" data-level="rojo"></span> <b>Rojo:</b> hay que tomar decisiones. Los gastos superan a los ingresos o las deudas se llevan más del 35%.</p>
          </div>
          <p class="footnote" style="margin:0">“Presupuestar no es limitarnos, es darnos permiso para elegir con conciencia.”</p>
          <button class="btn" id="g-plan">Armar mi presupuesto con 50/30/20</button>
        </div>`;
        $('#g-plan').onclick = editPlan;
      }
    });
  }

  // ---------- Buscar actualización ----------
  // Compara la versión publicada con la instalada; si hay una nueva, renueva los archivos y recarga.
  async function checkUpdate(btn) {
    const reset = () => { btn.disabled = false; btn.textContent = 'Buscar actualización'; };
    btn.disabled = true; btn.textContent = 'Buscando…';
    try {
      const txt = await (await fetch('app.js?t=' + Date.now(), { cache: 'no-store' })).text();
      const remote = (txt.match(/const APP_VERSION = '(\d[\w.-]*)'/) || [])[1];
      if (!remote) throw new Error('sin versión');
      if (remote === APP_VERSION) { reset(); toast(`Ya tenés la última versión (${APP_VERSION})`); return; }
      btn.textContent = 'Actualizando…';
      const files = ['./', 'index.html', 'styles.css', 'parser.js', 'vault.js', 'app.js', 'manifest.webmanifest', 'privacidad.html'];
      await Promise.all(files.map((f) => fetch(f, { cache: 'reload' }).catch(() => {})));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith('mf-ml-')).map((k) => caches.delete(k)));
      }
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update().catch(() => {});
      toast(`Instalando la versión ${remote}…`);
      setTimeout(() => location.reload(), 700);
    } catch (e) {
      reset(); toast('No pude buscar actualizaciones. Revisá tu conexión a internet.');
    }
  }

  // ---------- Inicio ----------
  const APP_VERSION = '1.1.0';
  function init() {
    applyTheme();
    $$('.tab').forEach((t) => (t.onclick = () => go(t.dataset.tab)));
    $('#btn-mic').onclick = () => openVoice();
    $('#btn-add').onclick = () => openEditor(null);
    $('#scrim').onclick = closeSheet;
    $('#sheet-body').addEventListener('change', (e) => {
      const mm = (e.target.id || '').match(/^(.*)cat$/);
      if (!mm || e.target.closest('#c-name')) return;
      const reg = $('#' + mm[1] + 'reg'), nat = $('#' + mm[1] + 'nat');
      if (!reg || !nat) return;
      const c = (S().categories.gasto || []).find((x) => x.name === e.target.value);
      if (c) { reg.value = c.reg || 'variable'; nat.value = c.nat || 'necesario'; }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetOpen()) closeSheet(); });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      const n = +b.dataset.m;
      ui.month = n === 0 ? monthOf(todayIso()) : shiftMonth(ui.month, n);
      renderAll();
    });
    $('#q').addEventListener('input', (e) => { ui.q = e.target.value; renderList(); });
    $$('#type-filter button').forEach((b) => (b.onclick = () => { ui.type = b.dataset.f; renderMovs(); }));
    $('#import-file').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) onImportFile(f); };
    window.addEventListener('storage', (e) => { if (e.key === KEY) { db = load(); renderAll(); } if (e.key === DRIVE_KEY) { drive = loadDrive(); renderDriveStatus(); } });
    $('#btn-cloud').onclick = () => go('settings');
    window.addEventListener('online', () => retryDrive());
    window.addEventListener('offline', () => renderDriveStatus());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') retryDrive(); });
    setInterval(renderDriveStatus, 60000);
    setInterval(pullNow, 45000);

    const hash = location.hash.slice(1);
    go(['stats', 'accounts', 'settings'].includes(hash) ? hash : 'movs');
    renderDriveStatus();
    retryDrive();
    if (db.movs.length || driveOn()) markOnboarded(); // usuarios que ya venían usando la app
    if (!S().firstUse) { S().firstUse = new Date().toISOString(); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* */ } }
    if (new URLSearchParams(location.search).get('voz') === '1') setTimeout(() => openVoice(), 300);
    else if (needsOnboarding()) setTimeout(openWelcome, 350);

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  window.__app = { get db() { return db; }, openReview, parseText, mergeData, diagnose };
  init();
})();
