"use client";

import { useFormStatus } from "react-dom";
import { useState, type ReactNode } from "react";
import {
  Button,
  Chip,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/lib/actions";

/**
 * The dashboard's shared form and display pieces.
 *
 * HeroUI v3 is react-aria-components underneath, so a single text input is four
 * elements (`TextField` > `Label` + `Input` + `Description`/`FieldError`). That
 * is the right amount of markup for an accessible field and the wrong amount to
 * retype in twenty forms — so it is wrapped exactly once, here.
 *
 * Every field renders a real `<input name>`, which is what lets every form in
 * the dashboard be a plain `<form action={serverAction}>` with no client state.
 */

/* ───────────────────────────────── Fields ───────────────────────────────── */

type BaseFieldProps = {
  name: string;
  label: string;
  description?: string;
  /** From the action's `fieldErrors`, keyed by this field's `name`. */
  error?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
};

export function Field({
  name,
  label,
  description,
  error,
  isRequired,
  isDisabled,
  defaultValue,
  placeholder,
  className,
  type = "text",
  autoComplete,
  inputMode,
}: BaseFieldProps & {
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "url";
}) {
  return (
    <TextField
      name={name}
      type={type}
      // RAC needs to be told the field is invalid, otherwise `FieldError` renders
      // nothing and the server's message is silently dropped.
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      isDisabled={isDisabled}
      defaultValue={defaultValue}
      autoComplete={autoComplete}
      className={cn("flex w-full flex-col gap-1.5", className)}
    >
      <Label>{label}</Label>
      <Input placeholder={placeholder} inputMode={inputMode} />
      {description && !error && <Description>{description}</Description>}
      <FieldError>{error}</FieldError>
    </TextField>
  );
}

export function TextAreaField({
  name,
  label,
  description,
  error,
  isRequired,
  isDisabled,
  defaultValue,
  placeholder,
  className,
  rows = 5,
}: BaseFieldProps & { rows?: number }) {
  return (
    <TextField
      name={name}
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      isDisabled={isDisabled}
      defaultValue={defaultValue}
      className={cn("flex w-full flex-col gap-1.5", className)}
    >
      <Label>{label}</Label>
      <TextArea placeholder={placeholder} rows={rows} />
      {description && !error && <Description>{description}</Description>}
      <FieldError>{error}</FieldError>
    </TextField>
  );
}

/**
 * A checkbox that actually submits.
 *
 * HeroUI v3's `Checkbox` is a pure ARIA widget — measured in the browser, it
 * renders **no** `<input name>` at all, so `name`/`value` on it are silently
 * dropped and every flag posted as `undefined`. Every switch on the settings
 * page, the "note interne" flag and the "envoyer aussi par e-mail" box were all
 * permanently false because of it.
 *
 * So this is a real `<input type="checkbox">` with the native control visually
 * hidden and the box drawn from `peer-checked`. It serializes, it works before
 * hydration, and it keeps the native focus ring behaviour — `peer-focus-visible`
 * draws the ring on the box the viewer can actually see.
 */
export function CheckboxField({
  name,
  label,
  description,
  defaultChecked,
  isDisabled,
  className,
}: {
  name: string;
  label: ReactNode;
  description?: string;
  defaultChecked?: boolean;
  isDisabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="group flex cursor-pointer items-start gap-2.5 text-sm font-[450] text-fg">
        <input
          type="checkbox"
          name={name}
          value="on"
          defaultChecked={defaultChecked}
          disabled={isDisabled}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-md border border-fg/40 bg-panel transition-colors group-hover:border-fg peer-checked:border-fg peer-checked:bg-fg peer-checked:[&_svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-fg peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas peer-disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-3.5 text-on-fg opacity-0 transition-opacity"
            aria-hidden
          >
            <path
              d="M5 12l5 5L19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="peer-disabled:opacity-60">{label}</span>
      </label>
      {description && <p className="ml-[28px] text-xs text-fg/80">{description}</p>}
    </div>
  );
}

export type Option = { value: string; label: string; description?: string };

export function SelectField({
  name,
  label,
  description,
  error,
  isRequired,
  isDisabled,
  defaultValue,
  placeholder = "Sélectionner…",
  className,
  options,
}: BaseFieldProps & { options: Option[] }) {
  return (
    <Select
      name={name}
      // RAC keys selections by `id`; `defaultSelectedKey` is the uncontrolled form.
      defaultSelectedKey={defaultValue}
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      isDisabled={isDisabled}
      placeholder={placeholder}
      className={cn("flex w-full flex-col gap-1.5", className)}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      {description && !error && <Description>{description}</Description>}
      <FieldError>{error}</FieldError>
      <Select.Popover>
        <ListBox>
          {options.map((o) => (
            <ListBoxItem key={o.value} id={o.value} textValue={o.label}>
              {o.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

/* ───────────────────────────────── Actions ───────────────────────────────── */

/**
 * A submit button that disables itself and shows a spinner while its form is
 * pending. `useFormStatus` reads the *parent* form's state, so this has to be a
 * separate component from the form — that's why it lives here rather than
 * inline.
 */
export function SubmitButton({
  children,
  variant = "primary",
  className,
  isDisabled,
  formAction,
  name,
  value,
}: {
  children: ReactNode;
  /** `danger` / `danger-soft` are HeroUI variants that read the red `--danger`
   *  token pinned in `app/(app)/heroui.css`. They mark actions that destroy
   *  data — prefer `ConfirmButton`, which arms first. */
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "danger-soft";
  className?: string;
  isDisabled?: boolean;
  /** For a second submit in the same form, e.g. "Enregistrer" vs "Envoyer". */
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      isDisabled={isDisabled || pending}
      formAction={formAction}
      name={name}
      value={value}
    >
      {pending && <Spinner className="size-4" />}
      {children}
    </Button>
  );
}

/**
 * The banner every form shows after a submit. Rendered with `role="status"` so a
 * screen reader announces the outcome — a visual-only confirmation is invisible
 * to exactly the people who most need to know the form went through.
 */
export function FormAlert({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-2xl px-6 py-3.5 text-sm font-[450] text-fg",
        // `text-fg` on `mist` in both cases: an accent on its own tint measures
        // under 4.5:1, so the green is a dot, never the text.
        state.ok ? "bg-soft" : "border border-fg/25 bg-panel",
      )}
    >
      <span
        aria-hidden
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", state.ok ? "bg-signal" : "bg-fg")}
      />
      {state.message}
    </p>
  );
}

/* ───────────────────────────────── Display ───────────────────────────────── */

export function StatusChip({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-[650]",
        tone,
      )}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-soft px-6 py-16 text-center">
      <p className="text-xl font-[650] leading-tight text-fg">{title}</p>
      {description && <p className="max-w-md text-sm font-[450] text-fg/80">{description}</p>}
      {action}
    </div>
  );
}

/* ──────────────────────────── Destructive actions ──────────────────────────── */

/**
 * The two-step destructive control: a quiet button that *arms*, then a red one
 * that acts.
 *
 * It exists because this pattern was hand-rolled in three places that had
 * already drifted — one asked a yes/no question, one demanded the account's
 * e-mail, and none of them was red. Deleting a quote and deleting an account
 * should not look like two different kinds of event.
 *
 * `action` takes either a plain server action or the dispatch from
 * `useActionState`; both are `(formData: FormData) => void`, so one prop covers
 * a redirecting delete and one that reports back through `FormAlert`.
 *
 * The arming step is the real safeguard, not the colour — a `<form>` posts on
 * Enter, and a bare red submit inside a panel is one stray keystroke from
 * running. Nothing here is ever a single click.
 */
export function ConfirmButton({
  action,
  label,
  confirmLabel = "Supprimer définitivement",
  cancelLabel = "Annuler",
  description,
  typeToConfirm,
  typeToConfirmLabel,
  hidden,
  children,
  fullWidth,
  isDisabled,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** The resting button, e.g. "Supprimer ce devis". */
  label: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** What the action destroys, and what survives it. Say both. */
  description?: string;
  /** Require the exact string to be retyped — for the genuinely unrecoverable. */
  typeToConfirm?: string;
  typeToConfirmLabel?: string;
  /** Hidden inputs the action needs, e.g. `{ quoteId: 12 }`. */
  hidden?: Record<string, string | number>;
  /** Rendered inside the armed form — a `FormAlert`, usually. */
  children?: ReactNode;
  fullWidth?: boolean;
  isDisabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button
        variant="tertiary"
        fullWidth={fullWidth}
        isDisabled={isDisabled}
        onPress={() => setArmed(true)}
        // The resting step is not red. Red is what the *irreversible* button
        // wears; painting the arming step too spends the signal before the
        // decision is made, and a panel full of red buttons stops meaning
        // anything. The label still says exactly what it will do.
        className="text-danger-fg"
      >
        {label}
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {hidden &&
        Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={String(value)} />
        ))}
      {children}
      {description && (
        <p className="rounded-2xl border border-danger/45 bg-danger/10 px-4 py-3 text-sm text-fg">
          {description}
        </p>
      )}
      {typeToConfirm && (
        <Field
          name="confirm"
          label={typeToConfirmLabel ?? `Saisissez « ${typeToConfirm} » pour confirmer`}
          placeholder={typeToConfirm}
          isRequired
        />
      )}
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="danger">{confirmLabel}</SubmitButton>
        <Button variant="ghost" onPress={() => setArmed(false)}>
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}

export { Button, Chip };
