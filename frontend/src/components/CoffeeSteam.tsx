import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 1200
const O = new THREE.Vector3(0.58, 0.03, 0.303)

function makeTexture() {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.08, 'rgba(255,255,255,0.7)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.35)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

export function CoffeeSteam() {
  const ref = useRef<THREE.Points>(null!)
  const tex = useMemo(makeTexture, [])
  const timeRef = useRef(0)

  const pos = useMemo(() => {
    const p = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * 0.05
      p[i * 3] = O.x + Math.cos(a) * r
      p[i * 3 + 1] = O.y + Math.random() * 0.15
      p[i * 3 + 2] = O.z + Math.sin(a) * r * 0.6
    }
    return p
  }, [])

  const vel = useMemo(() => {
    const v = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const dir = Math.random() * Math.PI * 2
      const spd = 0.002 * (0.2 + Math.random() * 1.5)
      v[i * 3] = Math.cos(dir) * spd * 0.4
      v[i * 3 + 1] = spd * (0.1 + Math.random() * 0.8)
      v[i * 3 + 2] = Math.sin(dir) * spd * 0.4
    }
    return v
  }, [])

  const phase = useMemo(() => {
    const p = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) p[i] = Math.random() * Math.PI * 2
    return p
  }, [])

  useEffect(() => {
    if (!ref.current) return
    ref.current.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  }, [pos])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timeRef.current += dt
    const t = timeRef.current
    const maxH = 0.18

    for (let i = 0; i < COUNT; i++) {
      const y = pos[i * 3 + 1]
      const h = Math.max(0, Math.min(1, (y - O.y) / maxH))

      vel[i * 3] += Math.sin(t * (2.5 + phase[i])) * 0.0002 * (0.5 + h) * dt * 60
      vel[i * 3 + 2] += Math.cos(t * (2.0 + phase[i] * 0.7)) * 0.0002 * (0.5 + h) * dt * 60
      vel[i * 3] *= 0.96
      vel[i * 3 + 2] *= 0.96

      pos[i * 3] += vel[i * 3] * dt * 60
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt * 60
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt * 60

      vel[i * 3 + 1] -= h * h * 0.0004 * dt * 60

      const spread = 0.02 + h * 0.06
      const dx = pos[i * 3] - O.x
      const dz = pos[i * 3 + 2] - O.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist > spread) {
        pos[i * 3] = O.x + (dx / dist) * spread
        pos[i * 3 + 2] = O.z + (dz / dist) * spread
        vel[i * 3] *= 0.2
        vel[i * 3 + 2] *= 0.2
      }

      if (y > O.y + maxH || (y > O.y + 0.01 && Math.random() < 0.001)) {
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * 0.05
        pos[i * 3] = O.x + Math.cos(a) * r
        pos[i * 3 + 1] = O.y + Math.random() * 0.005
        pos[i * 3 + 2] = O.z + Math.sin(a) * r * 0.6
        const dir = Math.random() * Math.PI * 2
        const spd = 0.002 * (0.2 + Math.random() * 1.5)
        vel[i * 3] = Math.cos(dir) * spd * 0.4
        vel[i * 3 + 1] = spd * (0.1 + Math.random() * 0.8)
        vel[i * 3 + 2] = Math.sin(dir) * spd * 0.4
      }
    }

    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry />
      <pointsMaterial
        map={tex}
        size={0.035}
        color="#f0e8e4"
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
