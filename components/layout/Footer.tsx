import { Logo } from "@/components/layout/Logo";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { SOCIAL_LABELS, SocialIcon, type SocialKey } from "@/components/ui/SocialIcon";
import type { FooterContent, GeneralContent } from "@/lib/content/schema";

/**
 * Everything here is edited in /admin/site: the blurb, columns and bottom lines under
 * « Pied de page », the contact lines and social links under « Général ». A column with
 * `includeSolutions` lists every published solution before its own links.
 */
export function Footer({
  footer,
  general,
  solutions,
}: {
  footer: FooterContent;
  general: GeneralContent;
  solutions: { slug: string; name: string }[];
}) {
  const socials = (Object.keys(general.socials) as SocialKey[]).filter((k) => general.socials[k]);
  const { contact } = general;
  const year = String(new Date().getFullYear());

  return (
    <footer className="section-tint texture-3d border-t border-ink/10 text-ink">
      <Container className="py-24 md:py-32">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-5">
            <Logo name={general.siteName} />
            {footer.blurb && <p className="max-w-xs text-sm leading-relaxed text-ink/80">{footer.blurb}</p>}

            {(contact.email || contact.phone || contact.address) && (
              <ul className="flex flex-col gap-2 text-sm text-steel">
                {contact.email && (
                  <li>
                    <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 hover:text-ink">
                      <Icon name="mail" className="h-4 w-4 text-signal" />
                      {contact.email}
                    </a>
                  </li>
                )}
                {contact.phone && (
                  <li>
                    <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 hover:text-ink">
                      <Icon name="send" className="h-4 w-4 text-signal" />
                      {contact.phone}
                    </a>
                  </li>
                )}
                {contact.whatsapp && (
                  <li>
                    <a
                      href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 hover:text-ink"
                    >
                      <Icon name="send" className="h-4 w-4 text-signal" />
                      WhatsApp · {contact.whatsapp}
                    </a>
                  </li>
                )}
                {contact.address && (
                  <li className="inline-flex items-center gap-2">
                    <Icon name="home" className="h-4 w-4 text-signal" />
                    {contact.address}
                  </li>
                )}
              </ul>
            )}

            {socials.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {socials.map((key) => (
                  <li key={key}>
                    <a
                      href={general.socials[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={SOCIAL_LABELS[key]}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-steel transition-colors hover:border-ink/30 hover:text-ink"
                    >
                      <SocialIcon name={key} className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {footer.columns.map((column, i) => {
            const links = [
              ...(column.includeSolutions
                ? solutions.map((s) => ({ label: s.name, href: `/solutions/${s.slug}` }))
                : []),
              ...column.links,
            ];
            return (
              <div key={i} className="flex flex-col gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink">{column.title}</p>
                <ul className="flex flex-col gap-3 text-sm text-steel">
                  {links.map((link, j) => (
                    <li key={j}>
                      <Link href={link.href || "#"} className="transition-colors hover:text-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t border-ink/10 pt-8 text-xs text-steel md:flex-row md:items-center md:justify-between">
          <p>{footer.copyright.replace("{année}", year)}</p>
          {footer.tagline && <p>{footer.tagline}</p>}
        </div>
      </Container>
    </footer>
  );
}
