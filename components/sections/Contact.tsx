"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { Turnstile } from "@/components/ui/Turnstile";
import type { Service } from "@/lib/types";
import type { GeneralContent, SectionContent } from "@/lib/content/schema";

// Unset until added to .env.local — see app/api/contact/route.ts for the matching
// server-side TURNSTILE_SECRET_KEY. The form still works without either; it just
// isn't bot-protected until both are set.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function Contact({
  content,
  contact,
  solutions,
}: {
  content: SectionContent<"contact">;
  contact: GeneralContent["contact"];
  solutions: Service[];
}) {
  const form = content.form;
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    setError(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: new FormData(form),
      });
      if (!res.ok) throw new Error("request failed");
      setSent(true);
      form.reset();
    } catch {
      setError(true);
    } finally {
      setSending(false);
      setVerified(false);
      setResetKey((k) => k + 1);
    }
  };

  return (
    <section id="contact" className="bg-paper py-28 text-ink">
      <Container className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow={content.heading.eyebrow}
            title={content.heading.title}
            description={content.heading.description || undefined}
          />
          <div className="flex flex-col gap-4 text-sm">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-ink/80 hover:text-teal-deep">
                <Icon name="mail" className="h-4 w-4 text-teal-deep" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-3 text-ink/80 hover:text-teal-deep">
                <Icon name="send" className="h-4 w-4 text-teal-deep" />
                {contact.phone}
              </a>
            )}
            {contact.address && (
              <p className="flex items-center gap-3 text-ink/80">
                <Icon name="home" className="h-4 w-4 text-teal-deep" />
                {contact.address}
              </p>
            )}
            {contact.hours && (
              <p className="flex items-center gap-3 text-ink/80">
                <Icon name="clock" className="h-4 w-4 text-teal-deep" />
                {contact.hours}
              </p>
            )}
            {content.supportLine && (
              <p className="flex items-center gap-3 text-ink/80">
                <Icon name="users" className="h-4 w-4 text-teal-deep" />
                {content.supportLine}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-3xl border border-ink/10 p-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              {form.name}
              <input required type="text" name="name" className="rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-teal" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              {form.email}
              <input required type="email" name="email" className="rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-teal" />
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            {form.solution}
            <select name="solution" className="rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-teal">
              <option value="">{form.solutionPlaceholder}</option>
              {solutions.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.name}
                </option>
              ))}
              <option value="autre">{form.other}</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            {form.message}
            <textarea required name="message" rows={4} className="resize-none rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-teal" />
          </label>
          {TURNSTILE_SITE_KEY && (
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={() => setVerified(true)}
              resetKey={resetKey}
            />
          )}
          <button
            type="submit"
            disabled={sending || (Boolean(TURNSTILE_SITE_KEY) && !verified)}
            className="mt-2 inline-flex w-fit items-center gap-2 control-signal rounded-full px-6 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? form.sending : form.submit}
            <Icon name="arrow-right" className="h-4 w-4" />
          </button>
          {sent && <p className="text-sm font-medium text-teal-deep">{form.success}</p>}
          {/* No error hue in the brand palette (see AGENTS.md) — plain ink carries the
              tone via copy instead of inventing a red. */}
          {error && <p className="text-sm font-semibold text-ink">{form.error}</p>}
        </form>
      </Container>
    </section>
  );
}
