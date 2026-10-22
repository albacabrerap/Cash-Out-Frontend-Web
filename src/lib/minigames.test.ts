import { betOrInvest } from '@/games/betOrInvest'
import { compoundInterest } from '@/games/compoundInterest'
import { loanSimulator } from '@/games/loanSimulator'
import type { TokenTransaction } from '@/types/finance'
import {
  gameInitials,
  gameStats,
  packFor,
  playHistory,
  prepareRun,
  raceRecords,
  scoreFor,
  shuffle,
  topicKey,
} from './minigames'

describe('packFor', () => {
  it('encuentra el contenido por tema, sin importar tildes, mayusculas ni signos', () => {
    expect(topicKey('¿Apuesta o Inversión?')).toBe('apuesta-o-inversion')
    expect(packFor({ type: 'TRIVIA', topic: 'interés COMPUESTO' })).toBe(compoundInterest)
    expect(packFor({ type: 'QUIZ', topic: 'Apuesta o inversión' })).toBe(betOrInvest)
    expect(packFor({ type: 'SIMULATION', topic: 'Préstamos' })).toBe(loanSimulator)
  })

  it('sin contenido para ese tema, o con otro tipo, no se puede jugar', () => {
    expect(packFor({ type: 'TRIVIA', topic: 'Criptomonedas' })).toBeNull()
    expect(packFor({ type: 'TRIVIA', topic: null })).toBeNull()
    expect(packFor({ type: 'QUIZ', topic: 'Interés compuesto' })).toBeNull()
  })
})

describe('scoreFor', () => {
  it('lleva los aciertos a un puntaje de 0 a 100', () => {
    expect(scoreFor(5, 8)).toBe(63)
    expect(scoreFor(1, 3)).toBe(33)
    expect(scoreFor(4, 4)).toBe(100)
    expect(scoreFor(0, 10)).toBe(0)
  })
})

describe('prepareRun', () => {
  it('mezcla preguntas y opciones sin perder cual es la correcta', () => {
    const random = () => 0.3
    const run = prepareRun(compoundInterest, random)
    if (run.type === 'SIMULATION') throw new Error('se esperaba una trivia')

    expect(run.questions.map((q) => q.prompt)).not.toEqual(compoundInterest.questions.map((q) => q.prompt))
    for (const question of run.questions) {
      const original = compoundInterest.questions.find((q) => q.prompt === question.prompt)!
      expect(question.options[question.answer]).toBe(original.options[original.answer])
      expect([...question.options].sort()).toEqual([...original.options].sort())
    }
  })

  it('en el quiz las dos opciones quedan siempre en el mismo orden', () => {
    const run = prepareRun(betOrInvest, () => 0.7)
    if (run.type === 'SIMULATION') throw new Error('se esperaba un quiz')
    expect(run.questions.every((q) => q.options.join() === 'Apuesta,Inversión')).toBe(true)
  })

  it('en el simulador mezcla las ofertas pero no el orden de las rondas', () => {
    const run = prepareRun(loanSimulator, () => 0)
    if (run.type !== 'SIMULATION') throw new Error('se esperaba la simulacion')
    expect(run.rounds.map((r) => r.need)).toEqual(loanSimulator.rounds.map((r) => r.need))
    expect(run.rounds[0].offers.map((o) => o.lender)).not.toEqual(loanSimulator.rounds[0].offers.map((o) => o.lender))
  })

  it('shuffle es una permutacion', () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5])
  })
})

describe('contenido', () => {
  it('cada pregunta tiene opciones distintas y una respuesta valida', () => {
    for (const question of [...compoundInterest.questions, ...betOrInvest.questions]) {
      expect(new Set(question.options).size).toBe(question.options.length)
      expect(question.options[question.answer]).toBeDefined()
    }
  })

  it('las descripciones dicen cuantas preguntas tiene cada juego', () => {
    expect(compoundInterest.description).toContain(`${compoundInterest.questions.length} preguntas`)
    expect(betOrInvest.description).toContain(`${betOrInvest.questions.length} situaciones`)
    expect(loanSimulator.rules).toContain(`${loanSimulator.rounds.length} rondas`)
  })
})

describe('gameInitials', () => {
  it('toma las palabras con contenido, sin signos', () => {
    expect(gameInitials('Interés compuesto')).toBe('IC')
    expect(gameInitials('¿Apuesta o inversión?')).toBe('AI')
    expect(gameInitials('Simulador de préstamo')).toBe('SP')
    expect(gameInitials('Yo')).toBe('Y')
  })
})

describe('historial de partidas', () => {
  const session = (id: number, title: string, score: number, playedAt: string) => ({
    id,
    minigameTitle: title,
    score,
    tokensSpent: 5,
    tokensEarned: 3,
    playedAt,
  })
  const tx = (id: number, reason: TokenTransaction['reason'], amount: number, referenceId: number | null, createdAt: string) => ({
    id,
    amount,
    reason,
    referenceId,
    balanceAfter: 0,
    createdAt,
  })

  it('cuenta las partidas de cada juego y guarda el mejor puntaje', () => {
    const stats = gameStats([session(1, 'Trivia', 40, 'a'), session(2, 'Trivia', 90, 'b'), session(3, 'Quiz', 70, 'c')])
    expect(stats.get('Trivia')).toEqual({ plays: 2, best: 90 })
    expect(stats.get('Quiz')).toEqual({ plays: 1, best: 70 })
  })

  it('arma cada carrera con su cuota, su premio o su devolucion', () => {
    const records = raceRecords([
      tx(1, 'RACE_ENTRY', -20, 7, '2026-10-17T20:00:00'),
      tx(2, 'RACE_PRIZE', 30, 7, '2026-10-17T20:02:00'),
      tx(3, 'RACE_ENTRY', -10, 8, '2026-10-18T20:00:00'),
      tx(4, 'RACE_REFUND', 10, 8, '2026-10-18T20:05:00'),
      tx(5, 'MINIGAME', 3, 1, '2026-10-18T21:00:00'),
    ])
    expect(records).toEqual([
      expect.objectContaining({ key: 'race-7', outcome: 'prize', spent: 20, earned: 30, playedAt: '2026-10-17T20:02:00' }),
      expect.objectContaining({ key: 'race-8', outcome: 'refund', spent: 10, earned: 10 }),
    ])
  })

  it('junta juegos y carreras de lo mas reciente a lo mas antiguo', () => {
    const history = playHistory(
      [session(1, 'Trivia', 40, '2026-10-05T10:00:00'), session(2, 'Quiz', 70, '2026-10-20T10:00:00')],
      [tx(1, 'RACE_ENTRY', -20, 7, '2026-10-17T20:00:00')],
    )
    expect(history.map((record) => record.key)).toEqual(['game-2', 'race-7', 'game-1'])
  })
})
