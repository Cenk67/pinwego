import type { AdminSecrets } from "@/lib/admin-gate"

type WorkerEnv = {
  ADMIN_LOGIN?: string
  ADMIN_PASSWORD_SALT?: string
  ADMIN_PASSWORD_HASH?: string
  ADMIN_OTP_TO?: string
}

function packed(env: WorkerEnv | undefined): AdminSecrets | null {
  const login = env?.ADMIN_LOGIN?.trim()
  const salt = env?.ADMIN_PASSWORD_SALT?.trim()
  const hash = env?.ADMIN_PASSWORD_HASH?.trim()
  const otpTo = env?.ADMIN_OTP_TO?.trim()
  if (!login || !salt || !hash || !otpTo) return null
  return { login, salt, hash, otpTo }
}

export async function adminSecrets(): Promise<AdminSecrets | null> {
  try {
    const loaded = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "cloudflare:workers")) as {
      env?: WorkerEnv
    }
    const remote = packed(loaded.env)
    if (remote) return remote
  } catch {
    // Local Next reads the development environment instead.
  }
  return packed({
    ADMIN_LOGIN: process.env.ADMIN_LOGIN,
    ADMIN_PASSWORD_SALT: process.env.ADMIN_PASSWORD_SALT,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    ADMIN_OTP_TO: process.env.ADMIN_OTP_TO,
  })
}
