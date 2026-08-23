"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

/**
 * Minimal error boundary. Error boundaries must be class components — there is no
 * hook equivalent — so this stays a class on purpose.
 *
 * Used to keep a failing non-essential widget (e.g. the WebGL hero scene) from
 * taking down the whole page: it swaps in `fallback` instead.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; label?: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it for debugging without breaking the page.
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`, error, info);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
