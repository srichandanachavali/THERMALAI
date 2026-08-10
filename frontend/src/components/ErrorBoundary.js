import React from "react";

// Catches render-time errors from any page and offers a recovery path instead
// of a blank screen. Wrapped around each route in App.js.
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ThermalAI UI Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center h-64 text-center p-8"
        >
          <div className="text-4xl mb-4" aria-hidden="true">⚠️</div>
          <h2 className="text-white text-xl font-bold mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-400 mb-4">
            A component failed to render. Reload the page to continue monitoring.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-500 hover:bg-green-400 text-white font-medium px-6 py-2 rounded-lg transition-all text-sm"
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
