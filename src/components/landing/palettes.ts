/** De la sombra al brillo de los pliegues, para cada tema. */
export const SILK_COLORS = {
  light: ['#f8f8f9', '#f3edf3', '#e9dfe8', '#dccfdb', '#c9b6c8', '#b7a0b5', '#a48aa2', '#8f7590'],
  dark: ['#0c0c15', '#121320', '#1d1d2d', '#2e2a3e', '#463a50', '#634e62', '#87708a', '#ac93aa'],
} as const

/** Capas de las cintas, de la mas alta a la mas cercana. */
export const RIBBON_COLORS = {
  light: ['#f4eef4', '#e3d6e2', '#c9b6c8', '#ac93aa', '#8f7590', '#5d4a5c'],
  dark: ['#1d1d2d', '#2e2a3e', '#4f4057', '#634e62', '#87708a', '#ac93aa'],
} as const

/** Malva, salvia y un acento; el brillo sube desde la base. */
export const PARTICLE_COLORS = {
  light: { colors: ['#8f7590', '#7d7f62', '#3f4058'], glow: '#dccfdb' },
  dark: { colors: ['#d9c6d7', '#cfd1b4', '#ffffff'], glow: '#634e62' },
} as const
