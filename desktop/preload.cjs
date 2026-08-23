const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("QueueSyncDesktop", {
  notify: (title, body) => ipcRenderer.invoke("queuesync:notify", { title, body }),
  isDesktop: true,
  workspace: "merchant-operations",
});

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.queuesyncDesktop = "merchant-operations";
});
