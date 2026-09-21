// app.js — Motorbrands · Application logic

const CAT = {
  all:        { label: 'All',          short: 'All'  },
  car:        { label: 'Cars',         short: 'Auto' },
  moto:       { label: 'Motorcycles',  short: 'Moto' },
  autonomous: { label: 'Autonomous',   short: 'AV'   },
};

const FUEL_META = {
  electric:   { label: 'Electric',   abbr: 'E' },
  hybrid:     { label: 'Hybrid',     abbr: 'H' },
  combustion: { label: 'Combustion', abbr: 'C' },
};

const state = {
  category:    'all',
  fuels:       [],
  query:       '',
  sort:        'name-asc',
  showDefunct: false,
  country:     '',
  group:       '',
  era:         '',
  view:        'grid',
};

let heroVizCleanup = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonogram(b) {
  if (b.mono) return b.mono;
  const words = b.name.split(/[\s\-\/·]+/).filter(Boolean);
  if (words.length === 1) return b.name.slice(0, 3).toUpperCase();
  if (words[0] === words[0].toUpperCase() && words[0].length <= 3) return words[0];
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return null; }
}

function logoImg(b) {
  const catSuffix = b.category === 'car' ? 'auto' : b.category;
  const localSrc = `assets/${b.id}-${catSuffix}.png`;
  const domain = b.url ? getDomain(b.url) : null;
  const fallbackSrc = domain ? `https://logo.clearbit.com/${domain}` : null;

  const fallbackAttr = fallbackSrc
    ? `onerror="if(this.dataset.tried){this.remove()}else{this.dataset.tried=1;this.src='${fallbackSrc}'}"`
    : `onerror="this.remove()"`;

  return `<img class="brand-logo" src="${localSrc}" alt="" `
    + `onload="this.parentElement.classList.add('has-logo')" ${fallbackAttr}>`;
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Filtering ─────────────────────────────────────────────────────────────────

const matchesCategory = b => state.category === 'all' || b.category === state.category;
const matchesFuel     = b => !state.fuels.length || state.fuels.some(f => b.fuel.includes(f));
const matchesStatus   = b => state.showDefunct || b.status !== 'defunct';
const matchesCountry  = b => !state.country || b.country === state.country;
const matchesGroup    = b => !state.group   || b.group   === state.group;

function matchesQuery(b) {
  if (!state.query) return true;
  const q = state.query.toLowerCase();
  return b.name.toLowerCase().includes(q) ||
    b.country.toLowerCase().includes(q) ||
    (b.group && b.group.toLowerCase().includes(q));
}

function matchesEra(b) {
  const y = b.founded;
  switch (state.era) {
    case 'pre-1950':  return y < 1950;
    case '1950-1990': return y >= 1950 && y < 1990;
    case '1990-2010': return y >= 1990 && y < 2010;
    case 'post-2010': return y >= 2010;
    default:          return true;
  }
}

function passes(b) {
  return matchesCategory(b) && matchesFuel(b) && matchesQuery(b) &&
    matchesStatus(b) && matchesCountry(b) && matchesGroup(b) && matchesEra(b);
}

function getFiltered() {
  return BRANDS.filter(passes).sort((a, b) => {
    switch (state.sort) {
      case 'name-asc':      return a.name.localeCompare(b.name);
      case 'name-desc':     return b.name.localeCompare(a.name);
      case 'founded-asc':   return a.founded - b.founded;
      case 'founded-desc':  return b.founded - a.founded;
      default:              return a.name.localeCompare(b.name);
    }
  });
}

function countForCategory(cat) {
  return BRANDS.filter(b => {
    const prevCat = state.category;
    state.category = cat;
    const ok = passes(b);
    state.category = prevCat;
    return ok;
  }).length;
}

// ── Card HTML (grid view) ─────────────────────────────────────────────────────

function cardHTML(b) {
  const mono  = esc(getMonogram(b));
  const rgb   = hexToRgb(b.color);
  const isDef = b.status === 'defunct';
  const fuels = b.fuel.map(f =>
    `<span class="fd fd-${f}" title="${FUEL_META[f].label}">${FUEL_META[f].abbr}</span>`
  ).join('');

  return `
<article class="card${isDef ? ' card-defunct' : ''}" data-id="${esc(b.id)}" style="--rgb:${rgb};--clr:${esc(b.color)};">
  <div class="card-head">
    <div class="mono">${logoImg(b)}<span class="mono-text">${mono}</span></div>
    <div class="card-pills">
      ${isDef ? '<span class="pill pill-defunct">Defunct</span>' : ''}
      <span class="pill pill-${b.category}">${CAT[b.category].short}</span>
    </div>
  </div>
  <div class="card-body">
    <h3 class="card-name">${esc(b.name)}</h3>
    ${b.group ? `<p class="card-group">${esc(b.group)}</p>` : ''}
    <p class="card-meta">
      <span class="card-country">${b.flag}&nbsp;${esc(b.country)}</span>
      <span class="card-year">${b.founded}</span>
    </p>
    <div class="card-fuels">${fuels}</div>
  </div>
  <div class="card-hover-panel" aria-hidden="true">
    <div class="chp-mid">
      <a class="chp-btn" href="brand.html?id=${esc(b.id)}" tabindex="-1">Más información</a>
    </div>
    <div class="chp-foot">
      <strong class="chp-name">${esc(b.name)}</strong>
      ${b.url ? `<a class="chp-web" href="${esc(b.url)}" target="_blank" rel="noopener" tabindex="-1">Ver web&thinsp;↗</a>` : ''}
    </div>
  </div>
  <a class="card-overlay" href="brand.html?id=${esc(b.id)}" aria-label="${esc(b.name)} — ver ficha"></a>
</article>`;
}

// ── List Row HTML (list view) ─────────────────────────────────────────────────

function listRowHTML(b) {
  const mono  = esc(getMonogram(b));
  const rgb   = hexToRgb(b.color);
  const isDef = b.status === 'defunct';
  const fuels = b.fuel.map(f =>
    `<span class="fd fd-${f}" title="${FUEL_META[f].label}">${FUEL_META[f].abbr}</span>`
  ).join('');

  return `
<article class="brand-row${isDef ? ' card-defunct' : ''}" data-id="${esc(b.id)}" style="--rgb:${rgb};--clr:${esc(b.color)};">
  <div class="mono row-mono">${logoImg(b)}<span class="mono-text">${mono}</span></div>
  <div class="row-info">
    <span class="row-name">${esc(b.name)}</span>
    ${b.group ? `<span class="row-group-text">${esc(b.group)}</span>` : ''}
  </div>
  <div class="row-origin">
    <span class="card-country">${b.flag}&nbsp;${esc(b.country)}</span>
    <span class="card-year">${b.founded}</span>
  </div>
  <div class="card-fuels">${fuels}</div>
  <div class="row-pill">
    <span class="pill pill-${b.category}">${CAT[b.category].short}</span>
    ${isDef ? '<span class="pill pill-defunct">Defunct</span>' : ''}
  </div>
  <a class="card-overlay" href="brand.html?id=${esc(b.id)}" aria-label="${esc(b.name)} — ver ficha"></a>
</article>`;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function render() {
  const brands = getFiltered();
  const grid   = document.getElementById('grid');
  const empty  = document.getElementById('empty');
  const count  = document.getElementById('results-count');

  grid.innerHTML = brands.map(b => state.view === 'list' ? listRowHTML(b) : cardHTML(b)).join('');
  empty.hidden = brands.length > 0;
  count.textContent = `${brands.length} brands`;

  document.querySelectorAll('[data-tab]').forEach(tab => {
    const saved = state.category;
    state.category = tab.dataset.tab;
    tab.querySelector('.tc').textContent = BRANDS.filter(passes).length;
    state.category = saved;
  });

  updateClearBtn();
  syncHeroCards();
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function updateHeroCards() {
  ['car', 'moto', 'autonomous'].forEach(cat => {
    const brands = BRANDS
      .filter(b => b.category === cat && b.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));

    const countEl   = document.getElementById(`hero-count-${cat}`);
    const previewEl = document.getElementById(`hero-preview-${cat}`);
    if (countEl)   countEl.textContent   = brands.length;
    if (previewEl) previewEl.textContent =
      brands.slice(0, 4).map(b => b.name).join(', ') + (brands.length > 4 ? '…' : '');
  });
}

function syncHeroCards() {
  ['car', 'moto', 'autonomous'].forEach(cat => {
    const btn = document.getElementById(`hero-${cat}`);
    if (btn) btn.classList.toggle('is-active', state.category === cat);
  });
}

// ── Hero Globe viz ────────────────────────────────────────────────────────────

async function initHeroViz() {
  if (heroVizCleanup) { heroVizCleanup(); heroVizCleanup = null; }
  const container = document.getElementById('site-hero-viz');
  if (!container) return;
  container.innerHTML = '';

  const dark = document.documentElement.getAttribute('data-theme') === 'dark';

  const carCount  = BRANDS.filter(b => b.category === 'car'        && b.status !== 'defunct').length;
  const motoCount = BRANDS.filter(b => b.category === 'moto'       && b.status !== 'defunct').length;
  const avCount   = BRANDS.filter(b => b.category === 'autonomous' && b.status !== 'defunct').length;

  // Fetch world land topology (CDN, cached by browser)
  let landPts = [];
  try {
    const world = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json').then(r => r.json());
    landPts = _globeRasterizeLand(world);
  } catch (_) {
    landPts = _globeFallbackPts();
  }
  if (!container.isConnected) return;

  // Canvas — fills container
  const rect = container.getBoundingClientRect();
  const W    = rect.width  || 440;
  const H    = rect.height || W;
  const DPR  = Math.min(devicePixelRatio || 1, 2);

  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  const CX = W / 2, CY = H / 2;
  const R  = Math.min(W, H) * 0.375;

  // Globe palette (light / dark)
  const COL = dark ? {
    atmo0: 'rgba(80,130,255,0.07)', atmo1: 'rgba(80,130,255,0)',
    gFrom: '#121929', gMid: '#0c1220', gTo: '#080d18',
    grid:  'rgba(80,130,255,0.08)',
    spec0: 'rgba(255,255,255,0.04)', spec1: 'rgba(255,255,255,0)',
  } : {
    atmo0: 'rgba(120,155,255,0.05)', atmo1: 'rgba(120,155,255,0)',
    gFrom: '#FCFDFF', gMid: '#F5F8FF', gTo: '#EBF1FF',
    grid:  'rgba(170,195,255,0.13)',
    spec0: 'rgba(255,255,255,0.20)', spec1: 'rgba(255,255,255,0)',
  };

  // Orbit pills (HTML, positioned each frame)
  const PILL_DEFS = [
    { num: carCount,  label: 'Auto Brands',  color: '#3B82F6', angle: 2.0,  tilt:  25, orbitR: 1.10, speed: 0.0028 },
    { num: motoCount, label: 'Moto Brands',  color: '#F97316', angle: 4.0,  tilt: -20, orbitR: 1.10, speed: 0.0020 },
    { num: avCount,   label: 'Autonomous',   color: '#22C55E', angle: 0.3,  tilt:  40, orbitR: 1.10, speed: 0.0024 },
  ];

  const pills = PILL_DEFS.map(def => {
    const el = document.createElement('div');
    el.className = 'hero-orbit-pill';
    el.innerHTML = `<span class="hop-dot" style="background:${def.color}"></span><strong class="hop-num" style="color:${def.color}">${def.num}</strong><span class="hop-lbl">${def.label}</span>`;
    container.appendChild(el);
    return { ...def, el, angle: def.angle };
  });

  let globeRot = 0;
  let raf;

  function frame() {
    ctx.clearRect(0, 0, W, H);

    // Subtle atmosphere ring
    {
      const g = ctx.createRadialGradient(CX, CY, R * 0.94, CX, CY, R * 1.14);
      g.addColorStop(0, COL.atmo0); g.addColorStop(1, COL.atmo1);
      ctx.beginPath(); ctx.arc(CX, CY, R * 1.14, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    }

    // Globe sphere (very soft gradient, almost flat)
    {
      const g = ctx.createRadialGradient(CX - R * .2, CY - R * .2, R * .05, CX + R * .1, CY + R * .1, R);
      g.addColorStop(0, COL.gFrom); g.addColorStop(1, COL.gTo);
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    }

    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, R * 0.998, 0, Math.PI * 2); ctx.clip();

    // Minimal graticule — equator + tropics only
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 0.5;
    [0, 30, -30].forEach(latDeg => {
      const lat = latDeg * Math.PI / 180;
      const gy  = CY - Math.sin(lat) * R;
      const hw  = Math.cos(lat) * R;
      ctx.beginPath(); ctx.moveTo(CX - hw, gy); ctx.lineTo(CX + hw, gy); ctx.stroke();
    });
    // Meridians — every 60° for cleaner look
    for (let ld = 0; ld < 360; ld += 60) {
      const lon = (ld * Math.PI / 180) + globeRot;
      if (Math.sin(lon) < 0) continue;
      const a = Math.abs(Math.cos(lon)) * R;
      ctx.beginPath(); ctx.ellipse(CX, CY, a, R, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Land dots (uniform blue, world map)
    for (const [lat, lon] of landPts) {
      const l  = lon + globeRot;
      const x3 = Math.cos(lat) * Math.cos(l);
      const y3 = Math.sin(lat);
      const z3 = Math.cos(lat) * Math.sin(l);
      if (z3 < 0) continue;
      const px    = CX + x3 * R;
      const py    = CY - y3 * R;
      const alpha = (0.38 + 0.52 * z3).toFixed(2);
      const dotR  = 0.9 + z3 * 0.5;
      ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(60,100,210,${alpha})`;
      ctx.fill();
    }

    ctx.restore();

    // Very subtle specular
    {
      const g = ctx.createRadialGradient(CX - R * .3, CY - R * .3, 0, CX, CY, R * .7);
      g.addColorStop(0, COL.spec0); g.addColorStop(1, COL.spec1);
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Update pill positions
    for (const p of pills) {
      p.angle += p.speed;
      const tR = p.tilt * Math.PI / 180;
      const oR = R * p.orbitR;
      const x3   = Math.cos(p.angle) * oR;
      const yPl  = Math.sin(p.angle) * oR;
      const y3   = yPl * Math.cos(tR);
      const z3   = yPl * Math.sin(tR);
      const sx   = CX + x3;
      const sy   = CY - y3;
      const dist = Math.sqrt(x3 * x3 + y3 * y3);
      const hide = z3 < 0 && dist < R * 0.88;
      // Clamp so pill never exits the container width
      const pillW = p.el.offsetWidth || 120;
      const clampedSx = Math.min(sx, W - pillW / 2 - 8);
      p.el.style.left    = clampedSx + 'px';
      p.el.style.top     = sy + 'px';
      p.el.style.opacity = hide ? '0' : '1';
      p.el.style.zIndex  = z3 > 0 ? '3' : '1';
    }

    globeRot += 0.003;
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  heroVizCleanup = () => cancelAnimationFrame(raf);
}

function _globeRasterizeLand(world) {
  if (typeof topojson === 'undefined') return _globeFallbackPts();
  const land = topojson.feature(world, world.objects.land);
  const W = 360, H = 180;
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const c = tmp.getContext('2d');
  const proj = d3.geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]);
  const path = d3.geoPath(proj, c);
  c.fillStyle = '#fff';
  c.beginPath(); path(land); c.fill();
  const px = c.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4] > 128 && Math.random() < 0.21) {
        pts.push([
          (90 - (y / H) * 180) * Math.PI / 180,
          ((x / W) * 360 - 180) * Math.PI / 180,
        ]);
      }
    }
  }
  return pts;
}

function _globeFallbackPts() {
  const D = Math.PI / 180;
  const blobs = [
    [50, -100, 22, 32, 80], [-15, -55, 27, 22, 60], [52, 15, 16, 26, 50],
    [5, 25, 30, 28, 70],    [45, 90, 28, 52, 100],  [-25, 135, 15, 18, 40],
    [70, -40, 8, 18, 15],
  ];
  const pts = [];
  for (const [clat, clon, slat, slon, n] of blobs) {
    for (let i = 0; i < n; i++) {
      const lat = (clat + (Math.random() - .5) * 2 * slat) * D;
      const lon = (clon + (Math.random() - .5) * 2 * slon) * D;
      if (Math.abs(lat) < Math.PI / 2) pts.push([lat, lon]);
    }
  }
  return pts;
}

// ── View toggle ───────────────────────────────────────────────────────────────

function setView(view) {
  state.view = view;
  document.getElementById('grid').classList.toggle('view-list', view === 'list');
  const listHeader = document.getElementById('list-header');
  if (listHeader) listHeader.hidden = view !== 'list';
  document.getElementById('view-grid').classList.toggle('active', view === 'grid');
  document.getElementById('view-list-btn').classList.toggle('active', view === 'list');
  render();
}

// ── Clear filters ─────────────────────────────────────────────────────────────

function updateClearBtn() {
  const active = state.country || state.group || state.era ||
    state.fuels.length > 0 || state.showDefunct || state.query;
  const btn = document.getElementById('clear-filters');
  if (btn) btn.hidden = !active;
}

function clearFilters() {
  state.country = ''; state.group = ''; state.era = '';
  state.fuels = []; state.showDefunct = false; state.query = '';
  document.getElementById('filter-country').value = '';
  document.getElementById('filter-group').value   = '';
  document.getElementById('filter-era').value     = '';
  document.getElementById('toggle-defunct').checked = false;
  document.getElementById('search').value = '';
  document.querySelectorAll('.fuel-btn').forEach(b => b.classList.remove('active'));
  render();
}

// ── Populate dropdowns ────────────────────────────────────────────────────────

function populateDropdowns() {
  const countryMap = new Map();
  const groups = new Set();
  BRANDS.forEach(b => {
    if (!countryMap.has(b.country)) countryMap.set(b.country, b.flag);
    if (b.group) groups.add(b.group);
  });

  const countrySelect = document.getElementById('filter-country');
  [...countryMap.entries()].sort((a,b) => a[0].localeCompare(b[0])).forEach(([c, flag]) => {
    const o = document.createElement('option');
    o.value = c; o.textContent = `${flag} ${c}`;
    countrySelect.appendChild(o);
  });

  const groupSelect = document.getElementById('filter-group');
  [...groups].sort().forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    groupSelect.appendChild(o);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  populateDropdowns();
  updateHeroCards();
  initHeroViz();

  // Search
  const searchEl = document.getElementById('search');
  const onSearch = e => { state.query = e.target.value.trim(); render(); };
  searchEl.addEventListener('input',  onSearch);
  searchEl.addEventListener('search', onSearch);
  document.getElementById('search-clear').addEventListener('click', () => {
    searchEl.value = ''; state.query = ''; render(); searchEl.focus();
  });

  // Category tabs
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.category = tab.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      render();
    });
  });

  // Hero category cards — click to filter, click again to deselect
  document.querySelectorAll('.hero-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      state.category = state.category === cat ? 'all' : cat;
      document.querySelectorAll('[data-tab]').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === state.category)
      );
      render();
      document.getElementById('grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Fuel toggle buttons
  document.querySelectorAll('[data-fuel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.fuel;
      const i = state.fuels.indexOf(f);
      if (i === -1) { state.fuels.push(f); btn.classList.add('active'); }
      else { state.fuels.splice(i, 1); btn.classList.remove('active'); }
      render();
    });
  });

  // Secondary filters
  document.getElementById('filter-country').addEventListener('change', e => { state.country = e.target.value; render(); });
  document.getElementById('filter-group').addEventListener('change',   e => { state.group   = e.target.value; render(); });
  document.getElementById('filter-era').addEventListener('change',     e => { state.era     = e.target.value; render(); });

  // Sort + defunct
  document.getElementById('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  document.getElementById('toggle-defunct').addEventListener('change', e => { state.showDefunct = e.target.checked; render(); });

  // Clear
  document.getElementById('clear-filters').addEventListener('click', clearFilters);

  // View toggle
  document.getElementById('view-grid').addEventListener('click', () => setView('grid'));
  document.getElementById('view-list-btn').addEventListener('click', () => setView('list'));

  // Filter panel toggle
  const filtrarBtn = document.getElementById('filtrar-btn');
  const advFilters = document.getElementById('adv-filters');
  if (filtrarBtn && advFilters) {
    filtrarBtn.addEventListener('click', () => {
      const opening = advFilters.hidden;
      advFilters.hidden = !opening;
      filtrarBtn.setAttribute('aria-expanded', String(opening));
      filtrarBtn.classList.toggle('is-open', opening);
    });
  }

  // Hero CTA → scroll to grid
  const heroBtn = document.getElementById('hero-explore-btn');
  if (heroBtn) {
    heroBtn.addEventListener('click', () =>
      document.getElementById('grid').scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  }

  // Re-render viz on theme change (toggle handled by nav.js)
  document.getElementById('theme-toggle').addEventListener('click', initHeroViz);

  render();

  // ── Hide-on-scroll nav ───────────────────────────────────────────────────
  (function () {
    const nav = document.querySelector('.site-nav');
    const filterbar = document.querySelector('.filterbar');
    if (!nav || !filterbar) return;

    const navH = nav.offsetHeight;
    let lastY = window.scrollY;
    let hidden = false;
    let ticking = false;

    function update() {
      const y = window.scrollY;
      const fbTop = filterbar.getBoundingClientRect().top;

      // Only engage once filterbar has reached the fixed nav
      if (fbTop <= navH) {
        if (y > lastY && !hidden) {
          nav.classList.add('nav--hidden');
          hidden = true;
        } else if (y < lastY && hidden) {
          nav.classList.remove('nav--hidden');
          hidden = false;
        }
      } else if (hidden) {
        // Still in hero area — always show nav
        nav.classList.remove('nav--hidden');
        hidden = false;
      }

      lastY = y;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  })();
});
