// Aplica el tema antes del primer pintado (misma clave que ThemeProvider).
// Va en un archivo y no inline para que la CSP pueda prohibir scripts inline.
try {
  var t = localStorage.getItem('cashout.theme')
  var dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
} catch (e) {}
