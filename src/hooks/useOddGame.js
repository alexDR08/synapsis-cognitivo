import { useCallback, useEffect, useRef, useState } from 'react'
import { logAttempt, logEvent } from '../api/activity.js'
import { PENALTY_SECONDS, buildRound, saveBest } from '../lib/odd.js'

function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
  }
}

const COUNT_STEP_MS = 700 // 3, 2, 1
const NEXT_ROUND_MS = 380 // pausa para ver el intruso antes de la siguiente cuadrícula
const FEEDBACK_MS = 600 // cuánto se ve el aviso de error

/**
 * Intruso visual: encuentra la figura distinta antes de que se acabe el tiempo.
 *  countdown -> 3, 2, 1  |  playing -> el reloj corre  |  over -> resultado
 * Para jugar otra vez se vuelve a montar el componente que lo usa (cambiándole la `key`).
 */
export function useOddGame(level, email) {
  const totalMs = level.seconds * 1000
  const [phase, setPhase] = useState('countdown')
  const [count, setCount] = useState(3)
  const [round, setRound] = useState(() => buildRound(level))
  const [found, setFound] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [msLeft, setMsLeft] = useState(totalMs)
  const [hit, setHit] = useState(null) // índice del intruso recién encontrado
  const [wrong, setWrong] = useState(null) // índice del último error
  const [penalty, setPenalty] = useState(false) // muestra "−3 s"
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('Prepárate…')

  const phaseRef = useRef('countdown')
  const lock = useRef(false)
  const deadline = useRef(0)
  const startedAt = useRef(0)
  const foundRef = useRef(0)
  const mistakesRef = useRef(0)
  const timers = useRef([])

  const later = useCallback((fn, ms) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])

  const finish = useCallback(() => {
    if (phaseRef.current === 'over') return
    phaseRef.current = 'over'
    setPhase('over')
    setMsLeft(0)
    setHit(null)
    setWrong(null)
    setPenalty(false)
    const record = saveBest(email, level.id, { found: foundRef.current, mistakes: mistakesRef.current })
    logAttempt({
      game: 'odd',
      level: level.id,
      success: foundRef.current > 0,
      durationSec: Math.min(level.seconds, (Date.now() - startedAt.current) / 1000),
      metrics: { found: foundRef.current, mistakes: mistakesRef.current, size: level.size, record },
    })
    setResult({ found: foundRef.current, mistakes: mistakesRef.current, record })
    setMessage('¡Se acabó el tiempo!')
    vibrate([30, 40, 70])
  }, [email, level.id, level.seconds, level.size])

  // Cuenta atrás 3-2-1 y arranque del reloj
  useEffect(() => {
    const ts = []
    const at = (fn, ms) => ts.push(setTimeout(fn, ms))
    at(() => setCount(2), COUNT_STEP_MS)
    at(() => setCount(1), COUNT_STEP_MS * 2)
    at(() => {
      phaseRef.current = 'playing'
      startedAt.current = Date.now()
      deadline.current = Date.now() + totalMs
      setPhase('playing')
      setMessage('Encuentra la figura distinta')
    }, COUNT_STEP_MS * 3)
    return () => ts.forEach(clearTimeout)
  }, [totalMs])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Si sale con el reloj corriendo, se registra como abandono.
  useEffect(
    () => () => {
      if (phaseRef.current === 'playing') {
        logEvent('game_abandoned', {
          game: 'odd',
          level: level.id,
          found: foundRef.current,
          mistakes: mistakesRef.current,
        })
      }
    },
    [level.id],
  )

  // Reloj
  useEffect(() => {
    if (phase !== 'playing') return undefined
    const id = setInterval(() => {
      const left = deadline.current - Date.now()
      if (left <= 0) finish()
      else setMsLeft(left)
    }, 100)
    return () => clearInterval(id)
  }, [phase, finish])

  const tap = useCallback(
    (index) => {
      if (phaseRef.current !== 'playing' || lock.current) return

      if (index === round.oddIndex) {
        foundRef.current += 1
        setFound(foundRef.current)
        setHit(index)
        setMessage('¡Lo encontraste!')
        vibrate(20)
        lock.current = true
        later(() => {
          setRound((prev) => buildRound(level, prev.oddIndex))
          setHit(null)
          lock.current = false
          if (phaseRef.current === 'playing') setMessage('Encuentra la figura distinta')
        }, NEXT_ROUND_MS)
        return
      }

      mistakesRef.current += 1
      setMistakes(mistakesRef.current)
      deadline.current -= PENALTY_SECONDS * 1000
      const left = deadline.current - Date.now()
      setWrong(index)
      setPenalty(true)
      setMessage(`Esa no. Pierdes ${PENALTY_SECONDS} segundos.`)
      vibrate(60)
      later(() => {
        setWrong(null)
        setPenalty(false)
      }, FEEDBACK_MS)
      if (left <= 0) finish()
      else setMsLeft(left)
    },
    [round.oddIndex, level, later, finish],
  )

  return { phase, count, round, found, mistakes, msLeft, totalMs, hit, wrong, penalty, result, message, tap }
}
