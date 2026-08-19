import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 p-6 text-center">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-red-100 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-3xl font-extrabold">
              ⚠️
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-extrabold text-gray-900">Something went wrong</h2>
              <p className="text-xs text-gray-500 font-medium">
                An unexpected error occurred while rendering this screen.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-left overflow-x-auto max-h-36">
                <p className="text-xs font-bold text-red-800 break-words">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-red-600 mt-1 whitespace-pre-wrap font-mono">
                    {this.state.errorInfo.componentStack.slice(0, 300)}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all mt-2"
            >
              🔄 Return to Safety / Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
