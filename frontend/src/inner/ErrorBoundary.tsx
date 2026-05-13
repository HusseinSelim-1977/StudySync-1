import { Component, ReactNode, ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: 512,
            height: 384,
            background: '#008080',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'MS Sans Serif', monospace",
            fontSize: 12,
            color: '#ffffff',
          }}
        >
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>an error occurred</div>
            <div style={{ fontSize: 10, color: '#ffcccc', wordBreak: 'break-all' }}>
              {this.state.error?.message}
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
