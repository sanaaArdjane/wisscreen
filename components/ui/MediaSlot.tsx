import type { MediaSlot as MediaSlotType, PaletteToken } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { LoadingImage } from "@/components/ui/LoadingImage";
import { cn } from "@/lib/cn";
// Reuse the shared maps rather than redeclaring them here — the local copies had
// already drifted out of sync with the palette tokens.
import { paletteBg as TOKEN_BG, paletteText as TOKEN_TEXT } from "@/lib/palette";

/**
 * One media frame: the real asset when the descriptor has a `src`, and a generated
 * on-brand stand-in when it doesn't. Every real-media integration point in the app reads
 * a MediaSlot descriptor rather than a hardcoded path, so filling a slot in is a one-line
 * change in `lib/data/services.ts` and never touches layout code.
 *
 * The mock is **always rendered**, and the real asset is layered over it — the same
 * contract as the device frames. So a photo covers its decode with a skeleton and then
 * cross-fades in (see `LoadingImage`), and a dead link falls back to the mock instead of
 * leaving an alt-text box in the grid.
 */
export function MediaSlot({
  slot,
  accent = "aqua",
  className,
  /** Describes the frame's rendered width to next/image. Defaults to the three-up grid. */
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: {
  slot: MediaSlotType;
  accent?: PaletteToken;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const isVideo = slot.kind === "video-slot";
  const hasAsset = Boolean(slot.src);

  return (
    <div
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-white/10 bg-ink text-paper",
        className,
      )}
    >
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:22px_22px]" />
      <div className={cn("absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl opacity-30", TOKEN_BG[accent])} />

      {slot.kind === "mock-dashboard" && <DashboardMock accent={accent} />}
      {slot.kind === "mock-scan" && <ScanMock accent={accent} />}
      {slot.kind === "mock-chart" && <ChartMock accent={accent} />}
      {isVideo && <VideoMock accent={accent} />}
      {slot.kind === "image-slot" && <ImageMock accent={accent} />}

      {/* The real asset, over the mock. A video keeps native controls — it is a clip in a
          grid, so the browser's own player is both the most familiar and the most
          accessible thing to give it; the scroll-driven presentation video is a separate
          section with its own chrome. */}
      {slot.src && isVideo && (
        <video
          src={slot.src}
          poster={slot.poster}
          controls
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full bg-abyss object-cover"
        />
      )}
      {slot.src && !isVideo && (
        <LoadingImage src={slot.src} alt={slot.label} sizes={sizes} priority={priority} />
      )}

      {/* Scrim only when there is a photo under the label — over the mock the label sits
          on a dark ground already, and an extra gradient would just mute the artwork.
          A video's own controls occupy that strip, so it gets neither. */}
      {hasAsset && !isVideo && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-abyss/90 to-transparent" />
      )}

      {!(hasAsset && isVideo) && (
        <span className="absolute bottom-4 left-5 right-5 text-xs font-medium uppercase tracking-[0.12em] text-paper/75">
          {slot.label}
        </span>
      )}
    </div>
  );
}

function DashboardMock({ accent }: { accent: PaletteToken }) {
  return (
    <div className="absolute inset-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        <span className="ml-auto h-3 w-20 rounded-full bg-white/15" />
      </div>
      <div className="grid flex-1 grid-cols-3 gap-3">
        <div className="col-span-1 flex flex-col gap-2 rounded-xl bg-white/5 p-3">
          {[0, 1, 2, 3].map((row) => (
            <span key={row} className="h-2 rounded-full bg-white/15" style={{ width: `${70 - row * 12}%` }} />
          ))}
        </div>
        <div className="col-span-2 flex items-end gap-2 rounded-xl bg-white/5 p-3">
          {[40, 65, 50, 80, 60, 90, 45].map((h, i) => (
            <span key={i} className={cn("w-full rounded-t-md", TOKEN_BG[accent])} style={{ height: `${h}%`, opacity: 0.85 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScanMock({ accent }: { accent: PaletteToken }) {
  return (
    <div className="absolute inset-6 flex items-center justify-center">
      <div className="relative h-full w-2/3 rounded-xl border border-white/15 bg-white/5 p-4">
        {[0, 1, 2, 3, 4].map((row) => (
          <span key={row} className="mb-3 block h-2 rounded-full bg-white/15" style={{ width: `${90 - row * 10}%` }} />
        ))}
        <span className={cn("absolute inset-x-0 h-0.5 opacity-80", TOKEN_BG[accent])} style={{ top: "55%" }} />
        <span className={cn("absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold text-ink", TOKEN_BG[accent])}>
          OCR
        </span>
      </div>
    </div>
  );
}

function ChartMock({ accent }: { accent: PaletteToken }) {
  return (
    <div className="absolute inset-6 flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-5">
      {[30, 55, 40, 70, 85, 60, 95, 75].map((h, i) => (
        <span
          key={i}
          className={cn("w-full rounded-t-lg", i === 6 ? TOKEN_BG[accent] : "bg-white/15")}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function VideoMock({ accent }: { accent: PaletteToken }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={cn("flex h-16 w-16 items-center justify-center rounded-full", TOKEN_BG[accent])}>
        <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 text-ink" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

function ImageMock({ accent }: { accent: PaletteToken }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Icon name="sparkles" className={cn("h-12 w-12", TOKEN_TEXT[accent])} strokeWidth={1.2} />
    </div>
  );
}
