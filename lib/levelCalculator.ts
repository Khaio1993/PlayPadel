/**
 * Algorithme de calcul du niveau basé sur le système ELO adapté au padel doubles
 * 
 * Principes:
 * 1. Niveau d'équipe = moyenne des 2 partenaires
 * 2. Résultat attendu = probabilité de victoire (formule ELO)
 * 3. Facteur K = amplitude du changement (diminue avec la fiabilité)
 * 4. Changement = K × (Résultat réel - Résultat attendu)
 */

export interface LevelConfig {
  K_MAX: number;           // Changement maximum par match
  SCALE: number;           // Facteur d'échelle ELO
  RELIABILITY_GAIN: number; // Gain de fiabilité base (%)
  LEVEL_MIN: number;       // Niveau minimum
  LEVEL_MAX: number;       // Niveau maximum
}

export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
  K_MAX: 1.5,
  SCALE: 2,
  RELIABILITY_GAIN: 10,
  LEVEL_MIN: 1,
  LEVEL_MAX: 10,
};

export interface PlayerLevelData {
  userId: string;
  level: number;
  reliability: number;
}

export interface LevelChange {
  userId: string;
  oldLevel: number;
  newLevel: number;
  oldReliability: number;
  newReliability: number;
  delta: number;
  matchId?: string;
  tournamentId?: string;
  timestamp: string;
}

export interface MatchLevelInput {
  team1: PlayerLevelData[];
  team2: PlayerLevelData[];
  winner: "team1" | "team2";
}

/**
 * Calcule le résultat attendu (probabilité de victoire) pour une équipe
 * @param teamLevel - Niveau moyen de l'équipe
 * @param opponentLevel - Niveau moyen de l'équipe adverse
 * @param scale - Facteur d'échelle (défaut: 2)
 * @returns Probabilité de victoire entre 0 et 1
 */
export function calculateExpectedResult(
  teamLevel: number,
  opponentLevel: number,
  scale: number = DEFAULT_LEVEL_CONFIG.SCALE
): number {
  return 1 / (1 + Math.pow(10, (opponentLevel - teamLevel) / scale));
}

/**
 * Calcule le facteur K (amplitude du changement) basé sur la fiabilité
 * @param reliability - Fiabilité actuelle (0-100)
 * @param kMax - Facteur K maximum (défaut: 1.5)
 * @returns Facteur K entre 0 et kMax
 */
export function calculateKFactor(
  reliability: number,
  kMax: number = DEFAULT_LEVEL_CONFIG.K_MAX
): number {
  return kMax * (1 - reliability / 100);
}

/**
 * Calcule un facteur de progression basé sur le niveau actuel
 * Plus le niveau est élevé, plus ce facteur réduit l'impact du delta
 *
 * Stratégie :
 * - En dessous d'un certain seuil (ex: 6), pas de friction → facteur = 1
 * - Entre ce seuil et LEVEL_MAX, le facteur diminue progressivement
 * - Un plancher (ex: 0.1) évite de bloquer totalement la progression
 */
export function calculateProgressFactor(
  level: number,
  levelMin: number = DEFAULT_LEVEL_CONFIG.LEVEL_MIN,
  levelMax: number = DEFAULT_LEVEL_CONFIG.LEVEL_MAX
): number {
  // Seuil à partir duquel on commence à freiner la progression
  const frictionStart = 5;

  if (level <= frictionStart) {
    return 1;
  }

  // Normaliser le niveau entre 0 et 1 sur l'intervalle [frictionStart, levelMax]
  const clampedLevel = Math.min(Math.max(level, frictionStart), levelMax);
  const t = (clampedLevel - frictionStart) / (levelMax - frictionStart); // 0 à 1

  // Courbe de friction : plus t est proche de 1, plus on réduit fortement
  // Ici on descend linéairement de 1 à 0.1 puis on applique un coefficient global
  const minFactor = 0.1;
  const factor = 1 - t * (1 - minFactor);

  // Appliquer une friction globale supplémentaire au-dessus du seuil
  // Exemple : un facteur de 0.5 devient ~0.3
  const globalFrictionCoeff = 0.6;

  return factor * globalFrictionCoeff;
}

/**
 * Calcule le gain de fiabilité après un match
 * @param currentReliability - Fiabilité actuelle (0-100)
 * @param baseGain - Gain de base (défaut: 10)
 * @returns Gain de fiabilité
 */
export function calculateReliabilityGain(
  currentReliability: number,
  baseGain: number = DEFAULT_LEVEL_CONFIG.RELIABILITY_GAIN
): number {
  return baseGain * (1 - currentReliability / 100);
}

/**
 * Calcule le niveau moyen d'une équipe
 */
export function calculateTeamLevel(players: PlayerLevelData[]): number {
  if (players.length === 0) return 0;
  const sum = players.reduce((acc, p) => acc + p.level, 0);
  return sum / players.length;
}

/**
 * Calcule les changements de niveau pour tous les joueurs d'un match
 * @param match - Données du match avec les équipes et le vainqueur
 * @param config - Configuration de l'algorithme
 * @returns Tableau des changements de niveau pour chaque joueur
 */
export function calculateMatchLevelChanges(
  match: MatchLevelInput,
  config: LevelConfig = DEFAULT_LEVEL_CONFIG
): LevelChange[] {
  const changes: LevelChange[] = [];
  const timestamp = new Date().toISOString();

  const team1Level = calculateTeamLevel(match.team1);
  const team2Level = calculateTeamLevel(match.team2);

  // Résultat attendu pour chaque équipe
  const expectedTeam1 = calculateExpectedResult(team1Level, team2Level, config.SCALE);
  const expectedTeam2 = 1 - expectedTeam1;

  // Résultat réel
  const actualTeam1 = match.winner === "team1" ? 1 : 0;
  const actualTeam2 = match.winner === "team2" ? 1 : 0;

  // Calculer les changements pour l'équipe 1
  for (const player of match.team1) {
    const k = calculateKFactor(player.reliability, config.K_MAX);
    const baseDelta = k * (actualTeam1 - expectedTeam1);
    const progressFactor = calculateProgressFactor(
      player.level,
      config.LEVEL_MIN,
      config.LEVEL_MAX
    );
    const delta = baseDelta * progressFactor;
    const newLevel = Math.max(
      config.LEVEL_MIN,
      Math.min(config.LEVEL_MAX, player.level + delta)
    );
    const reliabilityGain = calculateReliabilityGain(player.reliability, config.RELIABILITY_GAIN);
    const newReliability = Math.min(100, player.reliability + reliabilityGain);

    changes.push({
      userId: player.userId,
      oldLevel: player.level,
      newLevel: Math.round(newLevel * 100) / 100, // Arrondir à 2 décimales
      oldReliability: player.reliability,
      newReliability: Math.round(newReliability * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      timestamp,
    });
  }

  // Calculer les changements pour l'équipe 2
  for (const player of match.team2) {
    const k = calculateKFactor(player.reliability, config.K_MAX);
    const baseDelta = k * (actualTeam2 - expectedTeam2);
    const progressFactor = calculateProgressFactor(
      player.level,
      config.LEVEL_MIN,
      config.LEVEL_MAX
    );
    const delta = baseDelta * progressFactor;
    const newLevel = Math.max(
      config.LEVEL_MIN,
      Math.min(config.LEVEL_MAX, player.level + delta)
    );
    const reliabilityGain = calculateReliabilityGain(player.reliability, config.RELIABILITY_GAIN);
    const newReliability = Math.min(100, player.reliability + reliabilityGain);

    changes.push({
      userId: player.userId,
      oldLevel: player.level,
      newLevel: Math.round(newLevel * 100) / 100,
      oldReliability: player.reliability,
      newReliability: Math.round(newReliability * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      timestamp,
    });
  }

  return changes;
}

/**
 * Calcule les changements de niveau pour tous les matchs d'un tournoi
 * @param matches - Tableau des matchs avec scores
 * @param playersLevelData - Map des données de niveau par oderId (player ID in tournament)
 * @param config - Configuration de l'algorithme
 * @returns Map des changements de niveau par oderId (cumulés)
 */
export function calculateTournamentLevelChanges(
  matches: Array<{
    id?: string;
    team1: string[]; // Player IDs (tournament player IDs)
    team2: string[];
    score?: { team1: number; team2: number };
  }>,
  playersLevelData: Map<string, { userId: string; level: number; reliability: number }>,
  tournamentId: string,
  config: LevelConfig = DEFAULT_LEVEL_CONFIG
): Map<string, LevelChange> {
  const cumulativeChanges = new Map<string, LevelChange>();
  const timestamp = new Date().toISOString();

  // Créer une copie mutable des niveaux pour les mises à jour progressives
  // Clé: oderId (player ID in tournament), Valeur: niveau et fiabilité actuels
  const currentLevels = new Map<string, { level: number; reliability: number }>();
  playersLevelData.forEach((data, oderId) => {
    currentLevels.set(oderId, { level: data.level, reliability: data.reliability });
  });

  for (const match of matches) {
    if (!match.score) continue;

    // Déterminer le vainqueur
    const winner: "team1" | "team2" = match.score.team1 > match.score.team2 ? "team1" : "team2";

    // Construire les données des équipes avec les niveaux actuels
    const team1Data: PlayerLevelData[] = [];
    const team2Data: PlayerLevelData[] = [];

    for (const playerId of match.team1) {
      const playerData = playersLevelData.get(playerId);
      const currentData = currentLevels.get(playerId);
      if (playerData && currentData) {
        team1Data.push({
          userId: playerData.userId,
          level: currentData.level,
          reliability: currentData.reliability,
        });
      }
    }

    for (const playerId of match.team2) {
      const playerData = playersLevelData.get(playerId);
      const currentData = currentLevels.get(playerId);
      if (playerData && currentData) {
        team2Data.push({
          userId: playerData.userId,
          level: currentData.level,
          reliability: currentData.reliability,
        });
      }
    }

    // Calculer les changements pour ce match
    const matchChanges = calculateMatchLevelChanges(
      { team1: team1Data, team2: team2Data, winner },
      config
    );

    // Appliquer les changements et les cumuler
    for (const change of matchChanges) {
      // Trouver le playerId correspondant à ce userId
      let playerId: string | undefined;
      playersLevelData.forEach((data, pid) => {
        if (data.userId === change.userId) {
          playerId = pid;
        }
      });

      if (playerId) {
        // Mettre à jour les niveaux courants pour le prochain match
        currentLevels.set(playerId, {
          level: change.newLevel,
          reliability: change.newReliability,
        });
      }

      // Cumuler les changements par oderId
      const existing = cumulativeChanges.get(change.userId);
      if (existing) {
        // Mettre à jour avec le nouveau niveau final
        existing.newLevel = change.newLevel;
        existing.newReliability = change.newReliability;
        existing.delta = Math.round((change.newLevel - existing.oldLevel) * 100) / 100;
      } else {
        // Premier changement pour ce joueur - trouver les données originales
        let originalLevel = change.oldLevel;
        let originalReliability = change.oldReliability;
        playersLevelData.forEach((data) => {
          if (data.userId === change.userId) {
            originalLevel = data.level;
            originalReliability = data.reliability;
          }
        });

        cumulativeChanges.set(change.userId, {
          userId: change.userId,
          oldLevel: originalLevel,
          newLevel: change.newLevel,
          oldReliability: originalReliability,
          newReliability: change.newReliability,
          delta: Math.round((change.newLevel - originalLevel) * 100) / 100,
          tournamentId,
          timestamp,
        });
      }
    }
  }

  return cumulativeChanges;
}

/**
 * Formate le delta de niveau pour l'affichage
 * @param delta - Changement de niveau
 * @returns Chaîne formatée (ex: "+0.45" ou "-1.32")
 */
export function formatLevelDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}`;
}

/**
 * Obtient la catégorie de fiabilité
 * @param reliability - Fiabilité (0-100)
 * @returns Catégorie textuelle
 */
export function getReliabilityCategory(reliability: number): {
  label: string;
  color: string;
} {
  if (reliability < 20) {
    return { label: "Faible", color: "text-muted-foreground" };
  } else if (reliability < 50) {
    return { label: "Modérée", color: "text-amber-500" };
  } else if (reliability < 80) {
    return { label: "Bonne", color: "text-blue-500" };
  } else {
    return { label: "Excellente", color: "text-green-500" };
  }
}
