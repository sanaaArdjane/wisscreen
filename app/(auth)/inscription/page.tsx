import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/guard";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default async function InscriptionPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <SignUpForm
      googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
      registrationOpen={await getSetting("registrationOpen")}
    />
  );
}
