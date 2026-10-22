import { formatSoles } from '@/lib/format'
import { formatTerm, monthlyRate, yearlyBreakdown, type CurvePoint } from '@/lib/projections'
import type { ProjectionParams } from '@/types/projections'

const percent = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 })
const ratio = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 })

/** El crecimiento año por año y por que el compuesto se despega. */
export function GrowthDetails({ params, curve }: { params: ProjectionParams; curve: CurvePoint[] }) {
  const years = yearlyBreakdown(curve)
  const most = Math.max(...years.map((year) => year.interest), 0.01)
  const rate = monthlyRate(params.annualRate)
  const n = params.periods
  const lastMonthInterest = curve[n].compound - curve[n - 1].compound - params.monthlyContribution
  const teaPercent = params.annualRate * 100

  const facts = [
    years.length > 1 && years[0].interest > 0
      ? `El interés del último periodo (${formatSoles(years[years.length - 1].interest)}) es ${ratio.format(
          years[years.length - 1].interest / years[0].interest,
        )} veces el del primer año.`
      : 'Con un plazo de más de un año verías cómo el interés de cada año supera al anterior.',
    params.monthlyContribution > 0
      ? `En el último mes el interés (${formatSoles(lastMonthInterest)}) ya equivale al ${Math.round(
          (lastMonthInterest / params.monthlyContribution) * 100,
        )} % de tu aporte.`
      : 'Sin aportes mensuales todo el crecimiento viene del interés sobre tu capital.',
    teaPercent > 0
      ? `Al ${percent.format(teaPercent)} % anual tu dinero se duplica en unos ${Math.round(72 / teaPercent)} años (regla del 72).`
      : 'Con una tasa de 0 % tu dinero no crece: solo suma lo que aportas.',
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section aria-labelledby="proyeccion-anios" className="min-w-0 rounded-2xl border bg-card p-5 lg:p-6">
        <h2 id="proyeccion-anios" className="text-base font-semibold">
          Año a año
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-[13px]">
            <caption className="sr-only">Lo aportado, el interés ganado y el total de cada año</caption>
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 font-medium">
                  Periodo
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Aportado
                </th>
                <th scope="col" className="py-2 pl-5 font-medium">
                  Interés ganado en el periodo
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Total al cierre
                </th>
              </tr>
            </thead>
            <tbody>
              {years.map((year) => (
                <tr key={year.year} className="border-t">
                  <th scope="row" className="py-2.5 text-left font-normal">
                    Año {year.year}
                    {year.months < 12 && <span className="text-muted-foreground"> ({formatTerm(year.months)})</span>}
                  </th>
                  <td className="py-2.5 text-right font-mono tabular-nums">{formatSoles(year.contributed)}</td>
                  <td className="py-2.5 pl-5">
                    <span className="flex items-center gap-2.5">
                      <span className="h-1.5 flex-1 rounded-full bg-muted" aria-hidden="true">
                        <span className="block h-full rounded-full bg-accent-ink" style={{ width: `${(year.interest / most) * 100}%` }} />
                      </span>
                      <span className="w-24 text-right font-mono text-gain tabular-nums">+{formatSoles(year.interest)}</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-medium tabular-nums">{formatSoles(year.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="proyeccion-porque" className="rounded-2xl border bg-card p-5 lg:p-6">
        <h2 id="proyeccion-porque" className="text-base font-semibold">
          ¿Por qué crece más?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Cada mes el interés se suma a tu saldo y el mes siguiente también gana interés.
        </p>
        <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 font-mono text-xs">
          tasa mensual = (1 + {percent.format(params.annualRate)})^(1/12) − 1 = {percent.format(rate * 100)} %
        </p>
        <ul className="mt-3.5 space-y-2.5 text-[13px] leading-relaxed">
          {facts.map((fact) => (
            <li key={fact} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-ink" />
              {fact}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
