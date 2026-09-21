"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Field, Option } from "@/lib/content/forms";
import type { IconName } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { FieldHint } from "./FieldHint";
import { IconPicker } from "./IconPicker";
import { MediaField } from "./MediaField";

/**
 * Renders a form from a spec in `lib/content/forms.ts`. Controlled: it never owns the
 * value, it reports every change to the parent editor as a new object, so one piece of
 * state per block is the single source of truth and is what gets posted as JSON.
 *
 * Every field gets a `FieldHint` (where it shows up on the site). Server-side
 * validation errors come back keyed by dotted path (`visual.slides.0.src`) and are
 * shown under the matching field.
 */

type Obj = Record<string, unknown>;

type Ctx = {
  errors: Record<string, string>;
  solutions: Option[];
  storage: boolean;
  /** For `solution` locations: the slug of the solution being edited. */
  slug?: string;
};
const SpecContext = createContext<Ctx>({ errors: {}, solutions: [], storage: false });

export function SpecProvider({ children, ...ctx }: Ctx & { children: ReactNode }) {
  return <SpecContext.Provider value={ctx}>{children}</SpecContext.Provider>;
}

const input =
  "w-full rounded-2xl bg-soft px-3 py-2.5 text-sm text-fg placeholder:text-fg/80 focus:outline-none focus:ring-2 focus:ring-fg";

export function SpecForm({
  fields,
  value,
  onChange,
  path = "",
}: {
  fields: Field[];
  value: Obj;
  onChange: (next: Obj) => void;
  path?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {fields.map((field) =>
        field.showIf && !field.showIf(value) ? null : (
          <FieldRow
            key={field.key}
            field={field}
            parent={value}
            value={value[field.key]}
            path={path ? `${path}.${field.key}` : field.key}
            onChange={(v) => onChange({ ...value, [field.key]: v })}
          />
        ),
      )}
    </div>
  );
}

function Label({ field, htmlFor }: { field: Field; htmlFor?: string }) {
  const { slug } = useContext(SpecContext);
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm text-fg">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="font-[650]">
          {field.label}
        </label>
      ) : (
        <span className="font-[650]">{field.label}</span>
      )}
      <FieldHint where={field.where} slug={slug} />
    </span>
  );
}

function Help({ field, path }: { field: Field; path: string }) {
  const { errors } = useContext(SpecContext);
  const error = errors[path];
  return (
    <>
      {field.help && <p className="text-xs leading-relaxed text-fg/80">{field.help}</p>}
      {error && (
        <p role="alert" className="text-sm font-[650] text-fg">
          ⚠ {error}
        </p>
      )}
    </>
  );
}

function FieldRow({
  field,
  parent,
  value,
  path,
  onChange,
}: {
  field: Field;
  parent: Obj;
  value: unknown;
  path: string;
  onChange: (v: unknown) => void;
}) {
  const ctx = useContext(SpecContext);
  const id = `f-${path.replace(/\./g, "-")}`;
  const invalid = Boolean(ctx.errors[path]);

  switch (field.kind) {
    case "text":
      return (
        <div className="flex flex-col gap-1.5">
          <Label field={field} htmlFor={id} />
          {field.multiline ? (
            <textarea
              id={id}
              rows={field.rows ?? 3}
              value={String(value ?? "")}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value)}
              className={cn(input, field.mono && "font-mono", invalid && "ring-2 ring-fg")}
            />
          ) : (
            <input
              id={id}
              value={String(value ?? "")}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={!field.mono}
              className={cn(input, field.mono && "font-mono", invalid && "ring-2 ring-fg")}
            />
          )}
          <Help field={field} path={path} />
        </div>
      );

    case "number":
      return (
        <div className="flex flex-col gap-1.5">
          <Label field={field} htmlFor={id} />
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={Number(value ?? 0)}
            onChange={(e) => onChange(e.target.value === "" ? field.min ?? 0 : Number(e.target.value))}
            className={cn(input, "w-32 tabular-nums", invalid && "ring-2 ring-fg")}
          />
          <Help field={field} path={path} />
        </div>
      );

    case "toggle":
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <input
              id={id}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[var(--dash-fg)]"
            />
            <Label field={field} htmlFor={id} />
          </div>
          <Help field={field} path={path} />
        </div>
      );

    case "icon":
      return (
        <div className="flex flex-col gap-1.5">
          <Label field={field} />
          <IconPicker value={(value as IconName) ?? "sparkles"} onChange={onChange} label={field.label} />
          <Help field={field} path={path} />
        </div>
      );

    case "asset": {
      const kind = field.accept === "media" ? (parent.kind === "video" ? "video" : "image") : field.accept;
      return (
        <div className="flex flex-col gap-1.5">
          <Label field={field} />
          {field.where.size && <p className="text-xs text-fg/80">Format conseillé : {field.where.size}</p>}
          <MediaField value={String(value ?? "")} onChange={onChange} kind={kind} storage={ctx.storage} invalid={invalid} />
          <Help field={field} path={path} />
        </div>
      );
    }

    case "select": {
      const options = field.options === "solutions" ? ctx.solutions : field.options;
      return (
        <div className="flex flex-col gap-1.5">
          <Label field={field} htmlFor={id} />
          <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={cn(input, invalid && "ring-2 ring-fg")}>
            {field.options === "solutions" && <option value="">— Choisir une solution —</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Help field={field} path={path} />
        </div>
      );
    }

    case "multiselect": {
      const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
      return (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="contents">
            <Label field={field} />
          </legend>
          <div className="flex flex-wrap gap-2">
            {field.options.map((o) => {
              const on = selected.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = new Set(selected);
                    if (on) next.delete(o.value);
                    else next.add(o.value);
                    onChange(field.options.map((x) => x.value).filter((v) => next.has(v)));
                  }}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-[650] ring-1 transition-colors",
                    on ? "bg-fg text-on-fg ring-fg" : "text-fg ring-fg/20 hover:bg-fg/8",
                  )}
                >
                  {on && "✓ "}
                  {o.label}
                </button>
              );
            })}
          </div>
          <Help field={field} path={path} />
        </fieldset>
      );
    }

    case "cards":
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="contents">
            <Label field={field} />
          </legend>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {field.options.map((o) => {
              const on = value === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(o.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl p-4 text-left ring-1 transition-colors",
                    on ? "bg-fg/8 ring-2 ring-fg" : "ring-fg/15 hover:bg-fg/5",
                  )}
                >
                  {o.icon && (
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", on ? "bg-fg text-on-fg" : "bg-soft text-fg")}>
                      <Icon name={o.icon} className="h-5 w-5" />
                    </span>
                  )}
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-[650] text-fg">
                      {o.label}
                      {on && " ✓"}
                    </span>
                    {o.description && <span className="text-xs leading-relaxed text-fg/80">{o.description}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <Help field={field} path={path} />
        </fieldset>
      );

    case "group":
      return (
        <fieldset className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-fg/10">
          <legend className="px-1">
            <Label field={field} />
          </legend>
          <Help field={field} path={path} />
          <SpecForm fields={field.fields} value={(value as Obj) ?? {}} onChange={onChange} path={path} />
        </fieldset>
      );

    case "list":
      return <ListField field={field} value={Array.isArray(value) ? (value as Obj[]) : []} path={path} onChange={onChange} />;

    case "strings":
      return <StringsField field={field} value={Array.isArray(value) ? (value as string[]) : []} path={path} onChange={onChange} />;
  }
}

/* ───────────────────────────── Lists ───────────────────────────── */

/** The item nouns the specs use that take "une". Everything else takes "un". */
const FEMININE = new Set([
  "diapositive",
  "colonne",
  "étape",
  "question",
  "valeur",
  "fonctionnalité",
  "garantie",
  "connexion",
  "intégration",
  "solution",
]);
const article = (noun: string) => (FEMININE.has(noun) ? "une" : "un");

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function RowControls({
  index,
  count,
  onMove,
  onRemove,
  noun,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  noun: string;
}) {
  const btn = "flex h-8 w-8 items-center justify-center rounded-full text-fg hover:bg-fg/10 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Monter ce ${noun}`} title="Monter">
        <Icon name="chevron-down" className="h-4 w-4 rotate-180" />
      </button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Descendre ce ${noun}`} title="Descendre">
        <Icon name="chevron-down" className="h-4 w-4" />
      </button>
      {/* Removing a row only edits the draft — nothing is lost until the form is saved,
          so this is not the red, irreversible kind of delete. */}
      <button type="button" className={btn} onClick={onRemove} aria-label={`Retirer ce ${noun}`} title="Retirer (pas enregistré tant que vous n'enregistrez pas)">
        <Icon name="close" className="h-4 w-4" />
      </button>
    </span>
  );
}

function ListField({
  field,
  value,
  path,
  onChange,
}: {
  field: Extract<Field, { kind: "list" }>;
  value: Obj[];
  path: string;
  onChange: (v: Obj[]) => void;
}) {
  // Collapsed by default past a handful of rows, so a 20-question FAQ isn't a wall.
  const [open, setOpen] = useState<number | null>(value.length <= 3 ? -1 : null);
  const full = field.max !== undefined && value.length >= field.max;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="contents">
        <span className="flex items-center justify-between gap-2">
          <Label field={field} />
          <span className="text-xs text-fg/80">
            {value.length}
            {field.max ? ` / ${field.max}` : ""}
          </span>
        </span>
      </legend>
      <Help field={field} path={path} />
      <ol className="flex flex-col gap-2">
        {value.map((item, i) => {
          const expanded = open === -1 || open === i;
          const title = field.titleKey ? String(item[field.titleKey] ?? "") : "";
          return (
            <li key={i} className="rounded-2xl ring-1 ring-fg/10">
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setOpen(expanded && open !== -1 ? null : i)}
                  aria-expanded={expanded}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-fg"
                >
                  <Icon name="chevron-right" className={cn("h-4 w-4 shrink-0 transition-transform", expanded && "rotate-90")} />
                  <span className="shrink-0 font-[650] capitalize">
                    {field.itemLabel} {i + 1}
                  </span>
                  {title && <span className="truncate text-fg/80">— {title}</span>}
                </button>
                <RowControls
                  index={i}
                  count={value.length}
                  noun={field.itemLabel}
                  onMove={(to) => {
                    onChange(move(value, i, to));
                    if (open === i) setOpen(to);
                  }}
                  onRemove={() => onChange(value.filter((_, j) => j !== i))}
                />
              </div>
              {expanded && (
                <div className="border-t border-fg/10 p-4">
                  <SpecForm
                    fields={field.fields}
                    value={item}
                    path={`${path}.${i}`}
                    onChange={(next) => onChange(value.map((x, j) => (j === i ? next : x)))}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        disabled={full}
        onClick={() => {
          onChange([...value, structuredClone(field.empty)]);
          setOpen(open === -1 ? -1 : value.length);
        }}
        className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-[650] text-fg ring-1 ring-fg/20 hover:bg-fg/8 disabled:opacity-40"
      >
        <Icon name="plus" className="h-4 w-4" />
        Ajouter {article(field.itemLabel)} {field.itemLabel}
      </button>
    </fieldset>
  );
}

function StringsField({
  field,
  value,
  path,
  onChange,
}: {
  field: Extract<Field, { kind: "strings" }>;
  value: string[];
  path: string;
  onChange: (v: string[]) => void;
}) {
  const { errors } = useContext(SpecContext);
  const full = field.max !== undefined && value.length >= field.max;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="contents">
        <Label field={field} />
      </legend>
      <Help field={field} path={path} />
      <ol className="flex flex-col gap-2">
        {value.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            {field.multiline ? (
              <textarea
                rows={3}
                value={item}
                aria-label={`${field.itemLabel} ${i + 1}`}
                onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
                className={cn(input, errors[`${path}.${i}`] && "ring-2 ring-fg")}
              />
            ) : (
              <input
                value={item}
                aria-label={`${field.itemLabel} ${i + 1}`}
                onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
                className={cn(input, errors[`${path}.${i}`] && "ring-2 ring-fg")}
              />
            )}
            <RowControls
              index={i}
              count={value.length}
              noun={field.itemLabel}
              onMove={(to) => onChange(move(value, i, to))}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={full}
        onClick={() => onChange([...value, ""])}
        className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-[650] text-fg ring-1 ring-fg/20 hover:bg-fg/8 disabled:opacity-40"
      >
        <Icon name="plus" className="h-4 w-4" />
        Ajouter {article(field.itemLabel)} {field.itemLabel}
      </button>
    </fieldset>
  );
}
