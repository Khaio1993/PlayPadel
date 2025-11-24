// Types pour l'application PlayPadel

export type Gender = "M" | "F";

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  userId?: string; // ID de l'utilisateur Firebase si sélectionné depuis un profil
  photoURL?: string; // Photo de profil si disponible
  placeIndex?: number; // Index de la place dans le tournoi (0-based)
}

export interface Court {
  id: string;
  name: string;
}

export interface TournamentMedia {
  id: string;
  url: string;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: string; // ISO string
  likes?: string[]; // liste des userId ayant liké
}

export interface Tournament {
  id?: string;
  name: string;
  location: string;
  time: string;
  description: string;
  players: Player[];
  courts: Court[];
  type: "americano-mixte" | "americano" | "mexicano" | "tournoi-complet";
  createdAt: Date;
  status: "draft" | "active" | "completed";
  userId: string; // ID de l'utilisateur qui a créé le tournoi
  maxPlayers?: number; // Nombre maximum de joueurs prévus pour le tournoi
  isPublic?: boolean; // Si le tournoi est public ou privé
  scoresValidated?: boolean; // Indique si les scores sont verrouillés
  media?: TournamentMedia[]; // Galerie d'images du tournoi
}

export interface Match {
  id?: string;
  tournamentId: string;
  round: number;
  courtId: string;
  team1: [string, string]; // Player IDs
  team2: [string, string]; // Player IDs
  score?: {
    team1: number;
    team2: number;
  };
  status: "pending" | "playing" | "completed";
}

export type PreferredSide = "left" | "right";


