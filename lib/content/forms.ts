import type { IconName } from "@/lib/types";
import type { BlockKey, SectionKey } from "./schema";

/**
 * The admin forms of /admin/site, described as data.
 *
 * One renderer (`components/dashboard/site/SpecForm.tsx`) draws every block's form from
 * these specs, so the ~25 editable blocks don't each need a hand-written form — and,
 * more importantly, **every field must say where it shows up on the site** (`where`
 * is required by the type). That is what the tooltip next to each label displays, with
 * a link that opens the page scrolled to the exact section. A new field without a
 * location does not compile, which is the point: the owner should never have to guess
 * what a box changes.
 */

/* ───────────────────────────── Locations ───────────────────────────── */

export type Where = {
  /** `solution` resolves to the solution page being edited (`/solutions/<slug>`). */
  page: "home" | "solution" | "everywhere";
  /** The section as the visitor sees it — its French title or a plain description. */
  section: string;
  /** Which element within the section. */
  detail?: string;
  /** DOM id to scroll to. */
  anchor?: string;
  /** Recommended pixel size or format, for media. */
  size?: string;
};

const home = (section: string, anchor: string, detail?: string, size?: string): Where => ({
  page: "home",
  section,
  anchor,
  detail,
  size,
});
const sol = (section: string, anchor: string, detail?: string, size?: string): Where => ({
  page: "solution",
  section,
  anchor,
  detail,
  size,
});
const everywhere = (section: string, detail?: string): Where => ({ page: "everywhere", section, detail });

/* ───────────────────────────── Field specs ───────────────────────────── */

export type Option = { value: string; label: string; description?: string; icon?: IconName };

type Base = {
  key: string;
  label: string;
  where: Where;
  help?: string;
  /** Only shown when this returns true for the object the field belongs to. */
  showIf?: (parent: Record<string, unknown>) => boolean;
};

export type Field =
  | (Base & { kind: "text"; multiline?: boolean; rows?: number; placeholder?: string; mono?: boolean })
  | (Base & { kind: "number"; min?: number; max?: number; step?: number })
  | (Base & { kind: "toggle" })
  | (Base & { kind: "icon" })
  | (Base & { kind: "asset"; accept: "image" | "video" | "media" })
  | (Base & { kind: "select"; options: Option[] | "solutions" })
  | (Base & { kind: "multiselect"; options: Option[] })
  | (Base & { kind: "cards"; options: Option[] })
  | (Base & { kind: "group"; fields: Field[] })
  | (Base & {
      kind: "list";
      /** Singular noun for "Ajouter un …" and item headers. */
      itemLabel: string;
      /** Which item field names the collapsed row. */
      titleKey?: string;
      fields: Field[];
      empty: Record<string, unknown>;
      max?: number;
    })
  | (Base & { kind: "strings"; itemLabel: string; multiline?: boolean; max?: number });

/* ───────────────────────────── Reusable pieces ───────────────────────────── */

const heading = (section: string, anchor: string): Field => ({
  kind: "group",
  key: "heading",
  label: "Titre de la section",
  where: home(section, anchor, "En-tête de la section"),
  fields: [
    {
      kind: "text",
      key: "eyebrow",
      label: "Sur-titre",
      where: home(section, anchor, "Petite étiquette verte au-dessus du titre"),
    },
    { kind: "text", key: "title", label: "Titre", where: home(section, anchor, "Grand titre de la section") },
    {
      kind: "text",
      key: "description",
      label: "Description",
      multiline: true,
      rows: 3,
      where: home(section, anchor, "Paragraphe sous le titre"),
      help: "Laissez vide pour ne rien afficher.",
    },
  ],
});

const hidden = (section: string, anchor: string): Field => ({
  kind: "toggle",
  key: "hidden",
  label: "Masquer cette section",
  where: home(section, anchor, "Toute la section"),
  help: "La section disparaît du site ; son contenu est conservé ici.",
});

const cta = (key: string, label: string, where: Where): Field => ({
  kind: "group",
  key,
  label,
  where,
  fields: [
    { kind: "text", key: "label", label: "Texte du bouton", where, help: "Laissez vide pour masquer le bouton." },
    {
      kind: "text",
      key: "href",
      label: "Lien",
      where,
      mono: true,
      help: "#contact, #solutions (ancre de la page), /solutions/ocr, ou https://…",
    },
  ],
});

const iconItems = (key: string, label: string, section: string, anchor: string, itemLabel: string, max = 6): Field => ({
  kind: "list",
  key,
  label,
  itemLabel,
  titleKey: "title",
  max,
  where: home(section, anchor, "Les cartes de la section"),
  empty: { icon: "sparkles", title: "", text: "" },
  fields: [
    { kind: "icon", key: "icon", label: "Icône", where: home(section, anchor, "Pictogramme de la carte") },
    { kind: "text", key: "title", label: "Titre", where: home(section, anchor, "Titre de la carte") },
    { kind: "text", key: "text", label: "Texte", multiline: true, rows: 3, where: home(section, anchor, "Texte de la carte") },
  ],
});

/* ───────────────────────────── General, hero, footer ───────────────────────────── */

export const GENERAL_FORM: Field[] = [
  {
    kind: "text",
    key: "siteName",
    label: "Nom du site",
    where: everywhere("Onglet du navigateur et partages", "Suffixe des titres de page (« OCR — WICLOUD »)"),
  },
  {
    kind: "text",
    key: "seoTitle",
    label: "Titre SEO de l'accueil",
    where: everywhere("Google et onglet du navigateur", "Titre de la page d'accueil dans les résultats de recherche"),
    help: "Idéalement moins de 60 caractères.",
  },
  {
    kind: "text",
    key: "seoDescription",
    label: "Description SEO",
    multiline: true,
    rows: 3,
    where: everywhere("Google et aperçus de partage", "Texte sous le titre dans les résultats et sur LinkedIn / WhatsApp"),
    help: "Idéalement entre 120 et 160 caractères.",
  },
  {
    kind: "strings",
    key: "keywords",
    label: "Mots-clés",
    itemLabel: "mot-clé",
    max: 40,
    where: everywhere("Référencement", "Balise keywords de toutes les pages"),
  },
  {
    kind: "group",
    key: "contact",
    label: "Coordonnées",
    where: home("Contact et pied de page", "contact"),
    fields: [
      { kind: "text", key: "email", label: "E-mail", where: home("« Contact » et pied de page", "contact", "Adresse e-mail cliquable") },
      { kind: "text", key: "phone", label: "Téléphone", where: home("« Contact » et pied de page", "contact", "Numéro cliquable (appel)"), placeholder: "+213 …" },
      { kind: "text", key: "whatsapp", label: "WhatsApp", where: home("Pied de page", "contact", "Lien wa.me vers ce numéro"), placeholder: "+213 …" },
      { kind: "text", key: "address", label: "Adresse", where: home("« Contact » et pied de page", "contact", "Adresse postale") },
      { kind: "text", key: "hours", label: "Horaires", where: home("« Contact »", "contact", "Ligne d'horaires sous l'adresse"), placeholder: "Dim.–Jeu. 9h–17h" },
    ],
  },
  {
    kind: "group",
    key: "socials",
    label: "Réseaux sociaux",
    where: everywhere("Pied de page", "Icônes des réseaux, sous les coordonnées"),
    help: "Laissez vide un réseau que vous n'utilisez pas : son icône n'apparaît pas.",
    fields: (["linkedin", "facebook", "instagram", "x", "youtube", "tiktok"] as const).map((k) => ({
      kind: "text" as const,
      key: k,
      label: { linkedin: "LinkedIn", facebook: "Facebook", instagram: "Instagram", x: "X (Twitter)", youtube: "YouTube", tiktok: "TikTok" }[k],
      mono: true,
      placeholder: "https://…",
      where: everywhere("Pied de page", "Icône du réseau"),
    })),
  },
];

const HERO = "Hero (haut de la page d'accueil)";
const heroWhere = (detail: string, size?: string): Where => ({ page: "home", section: HERO, anchor: "", detail, size });
const is3d = (h: Record<string, unknown>) => {
  const mode = (h.visual as { mode?: string } | undefined)?.mode;
  return mode === "earth" || mode === "stack";
};

export const HERO_VISUAL_FORM: Field[] = [
  {
    kind: "cards",
    key: "mode",
    label: "Visuel à droite du texte (70 % de la largeur)",
    where: heroWhere("Toute la partie droite du hero"),
    options: [
      { value: "earth", label: "Terre 3D", icon: "globe", description: "Le globe interactif, vos solutions en marqueurs." },
      { value: "stack", label: "Infrastructure 3D", icon: "layers", description: "La pile de couches cloud, vos solutions en modules." },
      { value: "image", label: "Image", icon: "file-text", description: "Une photo ou une illustration plein cadre." },
      { value: "video", label: "Vidéo", icon: "zap", description: "Une vidéo muette en boucle." },
      { value: "slides", label: "Diaporama", icon: "refresh", description: "Plusieurs images et vidéos qui défilent." },
    ],
  },
  {
    kind: "asset",
    key: "image",
    label: "Image",
    accept: "image",
    where: heroWhere("Visuel de droite (mode Image)", "2400 × 1500 px (16:10), sujet au centre"),
    showIf: (v) => v.mode === "image",
  },
  {
    kind: "text",
    key: "imageAlt",
    label: "Description de l'image (accessibilité)",
    where: heroWhere("Texte lu par les lecteurs d'écran"),
    showIf: (v) => v.mode === "image",
  },
  {
    kind: "asset",
    key: "video",
    label: "Vidéo",
    accept: "video",
    where: heroWhere("Visuel de droite (mode Vidéo)", "MP4 ou WebM, 16:10, idéalement < 15 Mo"),
    showIf: (v) => v.mode === "video",
  },
  {
    kind: "asset",
    key: "videoPoster",
    label: "Image d'attente de la vidéo",
    accept: "image",
    where: heroWhere("Affichée pendant le chargement de la vidéo", "Même format que la vidéo"),
    showIf: (v) => v.mode === "video",
  },
  {
    kind: "list",
    key: "slides",
    label: "Diapositives",
    itemLabel: "diapositive",
    titleKey: "caption",
    max: 12,
    where: heroWhere("Visuel de droite (mode Diaporama)"),
    showIf: (v) => v.mode === "slides",
    empty: { kind: "image", src: "", poster: "", caption: "" },
    fields: [
      {
        kind: "select",
        key: "kind",
        label: "Type",
        where: heroWhere("Une diapositive du diaporama"),
        options: [
          { value: "image", label: "Image" },
          { value: "video", label: "Vidéo" },
        ],
      },
      { kind: "asset", key: "src", label: "Fichier", accept: "media", where: heroWhere("Une diapositive du diaporama", "2400 × 1500 px (16:10)") },
      {
        kind: "asset",
        key: "poster",
        label: "Image d'attente",
        accept: "image",
        where: heroWhere("Pendant le chargement de cette vidéo"),
        showIf: (s) => s.kind === "video",
      },
      { kind: "text", key: "caption", label: "Légende", where: heroWhere("Texte en bas de la diapositive"), help: "Facultative." },
    ],
  },
  {
    kind: "number",
    key: "interval",
    label: "Durée de chaque diapositive (secondes)",
    min: 2,
    max: 30,
    where: heroWhere("Vitesse du diaporama"),
    showIf: (v) => v.mode === "slides",
  },
];

export const HERO_TEXT_FORM: Field[] = [
  { kind: "text", key: "badge", label: "Étiquette", where: heroWhere("Petite étiquette verte au-dessus du titre") },
  { kind: "text", key: "headline", label: "Titre (partie fixe)", where: heroWhere("Début du grand titre, avant les mots qui défilent") },
  {
    kind: "strings",
    key: "words",
    label: "Mots qui s'écrivent à la suite du titre",
    itemLabel: "mot",
    max: 10,
    where: heroWhere("Fin du grand titre, tapée lettre par lettre en boucle"),
  },
  { kind: "text", key: "paragraph", label: "Paragraphe", multiline: true, rows: 4, where: heroWhere("Texte sous le titre") },
  cta("primaryCta", "Bouton principal (vert)", heroWhere("Premier bouton sous le texte")),
  cta("secondaryCta", "Bouton secondaire", heroWhere("Second bouton sous le texte")),
  {
    kind: "text",
    key: "hint",
    label: "Indication sous les boutons",
    where: heroWhere("Petite ligne en majuscules — seulement avec un visuel 3D"),
    showIf: is3d,
  },
];

export const FOOTER_FORM: Field[] = [
  { kind: "text", key: "blurb", label: "Présentation", multiline: true, rows: 3, where: everywhere("Pied de page", "Texte sous le logo") },
  {
    kind: "list",
    key: "columns",
    label: "Colonnes de liens",
    itemLabel: "colonne",
    titleKey: "title",
    max: 6,
    where: everywhere("Pied de page", "Colonnes de liens à droite du logo"),
    empty: { title: "", includeSolutions: false, links: [] },
    fields: [
      { kind: "text", key: "title", label: "Titre de la colonne", where: everywhere("Pied de page", "Titre en majuscules de la colonne") },
      {
        kind: "toggle",
        key: "includeSolutions",
        label: "Lister automatiquement toutes les solutions",
        where: everywhere("Pied de page", "Un lien par solution publiée, avant les liens ci-dessous"),
      },
      {
        kind: "list",
        key: "links",
        label: "Liens",
        itemLabel: "lien",
        titleKey: "label",
        max: 12,
        where: everywhere("Pied de page", "Liens de la colonne"),
        empty: { label: "", href: "" },
        fields: [
          { kind: "text", key: "label", label: "Texte", where: everywhere("Pied de page", "Texte du lien") },
          { kind: "text", key: "href", label: "Lien", mono: true, where: everywhere("Pied de page", "Destination du lien"), help: "#faq, /connexion, https://…" },
        ],
      },
    ],
  },
  {
    kind: "text",
    key: "copyright",
    label: "Mention de copyright",
    where: everywhere("Pied de page", "Ligne tout en bas à gauche"),
    help: "« {année} » est remplacé par l'année en cours.",
  },
  { kind: "text", key: "tagline", label: "Ligne de fin", where: everywhere("Pied de page", "Ligne tout en bas à droite") },
];

/* ───────────────────────────── Homepage sections ───────────────────────────── */

export const SECTION_META: Record<SectionKey, { title: string; anchor: string; summary: string }> = {
  highlights: { title: "L'essentiel, en un coup d'œil", anchor: "highlights", summary: "Le carrousel de cartes des solutions" },
  performance: { title: "Performance cloud", anchor: "performance", summary: "Les chiffres clés de chaque solution" },
  reveal: { title: "WICLOUD (vidéo dans le mot)", anchor: "univers", summary: "La vidéo qui se révèle dans le mot WICLOUD" },
  devices: { title: "Nos interfaces", anchor: "interfaces", summary: "Les solutions sur un ordinateur et un téléphone" },
  dataIntelligence: { title: "Data & Intelligence", anchor: "data-intelligence", summary: "L'IA conçue en interne" },
  reliability: { title: "Fiabilité 24/7", anchor: "reliability", summary: "Le grand chiffre de disponibilité" },
  platform: { title: "La plateforme", anchor: "platform", summary: "Les consoles d'administration" },
  connected: { title: "Un seul cloud", anchor: "connected", summary: "Comment les services se connectent" },
  audiences: { title: "Pour qui ?", anchor: "pour-qui", summary: "Onglets par type de client" },
  scale: { title: "Le socle cloud", anchor: "scale", summary: "Les six garanties techniques" },
  ocrDemo: { title: "OCR en action", anchor: "ocr-demo", summary: "La démonstration d'extraction" },
  integrations: { title: "Intégrations & API", anchor: "integrations", summary: "Les six moyens d'intégration" },
  security: { title: "Sécurité & conformité", anchor: "security", summary: "Les trois piliers de sécurité" },
  finder: { title: "Quelle solution pour vous ?", anchor: "finder", summary: "Les profils et leurs solutions" },
  migration: { title: "Accompagnement à la migration", anchor: "migration", summary: "Les étapes d'accompagnement" },
  whyUs: { title: "Pourquoi WICLOUD", anchor: "why-us", summary: "Les avantages en accordéon" },
  solutionsGrid: { title: "Toutes nos solutions", anchor: "solutions", summary: "La grille de toutes les solutions" },
  commitment: { title: "Souveraineté & responsabilité", anchor: "commitment", summary: "Les engagements sur les données" },
  values: { title: "Nos valeurs", anchor: "values", summary: "Les trois valeurs" },
  faq: { title: "Questions fréquentes", anchor: "faq", summary: "La FAQ de l'accueil" },
  contact: { title: "Contact", anchor: "contact", summary: "Le formulaire de contact" },
};

const m = (k: SectionKey) => SECTION_META[k];
const w = (k: SectionKey, detail?: string, size?: string) => home(`« ${m(k).title} »`, m(k).anchor, detail, size);
const sectionBase = (k: SectionKey): Field[] => [hidden(`« ${m(k).title} »`, m(k).anchor)];
const sectionHeading = (k: SectionKey) => heading(`« ${m(k).title} »`, m(k).anchor);

export const SECTION_FORMS: Record<SectionKey, Field[]> = {
  highlights: [
    ...sectionBase("highlights"),
    { kind: "text", key: "titleUnderlined", label: "Titre — partie soulignée", where: w("highlights", "Premier mot du titre, souligné à la main en vert") },
    { kind: "text", key: "titleRest", label: "Titre — suite", where: w("highlights", "Suite du titre après le mot souligné") },
    cta("link", "Lien à droite du titre", w("highlights", "Lien « Voir toutes nos solutions »")),
  ],
  performance: [...sectionBase("performance"), sectionHeading("performance")],
  reveal: [
    ...sectionBase("reveal"),
    { kind: "text", key: "badge", label: "Étiquette", where: w("reveal", "Étiquette verte au-dessus du mot WICLOUD") },
    {
      kind: "list",
      key: "pitch",
      label: "Les trois blocs qui apparaissent sous le mot",
      itemLabel: "bloc",
      titleKey: "title",
      max: 3,
      where: w("reveal", "Les blocs de texte qui apparaissent un à un"),
      empty: { title: "", body: "" },
      fields: [
        { kind: "text", key: "title", label: "Titre", where: w("reveal", "Titre du bloc") },
        { kind: "text", key: "body", label: "Texte", multiline: true, rows: 3, where: w("reveal", "Texte du bloc") },
      ],
    },
    {
      kind: "asset",
      key: "video",
      label: "Vidéo dans le mot",
      accept: "video",
      where: w("reveal", "La vidéo visible à l'intérieur des lettres", "MP4/WebM 16:9, images sombres"),
      help: "Choisissez une vidéo sombre : elle devient la couleur des lettres sur fond blanc.",
    },
  ],
  devices: [
    ...sectionBase("devices"),
    { kind: "text", key: "badge", label: "Étiquette", where: w("devices", "Étiquette verte au-dessus du titre") },
    { kind: "text", key: "title", label: "Titre", where: w("devices", "Titre au-dessus de l'ordinateur et du téléphone") },
  ],
  dataIntelligence: [
    ...sectionBase("dataIntelligence"),
    sectionHeading("dataIntelligence"),
    iconItems("points", "Points clés", `« ${m("dataIntelligence").title} »`, m("dataIntelligence").anchor, "point"),
    cta("cta", "Bouton", w("dataIntelligence", "Bouton sous les points clés")),
    {
      kind: "select",
      key: "solutionSlug",
      label: "Image affichée",
      options: "solutions",
      where: w("dataIntelligence", "Grande image à droite"),
      help: "L'image de couverture de la solution choisie (réglable dans Solutions → Médias).",
    },
  ],
  reliability: [
    ...sectionBase("reliability"),
    { kind: "text", key: "badge", label: "Étiquette", where: w("reliability", "Étiquette verte au-dessus du chiffre") },
    { kind: "text", key: "stat", label: "Grand chiffre", where: w("reliability", "Le chiffre géant animé"), placeholder: "99,95%" },
    { kind: "text", key: "paragraph", label: "Texte sous le chiffre", multiline: true, rows: 3, where: w("reliability", "Phrase sous le grand chiffre") },
    {
      kind: "list",
      key: "points",
      label: "Encarts",
      itemLabel: "encart",
      titleKey: "label",
      max: 6,
      where: w("reliability", "Les encarts en bas de la section"),
      empty: { label: "", value: "" },
      fields: [
        { kind: "text", key: "label", label: "Titre", where: w("reliability", "Titre de l'encart") },
        { kind: "text", key: "value", label: "Texte", where: w("reliability", "Texte de l'encart") },
      ],
    },
  ],
  platform: [
    ...sectionBase("platform"),
    sectionHeading("platform"),
    {
      kind: "list",
      key: "panels",
      label: "Panneaux",
      itemLabel: "panneau",
      titleKey: "title",
      max: 6,
      where: w("platform", "Les panneaux image + texte"),
      empty: { slug: "", title: "", text: "" },
      fields: [
        {
          kind: "select",
          key: "slug",
          label: "Solution",
          options: "solutions",
          where: w("platform", "Image du panneau"),
          help: "L'image de couverture de cette solution est affichée.",
        },
        { kind: "text", key: "title", label: "Titre", where: w("platform", "Titre sous l'image") },
        { kind: "text", key: "text", label: "Texte", multiline: true, rows: 2, where: w("platform", "Texte sous le titre") },
      ],
    },
  ],
  connected: [
    ...sectionBase("connected"),
    sectionHeading("connected"),
    {
      kind: "list",
      key: "links",
      label: "Connexions",
      itemLabel: "connexion",
      titleKey: "from",
      max: 8,
      where: w("connected", "Les lignes « A → B »"),
      empty: { from: "", to: "", text: "" },
      fields: [
        { kind: "text", key: "from", label: "De", where: w("connected", "Première étiquette de la ligne") },
        { kind: "text", key: "to", label: "Vers", where: w("connected", "Seconde étiquette de la ligne") },
        { kind: "text", key: "text", label: "Explication", multiline: true, rows: 2, where: w("connected", "Texte à droite des étiquettes") },
      ],
    },
  ],
  audiences: [
    ...sectionBase("audiences"),
    sectionHeading("audiences"),
    {
      kind: "group",
      key: "labels",
      label: "Noms des onglets",
      where: w("audiences", "Onglets au-dessus des cartes"),
      help: "Chaque solution choisit ses publics dans Solutions → Identité.",
      fields: (["banques", "entreprises", "partenaires", "particuliers"] as const).map((k) => ({
        kind: "text" as const,
        key: k,
        label: `Onglet « ${k} »`,
        where: w("audiences", "Nom de l'onglet"),
      })),
    },
    { kind: "text", key: "ctaLabel", label: "Lien des cartes", where: w("audiences", "Lien en bas de chaque carte") },
  ],
  scale: [
    ...sectionBase("scale"),
    sectionHeading("scale"),
    {
      kind: "list",
      key: "specs",
      label: "Garanties",
      itemLabel: "garantie",
      titleKey: "value",
      max: 9,
      where: w("scale", "La grille de garanties"),
      empty: { icon: "sparkles", value: "", label: "" },
      fields: [
        { kind: "icon", key: "icon", label: "Icône", where: w("scale", "Pictogramme de la case") },
        { kind: "text", key: "value", label: "Valeur", where: w("scale", "Grand texte de la case") },
        { kind: "text", key: "label", label: "Texte", multiline: true, rows: 2, where: w("scale", "Texte sous la valeur") },
      ],
    },
  ],
  ocrDemo: [
    ...sectionBase("ocrDemo"),
    sectionHeading("ocrDemo"),
    {
      kind: "select",
      key: "solutionSlug",
      label: "Image affichée",
      options: "solutions",
      where: w("ocrDemo", "Grande image à gauche"),
      help: "La 1re image de la galerie de cette solution (Solutions → Médias → Galerie).",
    },
    {
      kind: "list",
      key: "fields",
      label: "Champs détectés",
      itemLabel: "champ",
      titleKey: "label",
      max: 10,
      where: w("ocrDemo", "La liste à droite de l'image"),
      empty: { label: "", value: "Reconnu" },
      fields: [
        { kind: "text", key: "label", label: "Champ", where: w("ocrDemo", "Nom du champ") },
        { kind: "text", key: "value", label: "État", where: w("ocrDemo", "Texte vert à droite") },
      ],
    },
  ],
  integrations: [...sectionBase("integrations"), sectionHeading("integrations"), iconItems("items", "Intégrations", `« ${m("integrations").title} »`, m("integrations").anchor, "intégration", 12)],
  security: [...sectionBase("security"), sectionHeading("security"), iconItems("items", "Piliers", `« ${m("security").title} »`, m("security").anchor, "pilier")],
  finder: [
    ...sectionBase("finder"),
    sectionHeading("finder"),
    {
      kind: "list",
      key: "profiles",
      label: "Profils",
      itemLabel: "profil",
      titleKey: "title",
      max: 8,
      where: w("finder", "Les cartes de profil"),
      empty: { title: "", text: "", solutions: [] },
      fields: [
        { kind: "text", key: "title", label: "Titre", where: w("finder", "Titre de la carte (« Vous êtes… »)") },
        { kind: "text", key: "text", label: "Texte", multiline: true, rows: 3, where: w("finder", "Texte de la carte") },
        {
          kind: "list",
          key: "solutions",
          label: "Solutions recommandées",
          itemLabel: "solution",
          titleKey: "name",
          max: 6,
          where: w("finder", "Étiquettes cliquables en bas de la carte"),
          empty: { name: "", slug: "" },
          fields: [
            { kind: "text", key: "name", label: "Texte de l'étiquette", where: w("finder", "Étiquette") },
            { kind: "select", key: "slug", label: "Mène vers", options: "solutions", where: w("finder", "Page ouverte au clic") },
          ],
        },
      ],
    },
  ],
  migration: [
    ...sectionBase("migration"),
    sectionHeading("migration"),
    cta("cta", "Bouton", w("migration", "Bouton à droite du titre")),
    {
      kind: "list",
      key: "steps",
      label: "Étapes",
      itemLabel: "étape",
      titleKey: "title",
      max: 8,
      where: w("migration", "Les étapes numérotées"),
      empty: { title: "", text: "" },
      fields: [
        { kind: "text", key: "title", label: "Titre", where: w("migration", "Titre de l'étape") },
        { kind: "text", key: "text", label: "Texte", multiline: true, rows: 2, where: w("migration", "Texte de l'étape") },
      ],
    },
  ],
  whyUs: [
    ...sectionBase("whyUs"),
    sectionHeading("whyUs"),
    {
      kind: "list",
      key: "items",
      label: "Avantages",
      itemLabel: "avantage",
      titleKey: "title",
      max: 12,
      where: w("whyUs", "L'accordéon à droite"),
      empty: { title: "", content: "" },
      fields: [
        { kind: "text", key: "title", label: "Titre", where: w("whyUs", "Ligne cliquable de l'accordéon") },
        { kind: "text", key: "content", label: "Texte", multiline: true, rows: 3, where: w("whyUs", "Texte déplié") },
      ],
    },
  ],
  solutionsGrid: [
    ...sectionBase("solutionsGrid"),
    sectionHeading("solutionsGrid"),
    {
      kind: "text",
      key: "ctaPrefix",
      label: "Lien des cartes",
      where: w("solutionsGrid", "« Découvrir » + nom de la solution, en bas de chaque carte"),
      help: "Les cartes elles-mêmes viennent des solutions (image de couverture, description).",
    },
  ],
  commitment: [...sectionBase("commitment"), sectionHeading("commitment"), iconItems("items", "Engagements", `« ${m("commitment").title} »`, m("commitment").anchor, "engagement")],
  values: [...sectionBase("values"), sectionHeading("values"), iconItems("items", "Valeurs", `« ${m("values").title} »`, m("values").anchor, "valeur")],
  faq: [
    ...sectionBase("faq"),
    sectionHeading("faq"),
    {
      kind: "list",
      key: "items",
      label: "Questions",
      itemLabel: "question",
      titleKey: "title",
      max: 20,
      where: w("faq", "L'accordéon de questions"),
      empty: { title: "", content: "" },
      fields: [
        { kind: "text", key: "title", label: "Question", where: w("faq", "Ligne cliquable") },
        { kind: "text", key: "content", label: "Réponse", multiline: true, rows: 3, where: w("faq", "Texte déplié") },
      ],
    },
  ],
  contact: [
    ...sectionBase("contact"),
    sectionHeading("contact"),
    {
      kind: "text",
      key: "supportLine",
      label: "Ligne sous les coordonnées",
      where: w("contact", "Dernière ligne à gauche du formulaire"),
      help: "L'e-mail, le téléphone et l'adresse se règlent dans « Général ».",
    },
    {
      kind: "group",
      key: "form",
      label: "Textes du formulaire",
      where: w("contact", "Formulaire à droite"),
      fields: [
        { kind: "text", key: "name", label: "Champ nom", where: w("contact", "Libellé du 1er champ") },
        { kind: "text", key: "email", label: "Champ e-mail", where: w("contact", "Libellé du 2e champ") },
        { kind: "text", key: "solution", label: "Liste des solutions", where: w("contact", "Libellé de la liste déroulante") },
        { kind: "text", key: "solutionPlaceholder", label: "Choix par défaut", where: w("contact", "Première ligne de la liste") },
        { kind: "text", key: "other", label: "Choix « autre »", where: w("contact", "Dernière ligne de la liste") },
        { kind: "text", key: "message", label: "Champ message", where: w("contact", "Libellé de la zone de texte") },
        { kind: "text", key: "submit", label: "Bouton d'envoi", where: w("contact", "Bouton vert") },
        { kind: "text", key: "sending", label: "Bouton pendant l'envoi", where: w("contact", "Bouton vert, pendant l'envoi") },
        { kind: "text", key: "success", label: "Message de confirmation", multiline: true, rows: 2, where: w("contact", "Après un envoi réussi") },
        { kind: "text", key: "error", label: "Message d'erreur", multiline: true, rows: 2, where: w("contact", "Si l'envoi échoue") },
      ],
    },
  ],
};

/* ───────────────────────────── Solutions ───────────────────────────── */

const AUDIENCE_OPTIONS: Option[] = [
  { value: "banques", label: "Banques" },
  { value: "entreprises", label: "Entreprises" },
  { value: "partenaires", label: "Partenaires" },
  { value: "particuliers", label: "Particuliers" },
];
const PALETTE_OPTIONS: Option[] = [
  { value: "teal", label: "Sarcelle" },
  { value: "aqua", label: "Aqua" },
  { value: "steel", label: "Acier" },
];
const SLOT_KINDS: Option[] = [
  { value: "mock-dashboard", label: "Tableau de bord (généré)" },
  { value: "mock-scan", label: "Document scanné (généré)" },
  { value: "mock-chart", label: "Graphique (généré)" },
  { value: "image-slot", label: "Image" },
  { value: "video-slot", label: "Vidéo" },
];

export const SOLUTION_IDENTITY_FORM: Field[] = [
  {
    kind: "text",
    key: "name",
    label: "Nom",
    where: sol("Toute la page de la solution, et l'accueil", "apercu", "Titre de la page, cartes de l'accueil, menu mobile, pied de page"),
  },
  {
    kind: "text",
    key: "shortName",
    label: "Nom court",
    where: home("Menu en haut de page et visuel 3D", "", "Lien du menu et étiquette sur le globe / la pile"),
  },
  {
    kind: "text",
    key: "slug",
    label: "Adresse de la page",
    mono: true,
    where: sol("Adresse de la page", "", "/solutions/<adresse>"),
    help: "Minuscules, chiffres et tirets. Changer l'adresse casse les liens déjà partagés.",
  },
  { kind: "icon", key: "icon", label: "Icône", where: home("Visuel 3D, onglets et cartes", "", "Pictogramme de la solution") },
  {
    kind: "text",
    key: "category",
    label: "Catégorie",
    where: home("Cartes de l'accueil et hero de la solution", "highlights", "Petite ligne en majuscules au-dessus du nom"),
  },
  {
    kind: "text",
    key: "tagline",
    label: "Accroche",
    multiline: true,
    rows: 2,
    where: home("« L'essentiel, en un coup d'œil », « Pour qui ? », carte du visuel 3D", "highlights", "Phrase sous le nom"),
  },
  {
    kind: "text",
    key: "heroDescription",
    label: "Description principale",
    multiline: true,
    rows: 4,
    where: sol("Haut de la page de la solution, et « Toutes nos solutions »", "apercu", "Paragraphe d'introduction"),
  },
  { kind: "text", key: "team", label: "Mention d'équipe", where: sol("« Présentation »", "presentation", "Ligne « Développé par… »") },
  {
    kind: "multiselect",
    key: "audiences",
    label: "Publics",
    options: AUDIENCE_OPTIONS,
    where: home("« Pour qui ? » et « Toutes nos solutions »", "pour-qui", "Onglets où la solution apparaît, étiquettes des cartes"),
  },
  {
    kind: "group",
    key: "palette",
    label: "Couleurs",
    where: home("Cartes et images générées", "highlights", "Teinte des cartes de la solution"),
    fields: [
      { kind: "select", key: "primary", label: "Couleur principale", options: PALETTE_OPTIONS, where: home("Cartes de la solution", "highlights", "Teinte principale") },
      { kind: "select", key: "secondary", label: "Couleur secondaire", options: PALETTE_OPTIONS, where: home("Cartes de la solution", "highlights", "Teinte secondaire") },
    ],
  },
];

export const SOLUTION_CONTENT_FORM: Field[] = [
  {
    kind: "strings",
    key: "description",
    label: "Paragraphes de présentation",
    itemLabel: "paragraphe",
    multiline: true,
    max: 12,
    where: sol("« Présentation »", "presentation", "Le texte détaillé"),
  },
  {
    kind: "list",
    key: "stats",
    label: "Chiffres clés",
    itemLabel: "chiffre",
    titleKey: "value",
    max: 6,
    where: home("« L'essentiel » (3 premiers) et « Performance cloud » (2 premiers)", "highlights", "Les grands chiffres de la solution"),
    empty: { value: "", label: "" },
    fields: [
      { kind: "text", key: "value", label: "Valeur", where: home("Cartes de l'accueil", "highlights", "Grand chiffre"), placeholder: "99,9%" },
      { kind: "text", key: "label", label: "Libellé", where: home("Cartes de l'accueil", "highlights", "Texte sous le chiffre") },
    ],
  },
  {
    kind: "list",
    key: "features",
    label: "Fonctionnalités",
    itemLabel: "fonctionnalité",
    titleKey: "title",
    max: 12,
    where: sol("« Fonctionnalités »", "fonctionnalites", "La grille de fonctionnalités (les 3 premières aussi dans « Nos interfaces »)"),
    empty: { icon: "sparkles", title: "", description: "" },
    fields: [
      { kind: "icon", key: "icon", label: "Icône", where: sol("« Fonctionnalités »", "fonctionnalites", "Pictogramme") },
      { kind: "text", key: "title", label: "Titre", where: sol("« Fonctionnalités »", "fonctionnalites", "Titre de la carte") },
      { kind: "text", key: "description", label: "Texte", multiline: true, rows: 2, where: sol("« Fonctionnalités »", "fonctionnalites", "Texte de la carte") },
    ],
  },
  {
    kind: "list",
    key: "steps",
    label: "Étapes",
    itemLabel: "étape",
    titleKey: "title",
    max: 10,
    where: sol("« Comment ça marche »", "etapes", "Les étapes numérotées"),
    empty: { title: "", description: "" },
    fields: [
      { kind: "text", key: "title", label: "Titre", where: sol("« Comment ça marche »", "etapes", "Titre de l'étape") },
      { kind: "text", key: "description", label: "Texte", multiline: true, rows: 2, where: sol("« Comment ça marche »", "etapes", "Texte de l'étape") },
    ],
  },
  {
    kind: "list",
    key: "subProjects",
    label: "Sous-projets",
    itemLabel: "sous-projet",
    titleKey: "name",
    max: 8,
    where: sol("« Sous-projets »", "sous-projets", "Section affichée seulement s'il y en a"),
    empty: { name: "", tagline: "", description: "" },
    fields: [
      { kind: "text", key: "name", label: "Nom", where: sol("« Sous-projets »", "sous-projets", "Nom du sous-projet") },
      { kind: "text", key: "tagline", label: "Accroche", where: sol("« Sous-projets »", "sous-projets", "Ligne sous le nom") },
      { kind: "text", key: "description", label: "Texte", multiline: true, rows: 3, where: sol("« Sous-projets »", "sous-projets", "Description") },
    ],
  },
  {
    kind: "list",
    key: "faq",
    label: "Questions fréquentes",
    itemLabel: "question",
    titleKey: "question",
    max: 20,
    where: sol("« Questions fréquentes »", "faq", "L'accordéon de la page"),
    empty: { question: "", answer: "" },
    fields: [
      { kind: "text", key: "question", label: "Question", where: sol("« Questions fréquentes »", "faq", "Ligne cliquable") },
      { kind: "text", key: "answer", label: "Réponse", multiline: true, rows: 3, where: sol("« Questions fréquentes »", "faq", "Texte déplié") },
    ],
  },
];

export const SOLUTION_LAYOUT_FORM: Field[] = [
  {
    kind: "cards",
    key: "highlightVariant",
    label: "Carte dans « L'essentiel, en un coup d'œil »",
    where: home("« L'essentiel, en un coup d'œil »", "highlights", "La grande carte de cette solution dans le carrousel"),
    help: "Ajouter une « Photo de la carte » (onglet Médias) passe automatiquement la carte en mode Photo.",
    options: [
      { value: "cards", label: "Chiffres", icon: "bar-chart", description: "Les 3 premiers chiffres clés en tuiles." },
      { value: "cards-gif", label: "Chiffres + GIF", icon: "zap", description: "Chaque tuile s'ouvre sur une animation au survol." },
      { value: "image", label: "Photo", icon: "file-text", description: "Une photo plein cadre sous le texte." },
    ],
  },
];

export const SOLUTION_MEDIA_FORM: Field[] = [
  {
    kind: "asset",
    key: "cover",
    label: "Image de couverture",
    accept: "image",
    where: home("« Toutes nos solutions », « La plateforme », « Data & Intelligence », « Solutions liées »", "solutions", "L'image générale de la solution", "1600 × 1000 px (16:10)"),
  },
  {
    kind: "asset",
    key: "highlight",
    label: "Photo de la carte (carrousel)",
    accept: "image",
    where: home("« L'essentiel, en un coup d'œil »", "highlights", "Photo plein cadre de la carte — passe la carte en mode Photo", "2400 × 1200 px (2:1)"),
  },
  {
    kind: "text",
    key: "site",
    label: "Site en direct (URL)",
    mono: true,
    placeholder: "https://…",
    where: home("« Nos interfaces » et haut de la page de la solution", "interfaces", "Le vrai site, affiché dans l'ordinateur"),
    help: "Certains sites refusent d'être affichés dans un cadre ; la capture d'écran prend alors le relais.",
  },
  {
    kind: "text",
    key: "siteMobile",
    label: "Site en direct — version mobile (URL)",
    mono: true,
    placeholder: "https://…",
    where: home("« Nos interfaces »", "interfaces", "Affiché dans le téléphone ; par défaut, le site ci-dessus"),
  },
  {
    kind: "asset",
    key: "screenshot",
    label: "Capture d'écran — ordinateur",
    accept: "image",
    where: home("« Nos interfaces » et haut de la page de la solution", "interfaces", "Dans l'écran de l'ordinateur dessiné", "2560 × 1600 px (16:10)"),
  },
  {
    kind: "asset",
    key: "screenshotMobile",
    label: "Capture d'écran — téléphone",
    accept: "image",
    where: home("« Nos interfaces »", "interfaces", "Dans l'écran du téléphone dessiné", "1170 × 2532 px"),
  },
  {
    kind: "asset",
    key: "mockup",
    label: "Maquette avec appareil",
    accept: "image",
    where: home("« Nos interfaces »", "interfaces", "Remplace l'ordinateur dessiné — photo qui contient déjà l'appareil", "≈16:10, fond noir ou transparent"),
  },
  {
    kind: "asset",
    key: "preview",
    label: "Aperçu animé (GIF)",
    accept: "image",
    where: home("Visuel 3D du hero", "", "Carte qui s'ouvre au survol d'une solution sur le globe / la pile", "GIF court en boucle"),
  },
  {
    kind: "asset",
    key: "video",
    label: "Vidéo de présentation",
    accept: "video",
    where: sol("« Vidéo de présentation »", "video", "La vidéo qui s'agrandit au défilement", "MP4/WebM 16:9"),
  },
  {
    kind: "asset",
    key: "videoPoster",
    label: "Image d'attente de la vidéo",
    accept: "image",
    where: sol("« Vidéo de présentation »", "video", "Première image, pendant le chargement", "1920 × 1080 px"),
  },
];

export const SLOT_KIND_OPTIONS = SLOT_KINDS;

/** Every block's form, for the pages that render them. */
export const BLOCK_FORMS: Partial<Record<BlockKey, Field[]>> = {
  general: GENERAL_FORM,
  footer: FOOTER_FORM,
  ...SECTION_FORMS,
};

/** Resolve a location to a URL on the public site. */
export function whereHref(where: Where, slug?: string): string | null {
  if (where.page === "everywhere") return "/";
  const base = where.page === "solution" ? (slug ? `/solutions/${slug}` : null) : "/";
  if (!base) return null;
  return where.anchor ? `${base}#${where.anchor}` : base;
}
