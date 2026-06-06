const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

// ── Production vs Development ──
const isDev =
  process.env.NODE_ENV === "development" || !app.isPackaged;

// In development, the Next.js dev server runs on port 3000.
// In production, we serve the static export from the out/ directory
// or run the Next.js standalone server.
const NEXT_PORT = 3000;
const NEXT_URL = `http://localhost:${NEXT_PORT}`;

let mainWindow = null;
let serverProcess = null;

// ── Start Next.js server in production (standalone mode) ──
function startNextServer() {
  if (isDev) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const serverPath = path.join(
      __dirname,
      "..",
      ".next",
      "standalone",
      "server.js"
    );

    try {
      require(serverPath);
      // If standalone server.js exists, spawn it
      serverProcess = spawn(process.execPath, [serverPath], {
        env: { ...process.env, PORT: String(NEXT_PORT) },
        stdio: ["ignore", "pipe", "pipe"],
      });

      serverProcess.stdout.on("data", (data) => {
        const msg = data.toString();
        if (msg.includes("Ready") || msg.includes("started")) {
          resolve();
        }
      });

      serverProcess.stderr.on("data", (data) => {
        console.error("[next server]", data.toString());
      });

      serverProcess.on("error", reject);

      // Timeout fallback — assume server starts within 10s
      setTimeout(resolve, 10000);
    } catch {
      // No standalone server — use static export
      console.log(
        "No standalone server found; using static export if available."
      );
      resolve();
    }
  });
}

// ── Create main window ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 390,
    minHeight: 600,
    title: "HealthGuard AI 健康监测",
    icon: path.join(__dirname, "..", "public", "icon-512.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    // macOS: transparent title bar for native feel
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL(NEXT_URL);
    // Open DevTools in development
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // Try standalone server first, fall back to static export
    const staticPath = path.join(__dirname, "..", "out", "index.html");
    const fs = require("fs");

    if (fs.existsSync(staticPath)) {
      // Static export mode
      mainWindow.loadFile(staticPath);
    } else {
      // Standalone server mode
      mainWindow.loadURL(NEXT_URL);
    }
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App lifecycle ──
app.whenReady().then(async () => {
  await startNextServer();
  createWindow();

  app.on("activate", () => {
    // macOS: re-create window when dock icon clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
