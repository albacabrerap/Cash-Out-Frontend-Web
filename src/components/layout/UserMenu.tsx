import { useState } from 'react'
import { Link } from 'react-router'
import { LogOut, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const { user, logout } = useAuth()
  const [leaving, setLeaving] = useState(false)

  if (!user) return null

  const handleLogout = async () => {
    setLeaving(true)
    // Al cerrarse la sesion, RequireAuth redirige solo al login.
    await logout()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Cuenta de ${user.name}`}>
          <UserAvatar user={user} className="size-8" fallbackClassName="text-xs font-medium" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <UserRound aria-hidden="true" />
            Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={leaving} onSelect={handleLogout}>
          <LogOut aria-hidden="true" />
          {leaving ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
