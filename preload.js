const { contextBridge, ipcRenderer: r } = require('electron');
contextBridge.exposeInMainWorld('api', {
  games: () => r.invoke('games'), stats: () => r.invoke('stats'), sessions: () => r.invoke('sessions'),
  save: g => r.invoke('save', g), remove: i => r.invoke('remove', i),
  launch: i => r.invoke('launch', i), theme: t => r.invoke('theme', t),
  version: () => r.invoke('version'), checkUpdate: () => r.invoke('update:check'),
  downloadUpdate: () => r.invoke('update:download'), installUpdate: () => r.invoke('update:install'), open: u => r.invoke('open', u), pick: k => r.invoke('pick', k),
  overlayToggle: () => r.invoke('overlay:toggle'),
  overlaySettings: s => r.invoke('overlay:settings', s),
  overlayGetSettings: () => r.invoke('overlay:getSettings'),
  appGetSettings: () => r.invoke('app:getSettings'), appSettings: s => r.invoke('app:settings', s),
  on: (c, f) => r.on(c, (_, ...a) => f(...a))
});
