import { useEffect, useRef, useState } from 'react'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)

    update()
    // Safari < 14 fallback.
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }

    if (typeof media.addListener === 'function') {
      media.addListener(update)
      return () => media.removeListener(update)
    }
  }, [])

  return reduced
}

export default function RevealOnScroll({
  children,
  className = '',
  delayMs = 0,
  rootMargin = '0px 0px -10% 0px',
}) {
  const reduced = usePrefersReducedMotion()
  const [visible, setVisible] = useState(() =>
    typeof window === 'undefined' || typeof IntersectionObserver === 'undefined' ? true : reduced,
  )
  const ref = useRef(null)

  useEffect(() => {
    if (reduced) return

    const el = ref.current
    if (!el) return

    // Prerendering environments (and some older browsers) may not support IntersectionObserver.
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin, threshold: 0.15 }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [reduced, rootMargin])

  const motionClass = reduced ? 'opacity-100 translate-y-0' : visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'

  return (
    <div
      ref={ref}
      className={[
        'will-change-transform transition-all duration-700 ease-out',
        motionClass,
        className,
      ].join(' ')}
      style={{ transitionDelay: reduced ? 0 : `${delayMs}ms` }}
    >
      {children}
    </div>
  )
}

