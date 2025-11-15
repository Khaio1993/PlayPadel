// Types pour l'application PlayPadel

export type Gender = "M" | "F";

export interface Player {
  id: string;
  name: string;
  gender: Gender;
}

export interface Court {
  id: string;
  name: string;
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


