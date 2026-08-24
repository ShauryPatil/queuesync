const { app, BrowserWindow, Menu, Notification, ipcMain, shell } = require("electron");
const path = require("path");

const merchantUrl = process.env.QUEUESYNC_WEB_URL || "http://localhost:3000/merchant";

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#07161c",
    title: "QueueSync — Merchant Operations",
    autoHideMenuBar: true,
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false },
  });
  window.loadURL(merchantUrl);
  window.once("ready-to-show", () => window.show());
  window.webContents.on("did-finish-load", () => window.setTitle("QueueSync — Merchant Operations"));
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function installApplicationMenu() {
  const template = [
    { label: "QueueSync", submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }] },
    { label: "Operations", submenu: [{ label: "Refresh workspace", accelerator: "CmdOrCtrl+R", click: () => BrowserWindow.getFocusedWindow()?.webContents.reload() }, { label: "Open customer view", click: () => BrowserWindow.getFocusedWindow()?.loadURL(merchantUrl.replace(/\/merchant(?:\?.*)?$/, "/")) }] },
    { label: "View", submenu: [{ role: "reload" }, { role: "togglefullscreen" }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  installApplicationMenu();
  ipcMain.handle("queuesync:notify", (_event, payload) => {
    if (!Notification.isSupported()) return false;
    new Notification({ title: payload.title, body: payload.body, silent: false }).show();
    return true;
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
