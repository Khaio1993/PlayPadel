// Service pour gérer les tournois dans Firebase
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Tournament } from "./types";

const TOURNAMENTS_COLLECTION = "tournaments";

/**
 * Créer un nouveau tournoi
 */
export const createTournament = async (
  tournamentData: Omit<Tournament, "id" | "createdAt">
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, TOURNAMENTS_COLLECTION), {
      ...tournamentData,
      createdAt: Timestamp.now(),
      status: "draft",
    });
    console.log("Tournament created with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating tournament:", error);
    throw error;
  }
};

/**
 * Récupérer tous les tournois d'un utilisateur (créés + rejoints)
 */
export const getTournaments = async (userId?: string): Promise<Tournament[]> => {
  try {
    if (!userId) {
      // Si pas d'userId, retourner tous les tournois
      const q = query(
        collection(db, TOURNAMENTS_COLLECTION),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Tournament[];
    }

    // Récupérer les tournois où l'utilisateur est propriétaire
    const ownedQuery = query(
      collection(db, TOURNAMENTS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const ownedSnapshot = await getDocs(ownedQuery);
    const ownedTournaments = ownedSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Tournament[];

    // Récupérer tous les tournois et filtrer ceux où l'utilisateur est participant
    // Note: Firestore ne permet pas de requêter directement sur les tableaux,
    // donc on récupère tous les tournois et on filtre côté client
    const allQuery = query(
      collection(db, TOURNAMENTS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const allSnapshot = await getDocs(allQuery);
    const joinedTournaments = (allSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Tournament[])
      .filter((tournament) => {
        // Exclure les tournois déjà dans ownedTournaments
        if (ownedTournaments.some((t) => t.id === tournament.id)) {
          return false;
        }
        // Vérifier si l'utilisateur est un joueur dans ce tournoi
        return tournament.players?.some((player) => player.userId === userId);
      });

    // Combiner et trier par date de création (plus récent en premier)
    const allTournaments = [...ownedTournaments, ...joinedTournaments];
    return allTournaments.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error("Error getting tournaments:", error);
    throw error;
  }
};

/**
 * Récupérer un tournoi par ID
 */
export const getTournamentById = async (
  id: string
): Promise<Tournament | null> => {
  try {
    const docRef = doc(db, TOURNAMENTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      } as Tournament;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting tournament:", error);
    throw error;
  }
};

/**
 * Mettre à jour un tournoi
 */
export const updateTournament = async (
  id: string,
  data: Partial<Tournament>
): Promise<void> => {
  try {
    const docRef = doc(db, TOURNAMENTS_COLLECTION, id);
    
    // Filtrer les valeurs undefined (Firestore ne les accepte pas)
    const cleanData: Record<string, any> = {};
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof Tournament];
      if (value !== undefined) {
        cleanData[key] = value;
      }
    });
    
    await updateDoc(docRef, cleanData);
    console.log("Tournament updated:", id);
  } catch (error) {
    console.error("Error updating tournament:", error);
    throw error;
  }
};

/**
 * Supprimer un tournoi
 */
export const deleteTournament = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, TOURNAMENTS_COLLECTION, id));
    console.log("Tournament deleted:", id);
  } catch (error) {
    console.error("Error deleting tournament:", error);
    throw error;
  }
};

/**
 * Récupérer les tournois actifs
 */
export const getActiveTournaments = async (): Promise<Tournament[]> => {
  try {
    const q = query(
      collection(db, TOURNAMENTS_COLLECTION),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Tournament[];
  } catch (error) {
    console.error("Error getting active tournaments:", error);
    throw error;
  }
};


