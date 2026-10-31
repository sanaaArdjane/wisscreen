
/** The solution hero's backdrop: a fine dot texture, nothing else (no glows — light,
    flat grounds only, see docs/DESIGN.md). */
export function PaletteAura() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:26px_26px]" />
    </div>
  );
}
