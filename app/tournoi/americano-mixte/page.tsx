"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, MapPin, Clock, FileText, Loader2 } from "lucide-react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../contexts/AuthContext";
import { PlayerSelector } from "../../components/PlayerSelector";
import { createTournament } from "@/lib/tournaments";
import { createOrUpdateUserProfile } from "@/lib/users";

type Player = {
  id: string;
  name: string;
  gender: "M" | "F";
  userId?: string;
  photoURL?: string;
};

type Court = {
  id: string;
  name: string;
};

export default function AmericanoMixtePage() {
  const { user } = useAuth();
  const [tournamentName, setTournamentName] = useState(
    "Saturday Morning Padel Mixed Americano"
  );
  const [location, setLocation] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");

  const [players, setPlayers] = useState<Player[]>([
    { id: "1", name: "", gender: "M" },
    { id: "2", name: "", gender: "F" },
    { id: "3", name: "", gender: "M" },
    { id: "4", name: "", gender: "F" },
  ]);

  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const addPlayer = () => {
    if (players.length < 12) {
      const newGender = players.length % 2 === 0 ? "M" : "F";
      setPlayers([
        ...players,
        { id: Date.now().toString(), name: "", gender: newGender },
      ]);
    }
  };

  const removePlayer = (id: string) => {
    if (players.length > 4) {
      setPlayers(players.filter((p) => p.id !== id));
    }
  };

  const updatePlayer = (
    id: string,
    playerData: {
      name: string;
      userId?: string;
      photoURL?: string;
    }
  ) => {
    setPlayers(
      players.map((p) =>
        p.id === id
          ? { ...p, name: playerData.name, userId: playerData.userId, photoURL: playerData.photoURL }
          : p
      )
    );
  };

  const togglePlayerGender = (id: string) => {
    setPlayers(
      players.map((p) =>
        p.id === id ? { ...p, gender: p.gender === "M" ? "F" : "M" } : p
      )
    );
  };

  const addCourt = () => {
    setCourts([
      ...courts,
      { id: Date.now().toString(), name: `Court ${courts.length + 1}` },
    ]);
  };

  const removeCourt = (id: string) => {
    setCourts(courts.filter((c) => c.id !== id));
  };

  const updateCourtName = (id: string, name: string) => {
    setCourts(courts.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const namedPlayers = players.filter((p) => p.name.trim().length > 0);
  const maleCount = namedPlayers.filter((p) => p.gender === "M").length;
  const femaleCount = namedPlayers.filter((p) => p.gender === "F").length;
  const isBalanced = maleCount === femaleCount;

  // Validation des données
  const validateTournament = (): string | null => {
    if (!tournamentName.trim()) {
      return "Le nom du tournoi est requis";
    }

    if (players.length < 4) {
      return "Minimum 4 places requises";
    }

    // Vérifier que les joueurs avec nom ont des noms uniques
    const playerNames = players
      .map((p) => p.name.trim())
      .filter((name) => name.length > 0);
    const uniqueNames = new Set(playerNames);

    if (playerNames.length !== uniqueNames.size) {
      return "Les noms des joueurs doivent être uniques";
    }

    // Vérifier l'équilibre seulement si on a au moins 4 joueurs avec nom
    if (playerNames.length >= 4) {
      const namedPlayers = players.filter((p) => p.name.trim().length > 0);
      const namedMales = namedPlayers.filter((p) => p.gender === "M").length;
      const namedFemales = namedPlayers.filter((p) => p.gender === "F").length;

      if (namedMales !== namedFemales) {
        return "Le nombre d'hommes et de femmes doit être égal parmi les joueurs inscrits";
      }
    }

    return null;
  };

  // Créer le tournoi
  const handleCreateTournament = async () => {
    setError(null);

    // Validation
    const validationError = validateTournament();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    if (!user) {
      setError("Vous devez être connecté pour créer un tournoi");
      return;
    }

    try {
      // Créer/mettre à jour le profil de l'utilisateur actuel
      await createOrUpdateUserProfile(user.uid, {
        email: user.email || "",
        displayName: user.displayName || "User",
        photoURL: user.photoURL || undefined,
      });
              // Préparer les données du tournoi
              // Assigner placeIndex à chaque joueur basé sur sa position initiale
              const playersWithPlaceIndex = players
                .filter((p) => p.name.trim().length > 0) // Seulement les joueurs avec nom
                .map((p) => ({
                  id: p.id,
                  name: p.name.trim(),
                  gender: p.gender,
                  // Firestore n'accepte pas les valeurs undefined, on normalise en null si absent
                  userId: p.userId ?? null,
                  photoURL: p.photoURL ?? null,
                  // Index dans le tableau original (avant filtrage) pour garder la position
                  placeIndex: players.indexOf(p),
                }));
              
              const tournamentData = {
                name: tournamentName.trim(),
                location: location.trim(),
                time: time || new Date().toISOString(),
                description: description.trim(),
                players: playersWithPlaceIndex,
                courts: courts.length > 0 ? courts : [{ id: "default", name: "Court 1" }],
                type: "americano-mixte" as const,
                status: "draft" as const,
                userId: user.uid,
                maxPlayers: players.length, // Nombre total de places disponibles
              };

      // Créer le tournoi dans Firebase
      const tournamentId = await createTournament(tournamentData);

      // Rediriger vers la page du tournoi (ou home)
      router.push(`/home?created=${tournamentId}`);
    } catch (err) {
      console.error("Error creating tournament:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la création du tournoi"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-8">
      {/* Header avec logo */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-center px-6 py-6">
          {/* Logo Light - visible en mode clair */}
          <Image
            src="/logoPPLight.svg"
            alt="PlayPadel Logo"
            width={600}
            height={200}
            priority
            className="h-auto w-40 dark:hidden"
          />
          {/* Logo Dark - visible en mode sombre */}
          <Image
            src="/logoPPDark.svg"
            alt="PlayPadel Logo"
            width={600}
            height={200}
            priority
            className="hidden h-auto w-40 dark:block"
          />
        </div>
      </header>

      {/* Titre de la page avec bouton retour */}
      <div className="mx-auto max-w-lg px-6 pt-8 pb-4">
        <Link href="/tournoi">
          <button className="mb-4 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Retour</span>
          </button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Mixed Americano</h1>
        <p className="mt-2 text-muted-foreground">
          Configuration de votre tournoi
        </p>
      </div>

      {/* Contenu principal */}
      <main className="mx-auto max-w-lg px-6 py-4">
        {/* Tournament Name */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-foreground">
            Tournament Name
          </label>
          <input
            type="text"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Enter tournament name"
          />
        </div>

        {/* Location */}
        <div className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4" />
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Where will the tournament take place?"
          />
        </div>

        {/* Time */}
        <div className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4" />
            Time
          </label>
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4" />
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Add tournament rules or additional information..."
          />
        </div>

        {/* Players */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-semibold text-foreground">
            Players
          </label>
          <div className="space-y-3">
            {players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {index + 1}.
                </span>
                <div className="flex flex-1 items-center gap-2">
                  {player.photoURL && (
                    <Image
                      src={player.photoURL}
                      alt={player.name}
                      width={24}
                      height={24}
                      className="h-6 w-6 rounded-full"
                    />
                  )}
                  <PlayerSelector
                    value={player.name}
                    onChange={(selectedPlayer) =>
                      updatePlayer(player.id, {
                        name: selectedPlayer.name,
                        userId: selectedPlayer.userId,
                        photoURL: selectedPlayer.photoURL,
                      })
                    }
                    onRemove={() =>
                      updatePlayer(player.id, { name: "", userId: undefined, photoURL: undefined })
                    }
                    gender={player.gender}
                    placeholder={`Player ${index + 1}`}
                    currentPlayerId={player.userId}
                    usedUserIds={players
                      .filter((p) => p.id !== player.id && p.userId)
                      .map((p) => p.userId!)
                    }
                  />
                </div>
                {/* Toggle M/F */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      player.gender === "M"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    M
                  </span>
                  <button
                    onClick={() => togglePlayerGender(player.id)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      player.gender === "M" ? "bg-primary" : "bg-[#e05d38]"
                    }`}
                  >
                    <div
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                        player.gender === "M"
                          ? "left-1"
                          : "left-6 translate-x-0"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-sm font-semibold ${
                      player.gender === "F"
                        ? "text-[#e05d38]"
                        : "text-muted-foreground"
                    }`}
                  >
                    F
                  </span>
                </div>
                {/* Remove button */}
                <button
                  onClick={() => removePlayer(player.id)}
                  disabled={players.length <= 4}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    players.length <= 4
                      ? "cursor-not-allowed bg-muted text-muted-foreground/50"
                      : "bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add More Button */}
          {players.length < 12 && (
            <button
              onClick={addPlayer}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-3 font-medium text-primary transition-all hover:bg-primary/20 active:scale-95"
            >
              <Plus className="h-5 w-5" />
              Add More
            </button>
          )}

          {/* Players Info */}
          <div className="mt-3 rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              {players.length} places disponibles. Minimum 4 players with unique names, equal males and females.
            </p>
            <div className="mt-2 flex gap-4 text-xs">
              <span className="text-primary">
                ♂ Males: {maleCount}
              </span>
              <span className="text-[#e05d38]">
                ♀ Females: {femaleCount}
              </span>
              {players.filter((p) => p.name.trim().length > 0).length >= 4 && !isBalanced && (
                <span className="text-destructive">⚠ Not balanced</span>
              )}
              {players.filter((p) => p.name.trim().length > 0).length >= 4 && isBalanced && (
                <span className="text-green-500">✓ Balanced</span>
              )}
            </div>
            <div className="mt-2 text-xs font-medium text-foreground">
              Inscrits: {players.filter((p) => p.name.trim().length > 0).length}/{players.length}
            </div>
          </div>
        </div>

        {/* Courts */}
        <div className="mb-8">
          <label className="mb-3 block text-sm font-semibold text-foreground">
            Court
          </label>

          {courts.length > 0 && (
            <div className="mb-3 space-y-3">
              {courts.map((court, index) => (
                <div
                  key={court.id}
                  className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={court.name}
                    onChange={(e) => updateCourtName(court.id, e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                    placeholder={`Court ${index + 1}`}
                  />
                  <button
                    onClick={() => removeCourt(court.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Court Button */}
          <button
            onClick={addCourt}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-3 font-medium text-primary transition-all hover:bg-primary/20 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Add
          </button>

          <p className="mt-3 text-xs text-muted-foreground">
            Skip if you have only one court available.
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        {/* Create Tournament Button */}
        <button
          onClick={handleCreateTournament}
          disabled={isLoading}
          className="w-full rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Création en cours...
            </span>
          ) : (
            "Create Tournament"
          )}
        </button>
      </main>
      </div>
    </ProtectedRoute>
  );
}
