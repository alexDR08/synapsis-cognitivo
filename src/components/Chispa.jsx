import { useEffect, useMemo, useRef } from 'react'
import pensando from '../assets/chispa/1-pensando.svg?raw'
import pesas from '../assets/chispa/2-pesas.svg?raw'
import estudiando from '../assets/chispa/3-estudiando.svg?raw'
import celebrando from '../assets/chispa/4-celebrando.svg?raw'
import senalando from '../assets/chispa/5-senalando.svg?raw'
import { getProgress } from '../lib/chispaVoice.js'
import './Chispa.css'

const POSES = { pensando, pesas, estudiando, celebrando, senalando }
let copies = 0

// Los degradados tienen id: cada copia necesita los suyos o una copia oculta deja a otra transparente.
function uniqueIds(svg, n) {
  const ids = [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1])
  return ids.reduce((out, id) => out.replaceAll(`id="${id}"`, `id="${id}-${n}"`).replaceAll(`url(#${id})`, `url(#${id}-${n})`), svg)
}

// Apertura de la boca (0-1) según la letra que se está diciendo
function openness(ch) {
  const c = ch.toLowerCase()
  if (/[aá]/.test(c)) return 1
  if (/[oó]/.test(c)) return 0.85
  if (/[eé]/.test(c)) return 0.65
  if (/[uúü]/.test(c)) return 0.45
  if (/[ií]/.test(c)) return 0.35
  if (/[mbp]/.test(c)) return 0
  return /[a-zñ]/.test(c) ? 0.3 : 0
}

function drawMouth(parts, a) {
  const w = parts.hw * (1 - 0.1 * a)
  const h = 2 + a * 34 * (parts.hw / 22)
  const k = w * 0.78
  parts.vb.setAttribute('d', `M${-w} 0 Q0 -3 ${w} 0 Q${k} ${h} 0 ${h} Q${-k} ${h} ${-w} 0 Z`)
  parts.vl.setAttribute('cy', h * 0.72)
  parts.vl.setAttribute('rx', w * 0.5)
  parts.vl.setAttribute('ry', Math.max(0.1, h * 0.26))
  parts.vl.style.opacity = a > 0.35 ? 1 : 0
}

// Mascota de la app. `pose`: pensando | pesas | estudiando | celebrando | senalando.
// Con `talking` (y `text`, lo que dice la voz) mueve la boca al ritmo de las letras.
export default function Chispa({ pose = 'senalando', size = 96, className = '', talking = false, text = '' }) {
  const box = useRef(null)
  const markup = useMemo(() => {
    copies += 1
    return uniqueIds(POSES[pose] ?? POSES.senalando, copies)
  }, [pose])

  useEffect(() => {
    const root = box.current
    const orig = root.querySelector('.orig')
    const viva = root.querySelector('.viva')
    if (!orig || !viva) return undefined
    if (!talking) {
      orig.style.display = ''
      viva.style.display = 'none'
      return undefined
    }
    const parts = { hw: Number(viva.dataset.hw), vb: viva.querySelector('.vb'), vl: viva.querySelector('.vl') }
    orig.style.display = 'none'
    viva.style.display = ''
    let a = 0
    let raf = 0
    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const ch = text ? text[Math.min(text.length - 1, Math.floor(getProgress() * text.length))] || ' ' : 'a'
      const target = text ? openness(ch) * (0.88 + 0.12 * Math.sin(now / 52)) : 0.5 + 0.5 * Math.sin(now / 110)
      a += (target - a) * (1 - Math.exp(-dt * 26))
      drawMouth(parts, a)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      orig.style.display = ''
      viva.style.display = 'none'
    }
  }, [talking, text, markup])

  return (
    <span
      ref={box}
      className={`chispa${talking ? ' chispa--talking' : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
