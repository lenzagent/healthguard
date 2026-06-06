const { contextBridge, ipcRenderer } = require("electron");

// ── Secure bridge between renderer (Next.js) and main process ──
// Exposes only the minimal API surface needed by the HealthGuard app.
// Follows Electron security best practices: contextIsolation + sandbox.

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Platform info ──
  platform: process.platform,
  isElectron: true,

  // ── App info ──
  getVersion: () => ipcRenderer.invoke("get-version"),
  getAppPath: () => ipcRenderer.invoke("get-app-path"),

  // ── Window controls ──
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  maximizeWindow: () => ipcRenderer.send("window-maximize"),
  closeWindow: () => ipcRenderer.send("window-close"),

  // ── Auto-updater (post-MVP) ──
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("update-available", (_event, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on("update-downloaded", (_event, info) => callback(info));
  },
  installUpdate: () => ipcRenderer.send("install-update"),

  // ── Deep links / file associations ──
  onDeepLink: (callback) => {
    ipcRenderer.on("deep-link", (_event, url) => callback(url));
  },
});
