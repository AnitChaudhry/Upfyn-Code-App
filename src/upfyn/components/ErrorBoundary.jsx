import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 max-w-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <svg className="h-4.5 w-4.5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-foreground">Something went wrong</h3>
                <p className="text-xs text-muted-foreground mt-0.5">This section encountered an error</p>
              </div>
            </div>
            {this.props.showDetails && this.state.error && (
              <details className="mt-3 text-left">
                <summary className="cursor-pointer text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs bg-muted/50 text-muted-foreground p-3 rounded-lg overflow-auto max-h-40 border border-border/50">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  if (this.props.onRetry) this.props.onRetry();
                }}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-muted text-muted-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
