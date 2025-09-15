import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Filter out extension errors
    const isExtensionError = error.message.includes('chrome-extension') ||
                           error.message.includes('mcafee') ||
                           error.message.includes('moz-extension') ||
                           error.stack?.includes('chrome-extension') ||
                           error.stack?.includes('mcafee');
    
    if (!isExtensionError) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
      this.setState({ error, errorInfo });
    } else {
      // Reset error state for extension errors
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>🚨 Something went wrong</h2>
            <p>We encountered an unexpected error. Please try refreshing the page.</p>
            <details className="error-details">
              <summary>Error Details</summary>
              <pre className="error-stack">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="error-reload-button"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global error handler to suppress extension errors
window.addEventListener('error', (event) => {
  const isExtensionError = event.filename?.includes('chrome-extension') ||
                          event.filename?.includes('mcafee') ||
                          event.filename?.includes('moz-extension') ||
                          event.message?.includes('chrome-extension') ||
                          event.message?.includes('mcafee');
  
  if (isExtensionError) {
    event.preventDefault();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const isExtensionError = event.reason?.toString().includes('chrome-extension') ||
                          event.reason?.toString().includes('mcafee') ||
                          event.reason?.toString().includes('moz-extension');
  
  if (isExtensionError) {
    event.preventDefault();
    return true;
  }
});
