import { useCallback, useEffect, useRef, useState } from 'react'
import { logAttempt, logEvent } from '../api/activity.js'
import { buildDeck, saveBest } from '../lib/memory.js'

function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
  }
}

const MATCH_DELAY_MS = 450 // pausa para ver la pareja antes de marcarla
const MISS_DELAY_MS = 900 // tiempo para memorizar las cartas antes de taparlas
const DEAL_MS = 1000 // las cartas se reparten boca abajo
const FLIP_UP_MS = 900 // se voltean todas para mostrar su posición (antes de contar el tiempo)
const HIDE_MS = 900 // se vuelven a tapar y se habilita el juego

/**
 * Memorama de `level.pairs` parejas, en cuatro fases:
 *  dealing  -> las cartas se reparten boca abajo
 *  preview  -> se voltean todas y empieza la cuenta atrás de `level.memorizeSeconds`
 *  hiding   -> se tapan de nuevo
 *  playing  -> el usuario busca las parejas (aquí empiezan el cronómetro y los movimientos)
 * Para empezar otra partida se vuelve a montar el componente que lo usa (por ejemplo cambiándole la `key`).
 */
export function useMemoryGame(level, email) {
  const { pairs, memorizeSeconds } = level
  const [deck] = useState(() => buildDeck(pairs))
  const [phase, setPhase] = useState('dealing')
  const [countdown, setCountdown] = useState(memorizeSeconds)
  const [flipped, setFlipped] = useState([]) // índices boca arriba ahora (máx. 2)
  const [matched, setMatched] = useState([]) // símbolos ya emparejados
  const [missed, setMissed] = useState([]) // las dos cartas que no coincidieron
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('Barajando las cartas…')
  const [result, setResult] = useState(null)

  const lock = useRef(true) // bloqueado hasta que termina la memorización
  const phaseRef = useRef('dealing')
  const startedAt = useRef(null)
  const timers = useRef([])
  const previewTimers = useRef([])
  const flippedRef = useRef([])
  const matchedRef = useRef([])
  const movesRef = useRef(0)
  const finishedRef = useRef(false)
  const previewEndsAt = useRef(0)

  const later = useCallback((fn, ms) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])

  const goTo = useCallback((next) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const atPreview = useCallback((fn, ms) => {
    previewTimers.current.push(setTimeout(fn, ms))
  }, [])

  const hide = useCallback(() => {
    goTo('hiding')
    setCountdown(0)
    setMessage('¡Ahora encuentra las parejas!')
    atPreview(() => {
      goTo('playing')
      lock.current = false
      setMessage('Toca una carta para empezar')
    }, HIDE_MS)
  }, [goTo, atPreview])

  // Secuencia de memorización. Los tiempos se programan una sola vez al montar el juego.
  useEffect(() => {
    previewEndsAt.current = Date.now() + DEAL_MS + FLIP_UP_MS + memorizeSeconds * 1000
    atPreview(() => {
      goTo('preview')
      setMessage(`Memoriza la posición de las cartas. Tienes ${memorizeSeconds} segundos.`)
    }, DEAL_MS)

    const countStart = DEAL_MS + FLIP_UP_MS
    for (let s = 1; s < memorizeSeconds; s++) {
      atPreview(() => setCountdown(memorizeSeconds - s), countStart + s * 1000)
    }
    atPreview(hide, countStart + memorizeSeconds * 1000)

    const pending = previewTimers
    return () => {
      pending.current.forEach(clearTimeout)
      pending.current = []
    }
  }, [memorizeSeconds, atPreview, goTo, hide])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Si sale a mitad de partida (ya con movimientos), se registra como abandono.
  useEffect(
    () => () => {
      if (movesRef.current > 0 && !finishedRef.current) {
        logEvent('game_abandoned', {
          game: 'memory',
          level: level.id,
          moves: movesRef.current,
          pairsFound: matchedRef.current.length,
        })
      }
    },
    [level.id],
  )

  // "Ya las memoricé": termina la memorización antes de tiempo.
  const skipPreview = useCallback(() => {
    if (phaseRef.current !== 'preview') return
    logEvent('preview_skipped', {
      game: 'memory',
      level: level.id,
      secondsLeft: Math.max(0, Math.round((previewEndsAt.current - Date.now()) / 1000)),
    })
    previewTimers.current.forEach(clearTimeout)
    previewTimers.current = []
    hide()
  }, [hide, level.id])

  // Cronómetro: arranca con la primera carta que el usuario voltea y se detiene al terminar.
  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt.current) / 1000))
    }, 250)
    return () => clearInterval(id)
  }, [running])

  const finish = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startedAt.current) / 1000)
    const record = saveBest(email, pairs, { moves: movesRef.current, seconds: elapsed })
    finishedRef.current = true
    logAttempt({
      game: 'memory',
      level: level.id,
      success: true,
      durationSec: elapsed,
      metrics: { pairs, moves: movesRef.current, memorizeSeconds, record },
    })
    setRunning(false)
    setSeconds(elapsed)
    setResult({ moves: movesRef.current, seconds: elapsed, record })
    setMessage('¡Completaste el memorama!')
    vibrate([30, 40, 70])
  }, [email, pairs, level.id, memorizeSeconds])

  const flip = useCallback(
    (index) => {
      if (lock.current || phaseRef.current !== 'playing') return
      const card = deck[index]
      if (flippedRef.current.includes(index) || matchedRef.current.includes(card.symbol)) return

      if (!startedAt.current) {
        startedAt.current = Date.now()
        setRunning(true)
      }

      const next = [...flippedRef.current, index]
      flippedRef.current = next
      setFlipped(next)
      if (next.length < 2) {
        setMessage('Busca su pareja')
        return
      }

      lock.current = true
      movesRef.current += 1
      setMoves(movesRef.current)
      const [first, second] = next

      if (deck[first].symbol === deck[second].symbol) {
        later(() => {
          matchedRef.current = [...matchedRef.current, deck[first].symbol]
          setMatched(matchedRef.current)
          flippedRef.current = []
          setFlipped([])
          lock.current = false
          if (matchedRef.current.length === pairs) {
            finish()
          } else {
            setMessage('¡Pareja encontrada!')
            vibrate(30)
          }
        }, MATCH_DELAY_MS)
      } else {
        setMissed(next)
        setMessage('No coinciden. Recuerda dónde están.')
        later(() => {
          flippedRef.current = []
          setFlipped([])
          setMissed([])
          lock.current = false
        }, MISS_DELAY_MS)
      }
    },
    [deck, pairs, finish, later],
  )

  return {
    deck,
    phase,
    countdown,
    memorizeSeconds,
    flipped,
    matched,
    missed,
    moves,
    seconds,
    message,
    result,
    flip,
    skipPreview,
  }
}
