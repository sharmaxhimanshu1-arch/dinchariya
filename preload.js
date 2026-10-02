'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  isElectron: true,
  load: () => ipcRenderer.invoke('data:load'),
  save: (json) => ipcRenderer.invoke('data:save', json),
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),
  setPrefs: (p) => ipcRenderer.invoke('prefs:set', p),
  openFolder: () => ipcRenderer.invoke('data:openFolder'),
  exportData: (json) => ipcRenderer.invoke('data:export', json),
  importData: () => ipcRenderer.invoke('data:import'),
  onPalette: (fn) => ipcRenderer.on('palette', () => fn())
});
