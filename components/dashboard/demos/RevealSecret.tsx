"use client";

import { useEffect, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { Icon } from "@/components/ui/Icon";

/**
 * A secret value that the page does not have until someone asks for it.
 *
 * The server component renders only the label; this fetches the value on
 * click, shows it in a monospace span, and forgets it after a minute. It is
 * never written into a DOM attribute or an `<input value>`, where autofill,
 * extensions and "view source" would all find it.
 */
const FORGET_AFTER_MS = 60_000;

const ERRORS: Record<string, string> = {
  expired: "Cet accès a expiré.",
  not_set: "Pas encore renseigné.",
  not_configured: "Chiffrement non configuré.",
  undecryptable: "Illisible — la clé de chiffrement a changé.",
};

export function RevealSecret({
  demoId,
  blockId,
  label,
  multiline = false,
}: {
  demoId: number;
  blockId: string;
  label: string;
  /** SSH keys are several lines; passwords are one. */
  multiline?: boolean;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (value === null) return;
    const t = setTimeout(() => setValue(null), FORGET_AFTER_MS);
    return () => clearTimeout(t);
  }, [value]);

  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demos/secret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ demoId, blockId, label }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { value?: string; error?: string };
      if (!res.ok || data.value === undefined) {
        setError(ERRORS[data.error ?? ""] ?? "Impossible d'afficher cette valeur.");
        return;
      }
      setValue(data.value);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (value === null) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (value === null) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="font-mono text-sm tracking-widest text-fg/80">
          ••••••••
        </span>
        <Button size="sm" variant="secondary" onPress={reveal} isDisabled={busy}>
          {busy ? <Spinner className="size-3.5" /> : <Icon name="lock" className="size-3.5" />}
          Afficher
        </Button>
        {error && <span className="text-xs text-fg">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {multiline ? (
        <pre className="max-h-64 overflow-auto rounded-2xl bg-soft px-4 py-3 font-mono text-xs text-fg">
          {value}
        </pre>
      ) : (
        <span className="break-all rounded-xl bg-soft px-3 py-1.5 font-mono text-sm text-fg">{value}</span>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onPress={copy}>
          <Icon name={copied ? "check" : "file-text"} className="size-3.5" />
          {copied ? "Copié" : "Copier"}
        </Button>
        <Button size="sm" variant="ghost" onPress={() => setValue(null)}>
          Masquer
        </Button>
      </div>
    </div>
  );
}

/** A value to copy with one click — an SSH command, a hostname. Not secret. */
export function CopyLine({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-soft py-1.5 pl-4 pr-1.5">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-fg">{value}</code>
      <Button
        size="sm"
        variant="ghost"
        aria-label={label ?? "Copier"}
        onPress={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <Icon name={copied ? "check" : "file-text"} className="size-3.5" />
        {copied ? "Copié" : "Copier"}
      </Button>
    </div>
  );
}
