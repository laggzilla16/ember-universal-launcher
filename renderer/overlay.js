// overlay.js – runs inside the overlay BrowserWindow

const panel = document.getElementById('panel');

// Show the panel with a slight delay so CSS transition plays
setTimeout(() => {
  panel.classList.add('visible');
  syncWindowSize();
}, 50);

// ---- Real-time FPS display (strictly reports actual game FPS from main process; never measures overlay's own rendering)
let refreshCap = 144;

// Cache last rendered state per element to skip redundant DOM mutations & repaints
const domCache = new Map();
function setText(el, txt) {
  if (!el) return;
  const k = el.id + ':t';
  if (domCache.get(k) !== txt) {
    domCache.set(k, txt);
    el.textContent = txt;
  }
}
function setCls(el, cls) {
  if (!el) return;
  const k = el.id + ':c';
  if (domCache.get(k) !== cls) {
    domCache.set(k, cls);
    el.className = cls;
  }
}
function setBarWidth(el, wStr) {
  if (!el) return;
  const k = el.id + ':w';
  if (domCache.get(k) !== wStr) {
    domCache.set(k, wStr);
    el.style.width = wStr;
  }
}

function updateFpsDisplay(fpsVal) {
  const v = document.getElementById('v-fps');
  const msEl = document.getElementById('v-fps-ms');
  const b = document.getElementById('b-fps');
  if (!v) return;
  if (fpsVal == null || fpsVal <= 0) {
    setText(v, 'N/A');
    setCls(v, 'metric-value na');
    setText(msEl, '');
    setBarWidth(b, '0%');
    setCls(b, 'metric-bar good');
    return;
  }
  const rounded = Math.round(fpsVal);
  const cls = rounded >= 55 ? 'good' : rounded >= 30 ? 'warn' : 'crit';
  setText(v, rounded + ' FPS');
  setCls(v, 'metric-value ' + cls);
  if (msEl) {
    const ms = (1000 / Math.max(1, fpsVal)).toFixed(1);
    setText(msEl, ms + ' ms');
  }
  if (b) {
    const pct = Math.min(100, Math.round((fpsVal / Math.max(60, refreshCap)) * 100));
    setBarWidth(b, pct + '%');
    setCls(b, 'metric-bar ' + cls);
  }
}

// Helper: determine color class based on percentage
function pct2cls(pct) {
  if (pct == null) return 'na';
  if (pct < 60)   return 'good';
  if (pct < 85)   return 'warn';
  return 'crit';
}

// Set a percentage-based metric row
function setPct(valId, barId, pct, label) {
  const v = document.getElementById(valId);
  const b = document.getElementById(barId);
  if (!v) return;
  if (pct == null && !label) {
    setText(v, 'N/A');
    setCls(v, 'metric-value na');
    setBarWidth(b, '0%');
    setCls(b, 'metric-bar good');
    return;
  }
  const cls = pct != null ? pct2cls(pct) : 'good';
  setText(v, label || (Math.round(pct) + '%'));
  setCls(v, 'metric-value ' + (pct != null ? cls : ''));
  if (b) {
    const w = pct != null ? Math.min(100, Math.max(0, Math.round(pct))) : 35;
    setBarWidth(b, w + '%');
    setCls(b, 'metric-bar ' + cls);
  }
}

// Set a temperature metric row
function setTemp(valId, barId, celsius) {
  const v = document.getElementById(valId);
  const b = document.getElementById(barId);
  if (!v) return;
  if (celsius == null) {
    setText(v, 'N/A');
    setCls(v, 'metric-value na');
    setBarWidth(b, '0%');
    setCls(b, 'metric-bar good');
    return;
  }
  const cls = celsius < 70 ? 'good' : celsius < 85 ? 'warn' : 'crit';
  setText(v, Math.round(celsius) + '°C');
  setCls(v, 'metric-value ' + cls);
  if (b) {
    const pct = Math.min(100, Math.max(5, Math.round((celsius / 100) * 100)));
    setBarWidth(b, pct + '%');
    setCls(b, 'metric-bar ' + cls);
  }
}

// Measure #panel and resize the overlay BrowserWindow to fit cleanly
let lastW = 0, lastH = 0;
function syncWindowSize() {
  if (!panel) return;
  const zoomStr = getComputedStyle(panel).zoom;
  const zoom = parseFloat(zoomStr) || 1;
  const rect = panel.getBoundingClientRect();
  // In Chromium, getBoundingClientRect() either includes or excludes CSS zoom depending on version;
  // use offsetWidth * zoom + 20px margin to be reliably exact across all Electron versions.
  const w = Math.ceil(Math.max(rect.width, panel.offsetWidth * zoom) + 20);
  const h = Math.ceil(Math.max(rect.height, panel.offsetHeight * zoom) + 20);
  if (Math.abs(w - lastW) > 1 || Math.abs(h - lastH) > 1) {
    lastW = w;
    lastH = h;
    overlay.resize(w, h);
  }
}

// Update layout, size, and visibility of metric rows based on settings
let lastSettingsKey = '';
function applySettings(s) {
  if (!s) return;
  const key = JSON.stringify({ l: s.layout, z: s.size, m: s.metrics });
  if (key === lastSettingsKey) return;
  lastSettingsKey = key;

  const layout = ['vertical', 'horizontal', 'compact', 'expanded'].includes(s.layout) ? s.layout : 'vertical';
  const size = ['small', 'medium', 'large'].includes(s.size) ? s.size : 'medium';

  panel.classList.remove('layout-vertical', 'layout-horizontal', 'layout-compact', 'layout-expanded');
  panel.classList.remove('size-small', 'size-medium', 'size-large');
  panel.classList.add('layout-' + layout, 'size-' + size);

  if (s.metrics) {
    const m = s.metrics;
    const map = {
      fps: 'm-fps',
      cpu: 'm-cpu',
      gpu: 'm-gpu',
      vram: 'm-vram',
      ram: 'm-ram',
      cpuTemp: 'm-cpuTemp',
      gpuTemp: 'm-gpuTemp'
    };
    for (const [k, rowId] of Object.entries(map)) {
      const el = document.getElementById(rowId);
      if (el) el.classList.toggle('hidden', m[k] === false);
    }
    const hasFps = m.fps !== false;
    const hasCompute = m.cpu !== false || m.gpu !== false;
    const hasMem = m.vram !== false || m.ram !== false;
    const hasTemp = m.cpuTemp !== false || m.gpuTemp !== false;

    const divFps = document.getElementById('div-fps');
    const divMem = document.getElementById('div-mem');
    const divTemp = document.getElementById('div-temp');
    if (divFps) divFps.classList.toggle('hidden', !(hasFps && (hasCompute || hasMem || hasTemp)));
    if (divMem) divMem.classList.toggle('hidden', !(hasCompute && (hasMem || hasTemp)));
    if (divTemp) divTemp.classList.toggle('hidden', !(hasMem && hasTemp));
  }

  requestAnimationFrame(syncWindowSize);
}

// Receive metrics from main process
overlay.on('metrics', (data) => {
  if (!data) return;
  if (data.settings) applySettings(data.settings);
  if (data.refreshHz && data.refreshHz > 0) refreshCap = data.refreshHz;

  // FPS – strictly display actual game FPS or N/A if unavailable
  const gameFps = data.fps != null && data.fps > 0 ? data.fps : null;
  updateFpsDisplay(gameFps);

  // CPU
  setPct('v-cpu', 'b-cpu', data.cpu != null ? data.cpu : null);

  // GPU
  setPct('v-gpu', 'b-gpu', data.gpu != null ? data.gpu : null);

  // VRAM – show in MB or GB
  if (data.vramMB != null) {
    const vramPct = data.vramPct != null ? data.vramPct : Math.min(100, Math.round((data.vramMB / 8192) * 100));
    const label = data.vramMB >= 1024
      ? (data.vramMB / 1024).toFixed(1) + ' GB'
      : Math.round(data.vramMB) + ' MB';
    setPct('v-vram', 'b-vram', vramPct, label);
  } else {
    setPct('v-vram', 'b-vram', null);
  }

  // RAM
  if (data.ramUsedGB != null) {
    const isCompact = panel.classList.contains('layout-compact') || panel.classList.contains('layout-horizontal');
    const label = (!isCompact && data.ramTotalGB)
      ? data.ramUsedGB.toFixed(1) + ' / ' + data.ramTotalGB.toFixed(0) + ' GB'
      : data.ramUsedGB.toFixed(1) + ' GB';
    setPct('v-ram', 'b-ram', data.ramPct != null ? data.ramPct : null, label);
  } else {
    setPct('v-ram', 'b-ram', null);
  }

  // Temps
  setTemp('v-cpuTemp', 'b-cpuTemp', data.cpuTemp);
  setTemp('v-gpuTemp', 'b-gpuTemp', data.gpuTemp);

  if (panel.classList.contains('layout-horizontal')) {
    syncWindowSize();
  }
});

// React to settings updates
overlay.on('settings', (s) => {
  applySettings(s);
});

// ---- Interactive Dragging to Custom Position
let isDragging = false;

panel.addEventListener('mouseenter', () => {
  overlay.setIgnoreMouse(false);
});

panel.addEventListener('mouseleave', () => {
  if (!isDragging) overlay.setIgnoreMouse(true);
});

panel.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  isDragging = true;
  panel.classList.add('dragging');
  overlay.dragStart();
});

function stopDrag() {
  if (!isDragging) return;
  isDragging = false;
  panel.classList.remove('dragging');
  overlay.dragEnd();
  if (!panel.matches(':hover')) overlay.setIgnoreMouse(true);
}

window.addEventListener('mouseup', stopDrag);
window.addEventListener('blur', stopDrag);
