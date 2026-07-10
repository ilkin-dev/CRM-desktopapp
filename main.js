// ============================================================
// Electron main process.
// Spins up a tiny local static file server (built-in http module,
// no extra dependencies) to serve the app/ folder, then opens a
// desktop window pointed at it. Using a real http:// origin (instead
// of file://) avoids ES module / CORS restrictions in Chromium and
// lets the Firebase SDK behave exactly like it does in a browser.
// ============================================================
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

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
    },
  });

  Menu.setApplicationMenu(null); // clean UI, no default File/Edit/View menu
  win.loadURL(`http://127.0.0.1:${PORT}/index.html`);
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
