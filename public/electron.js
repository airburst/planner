const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { setupDatabase, schema } = require("./db");
const registerPlansHandlers = require("./ipc/plans");
const registerPeopleHandlers = require("./ipc/people");
const registerAccountsHandlers = require("./ipc/accounts");
const registerIncomeStreamsHandlers = require("./ipc/income-streams");
const registerProjectionHandlers = require("./ipc/projections");

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
      preload: path.join(__dirname, "preload.js"),
      enableRemoteModule: false,
      sandbox: true
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
  const { db } = setupDatabase();
  registerPlansHandlers(ipcMain, db, schema);
  registerPeopleHandlers(ipcMain, db, schema);
  registerAccountsHandlers(ipcMain, db, schema);
  registerIncomeStreamsHandlers(ipcMain, db, schema);
  registerProjectionHandlers(ipcMain, db, schema);

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