import { useAvatarUrl } from '@/hooks/useAvatarUrl'
import { initials } from '@/lib/format'
import type { User } from '@/types/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UserAvatarProps {
  user: Pick<User, 'id' | 'name' | 'avatarUpdatedAt'>
  /** Otra imagen en lugar de la guardada (una vista previa); null para mostrar solo las iniciales. */
  src?: string | null
  className?: string
  fallbackClassName?: string
}

/** La foto de perfil, o las iniciales mientras carga o si no hay foto. */
export function UserAvatar({ user, src, className, fallbackClassName }: UserAvatarProps) {
  const stored = useAvatarUrl(src === undefined ? user : null)
  const image = src === undefined ? stored : src

  return (
    <Avatar className={className}>
      {image && <AvatarImage src={image} alt="" className="object-cover" />}
      <AvatarFallback className={fallbackClassName}>{initials(user.name)}</AvatarFallback>
    </Avatar>
  )
}
