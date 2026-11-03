import { useCallback, useEffect, useRef, useState } from 'react'

const CELLS = 9
const FIRST_LIGHT_MS = 600 // pausa antes del primer destello
const STEP_MS = 800 // un destello cada 800 ms
const LIGHT_MS = 500 // cuánto dura encendido cada punto
const START_LENGTH = 3
const MAX_LENGTH = 7

// Vibración corta en celulares que la soportan (en computadora no hace nada).
function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
  }
}

function newSequence(length) {
  const sequence = []
  while (sequence.length < length) {
    const next = Math.floor(Math.random() * CELLS)
    if (next !== sequence[sequence.length - 1]) sequence.push(next)
  }
  return sequence
}

/**
 * Juego de secuencias: el tablero enciende N puntos, la persona los repite.
 * onCorrect(userSequence, targetSequence) se llama en cada acierto (valores 1-9,
 * como espera el backend). onAttempt({ success, durationSec, length, hits, taps }) se llama
 * al terminar cada ronda, con acierto o con error.
 */
export function useSequenceGame({ onCorrect, onAttempt } = {}) {
  const [phase, setPhase] = useState('idle') // idle | showing | input | won | lost
  const [message, setMessage] = useState('')
  const [lit, setLit] = useState(null)
  const [tapped, setTapped] = useState(null)
  const [bad, setBad] = useState(null)
  const [trail, setTrail] = useState([])
  const [trailTone, setTrailTone] = useState('spark')
  const [hits, setHits] = useState(0)
  const [length, setLength] = useState(START_LENGTH)
  const [memorize, setMemorize] = useState({ ms: 0, run: 0 })

  const timers = useRef([])
  const sequence = useRef([])
  const taps = useRef([])
  const hitsRef = useRef(0)
  const lengthRef = useRef(START_LENGTH)
  const locked = useRef(true)
  const inputStartedAt = useRef(0)
  const onCorrectRef = useRef(onCorrect)
  const onAttemptRef = useRef(onAttempt)

  useEffect(() => {
    onCorrectRef.current = onCorrect
    onAttemptRef.current = onAttempt
  })

  const reportAttempt = useCallback((success) => {
    onAttemptRef.current?.({
      success,
      durationSec: (Date.now() - inputStartedAt.current) / 1000,
      length: sequence.current.length,
      hits: hitsRef.current,
      taps: taps.current.length + (success ? 0 : 1),
    })
  }, [])

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const later = useCallback((fn, ms) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])

  const startRound = useCallback(
    (roundLength) => {
      clear()
      locked.current = true
      taps.current = []
      const target = newSequence(roundLength)
      sequence.current = target

      setPhase('showing')
      setMessage('Memoriza el patrón luminoso')
      setLit(null)
      setBad(null)
      setTapped(null)
      setTrail([])
      setTrailTone('spark')

      const total = FIRST_LIGHT_MS + roundLength * STEP_MS
      setMemorize((m) => ({ ms: total, run: m.run + 1 }))

      target.forEach((cell, i) => {
        later(() => {
          setLit(cell)
          setTrail(target.slice(0, i + 1))
        }, FIRST_LIGHT_MS + i * STEP_MS)
        later(() => setLit(null), FIRST_LIGHT_MS + i * STEP_MS + LIGHT_MS)
      })

      later(() => {
        locked.current = false
        inputStartedAt.current = Date.now()
        setPhase('input')
        setTrail([])
        setTrailTone('trace')
        setMessage('Tu turno: repite la secuencia')
      }, total)
    },
    [clear, later],
  )

  const start = useCallback(() => {
    hitsRef.current = 0
    lengthRef.current = START_LENGTH
    setHits(0)
    setLength(START_LENGTH)
    startRound(START_LENGTH)
  }, [startRound])

  const stop = useCallback(() => {
    clear()
    locked.current = true
  }, [clear])

  const tap = useCallback(
    (cell) => {
      if (locked.current) return

      setTapped(cell)
      later(() => setTapped((t) => (t === cell ? null : t)), 180)

      const expected = sequence.current[taps.current.length]
      if (cell !== expected) {
        locked.current = true
        setBad(cell)
        setPhase('lost')
        setMessage('Casi. Mira el patrón otra vez')
        vibrate(120)
        reportAttempt(false)
        later(() => startRound(lengthRef.current), 1300)
        return
      }

      taps.current.push(cell)
      setTrail([...taps.current])

      if (taps.current.length === sequence.current.length) {
        locked.current = true
        hitsRef.current += 1
        setHits(hitsRef.current)
        lengthRef.current = Math.min(MAX_LENGTH, START_LENGTH + Math.floor(hitsRef.current / 2))
        setLength(lengthRef.current)
        setPhase('won')
        setMessage('¡Bien! Prepárate para el siguiente patrón')
        vibrate([30, 40, 70])
        reportAttempt(true)
        onCorrectRef.current?.(
          taps.current.map((c) => c + 1),
          sequence.current.map((c) => c + 1),
        )
        later(() => startRound(lengthRef.current), 1200)
      }
    },
    [later, startRound, reportAttempt],
  )

  useEffect(() => clear, [clear])

  return { phase, message, lit, tapped, bad, trail, trailTone, hits, length, memorize, start, stop, tap }
}
