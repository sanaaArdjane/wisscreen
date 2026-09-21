import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/guard";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function ConnexionPage() {
  // Already signed in: the sign-in page is a dead end, not a second front door.
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" || user.role === "staff" ? "/admin" : "/dashboard");

  return (
    // `useSearchParams` in the form makes this route a client-boundary read;
    // the Suspense wrapper is what keeps the rest of the page static.
    <Suspense fallback={null}>
      <SignInForm
        googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
        magicLinkEnabled={await getSetting("magicLinkEnabled")}
      />
    </Suspense>
  );
}
