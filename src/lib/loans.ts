export interface LoanOffer {
  lender: string
  /** Tasa efectiva anual, como fraccion: 0.22 es 22 %. */
  tea: number
  months: number
  /** Cobro unico al desembolsar. */
  fee: number
  /** Seguro u otro cargo fijo que se suma a cada cuota. */
  monthlyInsurance: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** Cuota fija del metodo frances, con la TEA llevada a tasa mensual efectiva. */
export function installment(principal: number, tea: number, months: number): number {
  const rate = (1 + tea) ** (1 / 12) - 1
  if (rate === 0) return round2(principal / months)
  return round2((principal * rate) / (1 - (1 + rate) ** -months))
}

/** Todo lo que se termina pagando: cuotas, seguro y comision. */
export function loanTotal(principal: number, offer: LoanOffer): number {
  const monthly = installment(principal, offer.tea, offer.months) + offer.monthlyInsurance
  return round2(monthly * offer.months + offer.fee)
}
