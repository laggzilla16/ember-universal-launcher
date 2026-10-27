const { contextBridge, ipcRenderer: r } = require('electron');
contextBridge.exposeInMainWorld('api', {
  games: () => r.invoke('games'), sessions: () => r.invoke('sessions'),
  save: g => r.invoke('save', g), remove: i => r.invoke('remove', i),
  launch: i => r.invoke('launch', i), theme: t => r.invoke('theme', t), pick: k => r.invoke('pick', k),
  on: (c, f) => r.on(c, (_, ...a) => f(...a))
});
