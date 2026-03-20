import * as React from 'react';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      
      try {
        // Try to parse if it's our custom Firestore error JSON
        const parsedError = JSON.parse(this.state.error?.message || '');
        if (parsedError.error && parsedError.operationType) {
          errorMessage = `Firestore ${parsedError.operationType} error: ${parsedError.error}`;
        }
      } catch (e) {
        // Not a JSON error, use the message directly if it's simple
        if (this.state.error?.message && this.state.error.message.length < 100) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 dark:bg-[#0a0a0a]">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-xl dark:border-red-900/30 dark:bg-slate-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Something went wrong</h1>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-[#E91E63] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
