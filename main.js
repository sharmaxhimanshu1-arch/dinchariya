'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

app.setAppUserModelId('com.himanshu.dinchariya');

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win = null;
let tray = null;
let quitting = false;
let prefs = { closeToTray: true, startOnLogin: false };

const ICON_ICO = path.join(__dirname, 'assets', 'icon.ico');
const ICON_PNG = path.join(__dirname, 'assets', 'icon-256.png');
const dataDir = () => app.getPath('userData');
const dataFile = () => path.join(dataDir(), 'dinchariya-data.json');

/* ---------- storage: atomic write + rolling backups ---------- */
function validJson(s) { try { JSON.parse(s); return true; } catch { return false; } }

function readData() {
  const f = dataFile();
  for (const p of [f, f + '.bak']) {
    try {
      const s = fs.readFileSync(p, 'utf8');
      if (validJson(s)) return s;
    } catch { /* try next */ }
  }
  return null;
}

function writeData(json) {
  const f = dataFile();
  fs.mkdirSync(dataDir(), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, json);
  if (fs.existsSync(f)) { try { fs.copyFileSync(f, f + '.bak'); } catch { /* ignore */ } }
  fs.renameSync(tmp, f);
  dailyBackup(json);
}

function dailyBackup(json) {
  try {
    const dir = path.join(dataDir(), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const d = new Date();
    const day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const target = path.join(dir, 'dinchariya-' + day + '.json');
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, json);
      const files = fs.readdirSync(dir).filter(n => n.startsWith('dinchariya-')).sort();
      while (files.length > 14) fs.unlinkSync(path.join(dir, files.shift()));
    }
  } catch { /* backups are best-effort */ }
}

/* ---------- window / tray ---------- */
function showWindow() {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1000,
    minHeight: 660,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    show: false,
    title: 'Dinchariya',
    icon: fs.existsSync(ICON_ICO) ? ICON_ICO : ICON_PNG,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    if (!process.argv.includes('--hidden')) win.show();
  });
  win.on('close', (e) => {
    if (!quitting && prefs.closeToTray) {
      e.preventDefault();
      win.hide();
    }
  });
  win.on('closed', () => { win = null; });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });
}

function createTray() {
  try {
    const img = nativeImage.createFromPath(ICON_PNG).resize({ width: 18, height: 18 });
    tray = new Tray(img);
    tray.setToolTip('Dinchariya');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Dinchariya', click: showWindow },
      { label: 'Quick add (Ctrl+K)', click: () => { showWindow(); if (win) win.webContents.send('palette'); } },
      { type: 'separator' },
      { label: 'Quit', click: () => { quitting = true; app.quit(); } }
    ]));
    tray.on('click', () => (win && win.isVisible() && win.isFocused() ? win.hide() : showWindow()));
  } catch { /* tray is optional */ }
}

app.on('second-instance', showWindow);
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => { if (quitting) app.quit(); });

app.whenReady().then(() => {
  try {
    const raw = readData();
    if (raw) {
      const s = JSON.parse(raw).settings || {};
      if (typeof s.closeToTray === 'boolean') prefs.closeToTray = s.closeToTray;
      if (typeof s.startOnLogin === 'boolean') prefs.startOnLogin = s.startOnLogin;
    }
  } catch { /* defaults */ }
  createWindow();
  createTray();
});

/* ---------- IPC ---------- */
ipcMain.handle('data:load', () => readData());
ipcMain.handle('data:save', (_e, json) => {
  if (typeof json !== 'string' || !validJson(json)) return false;
  writeData(json);
  return true;
});
ipcMain.handle('notify', (_e, title, body) => {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title: String(title || 'Dinchariya'), body: String(body || ''), icon: ICON_PNG });
  n.on('click', showWindow);
  n.show();
  return true;
});
ipcMain.handle('prefs:set', (_e, p) => {
  prefs = { ...prefs, ...p };
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: !!prefs.startOnLogin, args: ['--hidden'] });
  }
  return true;
});
ipcMain.handle('data:openFolder', () => shell.openPath(dataDir()));
ipcMain.handle('data:export', async (_e, json) => {
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const r = await dialog.showSaveDialog(win, {
    title: 'Export backup',
    defaultPath: path.join(app.getPath('documents'), 'dinchariya-backup-' + stamp + '.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, json);
  return r.filePath;
});
ipcMain.handle('data:import', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Import backup',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return fs.readFileSync(r.filePaths[0], 'utf8');
});
