// Algorithme de génération des matchs pour Americano Mixte
import { Player, Match } from "./types";

interface MatchPair {
  team1: [string, string]; // [playerId1, playerId2]
  team2: [string, string]; // [playerId3, playerId4]
}

/**
 * Génère les matchs pour un tournoi Americano Mixte
 * Règles :
 * - Chaque homme joue avec une femme
 * - Les paires mixtes doivent être différentes à chaque match
 * - Chaque round a exactement 2 matchs (un par court)
 * - Tous les joueurs jouent en même temps dans chaque round
 */
export function generateMatches(players: Player[], courts: { id: string; name: string }[]): Match[] {
  const males = players.filter((p) => p.gender === "M");
  const females = players.filter((p) => p.gender === "F");

  if (males.length !== females.length) {
    throw new Error("Le nombre d'hommes et de femmes doit être égal");
  }

  const numPairs = males.length; // nombre de paires homme/femme possibles
  const totalPlayers = players.length;

  // Chaque match = 4 joueurs (2 paires), donc matchesPerRound = joueurs / 4 = paires / 2
  if (totalPlayers % 4 !== 0) {
    throw new Error("Le nombre total de joueurs doit être un multiple de 4");
  }

  const matchesPerRound = numPairs / 2; // Nombre de matchs par round = joueurs/4
  const numRounds = numPairs; // On garde la rotation complète sur le nombre de paires

  // Gestion des terrains :
  // - Aucun terrain ou un seul terrain : tous les matchs utilisent ce même courtId
  // - Plusieurs terrains : les matchs sont répartis sur les courts (1 match par court tant que possible)
  const courtIds = courts.length > 0 ? courts.map((c) => c.id) : ["default"];
  const hasSingleOrNoCourt = courtIds.length <= 1;

  const matches: Match[] = [];

  // Générer toutes les combinaisons possibles de paires (pour varier les adversaires)
  const allPairCombinations: [number, number][] = [];
  for (let i = 0; i < numPairs; i++) {
    for (let j = i + 1; j < numPairs; j++) {
      allPairCombinations.push([i, j]);
    }
  }

  // Générer les rounds
  for (let round = 1; round <= numRounds; round++) {
    // Créer une rotation des femmes pour ce round (les hommes restent fixes)
    const rotatedFemales = rotateArray(females, round - 1);

    // Créer les paires mixtes pour ce round
    const pairs: [string, string][] = [];
    for (let i = 0; i < males.length; i++) {
      pairs.push([males[i].id, rotatedFemales[i].id]);
    }

    // Sélectionner les matchs pour ce round
    // On veut exactement `matchesPerRound` matchs
    const selectedMatches: [number, number][] = [];
    const usedPairs = new Set<number>();

    // Stratégie simple : diviser les paires en groupes de 2 pour créer les matchs
    // On utilise une rotation pour varier les matchs entre les rounds
    const rotationOffset = (round - 1) % numPairs;
    
    // Créer les matchs en groupant les paires
    // Exemple 4 paires, 2 courts: (0,1) et (2,3)
    // Exemple 6 paires, 3 courts: (0,1), (2,3), (4,5)
    for (let i = 0; i < matchesPerRound && selectedMatches.length < matchesPerRound; i++) {
      // Calculer les indices des paires pour ce match avec rotation
      const pair1Index = (rotationOffset + i * 2) % numPairs;
      const pair2Index = (rotationOffset + i * 2 + 1) % numPairs;
      
      // Vérifier qu'on n'utilise pas la même paire deux fois
      if (pair1Index !== pair2Index && !usedPairs.has(pair1Index) && !usedPairs.has(pair2Index)) {
        selectedMatches.push([pair1Index, pair2Index]);
        usedPairs.add(pair1Index);
        usedPairs.add(pair2Index);
      }
    }

    // Si on n'a toujours pas assez de matchs (cas où il y a des chevauchements),
    // compléter avec d'autres combinaisons disponibles
    if (selectedMatches.length < matchesPerRound) {
      // Trouver des combinaisons qui n'ont pas encore été utilisées dans ce round
      for (const [pair1, pair2] of allPairCombinations) {
        if (selectedMatches.length >= matchesPerRound) break;

        // Vérifier si cette combinaison n'est pas déjà dans selectedMatches
        const alreadyExists = selectedMatches.some(
          ([p1, p2]) =>
            (p1 === pair1 && p2 === pair2) || (p1 === pair2 && p2 === pair1)
        );

        if (!alreadyExists) {
          selectedMatches.push([pair1, pair2]);
        }
      }
    }

    // Créer les matchs pour ce round
    selectedMatches.slice(0, matchesPerRound).forEach(([pairIndex1, pairIndex2], matchIndex) => {
      // Vérifier que les indices sont valides
      if (pairIndex1 < pairs.length && pairIndex2 < pairs.length) {
        const match: Match = {
          tournamentId: "",
          round,
          courtId: hasSingleOrNoCourt
            ? courtIds[0]
            : courtIds[matchIndex % courtIds.length],
          team1: pairs[pairIndex1] as [string, string],
          team2: pairs[pairIndex2] as [string, string],
          status: "pending",
        };
        matches.push(match);
      }
    });
  }

  return matches;
}

/**
 * Fait tourner un tableau
 */
function rotateArray<T>(array: T[], positions: number): T[] {
  const rotated = [...array];
  for (let i = 0; i < positions; i++) {
    rotated.push(rotated.shift()!);
  }
  return rotated;
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

