import Link from "next/link";
import { SERVICES } from "@/lib/data/services";
import { Container } from "@/components/ui/Container";

const COLUMNS = [
  {
    title: "Solutions",
    links: SERVICES.map((service) => ({ label: service.name, href: `/solutions/${service.slug}` })),
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos de Wissal Univers", href: "#values" },
      { label: "Nos engagements", href: "#commitment" },
      { label: "Carrières", href: "#" },
      { label: "Actualités", href: "#" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Documentation API", href: "#integrations" },
      { label: "Centre d'aide", href: "#" },
      { label: "Statut des services", href: "#" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "Demander une démo", href: "#contact" },
      { label: "Support partenaires", href: "#contact" },
      { label: "Support banques (Etaysir)", href: "#contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="section-ink border-t border-white/10">
      <Container className="py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.14em]">
              Wissal <span className="text-aqua">Univers</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed opacity-60">
              Agence de solutions IT. Nous concevons les outils qui connectent banques,
              entreprises partenaires et particuliers : extraction de données, cloud,
              paiement échelonné et marketplace.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-50">{column.title}</p>
              <ul className="flex flex-col gap-2.5 text-sm opacity-80">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition-opacity hover:opacity-100 hover:text-aqua">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-8 text-xs opacity-50 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Wissal Univers. Tous droits réservés.</p>
          <p>OCR · WICLOUD · WIFACILITY · SETYCORE — et bientôt plus de solutions.</p>
        </div>
      </Container>
    </footer>
  );
}
