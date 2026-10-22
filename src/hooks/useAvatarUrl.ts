import { useEffect, useState } from 'react'
import { userService } from '@/services/userService'
import type { User } from '@/types/auth'

// Una sola foto por pestana, compartida por la barra superior y el perfil: se descarga una vez por version.
let cached: { key: string; url: Promise<string> } | undefined

function avatarUrl(key: string): Promise<string> {
  if (cached?.key !== key) {
    const previous = cached
    const url = userService.getAvatar().then((blob) => URL.createObjectURL(blob))
    cached = { key, url }
    url.catch(() => {
      if (cached?.key === key) cached = undefined
    })
    previous?.url.then((old) => URL.revokeObjectURL(old), () => {})
  }
  return cached.url
}

/** La foto de perfil como URL local, o undefined si no tiene o todavia no llega. */
export function useAvatarUrl(user: Pick<User, 'id' | 'avatarUpdatedAt'> | null): string | undefined {
  const key = user?.avatarUpdatedAt ? `${user.id}:${user.avatarUpdatedAt}` : null
  const [loaded, setLoaded] = useState<{ key: string; url: string }>()

  useEffect(() => {
    if (!key) return
    let active = true
    avatarUrl(key).then(
      (url) => active && setLoaded({ key, url }),
      () => {},
    )
    return () => {
      active = false
    }
  }, [key])

  return key && loaded?.key === key ? loaded.url : undefined
}
