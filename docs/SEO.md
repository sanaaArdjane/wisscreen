# SEO & GEO — le dossier de ce site

Ce que le site valait au départ, ce qui a été changé, et **pourquoi**. Les raisons
comptent davantage que les instructions : elles évitent qu'on « simplifie » plus tard ce
qui était délibéré.

Pour la méthode transposable à un autre site, voir [SEO-PLAYBOOK.md](SEO-PLAYBOOK.md).

**Marchés visés** : Algérie et France, en français. **Domaine canonique** :
`wisscreen.rflabs.tech`, via `NEXT_PUBLIC_SITE_URL`.

---

## 1. État initial, mesuré

Deux audits du dépôt ont précédé tout changement. Les chiffres ci-dessous sont la ligne
de départ : c'est à eux qu'il faut comparer pour affirmer un progrès.

| Mesure | Avant | Commande |
| --- | --- | --- |
| Poids de `public/` | **103 Mo** | `du -sh public/` |
| Le plus gros fichier servi sur `/` | **37 Mo** (`ocrGif_2.gif`) | `du -h public/photos/* \| sort -rh` |
| URL publiques | **5** (`/` + 4 solutions) | `find "app/(marketing)" -name page.tsx` |
| Texte réel dans le HTML de `/` | 15 150 caractères | lecture du prérendu `.next/server/app/index.html` |
| Pages d'authentification indexables | **3** | `/reinitialiser`, `/mot-de-passe-oublie`, `/verification` |
| `lastModified` du sitemap | `new Date()` pour **toutes** les entrées | `curl -s localhost:3000/sitemap.xml` |
| Outils de mesure branchés | **aucun** | ni Search Console, ni analytics, ni fiche Google |

Et ce qui était déjà bon, à ne pas casser : `/` et `/solutions/[slug]` réellement
prérendus en statique, `<h1>` rendu côté serveur, hiérarchie `h1 → h2 → h3` sans niveau
sauté, polices auto-hébergées par `next/font`, aucun script tiers bloquant, `noindex`
sur tout le tableau de bord.

---

## 2. Poids et vitesse

### Le problème

`ocrGif_2.gif` (37 Mo) et `ocrGif_3.gif` (30 Mo) étaient rendus sur la page d'accueil par
un `<img>` nu, **sans chargement différé**. `next/image` laisse passer les GIF animés
sans les optimiser : les 37 Mo partaient tels quels, à chaque visiteur, depuis l'origine
Node — il n'y a aucun CDN devant.

### Ce qui a été fait

| Asset | Avant | Après |
| --- | --- | --- |
| `ocrGif_2.gif` → `ocr_2.mp4` | 37 Mo | **2,2 Mo** |
| `ocrGif_3.gif` → `ocr_3.mp4` | 30 Mo | **1,3 Mo** |
| `ocrGif_1.gif` → `ocr_1.mp4` | 7,5 Mo | **664 Ko** |
| Posters WebP (les trois) | — | 146 Ko |
| `lp_video2s.mp4` → `lp_reveal-1080.mp4` | 15 Mo (3840×2160, 11,4 Mbps) | **1,3 Mo** (1080p) |
| `lp_video.webm` | 7,6 Mo, référencé nulle part | supprimé |
| **`public/` au total** | **103 Mo** | **14 Mo** |

Commandes reproductibles :

```bash
ffmpeg -i in.gif -c:v libx264 -crf 28 -preset veryslow -pix_fmt yuv420p -an \
       -movflags +faststart out.mp4
ffmpeg -i in.gif -frames:v 1 -vf scale=960:-2 -c:v libwebp -quality 72 out-poster.webp
```

### Les décisions, et leurs raisons

**Pas de WebM.** Le plan en prévoyait un en second format. Mesuré : VP9 sortait à
**7,1 Mo** là où H.264 donnait 2,2 Mo sur ce contenu de capture d'écran. Une seconde
source aurait coûté des octets au lieu d'en économiser. VP9 gagne souvent sur des prises
de vue réelles — il perd ici, et c'est la mesure qui tranche, pas la réputation du codec.

**La vidéo du reveal passe de 4K à 1080p.** C'est un fond plein écran que le composant
assombrit ensuite à `brightness(0.5)` et découpe dans des lettres. `AGENTS.md` impose que
ce rush reste assez sombre pour tenir 3:1 contre le papier à l'intérieur des glyphes :
la luma moyenne a donc été vérifiée de part et d'autre du ré-encodage —
`signalstats` YAVG **83,6 → 83,7**, soit inchangée.

```bash
ffmpeg -v error -i f.mp4 -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" \
       -f null - 2>/dev/null | grep -oE 'YAVG=[0-9.]+'
```

**La clé `statGifs` garde son nom alors qu'elle porte des `.mp4`.** Elle fait partie de
`SolutionMediaSchema`, donc du jsonb `site_solutions.media`. La renommer ferait échouer
le `safeParse` des lignes déjà enregistrées — et `toRecord()` traite cet échec par un
`console.warn` suivi d'un `return null` : **la solution disparaîtrait du site sans la
moindre erreur visible.** Le nom est devenu historique ; c'est le prix d'une migration
évitée, et il est écrit dans le registre.

**`preload="none"` avec un poster.** La tuile ne coûte qu'une image fixe (~50 Ko) tant
que le navigateur n'est pas invité à jouer le clip. Les octets de la vidéo partent sur
l'appel à `play()`.

**`muted` est posé comme *propriété*, pas laissé à l'attribut.** React ne rend pas
`muted` au SSR et les politiques d'autoplay lisent la propriété — le même piège que
documente `UniverseReveal`. D'où un effet plutôt qu'un attribut `autoPlay`.

**`Reveal` n'utilise plus GSAP.** C'était l'import le plus coûteux du site public, et pas
à cause de ce composant : `SectionHeading` enveloppe chaque titre dans un `Reveal`,
vingt-et-une sections utilisent `SectionHeading`, et `Reveal` est une frontière client.
GSAP atterrissait donc **statiquement dans le bundle principal de toutes les pages
publiques** pour faire apparaître des titres. Un `IntersectionObserver` et deux
propriétés CSS font le même travail sans rien télécharger. GSAP reste là où le dépôt
scrube réellement une animation au scroll — `UniverseReveal`, `DeviceShowcase`,
`SolutionVideoReveal`. Bénéfice secondaire : `prefers-reduced-motion` est désormais
respecté, ce que la version GSAP ignorait.

**`LoadingImage` ne cache plus une image `priority`.** Le composant couvre ses images
d'un panneau opaque et les tient à `opacity-0` jusqu'à `onLoad` — excellent pour une
image différée, désastreux pour celle sur laquelle la page est mesurée : cela déplaçait
le LCP de « image décodée » à « JavaScript hydraté ».

**Cache immuable sur `/photos` et `/videos`.** Il n'y a pas de CDN : `server.js` sert
chaque octet. Next ne pose du cache long que sur `/_next/static`, dont les noms portent
un hash. Les nôtres sont content-adressés **par convention** — on remplace un asset en
ajoutant un fichier et en repointant `lib/data/media.ts`, jamais en écrasant des octets
sous un nom existant. C'est pour cela que `lp_reveal-1080.mp4` porte sa résolution dans
son nom. Cette convention est ce qui rend `immutable` sûr, donc elle est écrite dans
`next.config.ts` plutôt que supposée.

---

## 3. Indexation

**Le groupe `(auth)` porte maintenant `noindex, nofollow` sur son layout.** C'était laissé
à chaque page : `/connexion` et `/inscription` y pensaient, `/reinitialiser`,
`/mot-de-passe-oublie` et `/verification` non — et le build les prérend en HTML statique
indexable. Au niveau du layout, une page ajoutée plus tard hérite de la règle au lieu de
devoir s'en souvenir.

**`robots.ts` interdit les chemins privés**, et ne se contente plus d'un `allow: /`.

**`/media` en est délibérément absent.** La lecture de la route a corrigé le plan : elle
ne sert que les pièces jointes marquées `public`, c'est-à-dire les images du site public.
La bloquer les cacherait à Google Images sans rien protéger.

**Les crawlers sont listés en deux groupes nommés** — citation d'un côté
(`OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`, `Bingbot`), entraînement de l'autre
(`GPTBot`, `Google-Extended`, `CCBot`, `anthropic-ai`). Ce sont deux décisions
différentes, et une seule est technique : autoriser la citation n'oblige pas à autoriser
l'entraînement. Les deux sont actuellement permis, ce qui est le choix délibéré ; pour
sortir de l'entraînement en restant citable, passer la seconde liste à `disallow: "/"`.

> **La règle qui rend ce fichier répétitif** : un robot qui trouve un groupe portant son
> nom **ignore entièrement le groupe `*`**. Chaque groupe doit donc redéclarer les
> interdictions, faute de quoi nommer un robot lui ouvrirait tout le back-office.

---

## 4. Le sitemap dit enfin la vérité

`lastModified` valait `new Date()` pour **toutes** les entrées. Annoncer à chaque passage
que tout vient de changer revient à ne rien annoncer : c'est le seul champ d'un sitemap
sur lequel un moteur peut agir, et il était bruité.

`getSitemapEntries()` (`lib/content/index.ts`) lit les vraies dates : `updatedAt` de
chaque ligne pour les solutions, et la plus récente des dates de blocs pour l'accueil.
Les pages jamais éditées héritent de la date du build, calculée **une seule fois** par
génération — sinon un sitemap construit en une passe distribuerait des horodatages
espacés de quelques millisecondes, ce qui ressemble à des changements indépendants.

Cette lecture existe à part parce que `Service` est un type **de rendu** : un horodatage
n'a rien à faire parmi les props d'un composant de hero.

> ⚠️ **Le piège des routes de convention.** `sitemap.ts`, `robots.ts`, `manifest.ts` et
> `opengraph-image.tsx` ne sont pas des pages : Next les génère **une fois au build**, et
> `updateTag` ne les atteint pas, faute de tag. Lire du contenu éditable sans
> `export const revalidate` les fige sur l'état du jour du déploiement. C'est le piège qui
> rendait le sitemap incapable de refléter une édition.

---

## 5. Données structurées

**Une entité, pas trois.** `Organization` reçoit un `@id` stable
(`${SITE_URL}/#organization`) ; `Service` et `WebSite` le référencent au lieu de
redécrire l'entreprise. Sans cela, chaque page affirme une société autonome et aucun
moteur n'a de raison de croire qu'il s'agit de la même — c'est la différence entre une
entité qui accumule de l'autorité et trois qui repartent de zéro.

**`contact` et `socials` servent enfin à quelque chose.** Ils étaient éditables, affichés
dans le pied de page, et n'atteignaient aucun balisage. Ils alimentent désormais
`sameAs`, `ContactPoint` et `PostalAddress`, avec `areaServed: ["DZ", "FR"]`. `sameAs`
est le signal de corroboration le moins cher qui existe.

**La FAQ de l'accueil émet `FAQPage`.** Elle portait de vraies questions et était le seul
endroit à n'en rien dire — les pages solution en avaient depuis toujours. C'est aussi la
chose la plus facile à citer pour un moteur de réponse.

**`lib/seo/schema.ts` n'importe aucune base.** Le bloc `general` arrive en paramètre :
les fonctions restent pures, testables et impossibles à transformer par accident en une
seconde requête par page.

**Pas de `LocalBusiness`, pas encore.** Sa valeur vient presque entièrement de la
corroboration avec une fiche Google Business vérifiée portant les mêmes coordonnées. Sans
fiche, sans `geo`, avec des horaires en texte libre, c'est du balisage qui affirme de
l'invérifiable — cela ne rapporte rien et expose à une action manuelle. Chemin de montée,
une fois la fiche créée : passer `@type` à `["Organization", "ProfessionalService"]`,
ajouter `geo` et `openingHoursSpecification`, **en gardant le même `@id`**.

**Pas de `hreflang`.** L'Algérie et la France partagent la langue et le contenu, et il y a
une seule URL par page. Les seules annotations possibles seraient `fr-dz` et `fr-fr`
pointant vers la même URL : un no-op qui ajoute de la maintenance et invite les erreurs
d'annotation non réciproque. Créer `/fr-dz/` et `/fr-fr/` pour justifier la balise
fabriquerait du contenu dupliqué qu'il faudrait ensuite canoniser — construire le problème
pour avoir le droit d'appliquer le remède. Le ciblage passe par `areaServed`, une vraie
`PostalAddress`, la fiche Google Business, et du contenu qui nomme les réalités des deux
marchés.

---

## 6. Être cité par les moteurs de réponse

- Les crawlers de citation sont explicitement autorisés (§3).
- `public/llms.txt` liste les URL faisant foi et renvoie vers les données structurées.
  Convention émergente, sans garantie — elle coûte dix lignes.
- `FAQPage` sur l'accueil et sur chaque solution : c'est le format qu'un LLM extrait le
  plus facilement — une question comme titre, une réponse courte et autonome.
- **L'essentiel se joue hors du site.** Un moteur de réponse reprend ce que plusieurs
  sources corroborent : annuaires d'ESN, LinkedIn de l'entreprise, articles invités.
  Aucune balise ne remplace cela.

---

## 7. Le moteur de contenu

Le site comptait **5 URL publiques**. C'était le vrai plafond : aucune qualité technique
ne positionne une page sur une requête dont elle ne parle pas. Trois choses ont été
ajoutées, dans cet ordre.

### 7.1 Métadonnées par page

Un objet `seo { title, description, ogImage, canonical, noindex }` sur chaque solution,
chaque article et chaque cas d'usage — en jsonb, donc **sans migration**. La chaîne de
repli est résolue **en un seul endroit**, `resolveSeo()` dans `lib/seo/metadata.ts`, et
pas en ligne dans chaque `generateMetadata` : c'est ainsi que les trois dérivent, l'une
oubliant le frein global, l'autre posant `follow: false` et orphelinant ses liens
internes.

Deux détails qui sont des décisions :

- `||` et non `??`. Un champ **vidé** par le propriétaire est une chaîne vide, et doit
  se replier exactement comme un champ absent.
- Un `noindex` **de page** garde `follow: true` — la page fait toujours partie du graphe
  interne du site. Seul le frein global (`general.noindex`) coupe les deux, parce qu'il
  sert à faire disparaître le site d'un coup.

> ⚠️ **Le piège le plus coûteux du lot.** `toRecord()` fait un `safeParse` et, en cas
> d'échec, se contente d'un `console.warn` puis `return null` : **la solution disparaît
> du site, sans erreur visible**. Les schémas n'utilisent pas `.optional()`, donc une
> clé requise absente des défauts suffit. Toute addition à `SolutionContentSchema` part
> dans le **même commit** que `toSolutionContent()` et `blankSolution()`, et
> `__tests__/seo.test.ts` prouve qu'une ligne ancienne, enregistrée avant le champ,
> continue de parser après la fusion sur les défauts.

> ⚠️ **Double `og:image`.** Définir `openGraph.images` ne remplace pas la convention de
> fichier `opengraph-image.tsx` : Next émet **les deux balises**. L'image personnalisée
> est donc servie par la route elle-même, et `generateMetadata` ne touche jamais à
> `images`.

### 7.2 Le blog

Sur le CMS existant — ni MDX, ni service tiers : le dépôt avait déjà `SpecForm`,
`BlockEditor` et un rendu Markdown sans `dangerouslySetInnerHTML`.

- Table `site_posts` : une colonne par champ **requêté, trié, unique ou joint**
  (`slug`, `published`, `publishedAt`, `authorId`, `updatedAt`), le reste en jsonb validé
  par `PostContentSchema`. Migration `0004`, purement additive.
- `updatedAt` est posé **à la main** dans chaque action. La colonne n'a pas de
  `$onUpdate`, et c'est elle que le sitemap publie comme `lastModified` : une
  modification qui ne l'écrit pas laisse la date de création en place.
- **Aucun défaut en code.** Une solution a un défaut parce que le site doit décrire ce
  qu'il vend même base coupée ; un article jamais écrit n'a rien sur quoi se replier.
  Pas de base = blog vide, et c'est la bonne réponse.
- **La pagination est un chemin**, `/blog/page/2`, pas `?page=2` : lire `searchParams`
  rendrait la route dynamique. Et **chaque page est canonique d'elle-même** — la pointer
  vers `/blog` est l'erreur classique qui désindexe tous les articles anciens.
- `relatedSolutions` rend le maillage interne **structurel** : l'article liste les
  solutions dont il parle, et chaque solution peut lister les articles qui la défendent.
  Deux directions depuis un seul champ, plutôt qu'un lien que le rédacteur doit penser à
  écrire.
- **Le slug d'un article publié ne peut plus changer.** L'ancienne adresse renverrait une
  404 et perdrait son classement ; une table de redirections pour quatre articles serait
  de la machinerie spéculative. Le serveur refuse le renommage et dit pourquoi.
- `BlogPosting` (`headline` tronqué à 110 caractères — au-delà, Google ignore l'objet
  entier plutôt que de le tronquer), `publisher` par `@id` partagé, `author` en `Person`
  seulement si le compte joint a un nom.
- Lien « Blog » dans la navbar. Un index atteignable seulement depuis une colonne du pied
  de page est un index que le visiteur ne voit jamais et que le crawler atteint en
  dernier.

### 7.3 Les pages par cas d'usage

Route **imbriquée** `/solutions/[slug]/[usecase]`, stockée dans le jsonb de la solution.
L'URL porte la relation, le fil d'Ariane reste honnête, et la page hérite de l'autorité
de sa parente — une hiérarchie `/cas-usage/[x]` orpheline gaspillerait celle-ci.

**La seule partie qui compte vraiment est le garde-fou.** `lib/content/usecases.ts`
exporte **un prédicat**, consommé par `generateStaticParams`, le sitemap et l'éditeur :
introduction ≥ 400 caractères, ≥ 3 problèmes **et** 3 bénéfices, preuve ≥ 200 caractères,
et similarité trigramme < 85 % avec les cas voisins (ensemble + Jaccard, ~15 lignes, zéro
dépendance). Un cas qui échoue est **absent partout** et son adresse renvoie une 404 — il
n'est pas « masqué » : une page liée qui refuse d'être indexée est le pire des deux.

Les seuils n'en font pas une bonne page ; ils n'excluent que la page qui n'a pas été
écrite. Et **le verdict s'affiche dans l'éditeur**, avec le nombre de caractères
manquants : « il manque 180 caractères d'introduction » est une instruction, tandis
qu'une page qui disparaît sans rien dire est une règle qu'on combat.

Détail de nommage, qui reviendra mordre sinon : les fonctions s'appellent `checkUseCase`
et `isUseCasePublishable`, pas `useCaseIssues` — un nom commençant par `use` est un hook
pour le lint React, et celui-ci est appelé dans un `.map` de composant.

La similarité est mesurée en **trigrammes** et non en mots, parce que la duplication
visée est un gabarit dont on a changé un nom : presque tous les mots correspondent déjà.

### 7.4 Les pages institutionnelles

`/contact`, `/mentions-legales`, `/politique-de-confidentialite`. Obligatoires en France,
signaux E-E-A-T partout, et — c'est le point sous-estimé — ce sont des **faits
vérifiables** qu'un moteur de réponse cherche avant de nommer une entreprise.

Les mentions légales lisent l'identité éditée dans /admin/paramètres, **la même que
celle imprimée sur les devis et factures** : la page légale et les factures ne peuvent
pas se contredire. Une ligne dont la valeur est vide est **supprimée**, pas rendue
blanche : un « NIS : » vide se lit comme un oubli.

La politique de confidentialité décrit ce que le code fait réellement — le stockage
privé à liens signés, les secrets de démonstration chiffrés, l'absence de traceur tiers.
Une politique qui décrit un autre produit est pire que pas de politique, parce qu'elle
est vérifiable.

### 7.5 Ce que le contenu lui-même doit viser

Le code produit les pages ; il ne produit pas le classement. Vous ne battrez pas OVH sur
« hébergement cloud ». La longue traîne où vous êtes légitimes et où presque personne
n'écrit en français :

- **Local** : « ESN Alger », « hébergement de données en Algérie », « facturation
  électronique Algérie ».
- **Problème** : « extraire automatiquement les données d'une facture », « migrer un
  serveur physique vers le cloud ».
- **Comparaison** : « OCR vs saisie manuelle : le vrai coût ».

Un article solide par semaine bat dix articles creux. Premiers résultats à 3–6 mois.

---

## 8. Ce qui reste à faire

**Hors du code, et prioritaire** — rien n'est branché aujourd'hui :

1. **Google Search Console** — vérifier le domaine (le jeton se colle dans
   /admin/site → Général), soumettre `sitemap.xml`.
2. **Bing Webmaster Tools** — l'index de Bing est celui que la recherche de ChatGPT
   interroge.
3. **Fiche Google Business Profile** — déterminante pour le marché algérien, et c'est
   elle qui débloque le `LocalBusiness` décrit au §5. Les coordonnées doivent être
   **identiques** à celles du `ContactPoint` du site.
4. **Analytics respectueux de la vie privée** (Plausible, Umami). Pas de GA4 par
   défaut : il impose une bannière de consentement, donc un composant à construire.
5. **Un CDN devant l'origine.** `server.js` sert encore chaque octet lui-même.

**Dans le code** :

- **Appliquer la migration `0004`** (`pnpm db:migrate`) : la table `site_posts` n'existe
  pas encore en production. Sans elle, le blog rend son état vide — ce qui est correct,
  mais l'onglet /admin/site → Blog ne peut rien enregistrer.
- Éclater `contact.address` en sous-champs (rue, ville, code postal) : c'est ce qui pèse
  sur « agence informatique Alger ».
- `useReportWebVitals` pour mesurer les Core Web Vitals sur le terrain.
- Une image de partage par article (`opengraph-image.tsx` sous `/blog/[slug]`) : ils
  héritent aujourd'hui de celle du site.

**Hors du code, et c'est désormais le facteur limitant** : écrire. Le moteur est en
place et il est vide.

---

## 9. Vérifier après une modification

```bash
pnpm lint && pnpm test && pnpm typecheck && pnpm build
mv .env.local /tmp/ && pnpm build && mv /tmp/.env.local .   # le contrat : build sans base

curl -s localhost:3000/robots.txt                 # groupes et interdictions
curl -s localhost:3000/sitemap.xml                # des dates distinctes et réelles
curl -s localhost:3000/ | grep -o 'application/ld+json[^<]*'   # Organization, WebSite, FAQPage
curl -s localhost:3000/reinitialiser | grep 'name="robots"'    # noindex
curl -s localhost:3000/blog/page/2 | grep -o 'rel="canonical"[^>]*'  # d'elle-même, pas /blog
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/blog/un-brouillon   # 404
du -sh public/                                    # le poids n'est pas reparti
```

Puis, sur l'URL de production : le [test des résultats enrichis][rrt] et une mesure
Lighthouse. Et après toute modification visuelle, relancer l'audit de contraste décrit
dans `AGENTS.md`.

[rrt]: https://search.google.com/test/rich-results
