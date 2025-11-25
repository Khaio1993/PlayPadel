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

export interface LevelHistoryEntry {
  delta: number;
  oldLevel: number;
  newLevel: number;
  oldReliability: number;
  newReliability: number;
  tournamentId: string;
  tournamentName?: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  // Onboarding fields
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // ISO date string
  phoneNumber?: string;
  gender?: "M" | "F";
  level?: number;
  levelReliability?: number; // 0-100, fiabilité du niveau
  levelHistory?: LevelHistoryEntry[]; // Historique des changements de niveau
  preferredSide?: "left" | "right";
  onboardingCompleted?: boolean;
}

export const getUserFullName = (profile?: Partial<UserProfile> | null): string => {
  if (!profile) return "";
  const first = profile.firstName?.trim();
  const last = profile.lastName?.trim();
  const combined = [first, last].filter(Boolean).join(" ").trim();
  if (combined.length > 0) {
    return combined;
  }
  return profile.displayName?.trim() || "";
};

/**
 * Créer ou mettre à jour le profil d'un utilisateur
 * Ne met à jour photoURL que si le profil n'existe pas encore (premier sign-up)
 */
export const createOrUpdateUserProfile = async (
  userId: string,
  userData: {
    email: string;
    displayName: string;
    photoURL?: string;
  },
  options?: {
    updatePhotoURL?: boolean; // Si true, force la mise à jour du photoURL même si existe
    updateDisplayName?: boolean; // Si true, force la mise à jour du displayName même si existe
  }
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    const existingData = userSnap.exists() ? userSnap.data() : null;

    const dataToUpdate: Record<string, any> = {
      email: userData.email,
      updatedAt: Timestamp.now(),
    };
    
    const shouldUpdateDisplayName =
      !userSnap.exists() ||
      options?.updateDisplayName ||
      !existingData?.displayName;

    if (shouldUpdateDisplayName) {
      dataToUpdate.displayName = userData.displayName;
    }
    
    // Ne mettre à jour photoURL que si :
    // 1. Le profil n'existe pas encore (premier sign-up)
    // 2. Ou si updatePhotoURL est explicitement true
    if (!userSnap.exists() || options?.updatePhotoURL) {
      if (userData.photoURL) {
        dataToUpdate.photoURL = userData.photoURL;
      }
    }
    // Si le profil existe déjà et qu'on a un photoURL uploadé, on ne l'écrase pas
    
    await setDoc(userRef, dataToUpdate, { merge: true });
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
    
    querySnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      allUsers.push({
        id: docSnap.id,
        email: data.email || "",
        displayName: data.displayName || "",
        firstName: data.firstName,
        lastName: data.lastName,
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
        preferredSide: data.preferredSide,
        gender: data.gender,
        onboardingCompleted: data.onboardingCompleted,
      });
    });

    // Filtrer par terme de recherche (insensible à la casse)
    const filtered = allUsers
      .filter(
        (user) => {
          const displayNameLower = (user.displayName || "").toLowerCase();
          const emailLower = (user.email || "").toLowerCase();
          const firstLower = (user.firstName || "").toLowerCase();
          const lastLower = (user.lastName || "").toLowerCase();
          const fullNameLower = `${firstLower} ${lastLower}`.trim();

          return (
            (displayNameLower && displayNameLower.includes(searchLower)) ||
            (fullNameLower && fullNameLower.includes(searchLower)) ||
            emailLower.includes(searchLower)
          );
        }
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
        email: data.email || "",
        displayName: data.displayName || "",
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        phoneNumber: data.phoneNumber,
        gender: data.gender,
        level: data.level,
        levelReliability: data.levelReliability,
        levelHistory: data.levelHistory,
        preferredSide: data.preferredSide,
        onboardingCompleted: data.onboardingCompleted || false,
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
};

/**
 * Mettre à jour le profil utilisateur avec les données d'onboarding
 */
export const updateUserProfile = async (
  userId: string,
  data: Partial<UserProfile>
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    // Nettoyer l'objet en supprimant les valeurs undefined (Firebase ne les accepte pas)
    const cleanedData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    };
    
    // Ne copier que les propriétés qui ne sont pas undefined
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof UserProfile];
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });
    
    await setDoc(userRef, cleanedData, { merge: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * Mettre à jour le niveau d'un utilisateur après un tournoi
 */
export const updateUserLevel = async (
  userId: string,
  newLevel: number,
  newReliability: number,
  historyEntry: LevelHistoryEntry
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.warn(`User ${userId} not found for level update`);
      return;
    }
    
    const currentData = userSnap.data();
    const currentHistory: LevelHistoryEntry[] = currentData.levelHistory || [];
    
    // Ajouter la nouvelle entrée à l'historique (garder les 20 dernières)
    const updatedHistory = [historyEntry, ...currentHistory].slice(0, 20);
    
    await setDoc(userRef, {
      level: newLevel,
      levelReliability: newReliability,
      levelHistory: updatedHistory,
      updatedAt: Timestamp.now(),
    }, { merge: true });
    
    console.log(`Updated level for user ${userId}: ${newLevel} (reliability: ${newReliability}%)`);
  } catch (error) {
    console.error("Error updating user level:", error);
    throw error;
  }
};

/**
 * Récupérer plusieurs utilisateurs par leurs IDs
 */
export const getUsersByIds = async (userIds: string[]): Promise<Map<string, UserProfile>> => {
  const users = new Map<string, UserProfile>();
  
  // Filtrer les IDs vides ou undefined
  const validIds = userIds.filter(id => id && id.trim().length > 0);
  
  // Récupérer chaque utilisateur (Firebase ne supporte pas IN avec plus de 10 éléments)
  const promises = validIds.map(async (userId) => {
    const user = await getUserById(userId);
    if (user) {
      users.set(userId, user);
    }
  });
  
  await Promise.all(promises);
  return users;
};

