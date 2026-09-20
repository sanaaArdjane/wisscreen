import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function MotDePasseOubliePage() {
  return <ForgotPasswordForm />;
}
