import type { ChoicePack } from './types'

const OPTIONS = ['Apuesta', 'Inversión']
const BET = 0
const INVEST = 1

export const betOrInvest: ChoicePack = {
  type: 'QUIZ',
  description: 'Clasifica 10 situaciones reales y descubre la diferencia.',
  rules: 'Lee cada situación y decide si es una apuesta o una inversión. Después de cada una verás por qué.',
  shuffleOptions: false,
  questions: [
    {
      prompt: 'Comprar cuotas de un fondo que replica al S&P 500 y mantenerlas 10 años.',
      options: OPTIONS,
      answer: INVEST,
      explanation: 'Está diversificado en cientos de empresas y apuesta por el largo plazo, no por un golpe de suerte.',
    },
    {
      prompt: 'Poner tus ahorros en una criptomoneda porque un influencer dice que la próxima semana se multiplica por 10.',
      options: OPTIONS,
      answer: BET,
      explanation: 'Una ganancia rápida prometida sin ningún respaldo es especulación. Nadie sabe cuánto valdrá la próxima semana.',
    },
    {
      prompt: 'Abrir un depósito a plazo fijo de 12 meses en una entidad supervisada por la SBS.',
      options: OPTIONS,
      answer: INVEST,
      explanation:
        'Sabes de antemano cuánto vas a ganar y el riesgo es bajo. Además, el Fondo de Seguro de Depósitos lo protege hasta un tope.',
    },
    {
      prompt: 'Comprar boletos de lotería cada semana esperando ganar el premio mayor.',
      options: OPTIONS,
      answer: BET,
      explanation: 'En promedio recuperas menos de lo que pagas: los premios se financian con lo que pierde la mayoría.',
    },
    {
      prompt: 'Pagar un curso que te da una certificación para conseguir un mejor empleo.',
      options: OPTIONS,
      answer: INVEST,
      explanation: 'Inviertes en tu capacidad de generar ingresos. Es de las inversiones con mejor retorno a largo plazo.',
    },
    {
      prompt: 'Pedir un préstamo para apostar en partidos de fútbol y así recuperar lo que perdiste.',
      options: OPTIONS,
      answer: BET,
      explanation: 'Perseguir pérdidas con deuda es el patrón más peligroso: si vuelves a perder, debes más y con intereses.',
    },
    {
      prompt: 'Entrar a un "negocio" que paga 20 % al mes por traer a más personas.',
      options: OPTIONS,
      answer: BET,
      explanation:
        'Es la señal de un esquema piramidal: rendimientos imposibles que dependen de que entre gente nueva. Tarde o temprano se cae.',
    },
    {
      prompt: 'Comprar acciones de una empresa porque subieron 30 % ayer, sin saber a qué se dedica.',
      options: OPTIONS,
      answer: BET,
      explanation: 'Comprar solo porque algo subió, sin entender qué compras, es especular con el movimiento del precio.',
    },
    {
      prompt: 'Aportar todos los meses a un fondo mutuo diversificado, elegido según tu perfil de riesgo.',
      options: OPTIONS,
      answer: INVEST,
      explanation: 'Aportar con constancia en algo diversificado y acorde a tu riesgo es la forma más simple de invertir.',
    },
    {
      prompt: 'Comprar mercadería al por mayor para revenderla en tu barrio, con el margen ya calculado.',
      options: OPTIONS,
      answer: INVEST,
      explanation: 'Es un negocio: tiene riesgo, pero conoces tus costos y tu margen, y el resultado depende de tu trabajo.',
    },
  ],
}
