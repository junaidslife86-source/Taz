import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { useFinanceStore } from "./lib/storage";
import "@fontsource/syne/600.css";
import "@fontsource/syne/700.css";
import "./styles/globals.css";

function Bootstrap() {
  const initialize = useFinanceStore((s) => s.initialize);
  const initialized = useFinanceStore((s) => s.initialized);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialize().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to initialize"),
    );
  }, [initialize]);

  if (error) {
    return (
      <div className="loading-screen">
        <p>Something went wrong: {error}</p>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="loading-screen">
        <span className="loading-spinner" aria-hidden="true" />
      </div>
    );
  }

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
