/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
self.addEventListener('push', function (event) {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }
  try {
    var _data$data;
    const data = event.data.json();
    const options = {
      body: data.body || data.message || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/badge.png',
      image: data.image,
      tag: data.tag || 'default',
      data: {
        url: data.url || ((_data$data = data.data) === null || _data$data === void 0 ? void 0 : _data$data.url) || '/'
      },
      vibrate: [200, 100, 200],
      requireInteraction: true
    };
    event.waitUntil(self.registration.showNotification(data.title || 'Benachrichtigung', options));
  } catch (error) {
    console.error('Error handling push:', error);
  }
});
self.addEventListener('notificationclick', function (event) {
  var _event$notification$d;
  event.notification.close();
  const urlToOpen = ((_event$notification$d = event.notification.data) === null || _event$notification$d === void 0 ? void 0 : _event$notification$d.url) || '/';
  event.waitUntil(clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function (clientList) {
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i];
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        client.navigate(urlToOpen);
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  }));
});
/******/ })()
;