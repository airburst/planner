const { app, BrowserWindow } = require("electron");
const path = require("node:path");

const isDev = !app.isPackaged;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1080,
    minWidth: 960,
    minHeight: 600,
    center: true,
    ...(process.platform === "darwin" ? { titleBarStyle: "hidden" } : {}),
    ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}),
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 16, y: 16 } }
      : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(app.getAppPath(), "build/index.html")}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});