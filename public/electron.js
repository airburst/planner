const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("node:path");
const { setupDatabase, schema } = require("./db");
const registerPlansHandlers = require("./ipc/plans");
const registerPeopleHandlers = require("./ipc/people");
const registerAccountsHandlers = require("./ipc/accounts");
const registerIncomeStreamsHandlers = require("./ipc/income-streams");
const registerProjectionHandlers = require("./ipc/projections");
const registerExpenseProfilesHandlers = require("./ipc/expense-profiles");
const registerScenarioHandlers = require("./ipc/scenarios");
const registerAssumptionSetsHandlers = require("./ipc/assumption-sets");
const registerOneOffIncomesHandlers = require("./ipc/one-off-incomes");
const registerOneOffExpensesHandlers = require("./ipc/one-off-expenses");
const registerSpendingPeriodsHandlers = require("./ipc/spending-periods");

const isDev = !app.isPackaged;
let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1080,
    minWidth: 960,
    minHeight: 600,
    center: true,
    // remove the default titlebar on macOS only
    // ...(process.platform === "darwin" ? { titleBarStyle: "hidden" } : {}),
    // expose window controls in Windows/Linux
    // ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}),
    // add padding around macOS traffic lights
    // ...(process.platform === "darwin"
    //   ? { trafficLightPosition: { x: 16, y: 16 } }
    //   : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
       enableRemoteModule: false,
      sandbox: true
    },
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
  // Set a Content-Security-Policy header on every response. Dev relaxes for
  // Vite HMR (inline + eval, WS to localhost). Prod is strict — only own
  // origin for scripts, no eval. Without this Electron prints an
  // "Insecure Content-Security-Policy" warning in DevTools.
  const cspDev = [
    "default-src 'self' 'unsafe-inline' data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self' ws://localhost:* http://localhost:*",
  ].join("; ");
  const cspProd = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data:",
    "connect-src 'self'",
  ].join("; ");
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [isDev ? cspDev : cspProd],
      },
    });
  });

  const { db } = setupDatabase();
  registerPlansHandlers(ipcMain, db, schema);
  registerPeopleHandlers(ipcMain, db, schema);
  registerAccountsHandlers(ipcMain, db, schema);
  registerIncomeStreamsHandlers(ipcMain, db, schema);
  registerProjectionHandlers(ipcMain, db, schema);
  registerExpenseProfilesHandlers(ipcMain, db, schema);
  registerScenarioHandlers(ipcMain, db, schema);
  registerAssumptionSetsHandlers(ipcMain, db, schema);
  registerOneOffIncomesHandlers(ipcMain, db, schema);
  registerOneOffExpensesHandlers(ipcMain, db, schema);
  registerSpendingPeriodsHandlers(ipcMain, db, schema);

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