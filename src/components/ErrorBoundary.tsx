import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render errors anywhere in the routed page tree so one broken
 * page shows a fallback instead of a blank white screen — placed around
 * <Routes> rather than the whole app, so the header (nav, search, wishlist
 * badge) stays usable as a way out.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in the route tree:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="section">
          <div className="section__inner">
            <div className="empty-state">
              <h2>Something went wrong</h2>
              <p>
                Try refreshing the page. If it keeps happening, let us know what you were doing.
              </p>
              {/* A plain reload, not <Link> — the error may have come from
                  state that survives a client-side route change (e.g. we're
                  already on /products when it happens), so only a full
                  reload is guaranteed to actually recover. */}
              <a className="pill-button" href="/products">
                Back to products
              </a>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
