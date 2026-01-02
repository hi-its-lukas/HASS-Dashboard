// Utility functions

export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatEventTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) + ' • ' + date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getWeatherIcon(condition: string): string {
  const iconMap: Record<string, string> = {
    sunny: '☀️',
    'clear-night': '🌙',
    partlycloudy: '⛅',
    cloudy: '☁️',
    rainy: '🌧️',
    snowy: '❄️',
    fog: '🌫️',
    windy: '💨',
    lightning: '⚡',
  }
  return iconMap[condition] || '🌡️'
}

export function getAlarmStateLabel(state: string): string {
  const labels: Record<string, string> = {
    disarmed: 'Disarmed',
    armed_home: 'Armed Home',
    armed_away: 'Armed Away',
    armed_night: 'Armed Night',
    arming: 'Arming...',
    pending: 'Pending',
    triggered: 'TRIGGERED',
  }
  return labels[state] || state
}

export function getActivityIcon(activity: string): string {
  const icons: Record<string, string> = {
    walking: '🚶',
    running: '🏃',
    driving: '🚗',
    cycling: '🚴',
    stationary: '🧘',
  }
  return icons[activity] || '📍'
}
