"use client";

import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== "production" && typeof console !== "undefined") {
      console.error("[ErrorBoundary]", error, info);
    }
  }

  reset = () => {
    this.setState({ error: null });
    if (typeof this.props.onReset === "function") this.props.onReset();
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) {
      return typeof this.props.fallback === "function"
        ? this.props.fallback({ error: this.state.error, reset: this.reset })
        : this.props.fallback;
    }
    return (
      <div className="max-w-md mx-auto my-10 p-6 bg-surface-elevated border border-border rounded-xl shadow-md text-center">
        <div className="font-display text-base font-semibold text-fg mb-2">
          Something went wrong
        </div>
        <div className="text-[13px] text-fg-subtle mb-4 wrap-break-word">
          {this.state.error?.message || "Unexpected error"}
        </div>
        <div className="inline-flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-elevated text-fg text-[13px] font-medium hover:bg-surface-subtle hover:border-border-strong"
            onClick={this.reset}
          >
            Try again
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-on-accent text-[13px] font-semibold hover:bg-accent-600"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
