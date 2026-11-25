const { contextBridge, ipcRenderer: r } = require('electron');
contextBridge.exposeInMainWorld('quick', {
  list: query => r.invoke('quick:list', typeof query === 'string' ? query.slice(0, 100) : ''),
  launch: id => r.invoke('quick:launch', Number(id)),
  close: () => r.invoke('quick:close'),
  onOpen: f => r.on('quick:open', () => f())
});
