"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { SERVICES } from "@/lib/data/services";

export function Contact() {
  const [sent, setSent] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <section id="contact" className="bg-paper py-28 text-ink">
      <Container className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Contact"
            title="Discutons de votre projet."
            description="Banque, entreprise partenaire ou particulier — notre équipe vous répond rapidement pour comprendre votre besoin."
          />
          <div className="flex flex-col gap-4 text-sm">
            <p className="flex items-center gap-3 opacity-70">
              <Icon name="link" className="h-4 w-4 text-teal-deep" />
              contact@wissalunivers.com
            </p>
            <p className="flex items-center gap-3 opacity-70">
              <Icon name="users" className="h-4 w-4 text-teal-deep" />
              Support partenaires & support banques (Etaysir) dédiés
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-3xl border border-ink/10 p-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Nom complet
              <input required type="text" name="name" className="rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-teal" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              E-mail professionnel
              <input required type="email" name="email" className="rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-teal" />
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Solution qui vous intéresse
            <select name="solution" className="rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-teal">
              <option value="">Sélectionner une solution</option>
              {SERVICES.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.name}
                </option>
              ))}
              <option value="autre">Autre / je ne sais pas encore</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Votre message
            <textarea required name="message" rows={4} className="resize-none rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-teal" />
          </label>
          <button
            type="submit"
            className="mt-2 inline-flex w-fit items-center gap-2 control-warm rounded-full px-6 py-3 text-sm font-medium transition-colors"
          >
            Envoyer
            <Icon name="arrow-right" className="h-4 w-4" />
          </button>
          {sent && <p className="text-sm font-medium text-teal-deep">Merci — votre message a bien été enregistré, nous revenons vers vous rapidement.</p>}
        </form>
      </Container>
    </section>
  );
}
