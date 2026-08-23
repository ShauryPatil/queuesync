interface Window {
  QueueSyncDesktop?: {
    notify: (title: string, body: string) => Promise<boolean>;
    isDesktop: boolean;
    workspace: "merchant-operations";
  };
}
