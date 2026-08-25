import { SERVICES } from "@/lib/data/services";

/**
 * Can this solution's `previewUrl` actually be shown in an `<iframe>`?
 *
 * The device frames in `DeviceShowcase` need to know *before* they mount a frame,
 * because **the browser will not tell them afterwards**. A page refused by
 * `X-Frame-Options` or a `frame-ancestors` policy still fires `load`, and every
 * discriminator available to the parent document — `contentDocument`, `contentWindow`,
 * `location` — behaves identically for "loaded cross-origin" and "refused": null and
 * SecurityError respectively, in both cases. Chrome makes them deliberately
 * indistinguishable. A refused frame then paints an *opaque* error page, so the
 * fallback can't simply sit underneath and show through either.
 *
 * The headers are only readable from a server, which is what this route is for. It
 * answers with a plain boolean; the frame mounts only on `true`, and the screenshot
 * fallback stays put otherwise.
 *
 * The `url` it is given is checked against the preview URLs declared in `SERVICES` before
 * anything is fetched. An endpoint that fetched whatever URL it was handed would be an
 * open SSRF proxy — the allowlist is what stops that, so keep it.
 */

/** Bounded wait: a host that is slow to answer is treated as unavailable. */
const PROBE_TIMEOUT_MS = 6000;
/** How long a verdict is reused before the target is probed again. */
const CACHE_TTL_MS = 10 * 60 * 1000;

type Verdict = { embeddable: boolean; reason: string };
const cache = new Map<string, { at: number; verdict: Verdict }>();

/** The origin the site is served from — what a `frame-ancestors` list is matched against. */
function selfOrigin(request: Request): string {
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

/** Does one CSP `frame-ancestors` source cover `origin`? */
function sourceMatches(source: string, origin: string, targetOrigin: string): boolean {
  const src = source.trim().toLowerCase();
  if (!src) return false;
  if (src === "*" || src === "https:" || src === "http:") return true;
  if (src === "'none'") return false;
  if (src === "'self'") return origin === targetOrigin;

  const url = new URL(origin);
  // A source may or may not carry a scheme; compare on host either way.
  const withScheme = src.includes("://") ? src : `${url.protocol}//${src}`;
  let host: string;
  let scheme: string;
  try {
    const parsed = new URL(withScheme);
    host = parsed.host;
    scheme = parsed.protocol;
  } catch {
    return false;
  }
  if (scheme !== url.protocol) return false;
  if (host.startsWith("*.")) return url.host === host.slice(2) || url.host.endsWith(host.slice(1));
  return host === url.host;
}

function judge(headers: Headers, origin: string, targetOrigin: string): Verdict {
  // frame-ancestors supersedes X-Frame-Options wherever both are sent.
  const csp = headers.get("content-security-policy");
  const directive = csp
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("frame-ancestors"));

  if (directive) {
    const sources = directive.split(/\s+/).slice(1);
    const allowed = sources.some((source) => sourceMatches(source, origin, targetOrigin));
    return { embeddable: allowed, reason: allowed ? "frame-ancestors allows this origin" : `frame-ancestors: ${sources.join(" ")}` };
  }

  const xfo = headers.get("x-frame-options")?.trim().toLowerCase();
  if (xfo === "deny") return { embeddable: false, reason: "X-Frame-Options: DENY" };
  if (xfo === "sameorigin") {
    const same = origin === targetOrigin;
    return { embeddable: same, reason: same ? "X-Frame-Options: SAMEORIGIN, same origin" : "X-Frame-Options: SAMEORIGIN" };
  }
  return { embeddable: true, reason: "no framing restriction" };
}

async function probe(url: string, origin: string): Promise<Verdict> {
  const targetOrigin = new URL(url).origin;
  // HEAD first — many hosts answer it and it saves pulling a whole page. Some reject it,
  // in which case a GET is the only way to see the headers; the body is discarded.
  for (const method of ["HEAD", "GET"] as const) {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
    } catch (error) {
      return { embeddable: false, reason: `unreachable (${error instanceof Error ? error.name : "error"})` };
    }
    await response.body?.cancel();
    if (method === "HEAD" && (response.status === 405 || response.status === 501)) continue;
    if (!response.ok) return { embeddable: false, reason: `HTTP ${response.status}` };
    return judge(response.headers, origin, targetOrigin);
  }
  return { embeddable: false, reason: "no usable response" };
}

/** Every preview URL any solution declares — the only things this route will fetch. */
function allowedUrls(): Set<string> {
  const urls = new Set<string>();
  for (const service of SERVICES) {
    if (service.previewUrl) urls.add(service.previewUrl);
    if (service.previewMobileUrl) urls.add(service.previewMobileUrl);
  }
  return urls;
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url || !allowedUrls().has(url)) {
    return Response.json({ embeddable: false, reason: "not a declared preview url" }, { status: 404 });
  }

  const origin = selfOrigin(request);
  const key = `${origin}|${url}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return Response.json(hit.verdict, { headers: { "cache-control": "public, max-age=600" } });
  }

  const verdict = await probe(url, origin);
  cache.set(key, { at: Date.now(), verdict });
  return Response.json(verdict, { headers: { "cache-control": "public, max-age=600" } });
}
