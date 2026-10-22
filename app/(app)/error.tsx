"use client";

import { useEffect } from "react";

/**
 * What a signed-in page shows when a server action or render throws. Without it
 * Next's generic "This page couldn't load" replaced the whole screen with no way
 * to tell what failed; the digest is what the logs are searchable by.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="text-xl font-[650] text-fg">L&apos;opération a échoué</p>
      <p className="text-sm text-fg/80">
        Une erreur est survenue côté serveur. Rien n&apos;a été perdu : réessayez, et si le problème persiste
        transmettez ce code à l&apos;équipe.
      </p>
      {error.digest && <code className="rounded-full bg-soft px-3 py-1 text-xs text-fg">{error.digest}</code>}
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-fg px-5 py-2.5 text-sm font-[650] text-on-fg hover:bg-fg-hover"
      >
        Réessayer
      </button>
    </div>
  );
}
