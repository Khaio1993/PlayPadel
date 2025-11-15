# Firebase Configuration

## Configuration initiale

Le projet est configuré avec Firebase pour la base de données et l'authentification.

### Variables d'environnement

Les clés API Firebase sont stockées de manière sécurisée dans le fichier `.env.local` (non versionné).

**Pour configurer votre environnement local :**

1. Copiez le fichier `.env.example` en `.env.local`
2. Remplacez les valeurs par vos propres clés Firebase
3. Redémarrez le serveur de développement

```bash
cp .env.example .env.local
npm run dev
```

### Utilisation de Firebase

Importez les services Firebase depuis `lib/firebase.ts` :

```typescript
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

// Exemple : Créer un tournoi
const createTournament = async (tournamentData) => {
  try {
    const docRef = await addDoc(collection(db, "tournaments"), tournamentData);
    console.log("Tournament created with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating tournament: ", error);
  }
};

// Exemple : Récupérer tous les tournois
const getTournaments = async () => {
  const querySnapshot = await getDocs(collection(db, "tournaments"));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
```

## Services disponibles

- **`db`** : Firestore Database
- **`auth`** : Firebase Authentication
- **`app`** : Firebase App instance

## Sécurité

⚠️ **Important** : Ne commitez JAMAIS le fichier `.env.local` dans Git !

Le fichier `.gitignore` est configuré pour ignorer tous les fichiers `.env*`.


