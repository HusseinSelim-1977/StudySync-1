import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import * as THREE from 'three'
import { useStore, CAMERA_TARGETS, ViewKey } from '../store'

const ZOOM_STEP = 0.08
const ZOOM_MIN = -0.8
const ZOOM_MAX = 0.8

export function CameraController() {
  const { camera, gl } = useThree()
  const activeView = useStore((s) => s.activeView)
  const zoomOffset = useStore((s) => s.zoomOffset)
  const setActiveView = useStore((s) => s.setActiveView)
  const setZoomOffset = useStore((s) => s.setZoomOffset)
  const setIsTransitioning = useStore((s) => s.setIsTransitioning)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const targetPos = useRef(new THREE.Vector3())
  const targetLook = useRef(new THREE.Vector3())
  const tempVec = useRef(new THREE.Vector3())

  const animateTo = (view: ViewKey, zoom: number) => {
    const base = CAMERA_TARGETS[view]
    if (!base) return

    const basePos = new THREE.Vector3(...base.position)
    const baseTarget = new THREE.Vector3(...base.target)

    const dir = new THREE.Vector3().copy(baseTarget).sub(basePos).normalize()
    const dist = basePos.distanceTo(baseTarget)
    const zoomedPos = basePos.clone().add(dir.clone().multiplyScalar(zoom * dist * 0.5))

    targetPos.current.copy(zoomedPos)
    targetLook.current.copy(baseTarget)

    setIsTransitioning(true)
    if (tl.current) tl.current.kill()

    tl.current = gsap.timeline({
      onComplete: () => setIsTransitioning(false),
    })

    const startPos = camera.position.clone()
    const startLook = tempVec.current.copy(camera.position).add(
      new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    )

    const camObj = { x: startPos.x, y: startPos.y, z: startPos.z, lx: startLook.x, ly: startLook.y, lz: startLook.z }

    tl.current.to(camObj, {
      x: targetPos.current.x,
      y: targetPos.current.y,
      z: targetPos.current.z,
      lx: targetLook.current.x,
      ly: targetLook.current.y,
      lz: targetLook.current.z,
      duration: 1.4,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.position.set(camObj.x, camObj.y, camObj.z)
        camera.lookAt(camObj.lx, camObj.ly, camObj.lz)
      },
    })
  }

  useEffect(() => {
    animateTo(activeView, zoomOffset)
  }, [activeView])

  useEffect(() => {
    animateTo(activeView, zoomOffset)
  }, [zoomOffset])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) return

      switch (e.key) {
        case 'Escape':
          setActiveView('overview')
          break

        case '1':
          setActiveView('overview')
          break
        case '2':
          setActiveView('monitor')
          break
        case '3':
          setActiveView('desk')
          break

        case 'PageUp':
          e.preventDefault()
          setZoomOffset(Math.min(ZOOM_MAX, zoomOffset + ZOOM_STEP))
          break
        case 'PageDown':
          e.preventDefault()
          setZoomOffset(Math.max(ZOOM_MIN, zoomOffset - ZOOM_STEP))
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeView, zoomOffset, setActiveView, setZoomOffset])

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return
      const current = useStore.getState().zoomOffset
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setZoomOffset(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, current + delta)))
      e.preventDefault()
    }

    const canvas = gl.domElement
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [setZoomOffset, gl])

  return null
}
