"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/**
 * Cloudflare Turnstile widget, explicit-rendered (not the implicit `data-sitekey`
 * div) so we get a real callback and a widget id — a token is single-use, and
 * without resetting after every submit attempt, a second submission on the same
 * page would silently fail verification with a stale token.
 *
 * Rendered inside a `<form>`, Cloudflare's script still injects its own
 * `<input type="hidden" name="cf-turnstile-response">` next to the widget either
 * way, so a plain `new FormData(formEl)` on submit picks the token up on its own —
 * nothing here has to thread it through React state.
 *
 * `onReady` (not `onLoad`) is what next/script fires on *every* mount, including
 * when the script was already loaded by a previous page — this component can
 * mount again after a client-side navigation (e.g. between two solution pages)
 * without the script re-downloading, and `onLoad` alone would never fire twice.
 */
export function Turnstile({
  siteKey,
  onVerify,
  resetKey,
  theme = "light",
}: {
  siteKey: string;
  onVerify: (token: string) => void;
  /** Bump this (e.g. after a submit attempt) to reset the widget for a fresh token. */
  resetKey?: number;
  /** Both current usages sit on a `bg-paper` card, so "light" is the right default —
   *  pass "auto" only for a spot that actually adapts to the visitor's OS scheme. */
  theme?: "light" | "dark" | "auto";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const render = () => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      callback: onVerify,
    });
  };

  useEffect(() => {
    return () => {
      // Cleared, not just called: React's dev-mode double-invoke of effects runs
      // this cleanup twice for one mount, and without clearing the ref the second
      // call tries to remove an already-removed widget (harmless, but Turnstile
      // logs a warning for it).
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return (
    <>
      <Script id={SCRIPT_ID} src={SCRIPT_SRC} strategy="afterInteractive" onReady={render} />
      <div ref={containerRef} />
    </>
  );
}
