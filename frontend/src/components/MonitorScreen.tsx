import { Html } from '@react-three/drei'
import { InnerOS } from '../inner/InnerOS'
import { ErrorBoundary } from '../inner/ErrorBoundary'
import { useStore } from '../store'

export function MonitorScreen() {
  const bootComplete = useStore((s) => s.bootComplete)

  return (
    <group position={[0, 0.317, 0.086]}>
      <Html
        transform
        occlude={false}
        distanceFactor={0.35}
        style={{
          width: '512px',
          height: '384px',
          overflow: 'hidden',
        }}
      >
        <ErrorBoundary>
          <InnerOS bootComplete={bootComplete} />
        </ErrorBoundary>
      </Html>
    </group>
  )
}
