import { z } from 'zod'
import type { Asset, AssetType, OrderSide, OrderStatus } from '@/types/market'

export const ASSET_TYPE_LABEL: Record<AssetType, string> = { STOCK: 'Acción', ETF: 'ETF', FUND: 'Fondo', CRYPTO: 'Cripto' }
export const ASSET_SOURCE_LABEL: Record<Asset['source'], string> = { ALPACA: 'Alpaca', COINBASE: 'Coinbase', MANUAL: 'Manual' }
export const ORDER_SIDE_LABEL: Record<OrderSide, string> = { BUY: 'Compra', SELL: 'Venta' }
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  EXECUTED: 'Ejecutada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
}

/** Decimales de cantidad que se permiten escribir. El backend guarda 8; 6 sobran para una persona. */
export const QUANTITY_DECIMALS = 6
const QUANTITY_FACTOR = 10 ** QUANTITY_DECIMALS

const usd2 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const usd4 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const quantity = new Intl.NumberFormat('es-PE', { maximumFractionDigits: QUANTITY_DECIMALS })
const tokens = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 333.75 → "US$ 333.75". Los centavos de las acciones de menos de 1 dolar se muestran con 4 decimales. */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `US$ ${(Math.abs(value) < 1 ? usd4 : usd2).format(value)}`
}

const axis0 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

/** Etiqueta corta para el eje de un grafico: "$350", "$12.50", "$0.4321". */
export function formatAxisUsd(value: number): string {
  if (Math.abs(value) >= 100) return `$${axis0.format(value)}`
  return `$${(Math.abs(value) < 1 ? usd4 : usd2).format(value)}`
}

export function formatQuantity(value: number): string {
  return quantity.format(value)
}

/** 1.5 → "+1.50 %"; null → "—". */
export function formatSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${usd2.format(Math.abs(value))} %`
}

/** 12.5 → "+12.50 fichas". */
export function formatSignedTokens(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${tokens.format(Math.abs(value))} fichas`
}

/**
 * Cuantas acciones se compran con tantas fichas. Se trunca, no se redondea: asi
 * el costo nunca supera lo que el usuario quiso gastar.
 */
export function tokensToQuantity(amount: number, price: number): number {
  if (price <= 0) return 0
  return Math.floor((amount / price) * QUANTITY_FACTOR) / QUANTITY_FACTOR
}

/** Fichas que mueve una orden, como las calcula el backend (redondeo a centavos). */
export function quantityToTokens(qty: number, price: number): number {
  return Math.round(qty * price * 100) / 100
}

/** Ganancia en % sobre lo invertido; null si no hay base para calcularla. */
export function returnPercent(pnl: number | null | undefined, cost: number | null | undefined): number | null {
  if (pnl === null || pnl === undefined || !cost) return null
  return (pnl / cost) * 100
}

const QUANTITY_PATTERN = new RegExp(`^\\d{1,9}(?:[.,]\\d{1,${QUANTITY_DECIMALS}})?$`)

export const quantityField = z
  .string()
  .trim()
  .min(1, { error: 'Ingresa la cantidad.' })
  .regex(QUANTITY_PATTERN, { error: `Escribe una cantidad con hasta ${QUANTITY_DECIMALS} decimales.` })
  .transform((value) => Number(value.replace(',', '.')))
  .refine((value) => value > 0, { error: 'La cantidad tiene que ser mayor que cero.' })

/** Alta manual de un activo (ADMIN). Replica AssetRequest. */
export const assetFormSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, { error: 'Ingresa el símbolo.' })
    .max(15, { error: 'El símbolo no puede tener más de 15 caracteres.' })
    .regex(/^[A-Za-z0-9.-]+$/, { error: 'Usa letras, números, punto o guion, como BRK.B.' })
    .transform((value) => value.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(1, { error: 'Ingresa el nombre.' })
    .max(255, { error: 'El nombre no puede tener más de 255 caracteres.' }),
  type: z.enum(['STOCK', 'ETF', 'FUND']),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, { error: 'Usa el código de 3 letras, como USD.' })
    .transform((value) => value.toUpperCase()),
})

export type AssetFormValues = z.input<typeof assetFormSchema>
export type AssetFormOutput = z.output<typeof assetFormSchema>

/** Precio fijado a mano para un activo manual. Hasta 4 decimales, como las acciones de menos de un dolar. */
export const priceFormSchema = z.object({
  price: z
    .string()
    .trim()
    .min(1, { error: 'Ingresa el precio.' })
    .regex(/^\d{1,9}(?:[.,]\d{1,4})?$/, { error: 'Escribe un precio con hasta 4 decimales, como 12.50.' })
    .transform((value) => Number(value.replace(',', '.')))
    .refine((value) => value > 0, { error: 'El precio tiene que ser mayor que cero.' }),
})

export type PriceFormValues = z.input<typeof priceFormSchema>
export type PriceFormOutput = z.output<typeof priceFormSchema>
