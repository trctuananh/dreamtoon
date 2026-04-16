import React from 'react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "We're sorry, an unexpected error occurred. Please try refreshing the page.";
      let errorTitle = "Something went wrong";

      try {
        if (this.state.error instanceof Error) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error && (parsedError.error.includes("Quota limit exceeded") || parsedError.error.includes("resource-exhausted") || parsedError.error.includes("quota"))) {
            errorTitle = "Daily Limit Reached";
            errorMessage = "The application has reached its free daily quota for the database. This usually happens when there is high traffic. The quota will reset tomorrow. Please try again later.";
          } else if (parsedError.error) {
            errorMessage = parsedError.error;
          }
        }
      } catch (e) {
        // Not a JSON error string, use default or error.message
        if (this.state.error instanceof Error && this.state.error.message) {
          if (this.state.error.message.includes("Quota limit exceeded")) {
            errorTitle = "Daily Limit Reached";
            errorMessage = "The application has reached its free daily quota for the database. This usually happens when there is high traffic. The quota will reset tomorrow. Please try again later.";
          }
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
          <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl max-w-md w-full text-center">
            <h2 className="text-2xl font-black text-red-600 mb-4">{errorTitle}</h2>
            <p className="text-zinc-500 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
