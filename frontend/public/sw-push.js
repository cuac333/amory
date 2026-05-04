// Push notification handler - injected alongside the PWA service worker
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
      vibrate: [200, 100, 200],
      tag: data.tag || "amory-notification",
      renotify: true,
      silent: false,
      actions: [],
    };
    event.waitUntil(self.registration.showNotification(data.title || "Amory", options));
  } catch {
    // fallback for plain text
    event.waitUntil(
      self.registration.showNotification("Amory", {
        body: event.data.text(),
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
