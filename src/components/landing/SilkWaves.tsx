import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

export interface SilkWavesProps {
  /** 8 colores, de la sombra de los pliegues a su brillo. */
  colors: readonly string[]
  speed?: number
  /** Zoom del patron: mas alto, pliegues mas finos. */
  scale?: number
  /** Cuanto se tuercen y ondulan los pliegues. */
  distortion?: number
  /** Desfase de las ondas: cambia la forma de las curvas. */
  curve?: number
  /** Cantidad de bandas. */
  frequency?: number
  /** Capas de plegado, de 0.5 a 2. */
  complexity?: number
  /** Nitidez entre sombra y brillo. */
  contrast?: number
  brightness?: number
  opacity?: number
  /** Grados. */
  rotation?: number
  offsetX?: number
  offsetY?: number
  className?: string
}

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uScale;
uniform float uDistortion;
uniform float uCurve;
uniform float uFrequency;
uniform float uComplexity;
uniform float uContrast;
uniform float uBrightness;
uniform float uOpacity;
uniform float uRotation;
uniform vec2 uOffset;
uniform vec3 uColors[8];

vec3 gradient(float t) {
  vec3 color = uColors[0];
  for (int i = 0; i < 7; i++) {
    float from = float(i) / 7.0;
    color = mix(color, uColors[i + 1], smoothstep(from, from + 1.0 / 7.0, t));
  }
  return color;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float c = cos(uRotation);
  float s = sin(uRotation);
  uv = mat2(c, -s, s, c) * uv;

  vec2 p = uv * uScale + uOffset;
  float t = uTime * 0.25;

  // Cada capa desplaza el plano con ondas de la anterior: asi las bandas se doblan como tela.
  for (int i = 0; i < 8; i++) {
    if (float(i) >= 2.0 + 3.0 * uComplexity) break;
    float k = float(i) + 1.0;
    p += uDistortion * 0.5 / k * vec2(
      sin(p.y * 0.75 * k + t * 1.2 + uCurve * 1.3 * k),
      cos(p.x * 0.65 * k - t * 0.9 + uCurve * 0.9 * k)
    );
  }

  float wave = sin((p.x * 0.9 + p.y * 0.55) * uFrequency * 2.2 + t * 1.6);
  float fold = 0.5 + 0.5 * wave;
  fold = clamp((fold - 0.5) * uContrast + 0.5, 0.0, 1.0);
  fold = fold * fold * (3.0 - 2.0 * fold);
  // Valles mas profundos que las crestas: es lo que hace que se lea como tela y no como degradado.
  fold = pow(fold, 1.4);

  vec3 color = gradient(fold) * uBrightness;
  gl_FragColor = vec4(color * uOpacity, uOpacity);
}
`

const UNIFORMS = [
  'uResolution',
  'uTime',
  'uScale',
  'uDistortion',
  'uCurve',
  'uFrequency',
  'uComplexity',
  'uContrast',
  'uBrightness',
  'uOpacity',
  'uRotation',
  'uOffset',
  'uColors',
] as const

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? [...value].map((ch) => ch + ch).join('') : value
  const int = Number.parseInt(full, 16)
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255]
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/** Pliegues de seda en WebGL: un shader de pantalla completa, sin librerias. */
export function SilkWaves({ className, ...props }: SilkWavesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Los props se leen en cada cuadro: cambiarlos no reinicia WebGL.
  const propsRef = useRef(props)
  const reduced = useReducedMotion()

  useEffect(() => {
    propsRef.current = props
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false })
    if (!canvas || !gl) return

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!vertex || !fragment || !program) return
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    // Un triangulo que cubre toda la pantalla.
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const loc = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<
      (typeof UNIFORMS)[number],
      WebGLUniformLocation | null
    >

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const draw = (time: number) => {
      const p = propsRef.current
      gl.uniform2f(loc.uResolution, canvas.width, canvas.height)
      gl.uniform1f(loc.uTime, time)
      gl.uniform1f(loc.uScale, p.scale ?? 2)
      gl.uniform1f(loc.uDistortion, p.distortion ?? 1)
      gl.uniform1f(loc.uCurve, p.curve ?? 1)
      gl.uniform1f(loc.uFrequency, p.frequency ?? 1)
      gl.uniform1f(loc.uComplexity, p.complexity ?? 1)
      gl.uniform1f(loc.uContrast, p.contrast ?? 1)
      gl.uniform1f(loc.uBrightness, p.brightness ?? 1)
      gl.uniform1f(loc.uOpacity, p.opacity ?? 1)
      gl.uniform1f(loc.uRotation, ((p.rotation ?? 0) * Math.PI) / 180)
      gl.uniform2f(loc.uOffset, p.offsetX ?? 0, p.offsetY ?? 0)
      const palette = Array.from({ length: 8 }, (_, i) => p.colors[Math.min(i, p.colors.length - 1)] ?? '#000000')
      gl.uniform3fv(loc.uColors, palette.flatMap(hexToRgb))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    let time = 8
    let last = 0
    let frame = 0
    let visible = true

    const tick = (now: number) => {
      if (last) time += ((now - last) / 1000) * (propsRef.current.speed ?? 1)
      last = now
      draw(time)
      frame = requestAnimationFrame(tick)
    }
    const start = () => {
      if (reduced || frame) return
      last = 0
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    const resizeObserver = new ResizeObserver(() => {
      resize()
      draw(time)
    })
    resizeObserver.observe(canvas)

    // Fuera de pantalla no se dibuja: ahorra GPU y bateria.
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else stop()
    })
    visibility.observe(canvas)

    resize()
    draw(time)
    if (visible) start()

    return () => {
      stop()
      resizeObserver.disconnect()
      visibility.disconnect()
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
    }
  }, [reduced])

  return <canvas ref={canvasRef} aria-hidden="true" className={cn('pointer-events-none block', className)} />
}
