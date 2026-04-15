const onlineMap = new Map()

export function markOnline(userId) {
  if (!userId) return
  onlineMap.set(String(userId), Date.now())
}

export function isUserOnline(userId, { withinMs = 60_000 } = {}) {
  if (!userId) return false
  const ts = onlineMap.get(String(userId))
  if (!ts) return false
  return Date.now() - ts <= withinMs
}

