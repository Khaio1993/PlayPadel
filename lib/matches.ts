// Service pour gérer les matchs dans Firebase
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
  writeBatch,
} from "firebase/firestore";
import { Match } from "./types";

const MATCHES_COLLECTION = "matches";

/**
 * Créer plusieurs matchs en une seule transaction
 */
export const createMatches = async (
  matches: Omit<Match, "id">[]
): Promise<string[]> => {
  try {
    const batch = writeBatch(db);
    const matchIds: string[] = [];

    matches.forEach((match) => {
      const docRef = doc(collection(db, MATCHES_COLLECTION));
      batch.set(docRef, match);
      matchIds.push(docRef.id);
    });

    await batch.commit();
    console.log(`Created ${matches.length} matches`);
    return matchIds;
  } catch (error) {
    console.error("Error creating matches:", error);
    throw error;
  }
};

/**
 * Récupérer tous les matchs d'un tournoi
 */
export const getMatchesByTournament = async (
  tournamentId: string
): Promise<Match[]> => {
  try {
    const q = query(
      collection(db, MATCHES_COLLECTION),
      where("tournamentId", "==", tournamentId),
      orderBy("round", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Match[];
  } catch (error) {
    console.error("Error getting matches:", error);
    throw error;
  }
};

/**
 * Mettre à jour un match (score, statut, etc.)
 */
export const updateMatch = async (
  id: string,
  data: Partial<Match>
): Promise<void> => {
  try {
    const docRef = doc(db, MATCHES_COLLECTION, id);
    await updateDoc(docRef, data);
    console.log("Match updated:", id);
  } catch (error) {
    console.error("Error updating match:", error);
    throw error;
  }
};

/**
 * Récupérer un match par ID
 */
export const getMatchById = async (id: string): Promise<Match | null> => {
  try {
    const docRef = doc(db, MATCHES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Match;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting match:", error);
    throw error;
  }
};

