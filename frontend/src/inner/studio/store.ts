import { createContext, useContext } from 'react'

export type StudioView = 'home' | 'contact'

export interface StudioState {
  view: StudioView
  setView: (v: StudioView) => void
}

export const StudioCtx = createContext<StudioState>({
  view: 'home',
  setView: () => {},
})

export const useStudio = () => useContext(StudioCtx)
