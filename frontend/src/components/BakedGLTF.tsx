import { useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

interface BakedGLTFProps {
  glbPath: string
  texturePath: string
  scale?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export function BakedGLTF({ glbPath, texturePath, scale = 1, position, rotation }: BakedGLTFProps) {
  const { scene } = useGLTF(glbPath)
  const texture = useTexture(texturePath)

  const clonedScene = useMemo(() => {
    texture.flipY = false
    texture.colorSpace = THREE.SRGBColorSpace

    const clone = scene.clone(true)
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshBasicMaterial({ map: texture })
      }
    })
    return clone
  }, [scene, texture])

  return (
    <primitive
      object={clonedScene}
      scale={scale}
      position={position}
      rotation={rotation}
    />
  )
}
