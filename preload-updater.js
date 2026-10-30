const { contextBridge, ipcRenderer: r } = require('electron');
contextBridge.exposeInMainWorld('updater', {
  on: f => r.on('updater:state', (_, s) => f(s)),
  retry: () => r.invoke('updater:retry'),
  dismiss: () => r.invoke('updater:dismiss')
});

