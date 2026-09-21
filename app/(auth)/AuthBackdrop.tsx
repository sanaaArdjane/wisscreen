"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const AuthScene = dynamic(() => import("./AuthScene"), { ssr: false });

export default function AuthBackdrop() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    const update = () => {
      setEnabled(media.matches);
      if (!media.matches) setReady(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-16 top-20 h-64 w-[85%] sm:top-16 sm:h-80 lg:w-[68%]"
        viewBox="0 0 1100 320"
        preserveAspectRatio="none"
        fill="none"
      >
        <path className="auth-wave auth-wave-back" d="M-60 154C168 34 316 262 535 140S879 33 1160 117" stroke="#354666" strokeOpacity=".12" strokeWidth="2" />
        <path className="auth-wave auth-wave-middle" d="M-60 202C171 82 327 307 548 185S889 76 1160 161" stroke="#354666" strokeOpacity=".16" strokeWidth="2" />
        <path className="auth-wave auth-wave-front" d="M-60 250C171 131 340 338 565 230S902 118 1160 207" stroke="#13C182" strokeOpacity=".24" strokeWidth="2" />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-52 w-full sm:h-72"
        viewBox="0 0 1440 280"
        preserveAspectRatio="none"
        fill="none"
      >
        <path className="auth-wave auth-wave-back" d="M-80 106C180 20 300 214 558 126S1000 32 1520 132" stroke="#354666" strokeOpacity=".1" strokeWidth="2" />
        <path className="auth-wave auth-wave-middle" d="M-80 156C150 76 365 238 628 146S1098 52 1520 178" stroke="#354666" strokeOpacity=".14" strokeWidth="2" />
        <path className="auth-wave auth-wave-front" d="M-80 206C205 128 428 254 692 198S1155 102 1520 220" stroke="#13C182" strokeOpacity=".3" strokeWidth="2" />
      </svg>
      </div>
      {enabled && <AuthScene onReady={() => setReady(true)} />}
    </div>
  );
}
