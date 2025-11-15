// Service pour gérer les utilisateurs
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";

const USERS_COLLECTION = "users";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
}

/**
 * Créer ou mettre à jour le profil d'un utilisateur
 */
export const createOrUpdateUserProfile = async (
  userId: string,
  userData: {
    email: string;
    displayName: string;
    photoURL?: string;
  }
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(
      userRef,
      {
        ...userData,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error creating/updating user profile:", error);
    throw error;
  }
};

/**
 * Rechercher des utilisateurs par nom ou email
 */
export const searchUsers = async (
  searchTerm: string,
  limitCount: number = 3
): Promise<UserProfile[]> => {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const usersRef = collection(db, USERS_COLLECTION);
    
    // Récupérer tous les utilisateurs (limité à 50 pour performance)
    // En production, on pourrait utiliser Algolia ou un index de recherche
    const allUsersQuery = query(usersRef, limit(50));
    const querySnapshot = await getDocs(allUsersQuery);

    // Filtrer côté client pour une recherche insensible à la casse
    const allUsers: UserProfile[] = [];
    
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      allUsers.push({
        id: doc.id,
        email: data.email || "",
        displayName: data.displayName || "",
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    // Filtrer par terme de recherche (insensible à la casse)
    const filtered = allUsers
      .filter(
        (user) =>
          user.displayName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      )
      .slice(0, limitCount);

    return filtered;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

/**
 * Obtenir un utilisateur par ID
 */
export const getUserById = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        id: userSnap.id,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
};

