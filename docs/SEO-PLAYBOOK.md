# Playbook SEO & GEO

Une méthode pour rendre un site lisible par Google **et** citable par les moteurs de
réponse (ChatGPT, Claude, Perplexity, AI Overviews).

Ce document se lit **sans rien connaître du projet dont il est issu**. Chaque point porte
une étiquette :

- **[U] universel** — vrai pour n'importe quel site ;
- **[N] Next.js** — propre à l'App Router de Next ;
- **[P] projet** — dépend de l'architecture d'un projet donné, à transposer.

Le dossier d'application sur un cas réel, avec ses mesures, est dans
[SEO.md](SEO.md) — utile comme exemple de ce à quoi ressemble la sortie.

---

## 1. L'ordre des opérations

**Mesurer → alléger → baliser → publier.** Dans cet ordre, et c'est la partie la plus
importante de ce document. **[U]**

Pourquoi : corriger des balises sur un site qui pèse 100 Mo ne produit rien de mesurable.
Les balises décident de *comment* une page est comprise ; le poids décide de *si* elle est
vue. Et publier du contenu avant d'avoir branché la mesure, c'est travailler sans savoir
si cela marche.

La tentation est inverse — les balises sont faciles et visibles, le poids est ingrat.
Résistez-y : c'est de l'optimisation que personne ne pourra prouver.

---

## 2. Auditer : les questions à poser à n'importe quel site

Dans l'ordre, avec les commandes. **[U]** sauf mention.

### Qu'y a-t-il réellement dans le HTML ?

```bash
curl -s https://exemple.com | wc -c                      # poids du HTML
curl -s https://exemple.com | sed 's/<[^>]*>//g' | wc -c # texte réel
curl -s https://exemple.com | grep -o '<h[12][^>]*>[^<]*' # les titres existent-ils ?
```

Un site dont le texte n'apparaît qu'après exécution du JavaScript est lisible par Google
(qui rend les pages) mais mal lisible par la plupart des crawlers IA, qui ne le font pas,
ou mal. **Si le texte n'est pas dans le HTML, il n'existe pas pour un moteur de réponse.**

### Où sont les gros octets ?

```bash
du -sh public/ ; du -h public/**/* | sort -rh | head -10
```

Les coupables habituels, par ordre de fréquence : **GIF animés** (un GIF de dix secondes
en 720p pèse 10 à 40 Mo ; le même clip en H.264 pèse 1 à 2 Mo), vidéos en 4K servies comme
fonds décoratifs, photos non redimensionnées sorties d'un appareil.

### Qu'est-ce qui est indexable sans le vouloir ?

```bash
curl -s https://exemple.com/robots.txt
curl -s https://exemple.com/reinitialiser | grep 'name="robots"'
```

Les classiques : pages de réinitialisation de mot de passe, de vérification d'e-mail,
environnements de recette, résultats de recherche interne, pages paginées à l'infini.

### Quelles données structurées sont émises ?

```bash
curl -s https://exemple.com | grep -o 'application/ld+json[^<]*'
```

Puis le [test des résultats enrichis](https://search.google.com/test/rich-results).

### Quelles pages sont statiques ? **[N]**

```bash
pnpm build        # la légende indique ○ statique, ● SSG, ƒ dynamique
```

Une page marketing dynamique est presque toujours un accident : une lecture de session, de
cookie, ou un `searchParams` glissé dans un composant.

---

## 3. Le socle technique minimal

Rien d'exotique ici — mais chaque point manquant coûte cher.

| Élément | Pourquoi | |
| --- | --- | --- |
| Une URL canonique par page | Sinon plusieurs URL se concurrencent et se diluent | **[U]** |
| Sitemap avec de **vraies** dates | `lastModified` est le seul champ actionnable ; une date toujours « maintenant » équivaut à aucune date | **[U]** |
| `robots.txt` qui interdit le privé | Pas pour la confidentialité — pour le budget de crawl | **[U]** |
| `noindex` **par défaut** sur les zones privées | Au niveau du layout, pas page par page : une page ajoutée plus tard doit hériter | **[N]** |
| Une entité `Organization` avec `@id` stable | Une entité qui accumule de l'autorité plutôt que N qui repartent de zéro | **[U]** |
| Images en AVIF/WebP, dimensionnées | | **[U]** |
| Cache long sur les assets content-adressés | | **[U]** |

### Trois pièges qui coûtent des semaines

**Les routes de convention sont figées au build. [N]** `sitemap.ts`, `robots.ts`,
`manifest.ts`, `opengraph-image.tsx` ne sont pas des pages : Next les génère une fois et
l'invalidation par tag ne les atteint pas. Si elles lisent du contenu éditable, il leur
faut un `export const revalidate`, sinon elles servent éternellement l'état du
déploiement.

**La convention de fichier `opengraph-image` s'ajoute à `openGraph.images`, elle ne la
remplace pas. [N]** Définir les deux émet deux balises `og:image`. Le correctif propre :
que la route d'image serve elle-même l'image personnalisée, et que `generateMetadata` ne
touche jamais `images`.

**Une page paginée est canonique d'elle-même. [U]** Faire pointer `/blog/page/2` vers
`/blog` est l'erreur classique qui désindexe tous les articles anciens. Et si la
pagination passe par un `?page=`, la page devient dynamique **[N]** : préférer un chemin.

---

## 4. GEO — être cité par les moteurs de réponse

### Citation et entraînement sont deux décisions distinctes **[U]**

Elles passent par des user-agents différents, et les confondre est l'erreur la plus
répandue :

| Robot | Ce qu'il gouverne |
| --- | --- |
| `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot` | **la citation** dans les réponses |
| `GPTBot`, `Google-Extended`, `CCBot` | **l'entraînement** des modèles |
| `Bingbot` | l'index que la recherche de ChatGPT interroge |

Bloquer `GPTBot` ne vous retire pas des réponses de ChatGPT ; bloquer `OAI-SearchBot`,
si. Autoriser la citation est en général l'objectif ; l'entraînement est un arbitrage
d'entreprise, à poser consciemment.

> **La règle qui surprend** : un robot qui trouve dans `robots.txt` un groupe portant son
> nom **ignore entièrement le groupe `*`**. Chaque groupe nommé doit donc redéclarer les
> interdictions, sinon nommer un robot lui ouvre tout ce que `*` protégeait.

### Le format qu'un LLM sait extraire **[U]**

Un moteur de réponse cite ce qu'il peut **découper** : une question en titre, une réponse
courte et autonome en dessous. Concrètement :

- une vraie FAQ sur les pages importantes, balisée en `FAQPage` ;
- des définitions explicites (« Un OCR est… ») plutôt qu'allusives ;
- des chiffres **datés et attribués** — un LLM reprend volontiers un chiffre qu'il peut
  sourcer ;
- des réponses qui tiennent sans leur contexte : un paragraphe qui commence par « comme
  vu plus haut » est incitable.

### `llms.txt` **[U]**

Un fichier à la racine listant les URL faisant foi et leur objet. Convention émergente,
aucune garantie qu'elle soit lue — elle coûte dix lignes.

### Ce qui compte le plus n'est pas sur votre site **[U]**

Un moteur de réponse reprend ce que **plusieurs sources corroborent**. Annuaires du
secteur, profils d'entreprise, articles invités, mentions presse. Aucune balise ne
remplace d'être mentionné ailleurs. C'est la partie ingrate, et c'est la plus décisive.

---

## 5. Rendre le SEO éditable sans casser le site **[P]**

Dès qu'un site a un back-office, les métadonnées doivent y être éditables — sinon chaque
correction de titre est un déploiement, donc n'a pas lieu.

### La chaîne de repli comme motif

Un champ SEO vide doit retomber sur la copie éditoriale, jamais sur du vide :

```
titre         seo.title       || nom de la page    (+ le gabarit du site)
description   seo.description || texte d'accroche
canonique     seo.canonical   || le chemin de la page
image         seo.ogImage     || l'image générée de la route
```

Utiliser `||` et non `??` : une chaîne vide est ce que laisse un propriétaire qui efface
un champ, et elle doit retomber comme une valeur absente.

### Le piège du champ requis ajouté sans défaut

Dans un CMS qui valide son contenu stocké contre un schéma, **ajouter une clé requise
sans l'ajouter aux valeurs par défaut casse toutes les lignes déjà enregistrées**. Et
selon la gestion d'erreur, l'échec peut être silencieux : l'entité disparaît simplement
du site.

Règle : **le schéma et les défauts partent dans le même commit**, y compris le
constructeur d'entité vierge. Vérifier ensuite qu'une ligne ancienne se relit toujours.

### Ce qui ne doit pas devenir éditable

Le **domaine canonique**. Une faute de frappe casse d'un coup tous les canoniques, toutes
les URL d'images sociales et le sitemap — et le correctif se trouve derrière une
authentification servie par le domaine cassé. Il reste en variable d'environnement.

---

## 6. La règle anti-contenu-mince **[U]**

Dès qu'un site génère des pages à partir de données (une page par ville, par secteur, par
combinaison produit × usage), il faut une barrière — sinon on fabrique des pages-portails,
que Google nomme et sanctionne, et c'est **tout le domaine** qui en pâtit, pas seulement
les pages fautives.

Un seul prédicat exporté, consommé par la génération des routes, le sitemap et l'éditeur :

```
publiable(page, voisines) :
  introduction ≥ 400 caractères spécifiques
  ET ≥ 3 problèmes ET ≥ 3 bénéfices propres à ce cas
  ET une preuve ≥ 200 caractères (chiffre, client nommé, cas réel)
  ET similarité (trigrammes, Jaccard) < 85 % avec chaque page voisine
```

Échec ⇒ la page n'est pas générée, pas dans le sitemap, et répond 404.

**Le détail qui fait tout fonctionner : afficher le verdict dans l'éditeur**, en clair —
« non publiée : il manque 180 caractères d'introduction et 1 bénéfice ». Une règle
invisible est une règle que l'on contourne.

La similarité est une quinzaine de lignes sans dépendance. C'est ce qui empêche de
dupliquer une page quatre fois en changeant le nom du secteur — ce qui, sans garde-fou,
arrivera.

---

## 7. Le moteur de contenu : un blog et des pages générées

Un site techniquement irréprochable sans pages sur lesquelles se positionner ne se
positionne sur rien. Ce qui suit est la liste des décisions à prendre, dans l'ordre où
elles se présentent.

### Le blog **[U]**

- **La pagination est un chemin, pas un paramètre.** `/blog/page/2`, pas `?page=2`.
  Sous Next, lire `searchParams` rend la route dynamique **[N]** ; partout ailleurs, un
  chemin reste une URL propre, mémorisable et partageable.
- **Chaque page paginée est canonique d'elle-même.** Les pointer toutes vers `/blog` est
  l'erreur la plus fréquente : Google les traite alors comme des doublons de la page 1,
  et tout article assez ancien pour en être tombé quitte l'index sans bruit.
  `rel="prev"`/`rel="next"` ne servent plus à rien ; ce que les moteurs suivent, c'est
  un lien ordinaire.
- **Le slug se fige à la première publication.** Le changer renvoie une 404 à tous les
  liens déjà partagés et jette le classement acquis. Refusez-le dans le code, en
  expliquant pourquoi — ne comptez pas sur la discipline. Une table de redirections pour
  une poignée d'articles est de la machinerie spéculative ; au-delà de quelques dizaines,
  elle devient justifiée.
- **Un brouillon doit répondre 404, pas 200.** Une page « pas encore prête » mais
  servie est une page indexable.
- **Le maillage interne doit être structurel.** Un champ « solutions liées » sur
  l'article suffit à produire les deux directions (article → produit, produit →
  articles). Un lien que le rédacteur doit penser à écrire est un lien qui manquera.
- **La date de modification doit être réelle.** Si votre ORM ne met pas à jour la colonne
  tout seul, écrivez-la à la main dans chaque action d'écriture : c'est elle que le
  sitemap publie, et un sitemap qui ment sur ses dates est pire qu'absent. **[N]**
- **Ne mettez en cache que les lignes brutes**, et laissez la fusion sur les défauts et
  la validation tourner à chaque lecture. Mettre en cache le résultat *assemblé* fait
  servir `undefined` pour tout champ ajouté par un déploiement, jusqu'à expiration de
  l'entrée. **[N]**
- **Pas de valeur par défaut pour un article.** Un contenu éditorial jamais écrit n'a
  rien sur quoi se replier : base indisponible = liste vide, et c'est la bonne réponse.
  (Un contenu *structurel* — ce que l'entreprise vend — mérite au contraire un défaut en
  code.)

### Les pages générées à partir de données **[U]**

- **Imbriquez la route sous sa page parente** quand la relation existe :
  `/produits/<produit>/<usage>` plutôt qu'un `/cas-usage/<usage>` orphelin. L'URL porte
  la relation, le fil d'Ariane reste honnête, et la page hérite de l'autorité de sa
  parente au lieu de repartir de zéro.
- **Appliquez la règle du §6 avant d'en générer une seule.** Elle est beaucoup plus
  facile à poser au début qu'à faire respecter après coup, sur vingt pages déjà en ligne.
- **Plafonnez-vous.** Vingt par parent est déjà beaucoup ; cinq bonnes valent mieux.

### Les pages institutionnelles **[U]**

`/contact`, mentions légales, politique de confidentialité. Obligatoires dans l'UE, et —
c'est le point sous-estimé — ce sont les **faits vérifiables** qu'un moteur de réponse
cherche avant de nommer une entreprise : qui elle est, où elle est, comment la joindre.

Deux règles :

- **Une seule source pour l'identité.** Si l'application imprime déjà le nom, l'adresse
  et les identifiants légaux sur des documents, la page légale doit lire *le même objet*.
  Deux saisies finissent par diverger, et c'est la page publique qui aura tort.
- **Une ligne vide se supprime, elle ne se rend pas vide.** Un intitulé sans valeur se
  lit comme un oubli ; son absence ne se lit pas du tout.
- **Décrivez le produit réel.** Une politique de confidentialité recopiée d'un gabarit
  décrit un autre service — et c'est vérifiable, donc c'est pire que rien.

---

## 8. Ce qui ne se transpose pas

**La stratégie éditoriale.** Elle dépend du marché, du métier et de la concurrence.
Quelques principes tiennent, le reste est à refaire :

- Vous ne battrez pas un acteur établi sur son terme générique. Visez la longue traîne où
  vous êtes légitime et où presque personne n'écrit.
- Trois intentions à couvrir : **locale** (« ESN Alger »), **problème** (« extraire
  automatiquement les données d'une facture »), **comparaison** (« X contre Y : le vrai
  coût »).
- Un article solide par semaine bat dix articles creux.
- Lier chaque article à la page produit concernée, et chaque page produit à deux ou trois
  articles. C'est le maillage interne qui fait circuler l'autorité.

**Les délais.** Les premiers résultats se voient à 3–6 mois. Tout plan qui promet mieux
vend autre chose que du référencement.

---

## 9. Mesurer, sinon rien

À brancher **avant** d'écrire la première ligne de contenu : **[U]**

1. **Google Search Console** — la seule source qui dise sur quelles requêtes le site
   apparaît réellement, et ce que Google n'arrive pas à indexer.
2. **Bing Webmaster Tools** — pour la visibilité dans ChatGPT.
3. **Une fiche d'établissement** si l'activité a une implantation locale. Les coordonnées
   doivent être **identiques** à celles du balisage du site.
4. **Un analytics respectueux de la vie privée** — Plausible, Umami. GA4 impose une
   bannière de consentement, donc un composant à construire et des données tronquées.
5. **Les Core Web Vitals sur le terrain**, pas en laboratoire. Lighthouse mesure votre
   machine ; Google note ce que vivent les visiteurs.

---

## 10. La check-list, en une page

```
[ ] Mesure branchée (Search Console, Bing, analytics)   ← avant tout le reste
[ ] Poids des assets vérifié ; aucun GIF animé > 1 Mo
[ ] Images en AVIF/WebP, dimensionnées, cache long
[ ] L'élément LCP peint sans attendre le JavaScript
[ ] Pages publiques statiques ; aucune lecture de session
[ ] Texte réel dans le HTML, pas injecté par le client
[ ] Un h1 par page, hiérarchie sans niveau sauté
[ ] Canonique sur chaque page ; pagination canonique d'elle-même
[ ] Sitemap avec de vraies dates + revalidation
[ ] robots.txt : privé interdit, crawlers IA décidés explicitement
[ ] noindex au niveau du layout sur les zones privées
[ ] Organization avec @id stable ; sameAs, ContactPoint, adresse
[ ] FAQPage là où il y a de vraies questions
[ ] llms.txt
[ ] Métadonnées éditables, avec chaîne de repli et défauts dans le même commit
[ ] Règle anti-contenu-mince si des pages sont générées
[ ] Pages légales, lisant la même identité que les documents de l'app
[ ] Pagination en chemins, chaque page canonique d'elle-même
[ ] Slug figé après publication ; brouillon en 404
[ ] Maillage interne structurel (un champ, pas la mémoire du rédacteur)
```
