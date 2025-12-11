// Algorithme de génération des matchs pour Americano Mixte
import { Player, Match } from "./types";

/**
 * Génère les matchs pour un tournoi Americano Mixte
 * 
 * Logique pour 8 joueurs (4H/4F) - MATRICE FIXE demandée :
 * R1: (H1-F1 vs H4-F4) & (H2-F2 vs H3-F3)
 * R2: (H4-F1 vs H2-F3) & (H1-F2 vs H3-F4)
 * R3: (H1-F3 vs H2-F4) & (H3-F1 vs H4-F2)
 * R4: (H3-F2 vs H4-F3) & (H2-F1 vs H1-F4)
 * 
 * Logique générique (pour 4, 12, 16... joueurs) :
 * - Séparation Hommes/Femmes
 * - Rotation des partenaires (H_i avec F_(i+round))
 * - Rotation des adversaires (basée sur décalage)
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

  // Gestion des terrains
  const courtIds = courts.length > 0 ? courts.map((c) => c.id) : ["default"];
  const hasSingleOrNoCourt = courtIds.length <= 1;

  const matches: Match[] = [];
  const numPairs = males.length; // Ex: 8 joueurs = 4 paires

  // --- CAS SPÉCIFIQUE : 8 JOUEURS (4H / 4F) ---
  if (totalPlayers === 8) {
    const matrix = [
      // Round 1
      [
        { h: 0, f: 0, vsH: 2, vsF: 2 }, // H1-F1 vs H3-F3
        { h: 1, f: 1, vsH: 3, vsF: 3 }  // H2-F2 vs H4-F4
      ],
      // Round 2
      [
        { h: 0, f: 2, vsH: 3, vsF: 1 }, // H1-F3 vs H4-F2
        { h: 1, f: 3, vsH: 2, vsF: 0 }  // H2-F4 vs H3-F1
      ],
      // Round 3
      [
        { h: 0, f: 1, vsH: 2, vsF: 3 }, // H1-F2 vs H3-F4
        { h: 1, f: 2, vsH: 3, vsF: 0 }  // H2-F3 vs H4-F1
      ],
      // Round 4
      [
        { h: 0, f: 3, vsH: 1, vsF: 0 }, // H1-F4 vs H2-F1
        { h: 2, f: 1, vsH: 3, vsF: 2 }  // H3-F2 vs H4-F3
      ]
    ];

    matrix.forEach((roundMatchesConfig, roundIdx) => {
      const roundNum = roundIdx + 1;
      roundMatchesConfig.forEach((config, matchIdx) => {
        const team1 = [males[config.h].id, females[config.f].id];
        const team2 = [males[config.vsH].id, females[config.vsF].id];

        matches.push({
          tournamentId: "", // Sera rempli par le contexte appelant
          round: roundNum,
          courtId: hasSingleOrNoCourt
            ? courtIds[0]
            : courtIds[matchIdx % courtIds.length],
          team1,
          team2,
          status: "pending",
        });
      });
    });

    return matches;
  }

  // --- CAS GÉNÉRIQUE (Fallback pour 4, 12, 16 joueurs...) ---
  // Logique simple : Partner Rotation + Opponent Shift
  const numRounds = numPairs; 

  for (let round = 1; round <= numRounds; round++) {
    // 1. Formation des équipes (H fixe, F tourne)
    const currentFemales = rotateArray(females, round - 1);
    const pairs: [string, string][] = males.map((male, index) => {
      return [male.id, currentFemales[index].id];
    });

    // 2. Formation des matchs (Pair i vs Pair i + N/2)
    // Cette méthode simple assure que tout le monde joue, mais ne garantit pas
    // une diversité parfaite des adversaires pour les grands nombres (>8).
    const roundMatches: [number, number][] = [];
    const usedPairs = new Set<number>();
    const half = Math.floor(numPairs / 2);

    // On fait jouer Pair i contre Pair i+half
    // Pour 4 paires (si on n'utilisait pas la matrice 8):
    // R1 (F decal 0): P0vP2, P1vP3
    // R2 (F decal 1): P0vP2, P1vP3 (mais P0 est H0-F1, P2 est H2-F3) -> Opposants changent
    
    // Pour 6 paires (12 joueurs):
    // P0vP3, P1vP4, P2vP5
    
    for (let i = 0; i < numPairs; i++) {
      if (usedPairs.has(i)) continue;
      
      const opponentIndex = (i + half) % numPairs;
      if (usedPairs.has(opponentIndex)) continue; // Ne devrait pas arriver si pair

      roundMatches.push([i, opponentIndex]);
      usedPairs.add(i);
      usedPairs.add(opponentIndex);
    }

    // Création des objets Match
    roundMatches.forEach(([pairIndex1, pairIndex2], matchIndex) => {
        matches.push({
          tournamentId: "",
          round,
          courtId: hasSingleOrNoCourt
            ? courtIds[0]
            : courtIds[matchIndex % courtIds.length],
          team1: pairs[pairIndex1],
          team2: pairs[pairIndex2],
          status: "pending",
        });
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
