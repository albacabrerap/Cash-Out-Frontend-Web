import { useState, type Ref } from 'react'
import { Search, X } from 'lucide-react'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  defaultValue: string
  onSearch: (value: string) => void
  label: string
  placeholder?: string
  /** El backend rechaza busquedas de mas de 100 caracteres. */
  maxLength?: number
  className?: string
  /** Para enfocarlo desde un atajo de teclado. */
  inputRef?: Ref<HTMLInputElement>
}

/** Busca 400 ms despues de la ultima tecla, o al presionar Enter. `defaultValue` es el valor de la URL. */
export function SearchInput({ defaultValue, onSearch, label, placeholder, maxLength = 100, className, inputRef }: SearchInputProps) {
  const [value, setValue] = useState(defaultValue)
  const [external, setExternal] = useState(defaultValue)
  const { debounced, flush } = useDebouncedCallback((term: string) => onSearch(term.trim()), 400)

  // Si la URL cambia desde fuera (atras, "Limpiar filtros"), el campo la sigue.
  if (defaultValue !== external) {
    setExternal(defaultValue)
    if (defaultValue !== value.trim()) setValue(defaultValue)
  }

  return (
    <div role="search" className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
        onChange={(event) => {
          setValue(event.target.value)
          debounced(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') flush()
        }}
      />
      {value && (
        <button
          type="button"
          aria-label="Borrar búsqueda"
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            setValue('')
            debounced('')
            flush()
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
