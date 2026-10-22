const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif']
const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_SIZE = 256

/** Por que no se puede usar la imagen, o null si se puede. Son las mismas reglas del backend. */
export function avatarFileError(file: Pick<File, 'type' | 'size'>): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return 'La foto tiene que ser JPG, PNG o GIF.'
  if (file.size > AVATAR_MAX_BYTES) return 'La foto pesa más de 2 MB.'
  return null
}

/** Recorta el centro en un cuadrado de 256 px: la foto se guarda y se descarga en pocos KB. */
export async function resizeAvatar(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Sin canvas')
  // JPEG no tiene transparencia: sin fondo, un PNG transparente quedaria negro.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Sin imagen'))), 'image/jpeg', 0.9),
  )
}
