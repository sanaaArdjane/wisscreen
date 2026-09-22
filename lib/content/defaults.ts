import { RAW_SERVICES } from "@/lib/data/services";
import { HOME_MEDIA, SOLUTION_MEDIA, type SolutionMedia } from "@/lib/data/media";
import type { Service } from "@/lib/types";
import type {
  FooterContent,
  GeneralContent,
  HeroContent,
  SectionsContent,
  SiteContent,
  SolutionContent,
  SolutionMediaContent,
} from "./schema";

/**
 * What the public site says before the owner has saved anything — and what it
 * falls back to if the database is unreachable (CI builds with none). Every string
 * here was lifted verbatim from the section components, so the site renders
 * exactly as it did when the copy lived in code.
 *
 * `lib/data/services.ts` and `lib/data/media.ts` stay as the **default solutions**.
 */

export const DEFAULT_GENERAL: GeneralContent = {
  siteName: "WICLOUD",
  seoTitle: "WICLOUD — Cloud & services numériques",
  seoDescription:
    "WICLOUD, le cloud souverain et les services qui tournent dessus : infrastructure, données, paiement et commerce en ligne, pour les entreprises, les banques et les particuliers.",
  keywords: [
    "WICLOUD",
    "OCR",
    "extraction de données",
    "reconnaissance de caractères",
    "cloud souverain",
    "Cloud Infrastructure",
    "paiement échelonné",
    "WIFACILITY",
    "Etaysir",
    "marketplace",
    "SETYCORE",
    "services cloud",
  ],
  contact: {
    email: "contact@wissalgroup.com",
    phone: "",
    whatsapp: "",
    address: "",
    hours: "",
  },
  socials: { linkedin: "", facebook: "", instagram: "", x: "", youtube: "", tiktok: "" },
};

export const DEFAULT_HERO: HeroContent = {
  badge: "Cloud & services numériques",
  headline: "Le cloud qui fait tourner",
  words: ["vos services", "vos données", "vos applications", "votre activité"],
  paragraph:
    "WICLOUD héberge, connecte et opère les services numériques des entreprises, des banques et des particuliers — infrastructure cloud, données, paiement et commerce en ligne, réunis sur une seule plateforme souveraine.",
  primaryCta: { label: "Découvrir nos solutions", href: "#solutions" },
  secondaryCta: { label: "Nous contacter", href: "#contact" },
  hint: "Faites pivoter la scène — cliquez sur une solution pour l'explorer",
  visual: {
    mode: "stack",
    image: "/photos/wicloud.jpg",
    imageAlt: "Test",
    video: "/videos/ocr_video.mp4",
    videoPoster: "/photos/ocr2.jpg",
    slides: [
      { kind: "image", src: "/photos/wicloud.jpg", poster: "", caption: "Infrastructure cloud souveraine" },
      { kind: "video", src: "/videos/ocr_video.mp4", poster: "/photos/ocr2.jpg", caption: "OCR en action" },
      { kind: "image", src: "/photos/setycore.jpg", poster: "", caption: "" },
    ],
    interval: 6,
    split: 60,
  },
};

export const DEFAULT_FOOTER: FooterContent = {
  blurb:
    "Cloud & services numériques. Nous hébergeons, connectons et opérons les services des entreprises, des banques et des particuliers : infrastructure, données, paiement et commerce en ligne.",
  columns: [
    { title: "Solutions", includeSolutions: true, links: [] },
    {
      title: "Entreprise",
      includeSolutions: false,
      links: [
        { label: "À propos de WICLOUD", href: "#values" },
        { label: "Nos engagements", href: "#commitment" },
        { label: "Carrières", href: "#" },
        { label: "Actualités", href: "#" },
      ],
    },
    {
      title: "Espace client",
      includeSolutions: false,
      links: [
        { label: "Se connecter", href: "/connexion" },
        { label: "Créer un compte", href: "/inscription" },
        { label: "Mes demandes", href: "/dashboard/demandes" },
        { label: "Essayer nos solutions", href: "/dashboard/demos" },
      ],
    },
    {
      title: "Ressources",
      includeSolutions: false,
      links: [
        { label: "Documentation API", href: "#integrations" },
        { label: "Centre d'aide", href: "#" },
        { label: "Statut des services", href: "#" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      title: "Contact",
      includeSolutions: false,
      links: [
        { label: "Demander une démo", href: "#contact" },
        { label: "Support partenaires", href: "#contact" },
        { label: "Support banques (Etaysir)", href: "#contact" },
      ],
    },
  ],
  copyright: "© {année} WICLOUD. Tous droits réservés.",
  tagline: "OCR · Cloud · WIFACILITY · SETYCORE — et bientôt plus de solutions.",
};

export const DEFAULT_SECTIONS: SectionsContent = {
  highlights: {
    hidden: false,
    titleUnderlined: "L'essentiel",
    titleRest: ", en un coup d'œil.",
    link: { label: "Voir toutes nos solutions", href: "#solutions" },
  },
  performance: {
    hidden: false,
    heading: {
      eyebrow: "Performance cloud",
      title: "Un cloud qui tient la charge, à chaque étage.",
      description:
        "De l'infrastructure aux services qui tournent dessus, chaque couche de la plateforme est mesurée en continu — voici les chiffres qui comptent.",
    },
  },
  reveal: {
    hidden: false,
    badge: "Un seul cloud",
    pitch: [
      {
        title: "Un partenaire, pas un prestataire",
        body: "Nos équipes conçoivent, déploient et exploitent vos solutions de bout en bout — un seul interlocuteur, du cadrage à la production.",
      },
      {
        title: "Un cloud, tous vos services",
        body: "Hébergement, données, paiement et vente en ligne partagent la même infrastructure. Ce que vous activez aujourd'hui se connecte à ce que vous ajouterez demain.",
      },
      {
        title: "Vos données restent les vôtres",
        body: "Cloud souverain, chiffrement de bout en bout et traçabilité complète. Vos données ne quittent pas l'environnement que vous contrôlez.",
      },
    ],
    video: HOME_MEDIA.revealVideo,
  },
  devices: { hidden: false, badge: "Nos interfaces", title: "Vos services, sur chaque écran." },
  dataIntelligence: {
    hidden: false,
    heading: {
      eyebrow: "Data & Intelligence",
      title: "L'intelligence artificielle, intégrée à votre cloud.",
      description:
        "Notre équipe Data développe, entraîne et opère ses propres modèles, directement sur l'infrastructure WICLOUD — sans dépendre de fournisseurs externes pour comprendre vos documents les plus sensibles.",
    },
    points: [
      { icon: "scan", title: "Compréhension de documents", text: "Nos modèles ne lisent pas que du texte : ils comprennent la structure d'un document — champs, tableaux, signatures." },
      { icon: "refresh", title: "Apprentissage continu", text: "L'équipe Data ré-entraîne les modèles en continu sur de nouveaux types de documents et de nouvelles langues." },
      { icon: "shield", title: "Traitement maîtrisé", text: "Vos documents sont traités dans un environnement que vous contrôlez, hébergé sur notre Cloud Infrastructure." },
    ],
    cta: { label: "Découvrir OCR", href: "/solutions/ocr" },
    solutionSlug: "ocr",
  },
  reliability: {
    hidden: false,
    badge: "Fiabilité 24/7",
    stat: "99,95%",
    paragraph:
      "de disponibilité garantie sur notre Cloud Infrastructure, la plateforme qui fait tourner l'ensemble des solutions WICLOUD — surveillée en continu pour que vos équipes n'aient jamais à s'en inquiéter.",
    points: [
      { label: "Supervision", value: "24/7 par notre équipe infrastructure" },
      { label: "Redondance", value: "Réplication multi-instances des services critiques" },
      { label: "Reprise après sinistre", value: "Sauvegardes automatisées et plans de restauration testés" },
    ],
  },
  platform: {
    hidden: false,
    heading: {
      eyebrow: "La plateforme",
      title: "Une console pour piloter tous vos services.",
      description:
        "Infrastructure, données, paiement ou vente en ligne : chaque service WICLOUD se pilote depuis une interface claire, pensée pour les équipes qui l'utilisent au quotidien.",
    },
    panels: [
      { slug: "wifacility", title: "Etaysir — panneau bancaire", text: "Les banques pilotent l'intégralité du cycle de financement : scoring, validation, échéanciers, recouvrement." },
      { slug: "setycore", title: "Dashboard marchand SETYCORE", text: "Catalogue, commandes, paiements et statistiques de vente, centralisés dans un seul back-office." },
      { slug: "wicloud", title: "Console Cloud", text: "Calcul, stockage et supervision de l'infrastructure, pilotés depuis une interface unique." },
    ],
  },
  connected: {
    hidden: false,
    heading: {
      eyebrow: "Un seul cloud",
      title: "Un cloud, plusieurs services, tous connectés.",
      description:
        "WICLOUD n'est pas une collection d'outils isolés : chaque service tourne sur le même socle cloud et s'intègre aux autres, de l'hébergement jusqu'au paiement.",
    },
    links: [
      { from: "OCR", to: "WIFACILITY", text: "Les pièces justificatives d'un dossier de financement sont lues et vérifiées automatiquement par OCR avant validation." },
      { from: "WIFACILITY", to: "SETYCORE", text: "Le paiement échelonné de WIFACILITY est intégré nativement dans la marketplace SETYCORE au moment du paiement." },
      { from: "Cloud Infrastructure", to: "Toutes les solutions", text: "OCR, WIFACILITY et SETYCORE fonctionnent tous sur notre Cloud Infrastructure — un socle commun, sécurisé et supervisé." },
    ],
  },
  audiences: {
    hidden: false,
    heading: {
      eyebrow: "Pour qui ?",
      title: "Un cloud pour chaque acteur de votre écosystème.",
      description:
        "Entreprise, banque, partenaire ou particulier : les services WICLOUD s'adaptent à votre activité, de l'hébergement jusqu'aux applications métier.",
    },
    labels: { banques: "Banques", entreprises: "Entreprises", partenaires: "Partenaires", particuliers: "Particuliers" },
    ctaLabel: "Découvrir",
  },
  scale: {
    hidden: false,
    heading: {
      eyebrow: "Le socle cloud",
      title: "Pensé pour l'échelle, dès le premier jour.",
      description: "Chaque service hébergé sur WICLOUD hérite des mêmes standards de sécurité, de disponibilité et de supervision.",
    },
    specs: [
      { icon: "globe", value: "100%", label: "Données hébergées en environnement souverain, sous votre contrôle." },
      { icon: "clock", value: "24/7", label: "Supervision continue de l'infrastructure par notre équipe technique." },
      { icon: "lock", value: "AES-256", label: "Chiffrement des données au repos et en transit sur l'ensemble du cloud." },
      { icon: "link", value: "REST API", label: "Chaque service s'intègre à vos systèmes existants via des API documentées." },
      { icon: "server", value: "Multi-région", label: "Une infrastructure pensée pour évoluer avec vos volumes, sans interruption." },
      { icon: "refresh", value: "Sauvegardes", label: "Politiques de sauvegarde et de reprise après sinistre configurables." },
    ],
  },
  ocrDemo: {
    hidden: false,
    heading: {
      eyebrow: "OCR en action",
      title: "Un document. Des données structurées, en un instant.",
      description: "Chaque champ est détecté, lu et vérifié automatiquement — visualisez ce que voit le moteur OCR au moment de l'analyse.",
    },
    solutionSlug: "ocr",
    fields: [
      { label: "Nom / Prénom", value: "Reconnu" },
      { label: "Numéro de document", value: "Reconnu" },
      { label: "Date de naissance", value: "Reconnu" },
      { label: "Date d'expiration", value: "Reconnu" },
      { label: "Adresse", value: "Reconnu" },
    ],
  },
  integrations: {
    hidden: false,
    heading: {
      eyebrow: "Intégrations & API",
      title: "Vos systèmes, connectés en toute simplicité.",
      description: "Le cloud WICLOUD se branche à votre écosystème existant — pas l'inverse.",
    },
    items: [
      { icon: "link", title: "API REST", text: "Chaque service du cloud expose une API documentée pour s'intégrer à vos systèmes existants." },
      { icon: "layers", title: "SDKs", text: "Des kits de développement pour accélérer l'intégration côté mobile et web." },
      { icon: "zap", title: "Webhooks", text: "Recevez des événements en temps réel : dossier validé, paiement reçu, document traité." },
      { icon: "server", title: "Connecteurs bancaires", text: "Etaysir se connecte aux systèmes cœur des banques partenaires." },
      { icon: "store", title: "Connecteurs e-commerce", text: "SETYCORE s'intègre aux catalogues et outils de gestion existants des marchands." },
      { icon: "lock", title: "Authentification & SSO", text: "Gestion des accès sécurisée, compatible avec les standards d'authentification d'entreprise." },
    ],
  },
  security: {
    hidden: false,
    heading: {
      eyebrow: "Sécurité & conformité",
      title: "La confiance ne se négocie pas.",
      description:
        "Notre cloud héberge des données sensibles — identité, finances, transactions. La sécurité est pensée dès la conception de chaque service, pas ajoutée après coup.",
    },
    items: [
      { icon: "lock", title: "Chiffrement de bout en bout", text: "Les données sont chiffrées au repos et en transit, sur l'ensemble du cloud WICLOUD." },
      { icon: "shield", title: "Contrôle d'accès strict", text: "Rôles, permissions et journaux d'audit pour savoir qui accède à quoi, à tout moment." },
      { icon: "check", title: "Traçabilité & conformité", text: "Chaque action sensible — validation d'un dossier, traitement d'un document — est tracée et auditable." },
    ],
  },
  finder: {
    hidden: false,
    heading: {
      eyebrow: "Quelle solution pour vous ?",
      title: "Trouvez le service adapté à votre situation.",
      description: "Selon votre profil, un ou plusieurs services WICLOUD répondent directement à votre besoin.",
    },
    profiles: [
      {
        title: "Vous êtes une banque",
        text: "Automatisez l'évaluation et le suivi des dossiers de financement grâce à Etaysir, avec une vérification d'identité fiabilisée par OCR.",
        solutions: [
          { name: "WIFACILITY / Etaysir", slug: "wifacility" },
          { name: "OCR", slug: "ocr" },
        ],
      },
      {
        title: "Vous êtes un commerçant partenaire",
        text: "Vendez au comptant ou en paiement échelonné sur votre propre marketplace, avec un dashboard unifié pour tout piloter.",
        solutions: [
          { name: "SETYCORE", slug: "setycore" },
          { name: "WIFACILITY", slug: "wifacility" },
        ],
      },
      {
        title: "Vous êtes un particulier",
        text: "Achetez au comptant ou en plusieurs fois sur SETYCORE, avec un parcours simple et transparent.",
        solutions: [{ name: "SETYCORE", slug: "setycore" }],
      },
      {
        title: "Vous développez une plateforme",
        text: "Hébergez, sécurisez et faites évoluer vos applications sur le cloud qui fait tourner tous les services WICLOUD.",
        solutions: [{ name: "Cloud Infrastructure", slug: "wicloud" }],
      },
    ],
  },
  migration: {
    hidden: false,
    heading: {
      eyebrow: "Accompagnement à la migration",
      title: "Passer au cloud WICLOUD, sans friction.",
      description: "Que vous migriez une infrastructure existante ou partiez de zéro, notre équipe vous accompagne à chaque étape.",
    },
    cta: { label: "Démarrer un projet", href: "#contact" },
    steps: [
      { title: "Audit", text: "Nous étudions votre existant et identifions les services WICLOUD les plus pertinents." },
      { title: "Plan de migration", text: "Un plan par étapes est défini pour limiter l'impact sur vos opérations en cours." },
      { title: "Déploiement accompagné", text: "Nos équipes vous accompagnent pendant tout le déploiement, environnement de test compris." },
      { title: "Formation", text: "Vos équipes sont formées à l'utilisation des tableaux de bord et des API." },
    ],
  },
  whyUs: {
    hidden: false,
    heading: {
      eyebrow: "Pourquoi WICLOUD",
      title: "Un partenaire cloud, pas juste un fournisseur.",
      description: "Au-delà de l'hébergement, c'est un accompagnement dans la durée que nous proposons à chaque entreprise, banque et partenaire.",
    },
    items: [
      { title: "Support dédié", content: "Une équipe support réactive, disponible pour vos équipes techniques comme métier." },
      { title: "SLA garanti", content: "Des engagements de disponibilité et de temps de réponse formalisés contractuellement." },
      { title: "Formation des équipes", content: "Vos équipes sont formées à l'utilisation des tableaux de bord, API et bonnes pratiques." },
      { title: "Intégration sur-mesure", content: "Chaque intégration est adaptée à vos systèmes existants, pas l'inverse." },
      { title: "Accompagnement Etaysir", content: "Un accompagnement dédié pour les banques lors de la mise en place du panneau Etaysir." },
      { title: "Roadmap partagée", content: "Nous partageons régulièrement notre feuille de route produit avec nos partenaires." },
    ],
  },
  solutionsGrid: {
    hidden: false,
    heading: {
      eyebrow: "Toutes nos solutions",
      title: "Explorez chaque service en détail.",
      description: "D'autres services rejoindront le cloud WICLOUD — cette page s'enrichira au fur et à mesure.",
    },
    ctaPrefix: "Découvrir",
  },
  commitment: {
    hidden: false,
    heading: {
      eyebrow: "Souveraineté & responsabilité",
      title: "Vos données méritent d'être traitées avec sérieux.",
      description: "Confier ses données à un cloud repose sur des engagements clairs — voici les nôtres.",
    },
    items: [
      { icon: "globe", title: "Hébergement souverain", text: "Vos données restent hébergées sur un cloud souverain, dont vous connaissez et contrôlez la localisation." },
      { icon: "shield", title: "Minimisation des données", text: "Nous ne collectons et ne conservons que les données strictement nécessaires au fonctionnement de chaque service." },
      { icon: "check", title: "Transparence", text: "Nos partenaires savent précisément quelles données sont traitées, où, et pourquoi." },
    ],
  },
  values: {
    hidden: false,
    heading: { eyebrow: "Nos valeurs", title: "Ce qui guide WICLOUD.", description: "" },
    items: [
      { icon: "lock", title: "Sécurité & confidentialité", text: "La protection des données de nos partenaires et de leurs clients guide chacune de nos décisions produit." },
      { icon: "sparkles", title: "Innovation continue", text: "Nos équipes Cloud, Data et Ingénierie font évoluer nos services en continu, au rythme des besoins du marché." },
      { icon: "users", title: "Accessibilité", text: "Des interfaces pensées pour être utilisables par des équipes non techniques, sans compromis sur la puissance." },
    ],
  },
  faq: {
    hidden: false,
    heading: { eyebrow: "Questions fréquentes", title: "Tout ce que vous devez savoir.", description: "" },
    items: [
      {
        title: "Que propose WICLOUD, concrètement ?",
        content:
          "Un cloud souverain et les services qui tournent dessus : hébergement et infrastructure, traitement de données, paiement et vente en ligne. Consultez la section « Quelle solution pour vous ? » ou contactez-nous directement.",
      },
      {
        title: "Les services WICLOUD sont-ils connectés entre eux ?",
        content:
          "Oui. Tous nos services tournent sur le même cloud et sont conçus pour fonctionner ensemble : ce que vous activez aujourd'hui se connecte à ce que vous ajouterez demain.",
      },
      {
        title: "Proposez-vous un accompagnement à l'intégration ?",
        content: "Oui, chaque projet bénéficie d'un accompagnement dédié : audit, plan de migration, déploiement et formation des équipes.",
      },
      { title: "Où sont hébergées les données ?", content: "Sur notre cloud souverain, avec un contrôle total sur la localisation des données." },
      {
        title: "Comment devenir partenaire de WICLOUD ?",
        content: "Contactez notre équipe via le formulaire ci-dessous — nous reviendrons vers vous rapidement pour étudier votre projet.",
      },
    ],
  },
  contact: {
    hidden: false,
    heading: {
      eyebrow: "Contact",
      title: "Discutons de votre projet cloud.",
      description: "Entreprise, banque ou particulier — notre équipe vous répond rapidement pour comprendre votre besoin.",
    },
    supportLine: "Support partenaires & support banques (Etaysir) dédiés",
    form: {
      name: "Nom complet",
      email: "E-mail professionnel",
      solution: "Solution qui vous intéresse",
      solutionPlaceholder: "Sélectionner une solution",
      other: "Autre / je ne sais pas encore",
      message: "Votre message",
      submit: "Envoyer",
      sending: "Envoi…",
      success: "Merci — votre message a bien été enregistré, nous revenons vers vous rapidement.",
      error: "Une erreur est survenue — merci de réessayer.",
    },
  },
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  general: DEFAULT_GENERAL,
  hero: DEFAULT_HERO,
  footer: DEFAULT_FOOTER,
  sections: DEFAULT_SECTIONS,
};

/* ───────────────────────────── Default solutions ───────────────────────────── */

/** A `services.ts` entry as the editable content shape (no media-derived fields). */
export function toSolutionContent(service: Service): SolutionContent {
  return {
    slug: service.slug,
    name: service.name,
    shortName: service.shortName,
    icon: service.icon,
    category: service.category,
    tagline: service.tagline,
    heroDescription: service.heroDescription,
    description: service.description,
    audiences: service.audiences,
    palette: service.palette,
    stats: service.stats.map(({ value, label }) => ({ value, label })),
    features: service.features,
    steps: service.steps,
    faq: service.faq,
    subProjects: service.subProjects ?? [],
    media: {
      hero: { kind: service.media.hero.kind, label: service.media.hero.label },
      gallery: service.media.gallery.map(({ kind, label }) => ({ kind, label })),
    },
    team: service.team,
    highlightVariant: service.highlightVariant ?? "cards",
  };
}

/** A `media.ts` entry as the editable media shape: every field present, "" when unset. */
export function toMediaContent(media: SolutionMedia | undefined): SolutionMediaContent {
  const m = media ?? {};
  return {
    site: m.site ?? "",
    siteMobile: m.siteMobile ?? "",
    cover: m.cover ?? "",
    highlight: m.highlight ?? "",
    screenshot: m.screenshot ?? "",
    screenshotMobile: m.screenshotMobile ?? "",
    mockup: m.mockup ?? "",
    preview: m.preview ?? "",
    video: m.video ?? "",
    videoPoster: m.videoPoster ?? "",
    gallery: (m.gallery ?? []).map((g) => g ?? ""),
    statGifs: (m.statGifs ?? []).map((g) => g ?? ""),
  };
}

export type SolutionRecord = {
  id: number | null;
  slug: string;
  position: number;
  published: boolean;
  content: SolutionContent;
  media: SolutionMediaContent;
};

/** The four solutions as shipped in code, in their code order, all published. */
export const DEFAULT_SOLUTIONS: SolutionRecord[] = RAW_SERVICES.map((service, i) => ({
  id: null,
  slug: service.slug,
  position: i,
  published: true,
  content: toSolutionContent(service),
  media: toMediaContent(SOLUTION_MEDIA[service.slug]),
}));

/** A blank solution for "Ajouter une solution". */
export function blankSolution(slug: string, name: string): { content: SolutionContent; media: SolutionMediaContent } {
  return {
    content: {
      slug,
      name,
      shortName: name,
      icon: "sparkles",
      category: "",
      tagline: "",
      heroDescription: "",
      description: [],
      audiences: [],
      palette: { primary: "teal", secondary: "aqua" },
      stats: [],
      features: [],
      steps: [],
      faq: [],
      subProjects: [],
      media: {
        hero: { kind: "mock-dashboard", label: `Aperçu — ${name}` },
        gallery: [
          { kind: "mock-dashboard", label: "Image 1" },
          { kind: "mock-chart", label: "Image 2" },
          { kind: "video-slot", label: "Vidéo de démonstration" },
        ],
      },
      team: "",
      highlightVariant: "cards",
    },
    media: toMediaContent(undefined),
  };
}
