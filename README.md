# Portfolio LGH — base V2

Base de site inspirée du troisième mockup retenu : sombre, cinématographique, portfolio en premier, projet en cours secondaire.

## Ce qui est déjà inclus

- Accueil responsive, desktop / tablette / mobile.
- Hero cinématographique.
- Portfolio filtrable : Assets, Personnages, Décors, Véhicules.
- Plusieurs formats de cartes : standard, verticale, horizontale, principale.
- Section « Mon approche ».
- Bloc « Projet en cours » volontairement secondaire.
- Section « À propos » et footer.
- `/admin.html` : interface d'administration privée.
- Ajout, modification et suppression de projets.
- Téléversement d'images.
- Choix de catégorie, ordre et emplacement/format de chaque projet.
- Édition des textes et images du Hero, du projet en cours et de la section À propos.
- Bouton « Éditer le site » affiché sur le site public uniquement quand l'administrateur est déjà connecté.

## Mode démonstration

Le site fonctionne immédiatement sans backend grâce à `js/default-content.js` et aux images temporaires du dossier `assets/placeholders/`.

## Activer l'administration sécurisée

Le site étant hébergé sur GitHub Pages, un mot de passe ne peut pas être sécurisé uniquement avec du HTML/JavaScript statique. Cette base utilise donc **Supabase** pour l'authentification, les contenus et les images.

1. Créer un projet Supabase.
2. Dans **Authentication > Users**, créer manuellement votre compte administrateur avec l'e-mail souhaité et un mot de passe fort.
3. Désactiver les inscriptions publiques si vous n'en avez pas besoin.
4. Ouvrir `supabase/setup.sql` et remplacer, si nécessaire, `lawrencegirardhodges@gmail.com` par l'adresse du compte administrateur.
5. Exécuter `supabase/setup.sql` dans **SQL Editor**.
6. Dans Supabase **Project Settings > API**, copier :
   - Project URL
   - `anon` / publishable key
7. Les coller dans `js/config.js` :

```js
window.PORTFOLIO_CONFIG = {
  supabaseUrl: "https://VOTRE-PROJET.supabase.co",
  supabaseAnonKey: "VOTRE_CLE_ANON_PUBLIQUE",
  adminEmail: "votre@email.fr"
};
```

La clé **anon/publishable** peut être présente dans le navigateur : les droits réels sont bloqués par les règles RLS du fichier SQL. **Ne jamais mettre la clé `service_role` dans le site.**

## Utilisation

- Site public : `index.html`
- Administration : `admin.html`

Dans l'admin, l'ordre d'affichage fonctionne avec un nombre : 1 apparaît avant 2, etc. Le champ « Emplacement / format » détermine la taille de la carte dans la grille.

## Déploiement GitHub Pages

Vous pouvez remplacer les fichiers de votre dépôt actuel par ceux de ce dossier, puis pousser le commit. La structure est volontairement en HTML/CSS/JS simple pour rester facile à maintenir sur GitHub Pages.

## À faire ensuite

- Remplacer les images temporaires par vos rendus réels.
- Ajouter des pages individuelles de projet / études de cas.
- Ajuster les textes et liens sociaux.
- Ajouter éventuellement le français / anglais complet.
