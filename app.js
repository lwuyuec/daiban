(function () {
  'use strict';

  /* ---------------- 基础工具 ---------------- */
  const $ = (s, el) => (el || document).querySelector(s);
  const pad = n => String(n).padStart(2, '0');
  const fmtISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const todayISO = () => fmtISO(new Date());
  const uid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return fmtISO(d); };

  const ICON = {
    inbox: '<path d="M4 13.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7"/><path d="M4 13.5h4l1.4 2.4h5.2L16 13.5h4v4A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>',
    circle: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.5 2.5 4.9-5.2"/>',
    flag: '<path d="M6 20V5"/><path d="M6 5.5h10.5l-2 4 2 4H6"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3.5v3M16 3.5v3M3.5 10h17"/>'
  };

  /* ---------------- 数据层：IndexedDB，localStorage 兜底 ---------------- */
  const DB_NAME = 'todo-workbench';
  const DB_STORE = 'kv';
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('no idb'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return dbPromise;
  }

  async function idbGet(key) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
      tx.onsuccess = () => res(tx.result);
      tx.onerror = () => rej(tx.error);
    });
  }

  async function idbPut(key, val) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(val, key);
      tx.onsuccess = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }

  /* 演示插图（首次打开时的示例图，内联 SVG，无外部依赖） */
  const DEMO_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EEF0FF"/><stop offset="1" stop-color="#FDF0E8"/></linearGradient>' +
    '<linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5A57D6"/><stop offset="1" stop-color="#9B86F5"/></linearGradient></defs>' +
    '<rect width="720" height="480" fill="url(#g)"/>' +
    '<rect x="72" y="56" width="576" height="368" rx="20" fill="#fff" stroke="#E7E3EF"/>' +
    '<rect x="100" y="88" width="120" height="12" rx="6" fill="#DCD8EA"/>' +
    '<rect x="100" y="118" width="220" height="9" rx="4.5" fill="#EEECF4"/>' +
    '<rect x="100" y="152" width="40" height="40" rx="10" fill="#F0EEFB"/><rect x="154" y="160" width="180" height="10" rx="5" fill="#E2DFEC"/><rect x="154" y="178" width="120" height="8" rx="4" fill="#EFEDF5"/>' +
    '<rect x="100" y="208" width="40" height="40" rx="10" fill="#F7EFE8"/><rect x="154" y="216" width="210" height="10" rx="5" fill="#E7E2DA"/><rect x="154" y="234" width="96" height="8" rx="4" fill="#F2EEE8"/>' +
    '<rect x="100" y="264" width="40" height="40" rx="10" fill="#EAF5F1"/><rect x="154" y="272" width="160" height="10" rx="5" fill="#DCEAE5"/><rect x="154" y="290" width="132" height="8" rx="4" fill="#EDF4F1"/>' +
    '<rect x="404" y="120" width="196" height="112" rx="14" fill="#fff" stroke="#EDEAF3"/><rect x="424" y="140" width="70" height="8" rx="4" fill="#E5E2EE"/>' +
    '<rect x="424" y="166" width="156" height="10" rx="5" fill="url(#b)"/><rect x="424" y="190" width="120" height="10" rx="5" fill="#EDEAF6"/><rect x="424" y="208" width="86" height="8" rx="4" fill="#F3F1F8"/>' +
    '<rect x="404" y="252" width="196" height="120" rx="14" fill="#fff" stroke="#EDEAF3"/>' +
    '<circle cx="440" cy="292" r="18" fill="#EEF0FF"/><rect x="470" y="284" width="98" height="9" rx="4.5" fill="#E6E3F0"/><rect x="470" y="302" width="70" height="8" rx="4" fill="#F0EEF6"/>' +
    '<rect x="424" y="332" width="156" height="6" rx="3" fill="#EFEDF5"/><rect x="424" y="332" width="104" height="6" rx="3" fill="url(#b)"/>' +
    '</svg>'
  );

  const seedTodos = () => ([
    {
      id: uid(), title: '整理 Q4 产品路线图', note: '把上周评审会的结论同步进路线图，附件是白板截图。',
      images: [DEMO_IMG], priority: 'high', due: todayISO(), tags: ['工作'], done: false, demo: true,
      createdAt: Date.now() - 1000 * 60 * 25, updatedAt: Date.now()
    },
    {
      id: uid(), title: '回复客户的合同修改意见', note: '重点确认付款节点与交付范围。',
      images: [], priority: 'medium', due: addDays(1), tags: ['工作', '沟通'], done: false, demo: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 4, updatedAt: Date.now()
    },
    {
      id: uid(), title: '读《设计中的设计》第三章', note: '', images: [],
      priority: 'low', due: '', tags: ['阅读'], done: false, demo: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 9, updatedAt: Date.now()
    },
    {
      id: uid(), title: '预约下周的体检', note: '记得空腹。', images: [],
      priority: 'medium', due: '', tags: ['生活'], done: true, demo: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 30, updatedAt: Date.now(), completedAt: Date.now() - 1000 * 60 * 60 * 2
    }
  ]);

  const state = {
    todos: [],
    filter: 'all',
    tag: null,
    query: '',
    sort: 'created'
  };

  let editingId = null;
  let draftImages = [];
  let saveTimer = null;

  /* 共享看板状态 */
  const API_BASE = '/api/board';
  const POLL_MS = 15000;
  let boardId = sanitizeBoard(new URLSearchParams(location.search).get('board'));
  let cloudReady = false;
  let localSha = null;
  let pendingPush = false;
  let pushGeneration = 0;
  let pushTimer = null;
  let pollTimer = null;

  function sanitizeBoard(raw) {
    return String(raw || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'default';
  }

  function storageKey() {
    return boardId === 'default' ? 'state' : 'state:' + boardId;
  }

  function legacyKey() {
    return boardId === 'default' ? 'todo-workbench' : 'todo-workbench:' + boardId;
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await idbPut(storageKey(), { todos: state.todos, version: 1 });
      } catch (e) {
        try { localStorage.setItem(legacyKey(), JSON.stringify({ todos: state.todos })); } catch (_) {}
      }
    }, 220);
  }

  async function load() {
    let data = null;
    try { data = await idbGet(storageKey()); } catch (e) {}
    if (!data) {
      try {
        const raw = localStorage.getItem(legacyKey());
        if (raw) data = JSON.parse(raw);
      } catch (e) {}
    }
    if (data && Array.isArray(data.todos)) {
      state.todos = data.todos;
    } else {
      state.todos = seedTodos();
      persist();
    }
  }

  /* ---------------- 备份导入：字段校验与清洗 ---------------- */
  function normalizeTodo(t) {
    if (!t || typeof t !== 'object' || typeof t.title !== 'string' || !t.title.trim()) return null;
    const images = Array.isArray(t.images)
      ? t.images.filter(s => typeof s === 'string' && /^(data:image\/|https?:\/\/|blob:)/i.test(s)).slice(0, 12)
      : [];
    const tags = Array.isArray(t.tags)
      ? t.tags.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim().slice(0, 24)).slice(0, 6)
      : [];
    return {
      id: typeof t.id === 'string' && t.id ? t.id : uid(),
      title: t.title.trim().slice(0, 120),
      note: typeof t.note === 'string' ? t.note.slice(0, 2000) : '',
      images,
      priority: ['high', 'medium', 'low'].indexOf(t.priority) > -1 ? t.priority : 'medium',
      due: /^\d{4}-\d{2}-\d{2}$/.test(t.due || '') ? t.due : '',
      tags,
      done: !!t.done,
      createdAt: Number.isFinite(t.createdAt) ? t.createdAt : Date.now(),
      updatedAt: Number.isFinite(t.updatedAt) ? t.updatedAt : Date.now(),
      completedAt: Number.isFinite(t.completedAt) ? t.completedAt : null
    };
  }

  async function importBackup(file) {
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch (e) {
      toast('备份文件不是有效的 JSON');
      return;
    }
    const rawList = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.todos) ? parsed.todos : null);
    if (!rawList) {
      toast('备份文件格式不正确');
      return;
    }
    const incoming = rawList.map(normalizeTodo).filter(Boolean);
    if (!incoming.length) {
      toast('没有找到可导入的待办');
      return;
    }

    const byId = new Map(state.todos.map(t => [t.id, t]));
    let added = 0;
    let updated = 0;
    incoming.forEach(t => {
      if (byId.has(t.id)) updated++; else added++;
      byId.set(t.id, t);
    });
    state.todos = Array.from(byId.values());
    markDirty();
    render();
    toast('已导入 ' + incoming.length + ' 项（新增 ' + added + '，更新 ' + updated + '）');
  }

  /* ---------------- 图片处理 ---------------- */
  function readAsDataURL(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(file);
    });
  }

  function loadImg(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('image load failed'));
      img.src = src;
    });
  }

  async function compressImage(file, maxSide = 1600) {
    const raw = await readAsDataURL(file);
    if (file.type === 'image/svg+xml' || file.size < 90 * 1024) return raw;
    try {
      const img = await loadImg(raw);
      const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
      if (scale === 1 && file.size < 600 * 1024) return raw;
      const w = Math.max(1, Math.round((img.width || maxSide) * scale));
      const h = Math.max(1, Math.round((img.height || maxSide) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      return raw;
    }
  }

  async function addFiles(files) {
    const imgs = Array.from(files || []).filter(f => f && f.type && f.type.indexOf('image/') === 0);
    if (!imgs.length) return;
    if (draftImages.length + imgs.length > 12) {
      toast('每条待办最多 12 张图片');
    }
    const room = Math.max(0, 12 - draftImages.length);
    const list = imgs.slice(0, room);
    for (const f of list) {
      try {
        const data = await compressImage(f);
        draftImages.push(data);
      } catch (e) {}
    }
    renderThumbs();
    if (list.length) toast('已添加 ' + list.length + ' 张图片');
  }

  function renderThumbs() {
    const thumbs = $('#thumbs');
    thumbs.innerHTML = draftImages.map((src, i) =>
      '<div class="thumb"><img src="' + esc(src) + '" alt="附件 ' + (i + 1) + '">' +
      '<button class="thumb-x" type="button" data-rm="' + i + '" title="移除这张图片">×</button></div>'
    ).join('');
    thumbs.classList.toggle('has', draftImages.length > 0);
    $('#imgCount').textContent = draftImages.length + ' 张图片';
    $('#dzHint').style.display = draftImages.length ? 'none' : 'flex';
  }

  /* ---------------- 弹窗 ---------------- */
  const modal = $('#modal');

  function setPriority(v) {
    Array.from($('#seg').children).forEach(b => b.classList.toggle('on', b.dataset.v === v));
  }

  function getPriority() {
    const on = $('#seg .on');
    return on ? on.dataset.v : 'medium';
  }

  function openModal(id) {
    editingId = id || null;
    const t = id ? state.todos.find(x => x.id === id) : null;
    $('#sheetTitle').textContent = t ? '编辑待办' : '新建待办';
    $('#saveBtn').textContent = t ? '保存修改' : '保存待办';
    $('#fTitle').value = t ? t.title : '';
    $('#fNote').value = t ? (t.note || '') : '';
    $('#fDue').value = t ? (t.due || '') : '';
    $('#fTags').value = t ? (t.tags || []).join(', ') : '';
    setPriority(t ? t.priority : 'medium');
    draftImages = t ? (t.images || []).slice() : [];
    renderThumbs();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { $('#fTitle').focus(); }, 80);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    editingId = null;
    draftImages = [];
  }

  function saveTodo() {
    const title = $('#fTitle').value.trim();
    if (!title) {
      const el = $('#fTitle');
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      el.focus();
      toast('先写一下要做什么吧');
      return;
    }
    const tags = $('#fTags').value.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean).slice(0, 6);
    const payload = {
      title: title.slice(0, 120),
      note: $('#fNote').value.trim().slice(0, 2000),
      images: draftImages.slice(),
      priority: getPriority(),
      due: $('#fDue').value || '',
      tags,
      updatedAt: Date.now()
    };

    if (editingId) {
      const t = state.todos.find(x => x.id === editingId);
      if (t) {
        Object.assign(t, payload);
        delete t.demo;
      }
      toast('已保存修改');
    } else {
      state.todos.unshift(Object.assign({
        id: uid(), done: false, createdAt: Date.now()
      }, payload));
      toast('待办已创建');
    }
    markDirty();
    closeModal();
    render();
  }

  /* ---------------- 渲染 ---------------- */
  const FILTERS = [
    { key: 'all', label: '全部待办', icon: 'inbox', title: '全部待办' },
    { key: 'today', label: '今天与逾期', icon: 'sun', title: '今天与逾期' },
    { key: 'active', label: '进行中', icon: 'circle', title: '进行中' },
    { key: 'done', label: '已完成', icon: 'check', title: '已完成' },
    { key: 'high', label: '高优先级', icon: 'flag', title: '高优先级' }
  ];

  function matchFilter(t) {
    const today = todayISO();
    switch (state.filter) {
      case 'today': return !t.done && t.due && t.due <= today;
      case 'active': return !t.done;
      case 'done': return !!t.done;
      case 'high': return t.priority === 'high' && !t.done;
      default: return true;
    }
  }

  function visibleTodos() {
    const q = state.query.trim().toLowerCase();
    let list = state.todos.filter(t => {
      if (!matchFilter(t)) return false;
      if (state.tag && !(t.tags || []).includes(state.tag)) return false;
      if (q) {
        const hay = (t.title + ' ' + (t.note || '') + ' ' + (t.tags || []).join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    const prioRank = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      if (state.sort === 'due') {
        const av = a.due || '9999-12-31', bv = b.due || '9999-12-31';
        if (av !== bv) return av < bv ? -1 : 1;
      } else if (state.sort === 'priority') {
        const d = prioRank[a.priority] - prioRank[b.priority];
        if (d !== 0) return d;
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }

  function dueInfo(t) {
    if (!t.due) return null;
    const today = todayISO();
    if (t.due < today) return { cls: 'over', text: '已逾期 · ' + shortDate(t.due) };
    if (t.due === today) return { cls: 'today', text: '今天到期' };
    if (t.due === addDays(1)) return { cls: '', text: '明天到期' };
    return { cls: '', text: shortDate(t.due) + ' 到期' };
  }

  function shortDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso;
    const now = new Date();
    const sameYear = Number(m[1]) === now.getFullYear();
    return sameYear ? (Number(m[2]) + '月' + Number(m[3]) + '日') : (m[1] + '年' + Number(m[2]) + '月' + Number(m[3]) + '日');
  }

  const PRIO_TEXT = { high: '高', medium: '中', low: '低' };

  function renderNav() {
    const today = todayISO();
    const counts = {
      all: state.todos.length,
      today: state.todos.filter(t => !t.done && t.due && t.due <= today).length,
      active: state.todos.filter(t => !t.done).length,
      done: state.todos.filter(t => t.done).length,
      high: state.todos.filter(t => t.priority === 'high' && !t.done).length
    };
    $('#nav').innerHTML = FILTERS.map(f =>
      '<button class="nav-item' + (state.filter === f.key ? ' on' : '') + '" type="button" data-f="' + f.key + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[f.icon] + '</svg>' + f.label +
      (counts[f.key] ? '<span class="n">' + counts[f.key] + '</span>' : '') + '</button>'
    ).join('');

    const tags = {};
    state.todos.forEach(t => (t.tags || []).forEach(tag => { tags[tag] = (tags[tag] || 0) + 1; }));
    const entries = Object.keys(tags).sort((a, b) => tags[b] - tags[a]);
    $('#tagList').innerHTML = entries.length
      ? entries.map(tag => '<button class="tag-chip' + (state.tag === tag ? ' on' : '') + '" type="button" data-tag="' + esc(tag) + '">#' + esc(tag) + '</button>').join('')
      : '<span class="tags-empty">给待办打上标签后会出现在这里</span>';
  }

  function renderStats() {
    const total = state.todos.length;
    const active = state.todos.filter(t => !t.done).length;
    const done = state.todos.filter(t => t.done).length;
    const today = state.todos.filter(t => !t.done && t.due && t.due <= todayISO()).length;
    $('#stActive').innerHTML = active + '<small>项</small>';
    $('#stToday').innerHTML = today + '<small>项</small>';
    $('#stDone').innerHTML = done + '<small>项</small>';
    const pct = total ? Math.round(done / total * 100) : 0;
    $('#ring').style.setProperty('--p', pct);
    $('#ringTxt').textContent = pct + '%';
    $('#barFill').style.width = pct + '%';
  }

  function renderList() {
    const list = visibleTodos();
    const wrap = $('#list');
    const filterMeta = FILTERS.find(f => f.key === state.filter);
    $('#listTitle').textContent = state.tag ? ('#' + state.tag) : (filterMeta ? filterMeta.title : '待办');
    $('#listCount').textContent = state.query ? ('搜索「' + state.query + '」· ' + list.length + ' 项') : (list.length + ' 项');

    wrap.innerHTML = list.map((t, idx) => {
      const d = dueInfo(t);
      const imgs = (t.images || []).slice(0, 3).map((src, i) =>
        '<button type="button" data-img="' + esc(t.id) + '" data-i="' + i + '"><img src="' + esc(src) + '" alt="待办图片"></button>'
      ).join('');
      const more = (t.images || []).length > 3
        ? '<button type="button" data-img="' + esc(t.id) + '" data-i="3"><img src="' + esc(t.images[3]) + '" alt=""><span class="more">+' + (t.images.length - 3) + '</span></button>'
        : '';
      const tags = (t.tags || []).map(tag => '<span class="mchip tag">#' + esc(tag) + '</span>').join('');
      return '<article class="card' + (t.done ? ' done' : '') + '" data-id="' + esc(t.id) + '" style="animation-delay:' + Math.min(idx * 26, 180) + 'ms">' +
        '<button class="check" type="button" data-act="toggle" title="' + (t.done ? '标记为未完成' : '标记为完成') + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-10"/></svg></button>' +
        '<div class="c-main">' +
        '<div class="c-top"><h4 class="c-title">' + esc(t.title) + '</h4>' +
        (t.priority !== 'medium' ? '<span class="prio ' + t.priority + '"><i></i>' + PRIO_TEXT[t.priority] + '</span>' : '') +
        '</div>' +
        (t.note ? '<p class="c-note">' + esc(t.note) + '</p>' : '') +
        (imgs ? '<div class="c-imgs">' + imgs + more + '</div>' : '') +
        '<div class="c-meta">' +
        (d ? '<span class="mchip ' + d.cls + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.cal + '</svg>' + d.text + '</span>' : '') +
        tags +
        '</div>' +
        '</div>' +
        '<div class="c-actions">' +
        '<button class="icon-btn" type="button" data-act="edit" title="编辑"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>' +
        '<button class="icon-btn del" type="button" data-act="del" title="删除"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/></svg></button>' +
        '</div>' +
        '</article>';
    }).join('');

    const emptyEl = $('#empty');
    emptyEl.classList.toggle('show', list.length === 0);
    if (list.length === 0) {
      if (state.query) {
        $('#emptyTitle').textContent = '没有匹配的待办';
        $('#emptyDesc').textContent = '换个关键词试试，或者清空搜索框';
      } else if (state.filter === 'done') {
        $('#emptyTitle').textContent = '还没有完成的任务';
        $('#emptyDesc').textContent = '勾掉一件待办，它会出现在这里';
      } else {
        $('#emptyTitle').textContent = '这里还没有待办';
        $('#emptyDesc').textContent = '点击「新建待办」，支持直接粘贴截图';
      }
    }
  }

  function render() {
    renderNav();
    renderStats();
    renderList();
  }

  /* ---------------- 共享看板同步 ---------------- */
  function setSyncStatus(text, kind) {
    $('#syncStatus').textContent = text;
    $('#syncDot').className = 'sync-dot' + (kind ? ' ' + kind : '');
  }

  function schedulePush() {
    if (!cloudReady) return;
    pendingPush = true;
    pushGeneration++;
    clearTimeout(pushTimer);
    setSyncStatus('正在保存…', 'busy');
    pushTimer = setTimeout(() => pushToCloud(pushGeneration, false), 450);
  }

  function markDirty() {
    persist();
    schedulePush();
  }

  async function apiRequest(method, body) {
    const response = await fetch(API_BASE + '?board=' + encodeURIComponent(boardId), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
    let data = {};
    try { data = await response.json(); } catch (e) {}
    if (!response.ok) {
      const error = new Error(data.error || '请求失败');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function handleSyncError(error) {
    if (error.status === 501 || error.status === 502 || error.status === 404) {
      cloudReady = false;
      clearInterval(pollTimer);
      setSyncStatus(error.status === 501 ? '本地模式（未配置共享存储）' : '共享存储不可用，已切换本地模式', 'err');
      return;
    }
    setSyncStatus('网络异常，稍后自动重试', 'err');
  }

  async function probeCloud() {
    try {
      const data = await apiRequest('GET');
      cloudReady = true;
      localSha = data.sha || null;
      return true;
    } catch (error) {
      cloudReady = false;
      handleSyncError(error);
      return false;
    }
  }

  async function syncFromCloud(initial) {
    if (!cloudReady) return;
    try {
      const data = await apiRequest('GET');
      const previousSha = localSha;
      localSha = data.sha || null;
      if (pendingPush) {
        await pushToCloud(pushGeneration, false);
        return;
      }
      const remote = (data.todos || []).map(normalizeTodo).filter(Boolean);
      if (initial && !remote.length && state.todos.length && state.todos.every(t => t.demo)) {
        state.todos = [];
        persist();
        render();
        setSyncStatus('共享看板为空，已清除演示待办', 'ok');
        return;
      }
      if (data.sha && data.sha !== previousSha) {
        state.todos = remote;
        localSha = data.sha;
        persist();
        render();
      }
      setSyncStatus('已同步 · ' + state.todos.length + ' 项', 'ok');
    } catch (error) {
      handleSyncError(error);
    }
  }

  async function pushToCloud(generation, retried) {
    if (!cloudReady) return;
    try {
      const data = await apiRequest('PUT', { board: boardId, todos: state.todos, sha: localSha });
      localSha = data.sha || localSha;
      if (generation === pushGeneration) {
        pendingPush = false;
        setSyncStatus('已同步 · ' + state.todos.length + ' 项', 'ok');
      } else {
        schedulePush();
      }
    } catch (error) {
      if (error.status === 409 && !retried) {
        try {
          const current = await apiRequest('GET');
          localSha = current.sha || null;
          await pushToCloud(generation, true);
          return;
        } catch (e) {}
      }
      setSyncStatus('保存失败，将在恢复后重试', 'err');
    }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      if (!document.hidden) syncFromCloud(false);
    }, POLL_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && cloudReady) syncFromCloud(false);
    });
    window.addEventListener('online', () => { if (cloudReady) syncFromCloud(false); });
  }

  /* ---------------- 交互 ---------------- */
  function toggleTodo(id) {
    const t = state.todos.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.completedAt = t.done ? Date.now() : null;
    t.updatedAt = Date.now();
    delete t.demo;
    markDirty();
    render();
    if (t.done) toast('完成一项，干得漂亮');
  }

  function deleteTodo(id) {
    const idx = state.todos.findIndex(x => x.id === id);
    if (idx < 0) return;
    const removed = state.todos.splice(idx, 1)[0];
    markDirty();
    render();
    toast('已删除「' + (removed.title.length > 14 ? removed.title.slice(0, 14) + '…' : removed.title) + '」', {
      action: '撤销',
      onAction: () => {
        state.todos.splice(Math.min(idx, state.todos.length), 0, removed);
        markDirty();
        render();
        toast('已恢复');
      }
    });
  }

  function toast(msg, opts) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-10"/></svg></span><span>' + esc(msg) + '</span>';
    if (opts && opts.action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = opts.action;
      b.onclick = () => { opts.onAction && opts.onAction(); remove(); };
      el.appendChild(b);
    }
    box.appendChild(el);
    const remove = () => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 200);
    };
    setTimeout(remove, opts && opts.action ? 5200 : 2400);
    if (box.children.length > 3) box.firstElementChild.remove();
  }

  /* 图片查看 */
  const lightbox = $('#lightbox');
  let lbSrc = '';
  function openLightbox(src) {
    lbSrc = src;
    $('#lbImg').src = src;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    $('#lbImg').src = '';
    lbSrc = '';
  }

  /* ---------------- 事件绑定 ---------------- */
  document.addEventListener('click', e => {
    const navBtn = e.target.closest('[data-f]');
    if (navBtn) {
      state.filter = navBtn.dataset.f;
      state.tag = null;
      render();
      return;
    }
    const tagBtn = e.target.closest('[data-tag]');
    if (tagBtn) {
      const tag = tagBtn.dataset.tag;
      state.tag = state.tag === tag ? null : tag;
      if (state.tag) state.filter = 'all';
      render();
      return;
    }

    const card = e.target.closest('.card');
    if (card) {
      const id = card.dataset.id;
      const act = e.target.closest('[data-act]');
      if (act) {
        const a = act.dataset.act;
        if (a === 'toggle') toggleTodo(id);
        if (a === 'edit') openModal(id);
        if (a === 'del') deleteTodo(id);
        return;
      }
      const imgBtn = e.target.closest('[data-img]');
      if (imgBtn) {
        const t = state.todos.find(x => x.id === imgBtn.dataset.img);
        if (t) openLightbox(t.images[Number(imgBtn.dataset.i)]);
      }
    }
  });

  $('#newBtn').onclick = () => openModal(null);
  $('#cancelBtn').onclick = closeModal;
  $('#saveBtn').onclick = saveTodo;

  modal.addEventListener('mousedown', e => { if (e.target === modal) closeModal(); });

  $('#seg').addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (b) setPriority(b.dataset.v);
  });

  $('#searchInput').addEventListener('input', e => {
    state.query = e.target.value;
    renderList();
  });

  $('#sortSel').addEventListener('change', e => {
    state.sort = e.target.value;
    renderList();
  });

  function quickAdd() {
    const input = $('#quickInput');
    const v = input.value.trim();
    if (!v) { input.focus(); return; }
    state.todos.unshift({
      id: uid(), title: v.slice(0, 120), note: '', images: [], priority: 'medium',
      due: '', tags: [], done: false, createdAt: Date.now(), updatedAt: Date.now()
    });
    input.value = '';
    markDirty();
    if (state.filter === 'done') state.filter = 'all';
    render();
    toast('待办已创建');
  }
  $('#quickBtn').onclick = quickAdd;
  $('#quickInput').addEventListener('keydown', e => { if (e.key === 'Enter') quickAdd(); });

  /* 选择文件 */
  const fileInput = $('#fileInput');
  const pickFile = () => fileInput.click();
  $('#pickBtn').onclick = pickFile;
  $('#pickBtn2').onclick = pickFile;
  fileInput.addEventListener('change', e => {
    addFiles(e.target.files);
    fileInput.value = '';
  });

  /* 拖拽 */
  const dz = $('#dropzone');
  let dragDepth = 0;
  dz.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; dz.classList.add('drag'); });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', e => { e.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; dz.classList.remove('drag'); } });
  dz.addEventListener('drop', e => {
    e.preventDefault(); dragDepth = 0; dz.classList.remove('drag');
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });
  window.addEventListener('dragover', e => { if (e.dataTransfer) e.preventDefault(); });
  window.addEventListener('drop', e => {
    if (dz.contains(e.target)) return;
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      if (!modal.classList.contains('open')) openModal(null);
      addFiles(e.dataTransfer.files);
    }
  });

  /* 缩略图删除 */
  $('#thumbs').addEventListener('click', e => {
    const b = e.target.closest('[data-rm]');
    if (!b) return;
    draftImages.splice(Number(b.dataset.rm), 1);
    renderThumbs();
  });

  /* 粘贴图片：全局生效 */
  document.addEventListener('paste', e => {
    const cd = e.clipboardData;
    if (!cd) return;
    const items = Array.from(cd.items || []);
    const files = items.filter(it => it.kind === 'file' && it.type.indexOf('image/') === 0)
      .map(it => it.getAsFile()).filter(Boolean);
    if (!files.length) return;

    const plain = (cd.getData && cd.getData('text/plain') || '').trim();
    const el = document.activeElement;
    const inText = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    if (plain && inText) return;

    e.preventDefault();
    if (!modal.classList.contains('open')) openModal(null);
    addFiles(files);
  });

  /* 键盘 */
  document.addEventListener('keydown', e => {
    const meta = e.metaKey || e.ctrlKey;
    if (e.key === 'Escape') {
      if (lightbox.classList.contains('open')) { closeLightbox(); return; }
      if (modal.classList.contains('open')) { closeModal(); return; }
    }
    if (meta && e.key === 'Enter' && modal.classList.contains('open')) { e.preventDefault(); saveTodo(); }
    if (meta && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      $('#searchInput').focus();
      $('#searchInput').select();
    }
    if (meta && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      openModal(null);
    }
  });

  $('#lbClose').onclick = closeLightbox;
  lightbox.addEventListener('mousedown', e => { if (e.target === lightbox) closeLightbox(); });
  $('#lbDownload').onclick = () => {
    if (!lbSrc) return;
    const a = document.createElement('a');
    a.href = lbSrc;
    a.download = 'todo-image-' + Date.now() + (lbSrc.indexOf('image/jpeg') > -1 ? '.jpg' : '.png');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* 导出 / 导入 / 清理 */
  $('#exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify({ todos: state.todos, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todo-backup-' + todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('备份已导出');
  };

  $('#importBtn').onclick = () => $('#importInput').click();
  $('#importInput').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) importBackup(file);
  });

  $('#clearDoneBtn').onclick = () => {
    const n = state.todos.filter(t => t.done).length;
    if (!n) { toast('暂时没有已完成的待办'); return; }
    state.todos = state.todos.filter(t => !t.done);
    markDirty();
    render();
    toast('已清除 ' + n + ' 项已完成待办');
  };

  /* 协作空间切换与分享 */
  $('#boardInput').value = boardId;
  $('#boardInput').addEventListener('change', async e => {
    const next = sanitizeBoard(e.target.value);
    e.target.value = next;
    if (next === boardId) return;
    boardId = next;
    localSha = null;
    pendingPush = false;
    clearTimeout(pushTimer);
    const url = new URL(location.href);
    url.searchParams.set('board', boardId);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    setSyncStatus('正在切换协作空间…', 'busy');
    await load();
    render();
    if (await probeCloud()) {
      await syncFromCloud(true);
      startPolling();
    }
  });

  $('#copyShareBtn').onclick = async () => {
    const url = new URL(location.href);
    url.searchParams.set('board', boardId);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast('协作链接已复制');
    } catch (e) {
      toast('复制失败，请手动复制地址栏链接');
    }
  };

  /* 头部文案 */
  function paintHeader() {
    const h = new Date().getHours();
    const greet = h < 5 ? '夜深了，注意休息' : h < 11 ? '早上好，开始新的一天' : h < 14 ? '中午好，吃点东西吧' : h < 18 ? '下午好，保持节奏' : '晚上好，今天辛苦了';
    $('#greet').textContent = greet;
    const d = new Date();
    const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    $('#dateText').textContent = (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 周' + w;
  }

  /* ---------------- 启动 ---------------- */
  (async function init() {
    paintHeader();
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      const row = $('.dz-hint .kbd-row');
      if (row) row.innerHTML = '<span>从相册选择图片，或长按输入框粘贴</span>';
      const hint = $('.sheet-foot .hint');
      if (hint) hint.textContent = '';
    }
    $('#boardInput').value = boardId;
    await load();
    render();
    if (await probeCloud()) {
      await syncFromCloud(true);
      startPolling();
    }
  })();
})();
