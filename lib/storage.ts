// Service pour gérer le stockage d'images dans Firebase Storage
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

/**
 * Upload une image de profil utilisateur
 */
export const uploadProfileImage = async (
  userId: string,
  file: File
): Promise<string> => {
  try {
    // Créer une référence vers le fichier
    const imageRef = ref(storage, `profile-images/${userId}/${Date.now()}_${file.name}`);
    
    // Upload le fichier
    const snapshot = await uploadBytes(imageRef, file);
    
    // Obtenir l'URL de téléchargement
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
};

/**
 * Supprimer une image de profil
 */
export const deleteProfileImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extraire le chemin depuis l'URL
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error("Error deleting profile image:", error);
    // Ne pas throw pour éviter de bloquer si l'image n'existe pas
  }
};

/**
 * Upload un média pour un tournoi
 */
export const uploadTournamentMedia = async (
  tournamentId: string,
  file: File
): Promise<string> => {
  try {
    const mediaRef = ref(storage, `tournament-media/${tournamentId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(mediaRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Error uploading tournament media:", error);
    throw error;
  }
};

/**
 * Supprimer un média de tournoi
 */
export const deleteTournamentMediaFile = async (mediaUrl: string): Promise<void> => {
  try {
    const mediaRef = ref(storage, mediaUrl);
    await deleteObject(mediaRef);
  } catch (error) {
    console.error("Error deleting tournament media:", error);
  }
};

