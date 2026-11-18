import { useEffect, useRef } from 'react'
import { GROUPS, LINKS, stressColor } from '../lib/neuron.js'
import './NeuronGraph.css'

const GOLD = '#ffca50'
const sprites = {}

// Punto luminoso (sprite cacheado por color rgba)
function glow(color) {
  if (sprites[color]) return sprites[color]
  const s = document.createElement('canvas')
  s.width = 64
  s.height = 64
  const g = s.getContext('2d')
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, color)
  r.addColorStop(0.3, color.replace(/[\d.]+\)$/, '0.35)'))
  r.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'))
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  sprites[color] = s
  return s
}

const radiusOf = (progress) => 10 + (progress / 100) * 12
const GOLD_RGBA = 'rgba(255,202,80,1)'
const BLUE_RGBA = 'rgba(155,183,234,1)'

// Grafo de fuerzas en canvas: cada punto es una neurona; tamaño y anillo = progreso, color = estrés.
export default function NeuronGraph({ nodes, mode, selectedId, onSelect, burst }) {
  const canvasRef = useRef(null)
  const live = useRef({ nodes, mode, selectedId })
  const sim = useRef(null)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    live.current = { nodes, mode, selectedId }
    onSelectRef.current = onSelect
  })

  // Ráfaga de pulsos cuando el padre lo pide (al entrenar)
  useEffect(() => {
    if (burst && sim.current) sim.current.fire(burst.id)
  }, [burst])

  useEffect(() => {
    const cv = canvasRef.current
    const cx = cv.getContext('2d')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = 0
    let H = 0
    let dpr = 1
    let raf = 0
    let last = performance.now()
    let t = 0
    let spawn = 0

    const sn = new Map() // estado de simulación por neurona
    const ambient = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), vx: 0, vy: 0 }))
    const pulses = []
    const edges = LINKS.map(([a, b]) => ({ a, b }))
    const neigh = new Map()
    edges.forEach(({ a, b }) => {
      if (!neigh.has(a)) neigh.set(a, [])
      if (!neigh.has(b)) neigh.set(b, [])
      neigh.get(a).push(b)
      neigh.get(b).push(a)
    })

    function ensure() {
      live.current.nodes.forEach((n) => {
        if (sn.has(n.id)) return
        const g = GROUPS[n.group].anchor
        sn.set(n.id, {
          x: g[0] * W + (Math.random() - 0.5) * 120,
          y: g[1] * H + (Math.random() - 0.5) * 120,
          vx: 0,
          vy: 0,
          flash: 0,
          p: n.progress,
          s: n.stress,
        })
      })
    }

    function measure() {
      const r = cv.getBoundingClientRect()
      if (!r.width || !r.height) return
      dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(r.width * dpr)
      cv.height = Math.round(r.height * dpr)
      W = r.width
      H = r.height
      ensure()
    }

    function fire(id) {
      ;(neigh.get(id) || []).forEach((to) => pulses.push({ from: id, to, t: 0, col: GOLD_RGBA, speed: 1.1 }))
      const s = sn.get(id)
      if (s) s.flash = 1
    }
    sim.current = { fire }

    function physics(dt) {
      const k = Math.min(2, dt * 60)
      const m = Math.min(W, H)
      const rep = 7000 * (m / 440) ** 2
      const L = m * 0.2
      const ids = [...sn.keys()]
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const a = sn.get(ids[i])
          const b = sn.get(ids[j])
          const dx = b.x - a.x
          const dy = b.y - a.y
          const d2 = dx * dx + dy * dy + 60
          const d = Math.sqrt(d2)
          const f = (rep / d2) * k
          a.vx -= (dx / d) * f
          a.vy -= (dy / d) * f
          b.vx += (dx / d) * f
          b.vy += (dy / d) * f
        }
      }
      edges.forEach(({ a, b }) => {
        const A = sn.get(a)
        const B = sn.get(b)
        if (!A || !B) return
        const dx = B.x - A.x
        const dy = B.y - A.y
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01
        const f = (d - L) * 0.02 * k
        A.vx += (dx / d) * f
        A.vy += (dy / d) * f
        B.vx -= (dx / d) * f
        B.vy -= (dy / d) * f
      })
      live.current.nodes.forEach((n) => {
        const s = sn.get(n.id)
        const g = GROUPS[n.group].anchor
        s.vx += (g[0] * W - s.x) * 0.006 * k
        s.vy += (g[1] * H - s.y) * 0.006 * k
        if (!calm) {
          s.vx += (Math.random() - 0.5) * 0.05
          s.vy += (Math.random() - 0.5) * 0.05
        }
        s.vx *= 0.82
        s.vy *= 0.82
        s.x = Math.max(34, Math.min(W - 34, s.x + s.vx * k))
        s.y = Math.max(34, Math.min(H - 40, s.y + s.vy * k))
        s.flash = Math.max(0, s.flash - dt * 1.4)
        // los valores mostrados se acercan al real (animación al entrenar / respirar)
        s.p += (n.progress - s.p) * Math.min(1, dt * 3)
        s.s += (n.stress - s.s) * Math.min(1, dt * 3)
      })
      if (!calm) {
        ambient.forEach((q) => {
          q.vx += (Math.random() - 0.5) * 0.00004
          q.vy += (Math.random() - 0.5) * 0.00004
          q.x = (q.x + q.vx * k + 1) % 1
          q.y = (q.y + q.vy * k + 1) % 1
        })
      }
    }

    function stepPulses(dt) {
      const { nodes: list, mode } = live.current
      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const p = pulses[i]
        p.t += dt * p.speed
        if (p.t >= 1) {
          const s = sn.get(p.to)
          if (s) s.flash = 1
          pulses.splice(i, 1)
        }
      }
      if (calm) return
      spawn += dt
      // en modo estrés, las neuronas tensas disparan más rápido
      if (spawn > (mode === 'estres' ? 0.22 : 0.45)) {
        spawn = 0
        const hot = list.filter((n) => n.stress > 45)
        const pool = mode === 'estres' && hot.length ? hot : list
        const src = pool[Math.floor(Math.random() * pool.length)]
        const around = neigh.get(src.id) || []
        const to = around[Math.floor(Math.random() * around.length)]
        if (to) {
          pulses.push({
            from: src.id,
            to,
            t: 0,
            col: mode === 'estres' ? stressColor(src.stress, 1) : BLUE_RGBA,
            speed: mode === 'estres' ? 0.5 + src.stress / 100 : 0.8,
          })
        }
      }
    }

    function draw() {
      const { nodes: list, mode, selectedId: sel } = live.current
      cx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx.clearRect(0, 0, W, H)

      // nombres de zona
      cx.textAlign = 'center'
      cx.font = '700 13px Lexend, system-ui, sans-serif'
      cx.fillStyle = 'rgba(177,192,204,.16)'
      Object.values(GROUPS).forEach((g) => {
        cx.fillText(g.label.toUpperCase(), g.anchor[0] * W, Math.max(20, g.anchor[1] * H - H * 0.36))
      })

      // neuronas de fondo: la masa del cerebro
      ambient.forEach((q) => {
        cx.beginPath()
        cx.arc(q.x * W, q.y * H, 1.6, 0, 7)
        cx.fillStyle = 'rgba(111,150,220,.32)'
        cx.fill()
      })

      const byId = new Map(list.map((n) => [n.id, n]))
      const near = sel ? neigh.get(sel) || [] : []

      // conexiones: grosor = fuerza (mínimo del progreso de ambos extremos)
      edges.forEach(({ a, b }) => {
        const A = sn.get(a)
        const B = sn.get(b)
        const na = byId.get(a)
        const nb = byId.get(b)
        if (!A || !B || !na || !nb) return
        const strength = Math.min(A.p, B.p) / 100
        const hot = mode === 'estres' && Math.max(A.s, B.s) > 62
        const on = sel && (a === sel || b === sel)
        cx.beginPath()
        cx.moveTo(A.x, A.y)
        cx.lineTo(B.x, B.y)
        cx.strokeStyle = on
          ? 'rgba(234,240,255,.85)'
          : hot
            ? 'rgba(255,107,90,.55)'
            : `rgba(177,192,204,${0.16 + strength * 0.3})`
        cx.lineWidth = 0.8 + strength * 2.6
        cx.stroke()
        const gym = mode === 'gimnasia' && na.reps >= 3 && nb.reps >= 3
        if (gym) {
          cx.save()
          cx.globalCompositeOperation = 'lighter'
          cx.strokeStyle = `rgba(255,202,80,${0.25 + Math.min(na.reps, nb.reps) * 0.05})`
          cx.lineWidth = 2 + Math.min(na.reps, nb.reps) * 0.7
          cx.stroke()
          cx.restore()
        }
        if (mode === 'progreso' && strength > 0.45) {
          cx.save()
          cx.globalCompositeOperation = 'lighter'
          cx.strokeStyle = `rgba(255,202,80,${(strength - 0.4) * 0.5})`
          cx.lineWidth = 1 + strength * 4
          cx.stroke()
          cx.restore()
        }
      })

      // pulsos con estela
      cx.save()
      cx.globalCompositeOperation = 'lighter'
      pulses.forEach((p) => {
        const A = sn.get(p.from)
        const B = sn.get(p.to)
        if (!A || !B) return
        const f = p.t * p.t * (3 - 2 * p.t)
        for (let s = 0; s < 4; s += 1) {
          const ff = Math.max(0, f - s * 0.04)
          const r = 14 - s * 2.6
          cx.globalAlpha = 1 - s * 0.22
          cx.drawImage(glow(p.col), A.x + (B.x - A.x) * ff - r, A.y + (B.y - A.y) * ff - r, r * 2, r * 2)
        }
      })
      cx.restore()

      // neuronas
      list.forEach((n, i) => {
        const s = sn.get(n.id)
        if (!s) return
        const r = radiusOf(s.p)
        const beat =
          mode === 'estres'
            ? 1 + Math.sin(t * (2 + s.s / 18) + i) * (s.s / 100) * 0.12
            : 1 + Math.sin(t * 2 + i) * 0.03
        const rr = r * beat
        const sleepy = mode === 'gimnasia' && n.reps === 0 ? 0.55 : 1
        const dim = (sel && sel !== n.id && !near.includes(n.id) ? 0.4 : 1) * sleepy

        // halo
        const gr = rr * (mode === 'estres' ? 2.6 + s.s / 60 : 2.3) + s.flash * 8
        cx.save()
        cx.globalCompositeOperation = 'lighter'
        cx.globalAlpha = dim * (0.45 + s.flash * 0.5)
        cx.drawImage(glow(mode === 'estres' ? stressColor(s.s, 1) : GOLD_RGBA), s.x - gr, s.y - gr, gr * 2, gr * 2)
        cx.restore()

        cx.globalAlpha = dim
        cx.beginPath()
        cx.arc(s.x, s.y, rr, 0, 7)
        cx.fillStyle = '#102951'
        cx.fill()
        cx.beginPath()
        cx.arc(s.x, s.y, rr * 0.55, 0, 7)
        cx.fillStyle = stressColor(s.s, 1)
        cx.fill()

        if (mode === 'gimnasia') {
          // 7 segmentos = sesiones de la semana; las llenas están ejercitadas
          const gap = 0.16
          const seg = (Math.PI * 2) / 7
          cx.lineWidth = 3.5
          cx.lineCap = 'butt'
          for (let d = 0; d < 7; d += 1) {
            const a0 = -Math.PI / 2 + d * seg + gap / 2
            cx.beginPath()
            cx.arc(s.x, s.y, rr + 4, a0, a0 + seg - gap)
            cx.strokeStyle = d < n.reps ? GOLD : 'rgba(255,255,255,.16)'
            cx.stroke()
          }
          cx.lineCap = 'round'
        } else {
          // anillo de progreso
          cx.beginPath()
          cx.arc(s.x, s.y, rr + 3.5, 0, 7)
          cx.strokeStyle = 'rgba(255,255,255,.12)'
          cx.lineWidth = 1
          cx.stroke()
          cx.beginPath()
          cx.arc(s.x, s.y, rr + 3.5, -Math.PI / 2, -Math.PI / 2 + (s.p / 100) * Math.PI * 2)
          cx.strokeStyle = GOLD
          cx.lineWidth = 3
          cx.lineCap = 'round'
          cx.stroke()
        }

        if (sel === n.id) {
          cx.setLineDash([4, 4])
          cx.lineDashOffset = -t * 20
          cx.beginPath()
          cx.arc(s.x, s.y, rr + 10, 0, 7)
          cx.strokeStyle = '#eaf0ff'
          cx.lineWidth = 1.5
          cx.stroke()
          cx.setLineDash([])
        }

        cx.globalAlpha = Math.max(dim, 0.6)
        cx.fillStyle = '#eaf0ff'
        cx.font = `${sel === n.id ? 600 : 500} 12px Lexend, system-ui, sans-serif`
        cx.textAlign = 'center'
        cx.fillText(n.label, s.x, s.y + rr + 20)
        cx.globalAlpha = 1
      })
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      if (W) {
        ensure()
        physics(dt)
        stepPulses(dt)
        draw()
      }
      raf = requestAnimationFrame(frame)
    }

    function onDown(e) {
      const rect = cv.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      let best = null
      let bestD = Infinity
      live.current.nodes.forEach((n) => {
        const s = sn.get(n.id)
        if (!s) return
        const d = Math.hypot(s.x - x, s.y - y)
        if (d < radiusOf(s.p) + 14 && d < bestD) {
          best = n.id
          bestD = d
        }
      })
      onSelectRef.current(best)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(cv)
    cv.addEventListener('pointerdown', onDown)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      cv.removeEventListener('pointerdown', onDown)
      sim.current = null
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="ngraph"
      role="img"
      aria-label="Grafo de tu red neuronal: cada punto es una neurona; el anillo dorado muestra su progreso (o las sesiones de gimnasia de la semana) y el color su nivel de estrés."
    />
  )
}
