# Echoes of Antiquity - static site starter

Ce dossier contient une première version gratuite, rapide et automatisable du futur site.

## Ce qui est prêt

- Site statique publiable gratuitement sur GitHub Pages, Cloudflare Pages ou Netlify.
- Articles en Markdown dans `content/articles/`.
- Page d'accueil, pages articles, pages topics, RSS, sitemap et robots.txt générés automatiquement.
- Meta SEO + Open Graph pour de bons aperçus quand un lien est partagé.
- Teasers sociaux générés dans `dist/social/`.
- AdSense préparé mais désactivé dans `content/site.json`.

## Commandes

```bash
npm run build
npm run serve
```

Le serveur local affiche le site sur `http://localhost:4173`.

## Ajouter un article

1. Dupliquer `content/articles/_template.md`.
2. Renommer le fichier avec un slug propre, par exemple `sappho-mytilene.md`.
3. Remplir les champs du haut.
4. Mettre l'image dans `public/assets/`.
5. Lancer `npm run build`.

## Quand activer AdSense

Je recommande de l'activer seulement quand le site a:

- 20 a 30 articles bien structures.
- Une navigation claire par themes.
- Une page contact et une politique editoriale basique.
- Quelques semaines de trafic stable depuis Google ou reseaux sociaux.

Pour l'activer, il suffira de passer `adsense.enabled` a `true` dans `content/site.json`, puis de renseigner le client et les slots.

## Publication gratuite conseillee

Option la plus simple: Cloudflare Pages.

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: none

GitHub Pages marche aussi tres bien si le dossier est pousse dans un depot GitHub.
