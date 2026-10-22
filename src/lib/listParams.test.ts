import { applyListChanges, pageWindow, parseListParams, type ListChanges, type ListConfig } from './listParams'

type Filter = 'search' | 'category'

const config: ListConfig<Filter> = {
  sorts: ['date,desc', 'date,asc', 'amount,desc'],
  defaultSort: 'date,desc',
  filters: ['search', 'category'],
}

const parse = (query: string) => parseListParams(new URLSearchParams(query), config)
const apply = (query: string, changes: ListChanges<Filter>) =>
  applyListChanges(new URLSearchParams(query), changes, config).toString()

describe('parseListParams', () => {
  it('sin parametros usa los valores por defecto', () => {
    expect(parse('')).toEqual({ page: 1, size: 10, sort: 'date,desc', filters: { search: '', category: '' } })
  })

  it('lee pagina, tamano, orden y filtros', () => {
    expect(parse('page=3&size=25&sort=amount,desc&search=taxi&category=FOOD')).toEqual({
      page: 3,
      size: 25,
      sort: 'amount,desc',
      filters: { search: 'taxi', category: 'FOOD' },
    })
  })

  it.each(['page=0', 'page=-2', 'page=abc', 'page=1.5', 'page=99999999'])('ignora una pagina invalida: %s', (q) => {
    expect(parse(q).page).toBe(1)
  })

  it('solo acepta los tamanos ofrecidos, para que nadie pida 5000 filas', () => {
    expect(parse('size=5000').size).toBe(10)
    expect(parse('size=7').size).toBe(10)
    expect(parse('size=100').size).toBe(100)
  })

  it('ignora un orden que el backend no permite', () => {
    expect(parse('sort=user.passwordHash,asc').sort).toBe('date,desc')
  })
})

describe('applyListChanges', () => {
  it('cambiar un filtro vuelve a la pagina 1', () => {
    expect(apply('page=4&search=taxi', { search: 'cine' })).toBe('search=cine')
  })

  it('cambiar de pagina conserva los filtros', () => {
    expect(apply('search=taxi&size=25', { page: 2 })).toBe('search=taxi&size=25&page=2')
  })

  it('quita los valores por defecto para que la URL quede corta', () => {
    expect(apply('page=2&size=25&sort=amount,desc', { page: 1, size: 10, sort: 'date,desc' })).toBe('')
  })

  it('un filtro vacio se quita de la URL', () => {
    expect(apply('search=taxi&category=FOOD', { search: '' })).toBe('category=FOOD')
  })

  it('descarta el parametro del dialogo de alta', () => {
    expect(apply('nuevo=1&search=taxi', { page: 2 })).toBe('search=taxi&page=2')
  })
})

describe('pageWindow', () => {
  it('pocas paginas: todas', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('en medio: primera, vecinas y ultima', () => {
    expect(pageWindow(10, 20)).toEqual([1, 'ellipsis-start', 9, 10, 11, 'ellipsis-end', 20])
  })

  it('cerca del inicio no pone puntos donde cabe un numero', () => {
    expect(pageWindow(3, 20)).toEqual([1, 2, 3, 4, 'ellipsis-end', 20])
  })

  it('cerca del final', () => {
    expect(pageWindow(19, 20)).toEqual([1, 'ellipsis-start', 18, 19, 20])
  })

  it('sin resultados no hay paginas', () => {
    expect(pageWindow(1, 0)).toEqual([])
  })
})
