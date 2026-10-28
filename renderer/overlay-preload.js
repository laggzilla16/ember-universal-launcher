const { contextBridge, ipcRenderer: r } = require('electron');
contextBridge.exposeInMainWorld('overlay', {
  on: (c, f) => r.on(c, (_, ...a) => f(...a))
});
