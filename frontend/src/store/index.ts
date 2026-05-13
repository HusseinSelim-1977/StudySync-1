import { create } from 'zustand'

export type ViewKey = 'overview' | 'monitor' | 'desk'

export interface CameraTarget {
  position: [number, number, number]
  target: [number, number, number]
}

export const CAMERA_TARGETS: Record<ViewKey, CameraTarget> = {
  overview: { position: [-6.667, 4.0, 6.667], target: [0, -0.333, 0] },
  monitor: { position: [0, 0.317, 1.0], target: [0, 0.317, 0] },
  desk: { position: [0, 0.6, 1.83], target: [0, 0.17, 0] },
}

interface AppState {
  activeView: ViewKey
  hoveredObject: string | null
  isTransitioning: boolean
  bootComplete: boolean
  loading: boolean
  zoomOffset: number
  setActiveView: (view: ViewKey) => void
  setHoveredObject: (obj: string | null) => void
  setIsTransitioning: (v: boolean) => void
  setBootComplete: (v: boolean) => void
  setLoading: (v: boolean) => void
  setZoomOffset: (v: number) => void
}

export const useStore = create<AppState>((set) => ({
  activeView: 'overview',
  hoveredObject: null,
  isTransitioning: false,
  bootComplete: false,
  loading: true,
  zoomOffset: 0,
  setActiveView: (view) => set({ activeView: view, zoomOffset: 0 }),
  setHoveredObject: (obj) => set({ hoveredObject: obj }),
  setIsTransitioning: (v) => set({ isTransitioning: v }),
  setBootComplete: (v) => set({ bootComplete: v }),
  setLoading: (v) => set({ loading: v }),
  setZoomOffset: (v) => set({ zoomOffset: v }),
}))
