import { useHoverPlay } from '../hooks/useHoverPlay.js'

// Panel (<section>) cuya mini animación se reproduce al pasar el cursor.
// children recibe `playing` (true/false) para pasárselo a la ilustración.
export default function HoverPanel({ className, children, ...props }) {
  const [ref, playing] = useHoverPlay()
  return (
    <section ref={ref} className={className} {...props}>
      {children(playing)}
    </section>
  )
}
