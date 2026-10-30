import { Component, StrictMode } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

class FrontendBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("NetOps Lab frontend error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-error">
          <div className="brand-mark">N</div>
          <p className="eyebrow">NETOPS LAB · SIMULATION</p>
          <h1>Antarmuka mengalami kesalahan.</h1>
          <p role="alert">{this.state.error}</p>
          <button className="button button-primary" onClick={() => window.location.reload()}>Muat ulang aplikasi</button>
        </main>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Elemen #root untuk NetOps Lab tidak ditemukan.");
document.documentElement.lang = "id";
document.title = "NetOps Lab — Network Operations Sandbox";
createRoot(root).render(<StrictMode><FrontendBoundary><App /></FrontendBoundary></StrictMode>);
