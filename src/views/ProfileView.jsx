import { useEffect, useState } from 'react'
import { getProfile } from '../api/auth.js'
import { isAuthError } from '../api/client.js'
import { useAuth } from '../context/useAuth.js'
import { useActivitySummary } from '../hooks/useActivitySummary.js'
import { daysLabel, formatDuration, fullName, shortDate } from '../lib/format.js'
import { formatTime } from '../lib/memory.js'
import { winsFor } from '../lib/wins.js'
import './ProfileView.css'

const GAMES = { sequence: 'Secuencia de patrones', memory: 'Memorama', odd: 'Intruso visual' }
const LEVELS = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' }
const LEVEL_ORDER = ['facil', 'medio', 'dificil']
const FILTERS = [{ id: 'all', label: 'Todos los juegos' }, ...Object.entries(GAMES).map(([id, label]) => ({ id, label }))]
const RECENT_SHOWN = 10

function bestDetail(game, best) {
  if (game === 'memory') return `${best.moves} mov. · ${formatTime(Math.round(best.durationSec))}`
  if (game === 'odd') return `${best.found} ${best.found === 1 ? 'intruso' : 'intrusos'}`
  return `${best.length} puntos`
}

// Detalle corto de un intento según el juego
function attemptDetail(attempt) {
  const m = attempt.metrics || {}
  if (attempt.game === 'sequence') return `${m.length ?? '?'} puntos`
  if (attempt.game === 'memory') return `${m.moves ?? '?'} mov. · ${formatTime(Math.round(attempt.durationSec))}`
  return `${m.found ?? 0} ${m.found === 1 ? 'intruso' : 'intrusos'}`
}

export default function ProfileView() {
  const { user, setScore, signOut } = useAuth()
  const activity = useActivitySummary()
  const [filter, setFilter] = useState('all')
  const summary = activity.status === 'ok' ? activity.data : null

  // Al abrir el perfil se refresca el puntaje con el valor del servidor.
  useEffect(() => {
    let cancelled = false
    getProfile()
      .then((profile) => {
        if (!cancelled) setScore(profile.score)
      })
      .catch((error) => {
        if (!cancelled && isAuthError(error)) signOut()
      })
    return () => {
      cancelled = true
    }
  }, [setScore, signOut])

  const name = fullName(user)
  const score = summary ? winsFor(filter, user.score, summary.games) : user.score

  return (
    <section className="profile">
      <h1>Tu perfil</h1>

      <div className="profile__grid">
        <div className="profile__card">
          {user.picture ? (
            <img className="profile__avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="profile__avatar profile__avatar--initial" aria-hidden="true">
              {name.charAt(0)}
            </div>
          )}
          <p className="profile__name">{name}</p>
          <p className="muted">{user.email}</p>

          {summary && (
            <div className="profile__pick">
              <label htmlFor="wins-game" className="muted">
                Ver aciertos de
              </label>
              <div className="select">
                <select id="wins-game" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  {FILTERS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <p className="profile__score">{score}</p>
          <p className="muted profile__label">
            {filter === 'all' ? 'aciertos acumulados' : `aciertos en ${GAMES[filter]}`}
          </p>
        </div>

        {summary && <ActivityCard summary={summary} filter={filter} />}
      </div>
    </section>
  )
}

function ActivityCard({ summary, filter }) {
  const { streak, totals } = summary
  const byGame = filter !== 'all'
  const game = byGame ? summary.games[filter] || { attempts: 0, wins: 0, playSeconds: 0, lastPlayedAt: null } : null

  const stats = byGame
    ? [
        ['Intentos', game.attempts],
        ['Aciertos', game.wins],
        ['Tiempo jugado', formatDuration(game.playSeconds)],
        ['Último intento', game.lastPlayedAt ? new Date(game.lastPlayedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'],
      ]
    : [
        ['Sesiones', totals.sessions],
        ['Intentos', totals.attempts],
        ['Aciertos', totals.wins],
        ['Tiempo jugado', formatDuration(totals.playSeconds)],
      ]

  const recent = summary.recent.filter((a) => !byGame || a.game === filter).slice(0, RECENT_SHOWN)
  const bests = byGame
    ? Object.entries(summary.bests)
        .filter(([key]) => key.startsWith(`${filter}_`))
        .map(([key, best]) => ({ level: key.slice(filter.length + 1), best }))
        .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))
    : []

  return (
    <div className="profile__card activity">
      <h2 className="activity__title">Tu actividad{byGame ? ` · ${GAMES[filter]}` : ''}</h2>

      <div className="activity__streak">
        <div>
          <p className={`activity__big${streak.current > 0 ? ' is-lit' : ''}`}>{daysLabel(streak.current)}</p>
          <p className="muted activity__label">de racha</p>
        </div>
        <div>
          <p className="activity__big">{daysLabel(streak.best)}</p>
          <p className="muted activity__label">mejor racha</p>
        </div>
      </div>
      {byGame && <p className="muted activity__note">La racha cuenta los días jugados en cualquier juego.</p>}

      <dl className="activity__stats">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {bests.length > 0 && (
        <>
          <h3 className="activity__sub">Mejores marcas</h3>
          <ul className="activity__bests">
            {bests.map(({ level, best }) => (
              <li key={level}>
                <strong>{LEVELS[level] ?? level}</strong>
                <span className="muted">{bestDetail(filter, best)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="activity__sub">Últimos intentos</h3>
      {recent.length === 0 ? (
        <p className="muted">
          {byGame ? `Aún no hay intentos de ${GAMES[filter]}.` : 'Aún no hay intentos. Juega una ronda y aparecerá aquí.'}
        </p>
      ) : (
        <ul className="activity__list">
          {recent.map((attempt) => (
            <li key={attempt.id}>
              <span className={`activity__result${attempt.success ? ' is-win' : ''}`} aria-hidden="true" />
              <span className="activity__what">
                <strong>{GAMES[attempt.game] ?? attempt.game}</strong>
                <span className="muted">
                  {LEVELS[attempt.level] ?? attempt.level} · {attemptDetail(attempt)}
                </span>
              </span>
              <span className="muted activity__when">
                <span className="sr-only">{attempt.success ? 'Acierto, ' : 'Sin acierto, '}</span>
                {shortDate(attempt.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
