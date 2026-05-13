import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { CameraController } from './CameraController'
import { Room } from './Room'
import { Lighting } from './Lighting'
import { MonitorScreen } from './MonitorScreen'
import { Particles } from './Particles'
import { Clickables } from './Clickables'
import { Scanlines } from './Scanlines'
import {
  useStore,
  CAMERA_TARGETS,
} from '../store'

function PostStack() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.2}
        luminanceSmoothing={0.02}
        intensity={0.15}
        mipmapBlur
      />
      <Noise opacity={0.015} />
      <Vignette eskil={false} offset={0.3} darkness={0.5} />
    </EffectComposer>
  )
}

export function Scene() {
  const activeView = useStore((s) => s.activeView)
  const setActiveView = useStore((s) => s.setActiveView)

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        camera={{
          position: CAMERA_TARGETS.overview.position,
          fov: 35,
          near: 0.01,
          far: 100,
        }}
        shadows={false}
      >
        <color attach="background" args={['#0a0a14']} />

        <PostStack />

        <CameraController />

        <Lighting />

        <Room />

        <MonitorScreen />

        <Clickables />

        <Particles />
      </Canvas>

      <Scanlines />

      {activeView === 'overview' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            cursor: 'pointer',
          }}
          onClick={() => setActiveView('monitor')}
        />
      )}
    </div>
  )
}
