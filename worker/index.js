self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event but no data')
    return
  }
  
  try {
    const data = event.data.json()
    
    const options = {
      body: data.body || data.message || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/badge.png',
      image: data.image,
      tag: data.tag || 'default',
      data: {
        url: data.url || data.data?.url || '/'
      },
      vibrate: [200, 100, 200],
      requireInteraction: true
    }
    
    const notifyClients = clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        const notification = {
          type: 'PUSH_NOTIFICATION',
          payload: {
            title: data.title || 'Benachrichtigung',
            message: data.body || data.message || '',
            severity: data.severity || 'info',
            tag: data.tag,
            cameraEntity: data.cameraEntity,
            aiDescription: data.aiDescription,
            intercomSlug: data.intercomSlug,
          }
        }
        clientList.forEach(function(client) {
          client.postMessage(notification)
        })
      })
    
    event.waitUntil(
      Promise.all([
        self.registration.showNotification(data.title || 'Benachrichtigung', options),
        notifyClients
      ])
    )
  } catch (error) {
    console.error('Error handling push:', error)
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
