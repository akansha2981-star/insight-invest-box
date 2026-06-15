import { createRoot } from "react-dom/client";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("InvestingIQ critical app render failed", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-foreground">
        <section className="max-w-xl border border-border bg-card p-7 shadow-card">
          <h1 className="mb-3 text-2xl font-black">InvestingIQ is recovering</h1>
          <p className="mb-6 text-sm leading-6 text-muted-foreground">
            A browser module failed to render. Refresh the page, or open the current www version of the site.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => window.location.reload()} className="bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
              Refresh page
            </button>
            <a href="https://www.investingiq.in/" className="border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted">
              Open current site
            </a>
          </div>
        </section>
      </main>
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </RootErrorBoundary>,
);
