# Après le déploiement — lot SEO / performance / blog

À faire une fois, après avoir mis en production la fusion de
`seo/performance-et-referencement` dans la version SETYCORP. Le détail et les raisons sont
dans [SEO.md](SEO.md) (§8 et §9).

## 1. Obligatoire

1. **Appliquer la migration `0004`** (table `site_posts`, celle du blog) :

   ```bash
   pnpm db:migrate
   ```

   Elle passe par `DATABASE_URL_UNPOOLED` (Doppler, config de production). Sans elle, `/blog`
   s'affiche vide, ce qui est normal, mais l'onglet /admin/site → Blog ne peut rien
   enregistrer.

2. **Vérifier `NEXT_PUBLIC_SITE_URL`** dans les variables CI de l'image Docker : c'est la
   vraie origine de production. Canonicals, sitemap, robots et données structurées en
   dépendent, et la variable est figée au build : si elle est fausse, il faut **reconstruire**
   l'image, pas seulement la redémarrer.

3. **Renseigner l'identité SETYCORP en base**, si ce n'est pas déjà fait (les valeurs en
   base remplacent celles du code) :
   - /admin/site → Général → `siteName` = SETYCORP ;
   - /admin/parametres → Société → `name` = SETYCORP, avec les mentions légales.
     `/mentions-legales` et `/politique-de-confidentialite` affichent ces champs.

4. **Vérifier les médias enregistrés dans /admin/site.** Le lot a supprimé
   `public/photos/ocrGif_1-3.gif`, `public/videos/lp_video.webm` et `lp_video2s.mp4`, que
   des fichiers plus légers remplacent. Les valeurs par défaut du code pointent déjà vers ces
   nouveaux fichiers, mais un chemin ancien enregistré en base donnerait une 404 : il faut
   alors le re-pointer ou remettre le champ à vide.

5. **Contrôler la production** (remplacer `$SITE` par l'origine) :

   ```bash
   curl -s $SITE/robots.txt
   curl -s $SITE/sitemap.xml                                 # dates réelles et distinctes
   curl -s $SITE/ | grep -o 'application/ld+json[^<]*'       # Organization, WebSite, FAQPage
   curl -s $SITE/reinitialiser | grep 'name="robots"'        # noindex
   curl -sI $SITE/photos/service1.jpg | grep -i cache-control # max-age=31536000, immutable
   ```

   Puis faire passer `/` et une page solution dans le
   [test des résultats enrichis](https://search.google.com/test/rich-results), et mesurer avec
   Lighthouse.

## 2. Hors du code, prioritaire

6. **Google Search Console** : vérifier le domaine (le jeton se colle dans /admin/site →
   Général), puis soumettre `/sitemap.xml`.
7. **Bing Webmaster Tools** : importer depuis Search Console et soumettre le sitemap. C'est
   l'index que consulte la recherche de ChatGPT.
8. **Fiche Google Business Profile**, avec des coordonnées identiques à celles du site
   (/admin/parametres et le bloc contact).
9. **Écrire** : le blog et les pages « cas d'usage » sont prêts mais vides. Visez un article
   solide par semaine depuis /admin/site → Blog.

## 3. Plus tard

- Des statistiques respectueuses de la vie privée (Plausible ou Umami, pas GA4 : GA4 impose
  une bannière de consentement).
- Un CDN devant l'origine : aujourd'hui, `server.js` sert lui-même tous les octets de
  `public/`.
- Ne jamais écraser un fichier de `public/photos` ou `public/videos` sous le même nom : ils
  sont mis en cache un an (`immutable`). Il faut ajouter un nouveau fichier et le pointer
  dans `lib/data/media.ts`.
