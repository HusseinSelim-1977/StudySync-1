import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

const CLICKABLES = [
  { position: [0, 0.317, 0.05], scale: [0.5, 0.4, 0.2], view: 'monitor' as const },
  { position: [0, -0.15, 0], scale: [0.8, 0.05, 0.5], view: 'desk' as const },
]

export function Clickables() {
  const { camera, gl, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const pointer = useRef(new THREE.Vector2())
  const meshes = useRef<THREE.Mesh[]>([])
  const setHoveredObject = useStore((s) => s.setHoveredObject)
  const setIsTransitioning = useStore((s) => s.setIsTransitioning)

  // create invisible clickable meshes
  useEffect(() => {
    const group = new THREE.Group()
    CLICKABLES.forEach((c) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...c.scale),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      )
      mesh.position.set(...c.position)
      mesh.userData.view = c.view
      group.add(mesh)
      meshes.current.push(mesh)
    })
    scene.add(group)
    return () => { scene.remove(group) }
  }, [scene])

  // raycaster per frame
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    const handleClick = () => {
      if (meshes.current.length === 0) return
      raycaster.current.setFromCamera(pointer.current, camera)
      const intersects = raycaster.current.intersectObjects(meshes.current)
      if (intersects.length > 0) {
        const view = intersects[0].object.userData.view
        if (view) useStore.getState().setActiveView(view)
      }
    }
    gl.domElement.addEventListener('mousemove', handleMouse)
    gl.domElement.addEventListener('click', handleClick)
    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouse)
      gl.domElement.removeEventListener('click', handleClick)
    }
  }, [camera, gl])

  // hover detection per frame via animation loop
  useFrame(() => {
    if (meshes.current.length === 0) return
    raycaster.current.setFromCamera(pointer.current, camera)
    const intersects = raycaster.current.intersectObjects(meshes.current)
    if (intersects.length > 0) {
      document.body.style.cursor = 'pointer'
      setHoveredObject(intersects[0].object.userData.view)
    } else {
      document.body.style.cursor = 'crosshair'
      setHoveredObject(null)
    }
  })

  return null
}
