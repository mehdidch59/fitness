# Fitness IA

Application de fitness personnalisée utilisant la recherche web pour créer des programmes d'entraînement et des plans nutritionnels adaptés à vos besoins.

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/username/fitness/deploy.yml?branch=main)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![Firebase](https://img.shields.io/badge/Firebase-latest-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## Fonctionnalités

- 🏋️ **Programmes d'entraînement personnalisés** basés sur votre équipement disponible et votre niveau
- 🥗 **Plans nutritionnels** adaptés à votre régime alimentaire et vos objectifs
- 📊 **Suivi de progression** pour visualiser vos performances
- 🔍 **Recherche web en temps réel** pour trouver des exercices et recettes adaptés
- 📱 **Interface responsive** utilisable sur tous les appareils
- 🔐 **Authentification** et stockage sécurisé des données avec Firebase

## Architecture

L'application utilise une architecture moderne et optimisée :

- **React 19** avec les dernières fonctionnalités et hooks
- **React Query** pour la gestion d'état côté serveur et le caching
- **Firebase** pour l'authentification, le stockage de données et l'hébergement
- **Zustand** pour une gestion d'état globale légère
- **React Hook Form** pour des formulaires performants
- **TailwindCSS** pour le design UI responsive
- **Recharts** pour la visualisation des données

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/mehdidch59/fitness.git
cd fitness

# Installer les dépendances
npm install

# Créer un fichier .env basé sur .env.example
cp .env.example .env
# Remplir les variables d'environnement

# Lancer l'application en développement
npm start
```

## Déploiement

L'application est configurée pour un déploiement automatique sur Firebase Hosting via GitHub Actions.

```bash
# Déploiement manuel
npm run build
firebase deploy
```

## Infrastructure

- **CI/CD** : GitHub Actions pour l'intégration et le déploiement continus
- **Hosting** : Firebase Hosting avec mise en cache optimisée
- **Database** : Firestore pour le stockage des données en temps réel
- **Authentication** : Firebase Auth pour la gestion des utilisateurs
- **Storage** : Firebase Storage pour les médias
- **Analytics** : Firebase Analytics pour le suivi des utilisateurs

## Structure du projet

```plaintext
fitness/
├── public/             # Ressources statiques
├── src/
│   ├── components/     # Composants React
│   │   ├── ui/         # Composants d'interface utilisateur
│   │   └── views/      # Vues principales de l'application
│   ├── context/        # Contextes React et gestion d'état global
│   ├── hooks/          # Hooks personnalisés
│   ├── services/       # Services (API, Firebase, etc.)
│   ├── styles/         # Styles et thèmes
│   └── utils/          # Fonctions utilitaires
├── .github/            # Configuration GitHub Actions
└── firebase/           # Configuration Firebase
```

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à soumettre une pull request ou ouvrir une issue.

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/amazing-feature`)
3. Commit vos changements (`git commit -m 'Ajout d'une fonctionnalité'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
