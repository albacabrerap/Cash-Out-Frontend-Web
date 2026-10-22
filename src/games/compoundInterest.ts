import type { ChoicePack } from './types'

export const compoundInterest: ChoicePack = {
  type: 'TRIVIA',
  description: 'Trivia de 8 preguntas sobre cómo crece tu dinero en el tiempo.',
  rules: 'Responde 8 preguntas de opción múltiple. Después de cada una verás la explicación.',
  shuffleOptions: true,
  questions: [
    {
      prompt: 'Depositas S/ 1,000 a una TEA de 10 % y no retiras nada. ¿Cuánto tienes al cabo de 2 años?',
      options: ['S/ 1,210', 'S/ 1,200', 'S/ 1,100', 'S/ 1,020'],
      answer: 0,
      explanation:
        'El segundo año el 10 % se calcula sobre S/ 1,100 y no sobre S/ 1,000: 1,000 × 1.1² = 1,210. Esos S/ 10 de más son intereses sobre intereses.',
    },
    {
      prompt: '¿Qué diferencia al interés compuesto del interés simple?',
      options: [
        'Los intereses que ganas también generan intereses',
        'Siempre paga una tasa más alta',
        'Solo se aplica a los préstamos',
        'Se cobra una sola vez, al final',
      ],
      answer: 0,
      explanation:
        'Con interés simple siempre ganas sobre el monto inicial. Con compuesto, cada periodo los intereses se suman al capital y empiezan a rendir.',
    },
    {
      prompt: 'Con una TEA de 8 %, ¿en cuántos años, más o menos, se duplica tu dinero?',
      options: ['9 años', '8 años', '12 años', '18 años'],
      answer: 0,
      explanation:
        'La regla del 72 lo estima rápido: 72 ÷ 8 = 9. Y se cumple: 1.08 elevado a 9 da 1.999.',
    },
    {
      prompt: 'Una cuenta paga una TEA de 6 %. ¿Cuál es su tasa mensual equivalente?',
      options: ['Un poco menos de 0.5 %', 'Exactamente 0.5 %', '0.6 %', '6 %'],
      answer: 0,
      explanation:
        'Es (1 + 0.06)^(1/12) − 1 ≈ 0.487 %. Dividir entre 12 da 0.5 % y se pasa, porque olvida que cada mes los intereses se capitalizan.',
    },
    {
      prompt:
        'Ana ahorra S/ 100 al mes desde los 20 años y Beto, lo mismo desde los 30. Con la misma tasa, ¿quién tiene más a los 60?',
      options: [
        'Ana, y por mucho más que lo que aportó de más',
        'Ana, pero solo por los S/ 12,000 extra que aportó',
        'Beto, porque empezó con más experiencia',
        'Los dos tienen lo mismo',
      ],
      answer: 0,
      explanation:
        'Con una TEA de 7 %, Ana llega a unos S/ 247,000 y Beto a unos S/ 117,000. Ana aportó solo S/ 12,000 más, pero sus primeros años tuvieron más tiempo para crecer.',
    },
    {
      prompt: '¿Qué le pasa a tu ahorro si la inflación es mayor que la tasa que te pagan?',
      options: [
        'Pierde poder de compra aunque el saldo suba',
        'Gana valor, porque el saldo sube',
        'Nada: la inflación no afecta al ahorro',
        'El banco te compensa la diferencia',
      ],
      answer: 0,
      explanation:
        'Si te pagan 3 % y los precios suben 5 %, al final del año tienes más soles pero te alcanzan para menos cosas.',
    },
    {
      prompt:
        'Debes S/ 1,000 en una tarjeta de crédito con TEA de 80 % y no pagas nada. ¿Cuánto debes, más o menos, a los 2 años?',
      options: ['S/ 3,240', 'S/ 2,600', 'S/ 1,800', 'S/ 2,000'],
      answer: 0,
      explanation:
        'El compuesto también juega en contra: 1,000 × 1.8² = 3,240. Con interés simple serían S/ 2,600.',
    },
    {
      prompt: '¿Qué hace que el interés compuesto trabaje más a tu favor?',
      options: [
        'Empezar pronto y no retirar los intereses',
        'Retirar los intereses cada mes',
        'Esperar a tener un monto grande para empezar',
        'Cambiar de banco cada año',
      ],
      answer: 0,
      explanation:
        'El compuesto premia el tiempo. Cada año que esperas es un año menos de intereses sobre intereses, y retirarlos corta el efecto.',
    },
  ],
}
