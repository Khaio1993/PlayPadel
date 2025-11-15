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
 * Récupérer tous les tournois
 */
export const getTournaments = async (): Promise<Tournament[]> => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, TOURNAMENTS_COLLECTION),
        orderBy("createdAt", "desc")
      )
    );
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Tournament[];
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
    await updateDoc(docRef, data);
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


