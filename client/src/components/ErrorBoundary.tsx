import { AlertTriangle, RotateCcw, WifiOff } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("[QueueSync] Unhandled application error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mesh-bg grid min-h-screen place-items-center p-5">
          <div className="surface-card empty-illustration w-full max-w-xl rounded-[2rem] p-8 text-center sm:p-12">
            <span className="signal-orb mx-auto h-16 w-16 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <p className="mt-7 text-xs font-extrabold uppercase tracking-[.16em] text-primary">Connection interrupted</p>
            <h2 className="display-font mt-3 text-3xl font-bold tracking-[-.05em]">QueueSync needs a fresh start.</h2>
            <p className="mx-auto mt-4 max-w-md leading-7 text-muted-foreground">We could not load this view safely. Your operational records remain unchanged; refresh to reconnect to the latest verified state.</p>
            <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground"><WifiOff className="h-3.5 w-3.5 text-primary" />Safe recovery available</div>
            <button onClick={() => window.location.reload()} className="mx-auto mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:-translate-y-px hover:shadow-lg"><RotateCcw className="h-4 w-4" />Reload QueueSync</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
