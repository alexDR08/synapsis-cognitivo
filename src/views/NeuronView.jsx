import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import Chispa from '../components/Chispa.jsx'
import SpeakButton from '../components/SpeakButton.jsx'
import NeuronGraph from '../components/NeuronGraph.jsx'
import { useChispaVoice } from '../hooks/useChispaVoice.js'
import { useAuth } from '../context/useAuth.js'
import { useActivitySummary } from '../hooks/useActivitySummary.js'
import { firstName } from '../lib/format.js'
import NeuronEmpty from './NeuronEmpty.jsx'
import { buildNetwork, chispaAdvice, dailyRoutine, networkLevel, stressColor, stressLabel, WEEK_GOAL } from '../lib/neuron.js'
import './NeuronView.css'

const clamp = (v) => Math.max(0, Math.min(100, v))
const MODES = [
  ['progreso', 'Progreso'],
  ['estres', 'Estrés'],
  ['gimnasia', 'Gimnasia'],
]

function NeuronNetwork() {
  const { user } = useAuth()
  const [nodes, setNodes] = useState(() => buildNetwork(user.email ?? user.name ?? 'invitado', user.score ?? 0))
  const [mode, setMode] = useState('progreso')
  const [selectedId, setSelectedId] = useState(null)
  const [burst, setBurst] = useState(null)
  const [note, setNote] = useState(null)
  const [routine, setRoutine] = useState(() => dailyRoutine(nodes).map((n) => n.id))
  const [done, setDone] = useState([])

  const selected = nodes.find((n) => n.id === selectedId) ?? null
  const avgProgress = Math.round(nodes.reduce((s, n) => s + n.progress, 0) / nodes.length)
  const avgStress = Math.round(nodes.reduce((s, n) => s + n.stress, 0) / nodes.length)
  const level = networkLevel(avgProgress)
  const tensest = useMemo(() => [...nodes].sort((a, b) => b.stress - a.stress)[0], [nodes])
  const sessions = nodes.reduce((s, n) => s + n.reps, 0)
  const asleep = nodes.filter((n) => n.reps === 0).length
  const advice = note ?? chispaAdvice(selected, nodes)
  const voice = useChispaVoice()
  const talking = voice.speaking && voice.text === advice.text

  useEffect(() => voice.stop, [voice.stop])
  // Si el mensaje cambia mientras habla, se corta para no leer algo desactualizado
  useEffect(() => {
    if (voice.speaking && voice.text !== advice.text) voice.stop()
  }, [advice.text, voice])

  const select = useCallback((id) => {
    setSelectedId(id)
    setNote(null)
  }, [])

  function train() {
    const target = selected ?? nodes[Math.floor(Math.random() * nodes.length)]
    setNodes((list) =>
      list.map((n) =>
        n.id === target.id
          ? { ...n, progress: clamp(n.progress + 6), stress: clamp(n.stress + 5), reps: Math.min(7, n.reps + 1) }
          : n,
      ),
    )
    setBurst({ id: target.id, n: (burst?.n ?? 0) + 1 })
    setNote({ pose: 'pesas', text: `¡Buen entrenamiento! ${target.label} creció, pero también se cansó un poco. Descansa antes de otra ronda.` })
    setSelectedId(target.id)
    setDone((d) => (d.includes(target.id) ? d : [...d, target.id]))
  }

  function breathe() {
    setNodes((list) => list.map((n) => ({ ...n, stress: clamp(n.stress - 14) })))
    setNote({ pose: 'estudiando', text: 'Inhala 4 segundos, sostén 4 y suelta 6. Mira cómo se va calmando tu red.' })
  }

  return (
    <section className="neuron">
      <header className="neuron__head">
        <div>
          <h1>Mi neurona</h1>
          <p className="muted">Así se ve tu red mental. Cada punto es una habilidad; su anillo es el progreso y su color, el estrés.</p>
        </div>
        <Chispa pose="pensando" size={84} />
      </header>

      <p className="neuron__sim muted">Vista simulada de ejemplo: aún no usa tus partidas reales.</p>

      <div className="neuron__layout">
        <div className="neuron__stage">
          <div className="neuron__modes" role="group" aria-label="Qué mostrar">
            {MODES.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="neuron__canvas">
            <NeuronGraph nodes={nodes} mode={mode} selectedId={selectedId} onSelect={select} burst={burst} />
          </div>
          <ul className="neuron__legend" aria-label="Leyenda">
            {mode === 'gimnasia' ? (
              <>
                <li><i className="neuron__ring" /> 7 tramos: sesiones de la semana</li>
                <li>Conexión dorada: neuronas que se entrenan juntas se conectan</li>
                <li>Tenue: neurona dormida, sin ejercitar</li>
              </>
            ) : (
              <>
                <li><i className="neuron__ring" /> Anillo dorado: progreso</li>
                <li><i className="neuron__grad" /> Color: calma → estrés</li>
                <li>Tamaño: mientras más grande, más desarrollada</li>
              </>
            )}
          </ul>
        </div>

        <aside className="neuron__side">
          <div className="neuron__stats">
            <div>
              <span className="muted">Nivel de la red</span>
              <strong>{level.name}</strong>
              <small className="muted">{level.next ? `Sigue hasta ${level.next}% de progreso medio` : 'Nivel máximo'}</small>
            </div>
            <div>
              <span className="muted">Progreso medio</span>
              <strong>{avgProgress}%</strong>
            </div>
            <div>
              <span className="muted">Estrés medio</span>
              <strong style={{ color: stressColor(avgStress) }}>{stressLabel(avgStress)} · {avgStress}%</strong>
              <small className="muted">Más tensa: {tensest.label}</small>
            </div>
          </div>

          <div className="neuron__chispa" aria-live="polite">
            <Chispa pose={advice.pose} size={64} talking={talking} text={advice.text} />
            <div>
              <p className="neuron__tag">Chispa dice</p>
              <p>
                {advice.text}
                <SpeakButton text={advice.text} />
              </p>
            </div>
          </div>

          {mode === 'gimnasia' && (
            <section className="neuron__gym" aria-labelledby="gym-title">
              <h2 id="gym-title">Rutina de gimnasia cerebral</h2>
              <p className="muted">
                {sessions} sesiones esta semana · {asleep === 0 ? 'ninguna neurona dormida' : `${asleep} ${asleep === 1 ? 'neurona dormida' : 'neuronas dormidas'}`} · meta: {WEEK_GOAL} por neurona.
                Como un músculo, la red crece con repetición y descanso.
              </p>
              <ol className="neuron__routine">
                {routine.map((id) => {
                  const n = nodes.find((x) => x.id === id)
                  const ok = done.includes(id)
                  return (
                    <li key={id} className={ok ? 'is-done' : ''}>
                      <div>
                        <strong>{n.label}</strong>
                        <span className="muted">{n.exercise}</span>
                      </div>
                      {ok ? (
                        <span className="neuron__ok">Hecho ✓</span>
                      ) : n.to ? (
                        <Button to={n.to} variant="spark" size="sm">Ir al reto</Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedId(id)
                            setDone((d) => [...d, id])
                            setNodes((list) => list.map((x) => (x.id === id ? { ...x, reps: Math.min(7, x.reps + 1), progress: clamp(x.progress + 4), stress: clamp(x.stress - 10) } : x)))
                            setBurst({ id, n: (burst?.n ?? 0) + 1 })
                            setNote({ pose: 'pesas', text: `¡Bien hecho! ${n.label} sumó una sesión de gimnasia.` })
                          }}
                        >
                          Marcar hecho
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ol>
              <Button variant="ghost" size="sm" onClick={() => { setRoutine(dailyRoutine(nodes).map((n) => n.id)); setDone([]) }}>
                Nueva rutina
              </Button>
            </section>
          )}

          <div className="neuron__actions">
            <Button variant="spark" onClick={train}>
              {selected ? `Entrenar ${selected.label}` : 'Entrenar una neurona'}
            </Button>
            <Button variant="ghost" onClick={breathe}>
              Respirar y calmar
            </Button>
          </div>

          <ul className="neuron__list" aria-label="Neuronas">
            {nodes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={n.id === selectedId ? 'is-on' : ''}
                  aria-pressed={n.id === selectedId}
                  onClick={() => select(n.id === selectedId ? null : n.id)}
                >
                  <span className="neuron__name">{n.label}</span>
                  <span className="neuron__bar" aria-hidden="true">
                    <i style={{ width: `${n.progress}%` }} />
                  </span>
                  <span className="neuron__val">{n.progress}%</span>
                  <i className="neuron__dot" style={{ background: stressColor(n.stress) }} title={`Estrés ${stressLabel(n.stress).toLowerCase()}`} />
                </button>
              </li>
            ))}
          </ul>
          {selected && <p className="muted neuron__detail"><strong>{selected.label}:</strong> {selected.text} Progreso {selected.progress}% · estrés {stressLabel(selected.stress).toLowerCase()} ({selected.stress}%) · {selected.reps}/7 sesiones. <em>Ejercicio: {selected.exercise}</em></p>}
        </aside>
      </div>
    </section>
  )
}

// Decide qué mostrar: red vacía (sin partidas), cargando, o la red con datos.
export default function NeuronView() {
  const { user } = useAuth()
  const { status, data } = useActivitySummary()

  if (status === 'loading') {
    return (
      <section className="neuron" aria-busy="true">
        <h1>Mi neurona</h1>
        <p className="muted">Despertando tu red…</p>
      </section>
    )
  }
  if (status === 'ok' && data.empty) {
    return <NeuronEmpty firstName={firstName(user)} firstVisit={data.firstVisit} />
  }
  return <NeuronNetwork />
}
