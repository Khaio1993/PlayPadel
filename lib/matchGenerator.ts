// Algorithme de génération des matchs pour Americano Mixte
import { Player, Match } from "./types";

/**
 * Génère les matchs pour un tournoi Americano Mixte
 * Logique :
 * 1. Séparation Hommes/Femmes.
 * 2. À chaque round, on décale les femmes pour changer les partenaires (H1 joue avec F1, puis F2, etc.).
 * 3. Pour les oppositions, on utilise la "Méthode du Cercle" (Berger tables) sur les index des paires.
 *    Cela garantit que la Paire 1 ne joue pas toujours contre la Paire 2.
 */
export function generateMatches(players: Player[], courts: { id: string; name: string }[]): Match[] {
  // 1. Validation et Préparation
  const males = players.filter((p) => p.gender === "M");
  const females = players.filter((p) => p.gender === "F");

  if (males.length !== females.length) {
    throw new Error("Le nombre d'hommes et de femmes doit être égal");
  }

  const totalPlayers = players.length;
  if (totalPlayers % 4 !== 0) {
    throw new Error("Le nombre total de joueurs doit être un multiple de 4 (pour faire des paires complètes)");
  }

  const numPairs = males.length; // Ex: 8 joueurs = 4 paires
  const numRounds = numPairs; // On fait autant de rounds que de paires pour que tout le monde joue avec tout le monde
  
  // Gestion des terrains
  const courtIds = courts.length > 0 ? courts.map((c) => c.id) : ["default"];
  const hasSingleOrNoCourt = courtIds.length <= 1;

  const matches: Match[] = [];

  // 2. Génération des Rounds
  for (let round = 1; round <= numRounds; round++) {
    
    // --- Étape A : Formation des Paires (Rotation des partenaires) ---
    // Les hommes restent fixes (H1, H2, H3, H4...)
    // Les femmes tournent à chaque round (F1, F2... puis F2, F3...)
    // Round 1: (H1-F1), (H2-F2), (H3-F3), (H4-F4)
    // Round 2: (H1-F2), (H2-F3), (H3-F4), (H4-F1)
    
    const currentFemales = rotateArray(females, round - 1);
    
    // On construit les paires pour ce round
    // On stocke l'ID des joueurs pour former l'équipe
    const pairs: [string, string][] = males.map((male, index) => {
      return [male.id, currentFemales[index].id];
    });

    // --- Étape B : Formation des Matchs (Rotation des adversaires) ---
    // On a une liste de paires [P0, P1, P2, P3...]
    // On doit les faire jouer l'une contre l'autre en variant les oppositions.
    // On utilise la méthode du ruban/cercle sur les INDICES des paires.
    
    // Indices initiaux : [0, 1, 2, 3]
    // On garde l'index 0 fixe, et on fait tourner les autres [1, 2, 3]
    
    const indices = Array.from({ length: numPairs }, (_, i) => i); // [0, 1, 2, 3...]
    const fixedIndex = indices[0]; // 0
    const movingIndices = indices.slice(1); // [1, 2, 3]
    
    // Rotation des adversaires : on décale de (round - 1) * 2
    // On utilise un pas de 2 (au lieu de 1) pour désynchroniser la rotation des matchs
    // par rapport à la rotation des femmes (qui est de 1).
    // Comme numPairs est pair, numPairs-1 (taille du cercle mobile) est impair.
    // Donc 2 est premier avec la taille du cercle, ce qui garantit qu'on parcourt toutes les combinaisons
    // mais dans un ordre différent qui évite les répétitions consécutives (F1 vs F2 deux fois de suite).
    const rotationStep = 2;
    const rotationOffset = (round - 1) * rotationStep;
    const rotatedMoving = rotateArray(movingIndices, rotationOffset);
    
    // On reconstruit le cercle : [0, ...les autres tournés]
    const roundIndices = [fixedIndex, ...rotatedMoving];
    
    // On apparie les extrémités du tableau :
    // Match 1 : index[0] vs index[last]
    // Match 2 : index[1] vs index[last-1]
    // etc.
    
    const roundMatches: [number, number][] = [];
    const half = numPairs / 2;
    
    for (let i = 0; i < half; i++) {
      const team1Index = roundIndices[i];
      const team2Index = roundIndices[numPairs - 1 - i];
      roundMatches.push([team1Index, team2Index]);
    }

    // --- Étape C : Création des objets Match ---
    roundMatches.forEach(([pairIndex1, pairIndex2], matchIndex) => {
      const match: Match = {
        tournamentId: "", // Sera rempli par le contexte appelant
        round,
        courtId: hasSingleOrNoCourt
          ? courtIds[0]
          : courtIds[matchIndex % courtIds.length], // Distribution équitable sur les courts
        team1: pairs[pairIndex1],
        team2: pairs[pairIndex2],
        status: "pending",
      };
      matches.push(match);
    });
  }

  return matches;
}

/**
 * Utilitaire : Fait tourner un tableau de N positions vers la gauche
 * Ex: [A, B, C], 1 => [B, C, A]
 */
function rotateArray<T>(array: T[], positions: number): T[] {
  const len = array.length;
  if (len === 0) return array;
  const shift = positions % len;
  return [...array.slice(shift), ...array.slice(0, shift)];
}

/**
 * Formate le nom d'une équipe pour l'affichage
 */
export function formatTeamName(
  team: [string, string],
  players: Player[]
): string {
  const player1 = players.find((p) => p.id === team[0]);
  const player2 = players.find((p) => p.id === team[1]);
  if (!player1 || !player2) return "Équipe inconnue";
  return `${player1.name} & ${player2.name}`;
}
