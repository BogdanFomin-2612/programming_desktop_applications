const { contextBridge } = require('electron');

// Expose a minimal API surface to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
