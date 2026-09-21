import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { SettingsForm } from "./SettingsForm";
import { emailConfigured } from "@/lib/email";
import { BUCKET, storageConfigured } from "@/lib/storage";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Paramètres" };

export default async function ParametresPage() {
  const staff = await requirePermission("settings:read");
  const [settings, catalogue] = await Promise.all([
    getSettings(),
    db.select().from(plans).orderBy(asc(plans.sortOrder)),
  ]);

  const google = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const turnstile = Boolean(process.env.TURNSTILE_SECRET_KEY);

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Réglages de la plateforme et état des services externes."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Réglages">
          {can(staff, "settings:write") ? (
            <SettingsForm
              settings={settings}
              planOptions={catalogue.map((p) => ({ value: p.slug, label: p.name }))}
            />
          ) : (
            <p className="text-sm text-fg/80">
              Vous pouvez consulter ces réglages mais pas les modifier.
            </p>
          )}
        </Panel>

        {/* Configuration state, shown rather than assumed. Each of these degrades
            quietly by design — an unset key disables a feature instead of
            throwing — so without this panel nobody would know it was off. */}
        <Panel
          title="Services externes"
          description="Ce qui est branché sur cet environnement."
        >
          <ul className="flex flex-col gap-3">
            <ServiceRow
              ok={emailConfigured()}
              label="Envoi d'e-mails"
              okHint="Resend configuré"
              offHint="RESEND_API_KEY absent — les e-mails sont journalisés, pas envoyés"
            />
            <ServiceRow
              ok={storageConfigured()}
              label="Stockage de fichiers"
              okHint={`Neon Object Storage — bucket « ${BUCKET} »`}
              offHint="AWS_* absent — exécutez `pnpm neon:deploy`"
            />
            <ServiceRow
              ok={google}
              label="Connexion Google"
              okHint="Client OAuth configuré"
              offHint="GOOGLE_CLIENT_ID / SECRET absents — le bouton est masqué"
            />
            <ServiceRow
              ok={turnstile}
              label="Anti-spam du formulaire public"
              okHint="Turnstile actif"
              offHint="TURNSTILE_SECRET_KEY absent — vérification désactivée"
            />
          </ul>
        </Panel>
      </div>
    </>
  );
}

function ServiceRow({
  ok,
  label,
  okHint,
  offHint,
}: {
  ok: boolean;
  label: string;
  okHint: string;
  offHint: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          ok ? "bg-signal text-abyss" : "bg-soft text-fg/80",
        )}
      >
        <Icon name={ok ? "check" : "close"} className="size-3" strokeWidth={2.6} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-[650] text-fg">{label}</span>
        <span className="block text-xs text-fg/80">{ok ? okHint : offHint}</span>
      </span>
    </li>
  );
}
