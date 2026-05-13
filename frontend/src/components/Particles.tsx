import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Particles() {
  const count = 200
  const ref = useRef<THREE.Points>(null!)

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8
      pos[i * 3 + 1] = Math.random() * 2.8 + 0.1
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 0.5
      spd[i] = 0.002 + Math.random() * 0.005
    }
    return [pos, spd]
  }, [])

  useFrame(() => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += speeds[i]
      if (pos[i * 3 + 1] > 3) {
        pos[i * 3 + 1] = 0.1
        pos[i * 3] = (Math.random() - 0.5) * 8
        pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 0.5
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#ffdd99"
        transparent
        opacity={0.2}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
