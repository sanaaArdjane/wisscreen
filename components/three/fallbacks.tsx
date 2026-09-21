/**
 * The CSS-only stand-ins for the hero's 3D scenes: the loading placeholder, and the
 * fallback shown when WebGL is unavailable or the scene throws.
 *
 * Kept apart from the scene modules on purpose. Importing a fallback from
 * `EarthNetwork.tsx` or `InfraStack.tsx` would pull three.js into whatever imported it,
 * which for the hero means into the page's main bundle — defeating the lazy `next/dynamic`
 * split that is the whole reason the 3D costs nothing until it is needed.
 */

/**
 * Static stand-in for the 3D scene. Used three ways: while the chunk loads, as the
 * `<canvas>` fallback when WebGL is unavailable, and as the error-boundary fallback
 * if the scene throws. Pure CSS so it can never fail for the same reasons the 3D can.
 */
export function EarthNetworkFallback({ message }: { message?: string } = {}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:30px_30px]" />
      <div className="absolute h-[28rem] w-[28rem] max-w-[80vw] rounded-full bg-aqua/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative h-[20rem] w-[20rem] max-w-[68vw] rounded-full border border-aqua/25 bg-[radial-gradient(circle_at_35%_28%,#3d5175_0%,#2b3852_55%,#233047_100%)] shadow-2xl">
          <div className="absolute inset-0 rounded-full opacity-55 [background-image:radial-gradient(circle_at_1px_1px,rgba(127,201,200,0.6)_1px,transparent_0)] [background-size:15px_15px]" />
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-teal/35" />
          <div className="absolute inset-x-0 top-[30%] h-px bg-aqua/15" />
          <div className="absolute inset-x-0 top-[70%] h-px bg-aqua/15" />
          <div className="absolute -inset-3 rounded-full border border-aqua/10" />
        </div>

        {message && (
          <p className="max-w-xs text-center text-xs uppercase tracking-[0.14em] text-aqua/70">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Transient placeholder for while the 3D chunk loads. Just soft ambient glow — no
 * globe (drawing one here then popping the real one in reads as loading twice) and
 * no dot pattern (the real starfield is rendered in GL; a CSS one underneath the
 * canvas would linger behind the whole scene).
 */
export function EarthSkyPlaceholder() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] max-w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqua/10 blur-3xl" />
      <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
    </div>
  );
}

/**
 * Static stand-in for the 3D scene: the `<canvas>` fallback when WebGL is unavailable
 * and the error-boundary fallback if the scene throws. Pure CSS so it can never fail
 * for the same reasons the 3D can.
 */
export function InfraStackFallback({ message }: { message?: string } = {}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:30px_30px]" />
      <div className="relative flex flex-col items-center gap-8">
        <div className="relative h-[15rem] w-[22rem] max-w-[78vw] [perspective:900px]">
          <div className="absolute inset-0 flex flex-col justify-center gap-7 [transform:rotateX(58deg)_rotateZ(-30deg)] [transform-style:preserve-3d]">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-24 rounded-2xl border bg-[#1d2a42]/70 shadow-[0_0_24px_rgba(127,201,200,0.18)] ${
                  i === 1 ? "border-signal/60" : "border-aqua/45"
                }`}
              />
            ))}
          </div>
        </div>
        {message && (
          <p className="max-w-xs text-center text-xs uppercase tracking-[0.14em] text-aqua">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Transient placeholder while the 3D chunk loads. Soft ambient glow only — drawing a
 * stack here and then popping the real one in would read as loading twice.
 */
export function InfraSkyPlaceholder() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-[26rem] w-[34rem] max-w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqua/10 blur-3xl" />
      <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
    </div>
  );
}
