/**
 * Error Boundary Component for Ghost Runner Frontend
 *
 * This component catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the entire app.
 *
 * Related: Development Execution Plan Task 1.4.1
 */

import { Component, type ReactNode, type ComponentType, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Props for the ErrorBoundary component.
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Fallback component to render on error */
  Fallback?: ComponentType<FallbackProps>;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Props passed to the fallback component.
 */
export interface FallbackProps {
  /** The error that was caught */
  error: Error;
  /** Error info with component stack */
  errorInfo: ErrorInfo;
  /** Function to reset the error boundary and retry */
  reset: () => void;
}

/**
 * State for the ErrorBoundary component.
 */
interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that was caught */
  error: Error | null;
  /** Error info with component stack */
  errorInfo: ErrorInfo | null;
}

/**
 * Default fallback UI displayed when an error is caught.
 */
function DefaultFallback({ error, errorInfo, reset }: FallbackProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Something went wrong</h1>
            <p className="text-slate-400 text-sm">An unexpected error occurred</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <p className="text-xs text-slate-500 mb-2">Error Message</p>
            <p className="text-sm text-red-400 font-mono break-all">{error.message}</p>
          </div>

          {errorInfo && (
            <details className="bg-slate-950 rounded-lg border border-slate-800">
              <summary className="px-4 py-3 cursor-pointer text-sm text-slate-400 hover:text-slate-300 select-none">
                Component Stack
              </summary>
              <div className="px-4 pb-4 border-t border-slate-800">
                <pre className="text-xs text-slate-500 font-mono overflow-auto max-h-48">
                  {errorInfo.componentStack}
                </pre>
              </div>
            </details>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Reload Page
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-600 text-center">
          If this problem persists, please check the browser console for more details.
        </p>
      </div>
    </div>
  );
}

/**
 * Error Boundary class component.
 *
 * Catches errors in child components and displays a fallback UI.
 *
 * @example
 * <ErrorBoundary
 *   onError={(error, errorInfo) => console.error(error, errorInfo)}
 * >
 *   <App />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Store error info in state
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset the error boundary state and retry rendering.
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.Fallback || DefaultFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo || { componentStack: '' }}
          reset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components.
 * Uses a class component internally but provides a simpler API.
 *
 * @example
 * function App() {
 *   return (
 *     <WithErrorBoundary>
 *       <Dashboard />
 *     </WithErrorBoundary>
 *   );
 * }
 */
export function WithErrorBoundary({
  children,
  Fallback,
  onError,
}: Omit<ErrorBoundaryProps, 'children'> & { children: ReactNode }): ReactNode {
  return (
    <ErrorBoundary Fallback={Fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}
