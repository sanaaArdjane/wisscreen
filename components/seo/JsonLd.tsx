/**
 * Renders one JSON-LD structured-data block. There's no metadata-API equivalent for
 * this in Next.js, so it's a plain `<script>` — `<` is escaped to `<` so a stray
 * one inside string data (a title, an FAQ answer) can never close the tag early and
 * break out into the surrounding HTML.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
