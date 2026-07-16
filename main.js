// ============================================================
// Electron main process.
//
// Owns the local SQLite database (via db/index.js) and answers every
// data request from the renderer over IPC (ipc.js) — no network, no
// Firebase, no local HTTP API. Documents are saved to disk under
// userData/documents and served back to the renderer through a
// custom crm-file:// protocol so <img src>/<a href> keep working
// exactly like they did with Firebase Storage's download URLs.
//
// Still spins up a tiny local static file server (built-in http
// module) to serve the app/ folder over http://127.0.0.1, purely to
// avoid ES module / CORS restrictions Chromium applies to file://
// pages — unrelated to the data layer above.
// ============================================================
const { app, BrowserWindow, Menu, shell, protocol, ipcMain, net } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const { pathToFileURL } = require("url");

const { openDatabase } = require("./db");
const { registerIpcHandlers } = require("./ipc");

const APP_DIR = path.join(__dirname, "app");
const PORT = 51837; // arbitrary local-only port

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Must be called before app is ready. "standard: true" + "supportFetchAPI"
// lets crm-file:// URLs work in <img src>/<a href> just like http(s).
protocol.registerSchemesAsPrivileged([
  { scheme: "crm-file", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(APP_DIR, decodeURIComponent(req.url.split("?")[0]));
      if (req.url === "/") filePath = path.join(APP_DIR, "index.html");
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(PORT, "127.0.0.1", () => resolve());
  });
}

function registerFileProtocol() {
  protocol.handle("crm-file", (request) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const filePath = segments.join(path.sep);
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1000,
    minHeight: 640,
    title: "Kenny's Client Book",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  Menu.setApplicationMenu(null); // clean UI, no default File/Edit/View menu
  win.loadURL(`http://127.0.0.1:${PORT}/index.html`);

  // target="_blank" links (e.g. "View" on an uploaded document) are blocked
  // by Electron's security defaults unless explicitly handled — route them
  // to the user's normal default browser instead of doing nothing.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Removing the menu also removes the default DevTools shortcut, so
  // register it manually (Ctrl+Shift+I / F12) — needed for troubleshooting.
  win.webContents.on("before-input-event", (event, input) => {
    const isDevToolsCombo =
      (input.control && input.shift && input.key.toLowerCase() === "i") ||
      input.key === "F12";
    if (isDevToolsCombo) {
      win.webContents.toggleDevTools();
    }
  });
}

let db;

app.whenReady().then(async () => {
  const dbPath = path.join(app.getPath("userData"), "crm-data.db");
  const documentsRoot = path.join(app.getPath("userData"), "documents");
  fs.mkdirSync(documentsRoot, { recursive: true });

  db = openDatabase(dbPath);
  registerIpcHandlers(ipcMain, db, documentsRoot);
  registerFileProtocol();

  await startServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (db) db.close();
});
