import { useEffect, useRef, useState } from 'react'

/**
 * Indica cuándo debe reproducirse la mini animación de un panel.
 *  - Con ratón: mientras el cursor está dentro del panel (o el teclado tiene el foco dentro).
 *  - En pantallas táctiles (sin hover): mientras el panel está a la vista.
 * Devuelve [ref, active]; el `ref` va en el contenedor del panel.
 */
export function useHoverPlay() {
  const ref = useRef(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const canHover = window.matchMedia?.('(hover: hover)').matches
    if (!canHover) {
      if (typeof IntersectionObserver === 'undefined') return undefined
      const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.6 })
      io.observe(el)
      return () => io.disconnect()
    }

    const on = () => setActive(true)
    const off = () => setActive(false)
    const focusOut = (event) => {
      if (!el.contains(event.relatedTarget)) setActive(false)
    }
    el.addEventListener('pointerenter', on)
    el.addEventListener('pointerleave', off)
    el.addEventListener('focusin', on)
    el.addEventListener('focusout', focusOut)
    return () => {
      el.removeEventListener('pointerenter', on)
      el.removeEventListener('pointerleave', off)
      el.removeEventListener('focusin', on)
      el.removeEventListener('focusout', focusOut)
    }
  }, [])

  return [ref, active]
}
