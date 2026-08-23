import type { Service } from "@/lib/types";

/**
 * Single source of truth for every solution shown on the homepage and rendered at
 * /solutions/[slug]. Add a 5th solution by adding one entry here — no other file
 * should hardcode this list. Copy is a first draft; the client will revise it.
 */
export const SERVICES: Service[] = [
  {
    slug: "ocr",
    name: "OCR",
    shortName: "OCR",
    icon: "scan",
    category: "Extraction intelligente de données",
    tagline: "Chaque document devient une donnée exploitable, en quelques secondes.",
    heroDescription:
      "Notre moteur OCR, développé en interne par l'équipe Data, lit, comprend et structure vos documents et images — cartes d'identité, factures, relevés, contrats — pour les transformer instantanément en données prêtes à l'emploi.",
    description: [
      "OCR est le moteur d'extraction de données de Wissal Univers. Conçu et entraîné par notre équipe Data, il combine reconnaissance optique de caractères, vision par ordinateur et modèles de compréhension de documents pour extraire automatiquement les informations contenues dans des fichiers scannés, des photos ou des PDF.",
      "Pensé pour les flux à fort volume, OCR s'intègre directement dans vos processus métier : onboarding client, vérification d'identité, traitement de factures, dématérialisation d'archives. Chaque document est analysé, structuré puis restitué au format dont vos systèmes ont besoin (JSON, API, base de données).",
      "Le moteur continue d'apprendre : nouveaux types de documents, nouvelles langues, nouveaux formats — l'équipe Data enrichit continuellement les modèles pour améliorer la précision au fil du temps.",
      "Cette page évoluera avec plus de détails techniques, de cas d'usage et de métriques de performance au fur et à mesure des mises à jour du produit.",
    ],
    audiences: ["partenaires", "particuliers"],
    palette: { primary: "aqua", secondary: "steel" },
    stats: [
      { value: "99,2%", label: "Précision moyenne d'extraction" },
      { value: "< 2 s", label: "Temps de traitement par document" },
      { value: "30+", label: "Types de documents reconnus" },
    ],
    features: [
      { title: "Reconnaissance multi-format", description: "PDF, image, scan, photo prise au smartphone — un seul moteur pour tous les formats d'entrée.", icon: "scan" },
      { title: "Extraction structurée", description: "Les données sont restituées prêtes à l'emploi, au format JSON ou directement via API.", icon: "layers" },
      { title: "Détection multilingue", description: "Reconnaissance de plusieurs langues et jeux de caractères sur un même document.", icon: "globe" },
      { title: "Scoring de confiance", description: "Chaque champ extrait est accompagné d'un score de confiance pour fiabiliser vos contrôles.", icon: "check" },
      { title: "Apprentissage continu", description: "Les modèles sont ré-entraînés régulièrement par l'équipe Data pour gagner en précision.", icon: "refresh" },
      { title: "Intégration simple", description: "SDK et API REST pour brancher OCR à vos applications existantes en quelques heures.", icon: "link" },
    ],
    steps: [
      { title: "Import du document", description: "Envoyez un fichier, une image ou un flux scanné via l'API ou l'interface." },
      { title: "Analyse & OCR", description: "Le moteur détecte la structure du document et lit chaque zone de texte." },
      { title: "Structuration des données", description: "Les champs identifiés sont validés, scorés et organisés en un objet structuré." },
      { title: "Restitution", description: "Les données sont renvoyées via API, export ou directement poussées vers vos systèmes." },
    ],
    faq: [
      { question: "Quels types de documents OCR peut-il traiter ?", answer: "Cartes d'identité, passeports, factures, relevés bancaires, contrats, formulaires manuscrits et bien d'autres — la liste s'agrandit à chaque mise à jour du moteur." },
      { question: "Les documents sont-ils stockés après traitement ?", answer: "Le traitement peut être configuré pour ne conserver aucune copie du document source, selon vos exigences de confidentialité." },
      { question: "Combien de temps prend une intégration ?", answer: "La plupart des partenaires sont opérationnels en quelques jours grâce à notre API REST et nos SDK." },
      { question: "OCR fonctionne-t-il hors ligne ou uniquement en cloud ?", answer: "OCR est disponible en mode cloud via WICLOUD, avec une option de déploiement dédié pour les besoins spécifiques." },
      { question: "Quelle est la précision réelle du moteur ?", answer: "La précision moyenne dépasse 99% sur les documents standards ; elle varie selon la qualité de numérisation et le type de document." },
    ],
    media: {
      hero: { kind: "mock-scan", label: "Aperçu — extraction d'un document en direct" },
      gallery: [
        { kind: "mock-scan", label: "Détection des champs sur une pièce d'identité" },
        { kind: "mock-chart", label: "Précision par type de document" },
        { kind: "video-slot", label: "Démonstration vidéo du moteur OCR" },
      ],
    },
    team: "Développé par l'équipe Data de Wissal Univers",
  },
  {
    slug: "wicloud",
    name: "WICLOUD",
    shortName: "WICLOUD",
    icon: "cloud",
    category: "Infrastructure cloud souveraine",
    tagline: "Votre cloud, vos règles — l'infrastructure qui fait tourner toutes nos solutions.",
    heroDescription:
      "WICLOUD est notre plateforme d'infrastructure cloud, pensée à la manière des grands fournisseurs internationaux mais conçue pour répondre aux exigences locales de souveraineté, de performance et de sécurité des données.",
    description: [
      "WICLOUD fournit les briques essentielles pour héberger, déployer et faire évoluer des applications modernes : calcul, stockage, réseau, bases de données managées et outils de supervision, le tout piloté depuis une seule console.",
      "Conçue dès le départ pour supporter l'ensemble des solutions Wissal Univers (OCR, WIFACILITY, SETYCORE), WICLOUD garantit une infrastructure homogène, sécurisée et scalable, avec un contrôle total sur la localisation des données.",
      "Notre équipe infrastructure surveille la plateforme 24/7, avec des mécanismes de redondance, de sauvegarde et de reprise après sinistre pour garantir une disponibilité continue.",
      "D'autres services (fonctions serverless, CDN, IA managée) rejoindront WICLOUD au fil des prochaines versions — cette page sera enrichie en conséquence.",
    ],
    audiences: ["partenaires", "entreprises"],
    palette: { primary: "steel", secondary: "aqua" },
    stats: [
      { value: "99,95%", label: "Disponibilité garantie (SLA)" },
      { value: "24/7", label: "Supervision infrastructure" },
      { value: "100%", label: "Données hébergées en environnement souverain" },
    ],
    features: [
      { title: "Calcul élastique", description: "Des instances qui s'adaptent automatiquement à la charge de vos applications.", icon: "server" },
      { title: "Stockage objet & bloc", description: "Stockage durable et hautement disponible pour tous types de charges de travail.", icon: "database" },
      { title: "Bases de données managées", description: "Provisionnement, sauvegarde et mise à l'échelle gérés automatiquement.", icon: "layers" },
      { title: "Réseau privé & VPN", description: "Isolation réseau complète entre vos environnements et connexion sécurisée.", icon: "lock" },
      { title: "Supervision temps réel", description: "Tableaux de bord et alertes pour suivre la santé de votre infrastructure en continu.", icon: "bar-chart" },
      { title: "Sauvegardes automatisées", description: "Politiques de sauvegarde et de reprise après sinistre configurables.", icon: "refresh" },
    ],
    steps: [
      { title: "Provisionnement", description: "Créez vos ressources (calcul, stockage, base de données) en quelques clics ou via API." },
      { title: "Déploiement", description: "Déployez vos applications avec les outils et pipelines de votre choix." },
      { title: "Mise à l'échelle automatique", description: "L'infrastructure s'ajuste dynamiquement selon la charge réelle." },
      { title: "Supervision continue", description: "Suivez performance, coûts et disponibilité depuis un tableau de bord unique." },
    ],
    faq: [
      { question: "Où sont hébergées les données sur WICLOUD ?", answer: "Dans un environnement souverain dont l'emplacement est garanti contractuellement, avec un contrôle total pour nos partenaires." },
      { question: "Peut-on migrer une infrastructure existante vers WICLOUD ?", answer: "Oui, notre équipe accompagne la migration avec un plan par étapes pour limiter les interruptions de service." },
      { question: "Quel est le modèle de facturation ?", answer: "Un modèle à l'usage, avec des paliers adaptés aux besoins des partenaires et entreprises — détails à venir." },
      { question: "Quel est le SLA de disponibilité ?", answer: "99,95% de disponibilité garantie, avec supervision 24/7 par notre équipe infrastructure." },
      { question: "WICLOUD héberge-t-il les autres solutions Wissal Univers ?", answer: "Oui, OCR, WIFACILITY et SETYCORE fonctionnent tous nativement sur l'infrastructure WICLOUD." },
    ],
    media: {
      hero: { kind: "mock-dashboard", label: "Console WICLOUD — vue d'ensemble de l'infrastructure" },
      gallery: [
        { kind: "mock-chart", label: "Supervision temps réel des ressources" },
        { kind: "mock-dashboard", label: "Gestion des instances et du stockage" },
        { kind: "video-slot", label: "Présentation vidéo de la console WICLOUD" },
      ],
    },
    team: "Opéré par l'équipe Infrastructure de Wissal Univers",
  },
  {
    slug: "wifacility",
    name: "WIFACILITY",
    shortName: "WIFACILITY",
    icon: "credit-card",
    // Full-bleed photo layout. Set `highlightImage` and the photo fills the card;
    // until then it shows a labelled placeholder. Switch to "cards" (or drop the
    // field) to use the data-tile layout instead.
    highlightVariant: "image",
    category: "Paiement & achat échelonné",
    tagline: "L'écosystème complet du paiement par facilités, pour les commerces comme pour les banques.",
    heroDescription:
      "WIFACILITY regroupe l'ensemble de nos solutions de paiement échelonné : de l'expérience d'achat côté client jusqu'au pilotage complet des dossiers de financement côté banque, via son module Etaysir.",
    description: [
      "WIFACILITY est le socle sur lequel reposent nos solutions de paiement par facilités. Il connecte marchands, clients et institutions financières autour d'un parcours d'achat échelonné fluide et sécurisé.",
      "Son module phare, Etaysir, est un panneau d'administration destiné aux banques : il centralise la gestion des demandes, l'évaluation des dossiers, le suivi des échéanciers et la gestion du risque, avec des tableaux de bord et des règles métier configurables.",
      "WIFACILITY expose également des API permettant à des partenaires commerciaux d'intégrer le paiement échelonné directement dans leurs propres parcours de vente, en ligne comme en point de vente.",
      "D'autres sous-projets viendront enrichir l'écosystème WIFACILITY (scoring automatisé, signature électronique, recouvrement) — contenu à venir.",
    ],
    audiences: ["banques", "partenaires"],
    palette: { primary: "teal", secondary: "steel" },
    subProjects: [
      {
        name: "Etaysir",
        tagline: "Panneau d'administration bancaire",
        description:
          "Etaysir permet aux banques de piloter l'intégralité du cycle de vie des dossiers de financement : réception des demandes, scoring, validation, génération des échéanciers, suivi des paiements et gestion du recouvrement, depuis une interface unique.",
      },
      {
        name: "Paiement échelonné marchand",
        tagline: "Intégration commerçant",
        description:
          "Un module dédié permettant aux commerces partenaires de proposer le paiement en plusieurs fois à leurs clients, avec simulation instantanée et validation en temps réel.",
      },
    ],
    stats: [
      { value: "4", label: "Étapes du parcours de financement automatisées" },
      { value: "-60%", label: "Temps de traitement d'un dossier vs. processus manuel" },
      { value: "100%", label: "Traçabilité des échéanciers" },
    ],
    features: [
      { title: "Simulation instantanée", description: "Un échéancier personnalisé est calculé et présenté en temps réel au client.", icon: "zap" },
      { title: "Scoring & évaluation du risque", description: "Chaque dossier est évalué automatiquement selon des règles métier configurables.", icon: "bar-chart" },
      { title: "Tableau de bord Etaysir", description: "Une vue centralisée pour les banques sur l'ensemble des dossiers en cours.", icon: "layers" },
      { title: "Suivi des paiements", description: "Chaque échéance est suivie en temps réel, avec alertes en cas de retard.", icon: "clock" },
      { title: "Validation numérique", description: "Signature et validation des dossiers directement depuis la plateforme.", icon: "check" },
      { title: "API d'intégration marchand", description: "Les partenaires commerciaux intègrent le paiement échelonné dans leur propre parcours de vente.", icon: "link" },
    ],
    steps: [
      { title: "Demande de financement", description: "Le client choisit le paiement échelonné au moment de l'achat." },
      { title: "Évaluation & scoring", description: "Le dossier est analysé automatiquement selon les règles définies par la banque." },
      { title: "Validation banque (Etaysir)", description: "La banque valide le dossier depuis son panneau d'administration Etaysir." },
      { title: "Suivi des échéances", description: "Le paiement est suivi jusqu'au dernier versement, avec relances automatiques." },
    ],
    faq: [
      { question: "Qu'est-ce qu'Etaysir exactement ?", answer: "Etaysir est le module d'administration de WIFACILITY destiné aux banques, pour piloter l'ensemble du cycle de financement." },
      { question: "Un commerçant peut-il intégrer WIFACILITY à sa caisse existante ?", answer: "Oui, via l'API d'intégration marchand, en ligne comme en point de vente physique." },
      { question: "Comment le risque est-il évalué ?", answer: "Selon des règles de scoring configurables par chaque institution financière partenaire." },
      { question: "Les échéanciers sont-ils personnalisables ?", answer: "Oui, la durée et les montants sont paramétrables selon les politiques de chaque partenaire bancaire." },
      { question: "WIFACILITY est-il connecté à SETYCORE ?", answer: "Oui, la marketplace SETYCORE s'appuie nativement sur WIFACILITY pour proposer le paiement échelonné à ses clients." },
    ],
    media: {
      hero: { kind: "mock-dashboard", label: "Etaysir — tableau de bord de gestion des dossiers" },
      gallery: [
        { kind: "mock-chart", label: "Suivi des échéanciers en temps réel" },
        { kind: "mock-dashboard", label: "Évaluation et scoring d'un dossier" },
        { kind: "image-slot", label: "Parcours client de simulation d'achat échelonné" },
      ],
    },
    team: "Porté par les équipes Produit & Ingénierie de Wissal Univers",
  },
  {
    slug: "setycore",
    name: "SETYCORE",
    shortName: "SETYCORE",
    icon: "store",
    category: "Marketplace & vente en ligne",
    tagline: "Une marketplace complète : vente directe ou paiement échelonné, pilotée depuis un seul tableau de bord.",
    heroDescription:
      "SETYCORE est notre plateforme de marketplace : elle permet aux marchands de vendre leurs produits au comptant ou en paiement échelonné, avec un back-office complet pour gérer catalogue, commandes et paiements.",
    description: [
      "SETYCORE combine une expérience d'achat moderne pour les clients finaux avec un dashboard marchand puissant permettant de gérer le catalogue produits, les stocks, les commandes et les paiements en un seul endroit.",
      "Les marchands peuvent proposer la vente directe classique ou activer le paiement échelonné grâce à l'intégration native avec WIFACILITY, offrant plus de flexibilité à leurs clients sans complexité technique supplémentaire.",
      "Le tableau de bord SETYCORE fournit des statistiques de vente en temps réel, une gestion fine des commandes et des outils marketing pour aider les marchands à développer leur activité.",
      "De nouvelles fonctionnalités (multi-boutiques, marketplace B2B, avis clients) sont prévues — cette page sera mise à jour au fur et à mesure.",
    ],
    audiences: ["partenaires", "particuliers"],
    palette: { primary: "teal", secondary: "aqua" },
    stats: [
      { value: "2", label: "Modes de paiement natifs : comptant et échelonné" },
      { value: "100%", label: "Gestion catalogue & commandes centralisée" },
      { value: "Temps réel", label: "Suivi des ventes et statistiques" },
    ],
    features: [
      { title: "Catalogue illimité", description: "Ajoutez et organisez un nombre illimité de produits et de variantes.", icon: "store" },
      { title: "Paiement comptant & échelonné", description: "Le paiement en plusieurs fois est proposé nativement grâce à WIFACILITY.", icon: "credit-card" },
      { title: "Dashboard marchand complet", description: "Une vue unique sur les ventes, les commandes et les stocks.", icon: "layers" },
      { title: "Gestion des commandes & stocks", description: "Suivi automatisé de l'inventaire et du cycle de vie de chaque commande.", icon: "database" },
      { title: "Statistiques en temps réel", description: "Chiffre d'affaires, paniers moyens et tendances de vente actualisés en continu.", icon: "bar-chart" },
      { title: "Outils marketing", description: "Promotions, codes de réduction et mise en avant produits pour booster les ventes.", icon: "sparkles" },
    ],
    steps: [
      { title: "Création de la boutique", description: "Le marchand configure sa boutique et ses moyens de paiement." },
      { title: "Ajout du catalogue", description: "Les produits sont ajoutés avec prix, stock et variantes." },
      { title: "Vente & paiement", description: "Le client achète au comptant ou choisit le paiement échelonné." },
      { title: "Suivi & statistiques", description: "Le marchand pilote son activité depuis le tableau de bord SETYCORE." },
    ],
    faq: [
      { question: "SETYCORE convient-il aux petits et grands marchands ?", answer: "Oui, la plateforme est pensée pour s'adapter aussi bien à un marchand individuel qu'à une enseigne avec un large catalogue." },
      { question: "Comment fonctionne le paiement échelonné sur SETYCORE ?", answer: "Il s'appuie nativement sur WIFACILITY : le client choisit ce mode de paiement directement au moment du checkout." },
      { question: "Peut-on gérer plusieurs boutiques depuis un seul compte ?", answer: "Cette fonctionnalité multi-boutiques fait partie de la feuille de route — plus de détails seront ajoutés prochainement." },
      { question: "Quelles statistiques sont disponibles pour les marchands ?", answer: "Chiffre d'affaires, commandes, taux de conversion et tendances produits, actualisés en temps réel." },
      { question: "SETYCORE propose-t-il une application mobile ?", answer: "Une expérience mobile est prévue sur la feuille de route produit — à suivre." },
    ],
    media: {
      hero: { kind: "mock-dashboard", label: "Dashboard marchand SETYCORE" },
      gallery: [
        { kind: "mock-chart", label: "Statistiques de vente en temps réel" },
        { kind: "image-slot", label: "Parcours d'achat côté client" },
        { kind: "video-slot", label: "Démonstration de la marketplace SETYCORE" },
      ],
    },
    team: "Développé par l'équipe Produit de Wissal Univers",
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((service) => service.slug === slug);
}
