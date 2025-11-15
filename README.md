# PlayPadel 🎾

Application Next.js pour organiser des tournois de padel Americano mixte.

## 🚀 Démarrage

### Installation des dépendances

```bash
npm install
```

### Configuration Firebase

1. Copiez le fichier `.env.example` en `.env.local`
2. Ajoutez vos clés Firebase dans `.env.local`
3. Les clés Firebase se trouvent dans votre [Console Firebase](https://console.firebase.google.com/)

```bash
cp .env.example .env.local
```

### Lancement du serveur de développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur pour voir le résultat.

## 🎨 Design

### Thème
L'application utilise Tailwind CSS 4.0 avec un thème personnalisé qui s'adapte automatiquement au mode sombre ou clair du système.

### Polices
- **Sans Serif** : Inter (texte principal)
- **Serif** : Source Serif 4 (titres et emphases)
- **Monospace** : JetBrains Mono (code)

### Couleurs principales

#### Mode clair
- Background: `#e8ebed`
- Primary: `#032d3c`
- Accent: `#d6e4f0`
- Primary Action: `#e05d38`

#### Mode sombre
- Background: `#1a212d`
- Primary: `#94fc13` (vert lime)
- Card: `#2a3040`
- Accent: `#2a3656`

## 📱 Optimisation mobile

L'application est conçue en priorité pour les appareils mobiles avec :
- Viewport optimisé pour mobile
- Thème adaptatif automatique (clair/sombre)
- Interface responsive
- Logo adaptatif au thème

## 🏗️ Structure

```
PlayPadel/
├── app/
│   ├── components/      # Composants réutilisables
│   │   └── BottomNav.tsx
│   ├── home/           # Page d'accueil avec stats
│   ├── tournoi/        # Pages de tournois
│   │   ├── americano-mixte/  # Configuration tournoi
│   │   └── page.tsx    # Sélection type de tournoi
│   ├── calendar/       # Page calendrier
│   ├── profile/        # Page profil
│   ├── globals.css     # Styles globaux et thème Tailwind
│   ├── layout.tsx      # Layout principal avec polices
│   └── page.tsx        # Landing page
├── lib/
│   ├── firebase.ts     # Configuration Firebase
│   └── README.md       # Documentation Firebase
├── public/
│   ├── logoPPLight.svg # Logo mode clair
│   ├── logoPPDark.svg  # Logo mode sombre
│   └── GetStartedImage.png # Image d'accueil
├── .env.local          # Variables d'environnement (non versionné)
├── .env.example        # Template des variables d'environnement
└── ...
```

## 🛠️ Technologies

- **Framework** : Next.js 16.0.1 (App Router)
- **Styling** : Tailwind CSS 4.0
- **Langage** : TypeScript
- **Backend** : Firebase (Firestore Database, Authentication)
- **Fonts** : Google Fonts (Inter, Source Serif 4, JetBrains Mono)
- **Icons** : Lucide React

## 🔥 Firebase

L'application utilise Firebase pour :
- **Firestore** : Base de données pour stocker les tournois, joueurs, etc.
- **Authentication** : Gestion des utilisateurs (à venir)

Consultez `lib/README.md` pour plus de détails sur l'utilisation de Firebase.

## 📝 Fonctionnalités

### ✅ Implémenté
- [x] Landing page avec image plein écran
- [x] Thème adaptatif (clair/sombre)
- [x] Page d'accueil avec statistiques
- [x] Bottom navigation
- [x] Sélection type de tournoi
- [x] Configuration tournoi Americano Mixte
  - Nom du tournoi, lieu, heure
  - Gestion des joueurs (4-12 joueurs)
  - Toggle Homme/Femme
  - Gestion des terrains
  - Description/Règles

### 🚧 À venir
- [ ] Sauvegarder les tournois dans Firebase
- [ ] Générer les matchs Americano
- [ ] Tableau des scores en temps réel
- [ ] Historique des tournois
- [ ] Authentification utilisateurs

## 📄 Licence

Privé - Tous droits réservés
