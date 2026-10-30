import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
    const msg = String(error?.message || '');
    if (
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('Importing a module script failed')
    ) {
      window.location.reload();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-100 text-base-content p-4">
          <div className="max-w-md w-full bg-base-200 border border-base-300 rounded-2xl p-6 shadow-xl text-center space-y-4">
            <h2 className="text-xl font-bold text-error">Something went wrong</h2>
            <p className="text-sm opacity-70">
              An unexpected issue occurred while rendering this view.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary btn-sm px-6"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
