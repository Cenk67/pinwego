export const NOTIFY_PERMISSION_KEY = "pinwego.notify.asked"

export function canNotify() {
  return typeof Notification !== "undefined"
}

export async function requestNotifyPermission() {
  if (!canNotify()) return "denied" as NotificationPermission | "unsupported"
  if (Notification.permission !== "default") return Notification.permission
  try {
    localStorage.setItem(NOTIFY_PERMISSION_KEY, "1")
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function showBrowserNotice(title: string, body: string, url: string) {
  if (!canNotify() || Notification.permission !== "granted") return
  try {
    const notice = new Notification(`${title} · pinwego`, {
      body: body.slice(0, 140),
      tag: url,
    })
    notice.onclick = () => {
      window.focus()
      window.location.assign(url)
      notice.close()
    }
  } catch {
    /* ignore */
  }
}
