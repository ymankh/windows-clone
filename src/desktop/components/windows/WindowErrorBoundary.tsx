import { Component, type ErrorInfo, type ReactNode } from "react";

type WindowErrorBoundaryProps = {
  title: string;
  children: ReactNode;
};

type WindowErrorBoundaryState = {
  error: Error | null;
};

/**
 * Contains a crash (or a failed lazy chunk load) to the window it happened in,
 * so one broken app cannot blank the whole desktop.
 */
class WindowErrorBoundary extends Component<
  WindowErrorBoundaryProps,
  WindowErrorBoundaryState
> {
  state: WindowErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WindowErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.title}] crashed`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm"
      >
        <p className="font-semibold">{this.props.title} stopped working.</p>
        <p className="max-w-sm text-muted-foreground">
          {this.state.error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          className="rounded-md border border-border bg-background px-3 py-1.5 font-medium transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          onClick={() => this.setState({ error: null })}
        >
          Try again
        </button>
      </div>
    );
  }
}

export default WindowErrorBoundary;
