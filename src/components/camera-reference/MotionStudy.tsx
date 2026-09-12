'use client'

import { memo, useEffect, useRef } from 'react'
import styles from './MotionStudy.module.css'

type Vec3 = [number, number, number]
type Vec2 = [number, number]
type Move = 'dolly' | 'pull' | 'crane' | 'pan' | 'whip' | 'tilt' | 'track' | 'zoom' | 'crash' | 'vertigo' | 'arc' | 'orbit' | 'handheld' | 'steadicam' | 'static'
type Camera = { position: Vec3; target: Vec3; focal: number; roll: number }
type Face = { points: Vec3[]; color: string; stroke?: string }
type Projector = { point: (v: Vec3) => Vec2 | null; depth: (v: Vec3) => number }

export type MotionStudyProps = {
  name: string
  compact?: boolean
  view?: 'frame' | 'rig' | 'split'
  playing?: boolean
  /** A normalized 0–1 value. When supplied, the parent owns the playback clock. */
  progress?: number
  /** Seconds for one pass when the component owns the playback clock. */
  duration?: number
  onProgress?: (progress: number) => void
}

function motionFor(name: string): Move | null {
  const n = name.toLowerCase().replace(/[’']/g, '')
  if (/dolly.?zoom|vertigo/.test(n)) return 'vertigo'
  if (/crash zoom/.test(n)) return 'crash'
  if (/whip pan/.test(n)) return 'whip'
  if (/pull.?out/.test(n)) return 'pull'
  if (/dolly|push.?in/.test(n)) return 'dolly'
  if (/crane|jib|pedestal/.test(n)) return 'crane'
  if (/360|orbit/.test(n)) return 'orbit'
  if (/arc shot/.test(n)) return 'arc'
  if (/tracking|truck/.test(n)) return 'track'
  if (/steadicam|gimbal/.test(n)) return 'steadicam'
  if (/handheld/.test(n)) return 'handheld'
  if (/^pan(?: shot)?$/.test(n)) return 'pan'
  if (/^tilt(?: shot)?$/.test(n)) return 'tilt'
  if (/zoom/.test(n)) return 'zoom'
  if (/static|locked.?off/.test(n)) return 'static'
  return null
}

export function supportsMotion(name: string): boolean {
  const move = motionFor(name)
  return move !== null && move !== 'static'
}

export function getMotionDescription(name: string): string {
  const descriptions: Record<Move, string> = {
    dolly: 'The camera travels toward the subject. Foreground and background shift at different rates.',
    pull: 'The camera travels away from the subject, opening up the surrounding space.',
    crane: 'The camera rises through space while tilting to keep the subject in frame.',
    pan: 'The camera rotates left to right from one fixed position.',
    whip: 'The camera makes a rapid horizontal rotation from one fixed position.',
    tilt: 'The camera rotates vertically. Its position and lens stay fixed.',
    track: 'The camera travels sideways. The subject and background move at different rates.',
    zoom: 'The camera stays in place while the focal length changes.',
    crash: 'The camera stays in place while the focal length changes rapidly.',
    vertigo: 'Camera distance and focal length change together to maintain subject scale while perspective changes.',
    arc: 'The camera travels along a partial circle, keeping the subject in frame.',
    orbit: 'The camera makes a full circle around the subject.',
    handheld: 'Small, irregular changes in position and rotation suggest a handheld camera.',
    steadicam: 'The camera glides on a stabilized path with gentle changes in viewpoint.',
    static: 'Camera position, direction and focal length remain fixed throughout the shot.',
  }
  const move = motionFor(name)
  return move ? descriptions[move] : 'A still framing study. This schematic does not simulate the full technique.'
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n]
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3): Vec3 => mul(a, 1 / (Math.hypot(...a) || 1))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (t: number) => t * t * (3 - 2 * t)
const target: Vec3 = [0, 0.75, 0]

function getCamera(name: string, progress: number): Camera {
  const p = clamp(progress)
  const move = motionFor(name)
  const n = name.toLowerCase()
  let position: Vec3 = [6.4, 3.3, 10.5]
  let look: Vec3 = [...target]
  let focal = 42
  let roll = 0
  if (move === 'dolly' || move === 'pull' || move === 'vertigo') {
    const t = move === 'pull' ? 1 - p : p
    const distance = lerp(16, 6.8, t)
    const direction: Vec3 = norm([0.51, 0.2, 0.83])
    position = add(target, mul(direction, distance))
    if (move === 'vertigo') focal = 42 * distance / 12
  } else if (move === 'crane') {
    position = [7.2, lerp(1.8, 10, p), lerp(10.5, 8.5, p)]
  } else if (move === 'pan' || move === 'whip') {
    position = [0, 2.5, 11.5]
    const pan = lerp(-0.39, 0.39, move === 'whip' ? smooth(clamp((p - 0.36) / 0.28)) : p)
    look = add(position, [Math.sin(pan) * 11.5, -1.75, -Math.cos(pan) * 11.5])
  } else if (move === 'tilt') {
    position = [6, 2.7, 10.5]
    const tilt = lerp(-0.3, 0.18, p)
    look = [0, 2.7 + Math.tan(tilt) * 12, 0]
  } else if (move === 'track') {
    position = [lerp(-6, 6, p), 2.5, 10]
    look = [position[0] * 0.25, 0.75, 0]
  } else if (move === 'zoom' || move === 'crash') {
    focal = lerp(25, 75, move === 'crash' ? smooth(clamp((p - 0.36) / 0.28)) : p)
  } else if (move === 'arc' || move === 'orbit') {
    const angle = move === 'orbit' ? lerp(0.4, Math.PI * 2 + 0.4, p) : lerp(-0.7, 0.8, p)
    position = [Math.sin(angle) * 11.5, 3.2, Math.cos(angle) * 11.5]
  } else if (move === 'handheld') {
    const t = p * 24
    position = [6.4 + Math.sin(t * 1.3) * 0.1, 3.3 + Math.sin(t * 1.9) * 0.06, 10.5 + Math.cos(t) * 0.08]
    look = [Math.sin(t * 0.8) * 0.11, 0.75 + Math.cos(t * 1.6) * 0.05, 0]
    roll = Math.sin(t * 1.1) * 0.006
  } else if (move === 'steadicam') {
    position = [lerp(-4, 5, p), 2.3 + Math.sin(p * Math.PI) * 0.3, 10 - Math.sin(p * Math.PI) * 2]
  } else if (!move) {
    if (/overhead|bird/.test(n)) position = [0.01, 17, 0.01]
    else if (/aerial/.test(n)) position = [11, 14, 15]
    else if (/high angle/.test(n)) position = [6, 10, 10]
    else if (/low angle|worm/.test(n)) position = [6, 0.6, 9]
    else if (/head.on|p.o.v/.test(n)) position = [9, 1.1, 0.01]
    else if (/eye.level/.test(n)) position = [6.4, 1.3, 10.5]
    if (/extreme close|choker|insert/.test(n)) focal = 130
    else if (/close.up/.test(n)) focal = 85
    else if (/medium|cowboy/.test(n)) focal = 58
    else if (/extreme long|establishing/.test(n)) focal = 22
    else if (/long shot|master/.test(n)) focal = 30
    if (/dutch/.test(n)) roll = -0.19
  }
  return { position, target: look, focal, roll }
}

function projector(camera: Camera, width: number, height: number, ortho = false): Projector {
  const forward = norm(sub(camera.target, camera.position))
  const right = norm(cross(forward, Math.abs(forward[1]) > 0.999 ? [0, 0, -1] : [0, 1, 0]))
  const up = norm(cross(right, forward))
  const focal = width * camera.focal / 36
  const scale = Math.min(width / 27, height / 23)
  return {
    depth: (v) => dot(sub(v, camera.position), forward),
    point: (v) => {
      const delta = sub(v, camera.position)
      const z = dot(delta, forward)
      if (!ortho && z < 0.2) return null
      const factor = ortho ? scale : focal / z
      const x = dot(delta, right) * factor
      const y = -dot(delta, up) * factor
      const cos = Math.cos(camera.roll)
      const sin = Math.sin(camera.roll)
      return [width / 2 + x * cos - y * sin, height * (ortho ? 0.5 : 0.51) + x * sin + y * cos]
    },
  }
}

function box(center: Vec3, size: Vec3, colors: [string, string, string], stroke?: string): Face[] {
  const [x, y, z] = center
  const [w, h, d] = size.map((v) => v / 2)
  const a: Vec3 = [x - w, y - h, z - d], b: Vec3 = [x + w, y - h, z - d]
  const c: Vec3 = [x + w, y - h, z + d], e: Vec3 = [x - w, y - h, z + d]
  const f: Vec3 = [x - w, y + h, z - d], g: Vec3 = [x + w, y + h, z - d]
  const i: Vec3 = [x + w, y + h, z + d], j: Vec3 = [x - w, y + h, z + d]
  return [
    { points: [a, b, g, f], color: colors[1], stroke }, { points: [b, c, i, g], color: colors[2], stroke },
    { points: [c, e, j, i], color: colors[1], stroke }, { points: [e, a, f, j], color: colors[2], stroke },
    { points: [f, g, i, j], color: colors[0], stroke },
  ]
}

function car(): Face[] {
  const faces = box([0, 0.56, 0], [4.6, 0.65, 1.82], ['#f8c29a', '#cf805b', '#dfa37b'])
  faces.push(...box([0.14, 0.89, 0], [4.25, 0.12, 1.73], ['#ffd4b4', '#e6a77e', '#edb38d']))
  // A tapered canopy gives the subject a recognizable coupe silhouette.
  const lf: Vec3 = [-1.38, 0.94, -0.79], rf: Vec3 = [0.95, 0.94, -0.79]
  const ln: Vec3 = [-1.38, 0.94, 0.79], rn: Vec3 = [0.95, 0.94, 0.79]
  const tl: Vec3 = [-0.87, 1.62, -0.64], tr: Vec3 = [0.38, 1.62, -0.64]
  const bl: Vec3 = [-0.87, 1.62, 0.64], br: Vec3 = [0.38, 1.62, 0.64]
  faces.push(
    { points: [lf, rf, tr, tl], color: '#33464b', stroke: '#edb692' },
    { points: [ln, rn, br, bl], color: '#263b41', stroke: '#e8ad86' },
    { points: [rf, rn, br, tr], color: '#536c6b', stroke: '#f1bd98' },
    { points: [lf, ln, bl, tl], color: '#293c40', stroke: '#e8ad86' },
    { points: [tl, tr, br, bl], color: '#f8c39c' },
  )
  for (const z of [-0.94, 0.94]) {
    for (const x of [-1.43, 1.46]) {
      const outward = z > 0 ? 1 : -1
      for (let j = 0; j < 12; j++) {
        const a = j / 12 * Math.PI * 2, b = (j + 1) / 12 * Math.PI * 2
        faces.push({ points: [[x + Math.cos(a) * 0.44, 0.44 + Math.sin(a) * 0.44, z - 0.12], [x + Math.cos(b) * 0.44, 0.44 + Math.sin(b) * 0.44, z - 0.12], [x + Math.cos(b) * 0.44, 0.44 + Math.sin(b) * 0.44, z + 0.12], [x + Math.cos(a) * 0.44, 0.44 + Math.sin(a) * 0.44, z + 0.12]], color: '#1d2324' })
      }
      const wheel = Array.from({ length: 16 }, (_, j): Vec3 => [x + Math.cos(j / 16 * Math.PI * 2) * 0.43, 0.44 + Math.sin(j / 16 * Math.PI * 2) * 0.43, z + outward * 0.13])
      const hub = Array.from({ length: 12 }, (_, j): Vec3 => [x + Math.cos(j / 12 * Math.PI * 2) * 0.24, 0.44 + Math.sin(j / 12 * Math.PI * 2) * 0.24, z + outward * 0.14])
      faces.push({ points: wheel, color: '#191f21', stroke: '#4d5353' }, { points: hub, color: '#89958f', stroke: '#acb2a5' })
    }
  }
  faces.push(...box([2.31, 0.69, -0.55], [0.018, 0.17, 0.43], ['#fae6c6', '#fff0cf', '#fff0cf']))
  faces.push(...box([2.31, 0.69, 0.55], [0.018, 0.17, 0.43], ['#fae6c6', '#fff0cf', '#fff0cf']))
  faces.push(...box([-2.31, 0.69, -0.55], [0.018, 0.12, 0.43], ['#cb7256', '#a65b48', '#e17d5b']))
  faces.push(...box([-2.31, 0.69, 0.55], [0.018, 0.12, 0.43], ['#cb7256', '#a65b48', '#e17d5b']))
  return faces
}

const carGeometry = car()

function polygon(ctx: CanvasRenderingContext2D, points: (Vec2 | null)[], fill?: string, stroke?: string) {
  if (points.some((point) => point === null) || !points.length) return
  ctx.beginPath()
  points.forEach((point, i) => { if (point) i === 0 ? ctx.moveTo(...point) : ctx.lineTo(...point) })
  ctx.closePath()
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.7; ctx.stroke() }
}

function projectedPolygon(project: Projector, points: Vec3[]): (Vec2 | null)[] {
  const clipped: Vec3[] = []
  const near = 0.25
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    const da = project.depth(a), db = project.depth(b)
    if (da >= near) clipped.push(a)
    if ((da >= near) !== (db >= near)) clipped.push(add(a, mul(sub(b, a), (near - da) / (db - da))))
  }
  return clipped.map(project.point)
}

function line(ctx: CanvasRenderingContext2D, project: Projector, points: Vec3[], color: string, width = 1, dash: number[] = []) {
  ctx.beginPath()
  for (let i = 0; i < points.length - 1; i++) {
    let a = points[i], b = points[i + 1]
    const da = project.depth(a), db = project.depth(b)
    if (da < 0.25 && db < 0.25) continue
    if (da < 0.25) a = add(a, mul(sub(b, a), (0.25 - da) / (db - da)))
    else if (db < 0.25) b = add(a, mul(sub(b, a), (0.25 - da) / (db - da)))
    const pa = project.point(a), pb = project.point(b)
    if (pa && pb) { ctx.moveTo(...pa); ctx.lineTo(...pb) }
  }
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.setLineDash(dash)
  ctx.stroke()
  ctx.setLineDash([])
}

function renderFaces(ctx: CanvasRenderingContext2D, project: Projector, faces: Face[]) {
  faces.map((face) => ({ ...face, depth: face.points.reduce((sum, v) => sum + project.depth(v), 0) / face.points.length }))
    .sort((a, b) => b.depth - a.depth)
    .forEach((face) => polygon(ctx, projectedPolygon(project, face.points), face.color, face.stroke))
}

function scene(ctx: CanvasRenderingContext2D, project: Projector, rig: boolean) {
  const extent = rig ? 12 : 26
  polygon(ctx, projectedPolygon(project, [[-extent, -0.04, -extent], [extent, -0.04, -extent], [extent, -0.04, extent], [-extent, -0.04, extent]]), rig ? '#171c1f' : '#202628')
  for (let i = -extent; i <= extent; i += 2) {
    line(ctx, project, [[i, 0, -extent], [i, 0, extent]], i === 0 ? '#47515142' : '#65747120', 0.6)
    line(ctx, project, [[-extent, 0, i], [extent, 0, i]], i === 0 ? '#47515142' : '#65747120', 0.6)
  }
  // Road edges and near/far markers make perspective and parallax readable.
  line(ctx, project, [[-extent, 0.016, -2.7], [extent, 0.016, -2.7]], '#9dac9b30', 1)
  line(ctx, project, [[-extent, 0.016, 2.7], [extent, 0.016, 2.7]], '#9dac9b30', 1)
  for (let x = -18; x < 19; x += 3) {
    line(ctx, project, [[x, 0.02, -3.25], [x + 1.5, 0.02, -3.25]], '#cad0b74f', 1.3)
    line(ctx, project, [[x, 0.02, 3.25], [x + 1.5, 0.02, 3.25]], '#cad0b72e', 1.3)
  }
  const columnFaces: Face[] = []
  for (const [x, z, h] of [[-8, -6, 3.2], [-3, -8, 4], [3, -8, 4], [8, -6, 3.2], [-8, 5, 1.2], [8, 5, 1.2]]) {
    columnFaces.push(...box([x, h / 2, z], [0.45, h, 0.45], ['#73847b', '#384844', '#4d5f56']))
    columnFaces.push(...box([x, h - 0.25, z], [0.46, 0.045, 0.46], ['#c4c9ab', '#9da98f', '#c4c9ab']))
  }
  // Multiple translucent ellipses give a soft contact shadow without raster assets.
  for (let i = 6; i > 0; i--) {
    const points = Array.from({ length: 40 }, (_, j): Vec3 => [Math.cos(j / 40 * Math.PI * 2) * (2.1 + i * 0.14), 0.025, Math.sin(j / 40 * Math.PI * 2) * (0.8 + i * 0.1)])
    polygon(ctx, points.map(project.point), '#050b0d16')
  }
  renderFaces(ctx, project, [...columnFaces, ...carGeometry])
}

function textLabel(ctx: CanvasRenderingContext2D, position: Vec2 | null, text: string, color: string, offset: Vec2 = [0, 0]) {
  if (!position) return
  ctx.font = '500 8px ui-monospace, SFMono-Regular, Consolas, monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, position[0] + offset[0], position[1] + offset[1])
}

function drawRig(ctx: CanvasRenderingContext2D, width: number, height: number, name: string, progress: number, compact: boolean) {
  const camera = getCamera(name, progress)
  const rigCamera: Camera = { position: [18, 22, 25], target: [0, 2.3, 0], focal: 35, roll: 0 }
  const project = projector(rigCamera, width, height, true)
  scene(ctx, project, true)
  const move = motionFor(name)
  if (move && !['pan', 'whip', 'tilt', 'zoom', 'crash', 'static'].includes(move)) {
    const path = Array.from({ length: 101 }, (_, i) => getCamera(name, i / 100).position)
    line(ctx, project, path, '#adba9870', 1.3, [4, 4])
    line(ctx, project, path.slice(0, Math.max(2, Math.round(progress * 100) + 1)), '#f5a873', 1.7)
    for (const p of [path[0], path[path.length - 1]]) {
      const point = project.point(p)
      if (point) { ctx.beginPath(); ctx.arc(...point, 2, 0, Math.PI * 2); ctx.fillStyle = '#d8ad86'; ctx.fill() }
    }
  }
  const forward = norm(sub(camera.target, camera.position))
  const right = norm(cross(forward, [0, 1, 0]))
  const up = norm(cross(right, forward))
  const distance = Math.min(9, Math.hypot(...sub(camera.target, camera.position)))
  const halfWidth = distance * 18 / camera.focal
  const halfHeight = halfWidth * height / width
  const frameCenter = add(camera.position, mul(forward, distance))
  const corners = [add(add(frameCenter, mul(right, -halfWidth)), mul(up, -halfHeight)), add(add(frameCenter, mul(right, halfWidth)), mul(up, -halfHeight)), add(add(frameCenter, mul(right, halfWidth)), mul(up, halfHeight)), add(add(frameCenter, mul(right, -halfWidth)), mul(up, halfHeight))]
  polygon(ctx, [project.point(camera.position), project.point(corners[0]), project.point(corners[1])], '#f7a46a09')
  polygon(ctx, [project.point(camera.position), project.point(corners[2]), project.point(corners[3])], '#f7a46a08')
  for (const corner of corners) line(ctx, project, [camera.position, corner], '#f4ab7070', 0.8)
  line(ctx, project, [...corners, corners[0]], '#f4ab70a8', 1)
  line(ctx, project, [camera.position, [camera.position[0], 0, camera.position[2]]], '#b4bfb23d', 0.7, [2, 3])
  const cameraFaces = box(camera.position, [0.83, 0.55, 0.7], ['#f4b07d', '#a46c4e', '#d58d5c'])
  renderFaces(ctx, project, cameraFaces)
  const lens = add(camera.position, mul(forward, 0.68))
  const lensCorners = [add(add(lens, mul(right, -0.29)), mul(up, -0.22)), add(add(lens, mul(right, 0.29)), mul(up, -0.22)), add(add(lens, mul(right, 0.29)), mul(up, 0.22)), add(add(lens, mul(right, -0.29)), mul(up, 0.22))]
  polygon(ctx, lensCorners.map(project.point), '#30413f', '#f6c199')
  if (!compact && width > 280) {
    textLabel(ctx, project.point(add(camera.position, [0, 0.9, 0])), 'CAMERA', '#e5b28c', [6, -4])
    textLabel(ctx, project.point([0, 0.01, -2]), 'SUBJECT', '#abb9ac', [5, 8])
    textLabel(ctx, project.point([-7.2, 0.02, 7.2]), '2 m', '#647269')
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, width: number, height: number, name: string, progress: number, compact: boolean) {
  const camera = getCamera(name, progress)
  scene(ctx, projector(camera, width, height), false)
  // A quiet center marker and framing corners identify a viewfinder without obscuring the scene.
  ctx.strokeStyle = '#c8d2c033'
  ctx.lineWidth = 0.8
  const inset = compact ? 18 : 28, arm = compact ? 7 : 12
  for (const [x, y, dx, dy] of [[inset, inset, 1, 1], [width - inset, inset, -1, 1], [inset, height - inset, 1, -1], [width - inset, height - inset, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x + arm * dx, y); ctx.lineTo(x, y); ctx.lineTo(x, y + arm * dy); ctx.stroke()
  }
  const vignette = ctx.createRadialGradient(width / 2, height * 0.43, height * 0.16, width / 2, height / 2, width * 0.68)
  vignette.addColorStop(0, '#070a0c00'); vignette.addColorStop(1, '#070a0c6e')
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height)
  if (!compact) {
    ctx.font = '400 8px ui-monospace, SFMono-Regular, Consolas, monospace'
    ctx.textAlign = 'right'; ctx.fillStyle = '#b6bbac99'
    ctx.fillText(`${Math.round(camera.focal)} mm`, width - 19, height - 15)
  }
}

function StudyCanvas({ name, compact = false, kind, playing, progress, duration = 8, onProgress }: Omit<MotionStudyProps, 'view'> & { kind: 'frame' | 'rig' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef({ name, compact, kind, playing, progress, duration, onProgress })
  const redrawRef = useRef<() => void>(() => undefined)
  propsRef.current = { name, compact, kind, playing, progress, duration, onProgress }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    let width = 0, height = 0, animation = 0, elapsed = (progress ?? 0.35) * duration, previous = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const paint = (p?: number) => {
      if (!width || !height) return
      const options = propsRef.current
      const value = clamp(p ?? options.progress ?? (elapsed / Math.max(1, options.duration)) % 1)
      const background = ctx.createLinearGradient(0, 0, 0, height)
      background.addColorStop(0, '#131a1d'); background.addColorStop(0.55, '#202b2d'); background.addColorStop(1, '#141b1d')
      ctx.fillStyle = background; ctx.fillRect(0, 0, width, height)
      const glow = ctx.createRadialGradient(width * 0.53, height * 0.25, 0, width * 0.53, height * 0.25, width * 0.6)
      glow.addColorStop(0, '#9fa38612'); glow.addColorStop(1, '#9fa38600')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height)
      if (options.kind === 'rig') drawRig(ctx, width, height, options.name, value, options.compact)
      else drawFrame(ctx, width, height, options.name, value, options.compact)
    }
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width; height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paint()
    }
    const tick = (now: number) => {
      const options = propsRef.current
      if (!options.playing || options.progress !== undefined || (reducedMotion.matches && options.playing !== true)) { previous = 0; return }
      elapsed += previous ? Math.min((now - previous) / 1000, 0.1) : 0
      previous = now
      const value = (elapsed / Math.max(1, options.duration)) % 1
      paint(value)
      options.onProgress?.(value)
      animation = requestAnimationFrame(tick)
    }
    redrawRef.current = () => {
      cancelAnimationFrame(animation)
      previous = 0
      paint()
      if (propsRef.current.playing && propsRef.current.progress === undefined) animation = requestAnimationFrame(tick)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    redrawRef.current()
    return () => { observer.disconnect(); cancelAnimationFrame(animation); redrawRef.current = () => undefined }
    // The renderer reads fresh props through propsRef; resizing does not reset the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { redrawRef.current() }, [name, playing, progress, duration])

  return (
    <div className={styles.panel}>
      <canvas ref={canvasRef} role="img" aria-label={`${name}: ${kind === 'rig' ? 'three-dimensional camera position, field of view and travel path' : 'illustrative camera view of a coupe in a studio'}. ${getMotionDescription(name)}`} />
      <span className={styles.label}><span className={styles.dot} />{kind === 'rig' ? 'Camera rig' : 'Through the lens'}</span>
      <span className={styles.caption}>{kind === 'rig' ? 'POSITION + FIELD OF VIEW' : 'ILLUSTRATIVE STUDY'}</span>
    </div>
  )
}

export const MotionStudy = memo(function MotionStudy({ view = 'frame', compact = false, ...props }: MotionStudyProps) {
  return (
    <div className={`${styles.study} ${compact ? styles.compact : ''} ${view === 'split' ? styles.split : ''} ${props.playing ? styles.running : ''}`}>
      <div className={styles.panels}>
        {view !== 'rig' && <StudyCanvas {...props} compact={compact} kind="frame" />}
        {view !== 'frame' && <StudyCanvas {...props} compact={compact} kind="rig" onProgress={view === 'split' ? undefined : props.onProgress} />}
      </div>
    </div>
  )
})

export default MotionStudy
