import { useEffect, useEffectEvent, useState } from 'react'

/** `value` despues de `delay` ms sin cambios. Se compara por JSON, asi que sirve con objetos que se recrean en cada render. */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  const key = JSON.stringify(value)
  const latest = useEffectEvent(() => value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(latest()), delay)
    return () => clearTimeout(timer)
  }, [key, delay])

  return debounced
}
