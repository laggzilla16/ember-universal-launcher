const { contextBridge, ipcRenderer: r } = require('electron');
contextBridge.exposeInMainWorld('overlay', {
  on: (c, f) => r.on(c, (_, ...a) => f(...a)),
  resize: (width, height) => r.send('overlay:resize', { width, height }),
  setIgnoreMouse: ignore => r.send('overlay:mouse', !!ignore),
  dragStart: () => r.send('overlay:drag-start'),
  dragEnd: () => r.send('overlay:drag-end')
});
