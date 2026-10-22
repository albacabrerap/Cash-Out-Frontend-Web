import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useAuth } from '@/hooks/useAuth'
import { avatarFileError, resizeAvatar } from '@/lib/avatar'
import { yesterdayIso } from '@/lib/dates'
import { formatServerDate } from '@/lib/format'
import { applyServerFieldErrors } from '@/lib/formErrors'
import { ROLE_LABEL } from '@/lib/users'
import { profileSchema, type ProfileValues } from '@/lib/validation'
import { userService } from '@/services/userService'
import type { User } from '@/types/auth'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { SettingsError, SettingsRow, SettingsSection } from '@/components/profile/SettingsSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const FIELDS = ['name', 'birthDate'] as const

type PhotoChange = { kind: 'keep' } | { kind: 'replace'; image: Blob; preview: string } | { kind: 'remove' }
const KEEP: PhotoChange = { kind: 'keep' }

export function ProfileForm({ user }: { user: User }) {
  const { updateUser } = useAuth()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, birthDate: user.birthDate ?? '' },
  })
  const { errors, isSubmitting, isDirty, dirtyFields } = form.formState
  const [photo, setPhoto] = useState<PhotoChange>(KEEP)
  const [photoError, setPhotoError] = useState<string>()
  const fileInput = useRef<HTMLInputElement>(null)
  const changed = isDirty || photo.kind !== 'keep'

  const preview = photo.kind === 'replace' ? photo.preview : undefined
  useEffect(() => (preview ? () => URL.revokeObjectURL(preview) : undefined), [preview])

  const pickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Sin esto, elegir de nuevo el mismo archivo no dispararia el cambio.
    event.target.value = ''
    if (!file) return
    const problem = avatarFileError(file)
    setPhotoError(problem ?? undefined)
    if (problem) return
    try {
      const image = await resizeAvatar(file)
      setPhoto({ kind: 'replace', image, preview: URL.createObjectURL(image) })
    } catch {
      setPhotoError('No pudimos leer esa imagen. Prueba con otra.')
    }
  }

  const discard = () => {
    form.reset()
    setPhoto(KEEP)
    setPhotoError(undefined)
  }

  const onSubmit = async (values: ProfileValues) => {
    // El backend ignora los campos que no llegan, asi que una fecha ya guardada no se puede borrar.
    if (values.birthDate === '' && user.birthDate) {
      form.setError('birthDate', { type: 'manual', message: 'Puedes cambiar la fecha, pero no dejarla vacía.' })
      return
    }
    try {
      if (isDirty) {
        const saved = await userService.updateMe({ name: values.name, birthDate: values.birthDate || undefined })
        updateUser(saved)
        form.reset({ name: saved.name, birthDate: saved.birthDate ?? '' })
      }
      if (photo.kind !== 'keep') {
        updateUser(photo.kind === 'replace' ? await userService.uploadAvatar(photo.image) : await userService.removeAvatar())
        setPhoto(KEEP)
      }
      toast.success('Perfil actualizado')
    } catch (err) {
      const error = toApiError(err)
      if (!applyServerFieldErrors(error, form.setError, FIELDS)) toast.error(userMessage(error))
    }
  }

  const roles = user.roles.map((role) => ROLE_LABEL[role]).join(' · ')
  const hasPhoto = photo.kind === 'replace' || (photo.kind === 'keep' && Boolean(user.avatarUpdatedAt))

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <SettingsSection
        id="perfil-cuenta"
        title="Cuenta"
        description={`${roles} · miembro desde el ${formatServerDate(user.createdAt)}`}
        footer={
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {changed ? 'Cambios sin guardar' : 'Todo está guardado'}
            </p>
            <div className="flex gap-2 max-sm:w-full max-sm:flex-col-reverse">
              <Button type="button" variant="ghost" onClick={discard} disabled={!changed || isSubmitting}>
                Descartar
              </Button>
              <Button type="submit" disabled={!changed || isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {isSubmitting ? 'Guardando…' : 'Guardar perfil'}
              </Button>
            </div>
          </>
        }
      >
        <SettingsRow
          label="Foto de perfil"
          description="JPG, PNG o GIF de hasta 2 MB. La recortamos en un cuadrado."
          changed={photo.kind !== 'keep'}
        >
          <div className="flex items-center justify-between gap-3 md:justify-end">
            <UserAvatar
              user={user}
              src={photo.kind === 'keep' ? undefined : (preview ?? null)}
              className="size-12"
              fallbackClassName="text-sm font-medium"
            />
            <div className="flex gap-2">
              {hasPhoto && (
                <Button type="button" variant="ghost" onClick={() => setPhoto(user.avatarUpdatedAt ? { kind: 'remove' } : KEEP)}>
                  Quitar
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} aria-describedby="perfil-foto-error">
                <Upload aria-hidden="true" />
                Cambiar
              </Button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="sr-only"
              tabIndex={-1}
              aria-label="Elegir foto de perfil"
              onChange={(event) => void pickPhoto(event)}
            />
          </div>
          <SettingsError id="perfil-foto-error" message={photoError} />
        </SettingsRow>

        <SettingsRow
          label="Nombre"
          htmlFor="profile-name"
          description="Así te saludamos y así apareces en las carreras de trading."
          changed={dirtyFields.name}
        >
          <Input
            id="profile-name"
            autoComplete="name"
            maxLength={120}
            aria-invalid={!!errors.name}
            aria-describedby="profile-name-error"
            {...form.register('name')}
          />
          <SettingsError id="profile-name-error" message={errors.name?.message} />
        </SettingsRow>

        <SettingsRow label="Correo" htmlFor="profile-email" description="Con él inicias sesión y te avisamos de tu cuenta.">
          <Input
            id="profile-email"
            value={user.email}
            readOnly
            className="bg-muted/50 text-muted-foreground"
            aria-describedby="profile-email-hint"
          />
          <p id="profile-email-hint" className="text-sm text-muted-foreground">
            No se puede cambiar.
          </p>
        </SettingsRow>

        <SettingsRow
          label="Fecha de nacimiento"
          htmlFor="profile-birth"
          description={user.birthDate ? 'Puedes corregirla, pero no dejarla vacía.' : 'Opcional.'}
          changed={dirtyFields.birthDate}
        >
          <Input
            id="profile-birth"
            type="date"
            autoComplete="bday"
            max={yesterdayIso()}
            aria-invalid={!!errors.birthDate}
            aria-describedby="profile-birth-error"
            {...form.register('birthDate')}
          />
          <SettingsError id="profile-birth-error" message={errors.birthDate?.message} />
        </SettingsRow>
      </SettingsSection>
    </form>
  )
}
