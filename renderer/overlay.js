// overlay.js – runs inside the overlay BrowserWindow

const panel = document.getElementById('panel');

// Show the panel with a slight delay so CSS transition plays
setTimeout(() => panel.classList.add('visible'), 50);

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
  if (pct == null) {
    v.textContent = 'N/A';
    v.className = 'metric-value na';
    if (b) { b.style.width = '0%'; b.className = 'metric-bar good'; }
    return;
  }
  const cls = pct2cls(pct);
  v.textContent = label || (Math.round(pct) + '%');
  v.className = 'metric-value ' + cls;
  if (b) { b.style.width = Math.min(100, pct) + '%'; b.className = 'metric-bar ' + cls; }
}

// Set a non-percentage temp metric
function setTemp(valId, celsius) {
  const v = document.getElementById(valId);
  if (celsius == null) {
    v.textContent = 'N/A';
    v.className = 'metric-value na';
    return;
  }
  const cls = celsius < 70 ? 'good' : celsius < 85 ? 'warn' : 'crit';
  v.textContent = Math.round(celsius) + '°C';
  v.className = 'metric-value ' + cls;
}

// Update visibility of metric rows based on settings
function applySettings(metrics) {
  const map = { cpu: 'm-cpu', gpu: 'm-gpu', vram: 'm-vram', ram: 'm-ram', cpuTemp: 'm-cpuTemp', gpuTemp: 'm-gpuTemp' };
  for (const [key, rowId] of Object.entries(map)) {
    const el = document.getElementById(rowId);
    if (el) el.classList.toggle('hidden', metrics[key] === false);
  }
}

// Receive metrics from main process
overlay.on('metrics', (data) => {
  // data = { cpu, gpu, vramMB, ramUsedGB, ramTotalGB, ramPct, vramPct, cpuTemp, gpuTemp, settings }

  if (data.settings && data.settings.metrics) {
    applySettings(data.settings.metrics);
  }

  // CPU
  setPct('v-cpu', 'b-cpu', data.cpu != null ? data.cpu : null);

  // GPU
  setPct('v-gpu', 'b-gpu', data.gpu != null ? data.gpu : null);

  // VRAM – show in MB or GB
  if (data.vramMB != null) {
    const vramPct = data.vramPct != null ? data.vramPct : null;
    const label = data.vramMB >= 1024
      ? (data.vramMB / 1024).toFixed(1) + ' GB'
      : Math.round(data.vramMB) + ' MB';
    setPct('v-vram', 'b-vram', vramPct, label);
  } else {
    setPct('v-vram', 'b-vram', null);
  }

  // RAM
  if (data.ramUsedGB != null) {
    const label = data.ramTotalGB
      ? data.ramUsedGB.toFixed(1) + ' / ' + data.ramTotalGB.toFixed(0) + ' GB'
      : data.ramUsedGB.toFixed(1) + ' GB';
    setPct('v-ram', 'b-ram', data.ramPct != null ? data.ramPct : null, label);
  } else {
    setPct('v-ram', 'b-ram', null);
  }

  // Temps
  setTemp('v-cpuTemp', data.cpuTemp);
  setTemp('v-gpuTemp', data.gpuTemp);
});

// React to settings updates
overlay.on('settings', (s) => {
  if (s && s.metrics) applySettings(s.metrics);
});
