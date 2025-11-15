# Installation PWA - PlayPadel

L'application PlayPadel est maintenant disponible en tant que Progressive Web App (PWA), ce qui permet de l'installer sur votre appareil mobile.

## Installation sur Mobile

### Android (Chrome/Edge)
1. Ouvrez l'application dans votre navigateur Chrome ou Edge
2. Appuyez sur le menu (3 points) en haut à droite
3. Sélectionnez "Ajouter à l'écran d'accueil" ou "Installer l'application"
4. Confirmez l'installation
5. L'application apparaîtra sur votre écran d'accueil

### iOS (Safari)
1. Ouvrez l'application dans Safari
2. Appuyez sur le bouton de partage (carré avec flèche vers le haut)
3. Faites défiler et sélectionnez "Sur l'écran d'accueil"
4. Personnalisez le nom si nécessaire
5. Appuyez sur "Ajouter"
6. L'application apparaîtra sur votre écran d'accueil

## Fonctionnalités PWA

- **Installation** : L'application peut être installée sur l'écran d'accueil
- **Mode standalone** : L'application s'ouvre en plein écran sans barre d'adresse
- **Icônes** : Icônes personnalisées pour l'écran d'accueil
- **Thème adaptatif** : Support du mode sombre/clair
- **Service Worker** : Cache des ressources pour une meilleure performance (en production)

## Génération des icônes

Les icônes PWA sont générées automatiquement à partir du logo. Pour régénérer les icônes :

```bash
npm run generate-icons
```

## Notes

- Le service worker est désactivé en mode développement pour faciliter le débogage
- En production, le service worker active la mise en cache pour une meilleure performance
- Les icônes sont générées à partir de `logoPPLight.svg`

