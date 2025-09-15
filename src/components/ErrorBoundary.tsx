import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
  info?: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info);
    this.setState({ error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Something went wrong</h2>
          <p>We captured an error while rendering. Please refresh.</p>
          <details style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error?.toString()}
            {"\n"}
            {this.state.info ? this.state.info.componentStack : null}
          </details>
          <button onClick={() => this.setState({ hasError: false, error: null, info: null })} style={{ marginTop: 12 }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
