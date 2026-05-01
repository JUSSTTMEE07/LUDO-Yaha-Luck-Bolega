/**
 * useMediaQuery.js – Responsive breakpoint hook
 * Returns true when the given CSS media query matches.
 *
 * Usage:
 *   const isMobile = useMediaQuery('(max-width: 768px)')
 */
import { useState, useEffect } from 'react'

export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)

    // Set initial value
    setMatches(mql.matches)

    // Modern API
    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    }
    // Legacy fallback
    mql.addListener(handler)
    return () => mql.removeListener(handler)
  }, [query])

  return matches
}
