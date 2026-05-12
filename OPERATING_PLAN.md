# Plan de gestion - Echoes of Antiquity

## Positionnement

Le site doit donner l'impression d'une revue d'histoire accessible: serieux, lisible, visuel, mais pas academique au point de refroidir le clic.

Objectif prioritaire: transformer les visiteurs Google ponctuels en lecteurs qui ouvrent un deuxieme article.

## Workflow article

Tu fournis:

- Le texte de l'article en anglais.
- Une illustration principale.
- Eventuellement 2 a 4 images secondaires.
- Les sources, meme brutes.

Je gere:

- Titre SEO et titre social si besoin.
- Extrait court.
- Structure H2/H3.
- Table des matieres automatique.
- Mise en page.
- Liens internes vers articles proches.
- Teasers X/Threads, Facebook et LinkedIn.
- Regeneration du site.

## Publication gratuite

Phase 1 conseillee:

- Hebergement: Cloudflare Pages ou GitHub Pages.
- Domaine: gratuit au debut, domaine personnalise plus tard si le trafic confirme.
- Ancien Blogger: garder en ligne au depart, puis migrer ou rediriger article par article.

## Reseaux sociaux

Pour chaque article, le build cree un fichier dans:

`dist/social/nom-de-l-article.txt`

Ces textes servent de base. Avant publication, je peux les adapter au ton de chaque reseau:

- X/Threads: accroche courte, curiosite, lien.
- Facebook: mini-recit, question ou angle humain.
- LinkedIn: angle culturel, pedagogique ou editorial.

## AdSense

Je ne conseille pas de l'activer tout de suite. Il faut eviter de donner au site une sensation de page publicitaire avant d'avoir assez de contenu et de confiance.

Signal vert:

- 20 a 30 articles propres.
- Pages legales minimales.
- Trafic organique recurrent.
- Temps de lecture correct.
- Mise en page stable mobile.

Ensuite on active `adsense.enabled` dans `content/site.json` et on place les blocs avec moderation: pas de pub avant que le lecteur ait compris la valeur de l'article.

## Prochaines ameliorations

- Importer les 33 articles Blogger existants.
- Remplacer les images temporaires par tes illustrations.
- Ajouter une page "About" et une page "Editorial policy".
- Ajouter des collections: Women of Antiquity, Roman Religion, Mesopotamian Kings, Greek Myth.
- Mettre une redirection propre depuis Blogger ou au moins des liens visibles vers le nouveau site.
