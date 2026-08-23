const { app, BrowserWindow, Notification, ipcMain, shell } = require("electron");
const path = require("path");

const merchantUrl = process.env.QUEUESYNC_WEB_URL || "http://localhost:3000/merchant";

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#f8fafc",
    title: "QueueSync Merchant",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false },
  });
  window.loadURL(merchantUrl);
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  ipcMain.handle("queuesync:notify", (_event, payload) => {
    if (!Notification.isSupported()) return false;
    new Notification({ title: payload.title, body: payload.body, silent: false }).show();
    return true;
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
