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
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h1 className="text-[15px] font-semibold">Something went wrong</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">The interface hit an unexpected error.</p>
          </div>
        </div>

        <pre className="mt-5 whitespace-pre-wrap break-all rounded-md bg-background px-3 py-2 font-mono text-xs text-destructive">
          {error.message}
        </pre>

        {errorInfo?.componentStack && (
          <details className="mt-3 rounded-md border border-border">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
              Component stack
            </summary>
            <pre className="max-h-48 overflow-auto border-t border-border px-3 py-2 font-mono text-xs text-faint">
              {errorInfo.componentStack}
            </pre>
          </details>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={reset}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-8 items-center rounded-md border border-border-strong px-3 text-[13px] font-medium text-foreground hover:bg-accent"
          >
            Reload
          </button>
        </div>
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
