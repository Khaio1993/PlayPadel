"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getTournamentById, updateTournament } from "@/lib/tournaments";
import { Tournament, Player } from "@/lib/types";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createOrUpdateUserProfile } from "@/lib/users";
import { Loader2, MapPin, Clock, Users, FileText, Trophy } from "lucide-react";

export default function JoinTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Écouter les changements en temps réel du tournoi
  useEffect(() => {
    if (!tournamentId) return;

    const tournamentRef = doc(db, "tournaments", tournamentId);
    const unsubscribe = onSnapshot(
      tournamentRef,
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setTournament({
            id: docSnapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Tournament);
          setIsLoading(false);
        } else {
          setError("Tournoi introuvable");
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Error listening to tournament:", error);
        setError("Erreur lors du chargement du tournoi");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tournamentId]);

  // Rediriger vers la page de connexion si non authentifié
  useEffect(() => {
    if (!authLoading && !user) {
      // Sauvegarder l'URL de destination
      sessionStorage.setItem("redirectAfterLogin", `/join/${tournamentId}`);
      router.push("/");
    }
  }, [authLoading, user, tournamentId, router]);

  // Vérifier si l'utilisateur est déjà dans le tournoi
  const isUserAlreadyInTournament = user && tournament?.players.some(
    (p) => p.userId === user.uid
  );

  // Obtenir les places disponibles
  const getAvailablePlaces = () => {
    if (!tournament) return [];
    
    const maxPlayers = tournament.maxPlayers || tournament.players.length;
    const availablePlaces: Array<{ index: number; player: Player | null; gender: "M" | "F" }> = [];
    
    // Créer un tableau de toutes les places
    for (let i = 0; i < maxPlayers; i++) {
      const existingPlayer = tournament.players[i] || null;
      availablePlaces.push({
        index: i,
        player: existingPlayer,
        gender: existingPlayer?.gender || (i % 2 === 0 ? "M" : "F"), // Alternance par défaut
      });
    }
    
    return availablePlaces;
  };

  const handleJoinPlace = async (placeIndex: number) => {
    if (!user || !tournament) return;

    setError(null);
    setIsJoining(true);

    try {
      // Créer/mettre à jour le profil utilisateur
      await createOrUpdateUserProfile(user.uid, {
        email: user.email || "",
        displayName: user.displayName || "User",
        photoURL: user.photoURL || undefined,
      });

      // Vérifier que la place est toujours disponible (en temps réel)
      const currentTournament = await getTournamentById(tournamentId);
      if (!currentTournament) {
        setError("Tournoi introuvable");
        setIsJoining(false);
        return;
      }

      // Vérifier si l'utilisateur est déjà dans le tournoi
      if (currentTournament.players.some((p) => p.userId === user.uid)) {
        setError("Vous êtes déjà inscrit à ce tournoi");
        setIsJoining(false);
        return;
      }

      // Vérifier si la place est toujours disponible
      if (currentTournament.players[placeIndex]) {
        setError("Cette place a été prise par quelqu'un d'autre");
        setIsJoining(false);
        return;
      }

      // Déterminer le genre de la place (alternance par défaut)
      const placeGender: "M" | "F" = placeIndex % 2 === 0 ? "M" : "F";

      // Ajouter le joueur à la place
      const updatedPlayers = [...currentTournament.players];
      updatedPlayers[placeIndex] = {
        id: Date.now().toString(),
        name: user.displayName || "User",
        gender: placeGender,
        userId: user.uid,
        photoURL: user.photoURL || undefined,
      };

      // Mettre à jour le tournoi
      await updateTournament(tournamentId, {
        players: updatedPlayers,
      });

      // Rediriger vers la page du tournoi
      router.push(`/tournoi/${tournamentId}`);
    } catch (err) {
      console.error("Error joining tournament:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setIsJoining(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/home")}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  const availablePlaces = getAvailablePlaces();
  const filledPlaces = tournament.players.length;
  const totalPlaces = tournament.maxPlayers || tournament.players.length;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header avec logo */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-center px-6 py-6">
          <Image
            src="/logoPPLight.svg"
            alt="PlayPadel Logo"
            width={600}
            height={200}
            priority
            className="h-auto w-40 dark:hidden"
          />
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

      {/* Contenu principal */}
      <main className="mx-auto max-w-lg px-6 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{tournament.name}</h1>
        <p className="text-muted-foreground mb-6">Rejoignez ce tournoi</p>

        {/* Informations du tournoi */}
        <div className="mb-8 space-y-4 rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Lieu</p>
              <p className="text-sm text-muted-foreground">
                {tournament.location || "Non spécifié"}
              </p>
            </div>
          </div>

          {tournament.time && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Date et heure</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(tournament.time).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Joueurs</p>
              <p className="text-sm text-muted-foreground">
                {filledPlaces}/{totalPlaces} places occupées
              </p>
            </div>
          </div>

          {tournament.description && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {tournament.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Message si déjà inscrit */}
        {isUserAlreadyInTournament && (
          <div className="mb-6 rounded-xl bg-primary/10 border border-primary/20 p-4">
            <p className="text-sm font-medium text-foreground">
              ✓ Vous êtes déjà inscrit à ce tournoi
            </p>
            <button
              onClick={() => router.push(`/tournoi/${tournamentId}`)}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Voir le tournoi →
            </button>
          </div>
        )}

        {/* Places disponibles */}
        {!isUserAlreadyInTournament && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Places disponibles
            </h2>
            {error && (
              <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}
            <div className="space-y-3">
              {availablePlaces.map((place, index) => {
                const isOccupied = place.player !== null;
                const isSelected = selectedPlace === place.index;
                const isUserPlace = place.player?.userId === user?.uid;

                return (
                  <div
                    key={place.index}
                    className={`flex items-center gap-3 rounded-xl p-4 shadow-sm transition-all ${
                      isOccupied
                        ? "bg-muted/50 cursor-not-allowed"
                        : "bg-card cursor-pointer hover:shadow-md"
                    } ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => !isOccupied && setSelectedPlace(place.index)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {place.index + 1}
                    </div>
                    <div className="flex-1">
                      {isOccupied ? (
                        <div className="flex items-center gap-2">
                          {place.player?.photoURL && (
                            <Image
                              src={place.player.photoURL}
                              alt={place.player.name}
                              width={24}
                              height={24}
                              className="h-6 w-6 rounded-full"
                            />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {place.player?.name}
                          </span>
                          {isUserPlace && (
                            <span className="text-xs text-primary">(Vous)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Place disponible ({place.gender === "M" ? "Homme" : "Femme"})
                        </span>
                      )}
                    </div>
                    <div
                      className={`h-6 w-6 rounded-full ${
                        place.gender === "M" ? "bg-primary" : "bg-[#e05d38]"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {selectedPlace !== null && !availablePlaces[selectedPlace]?.player && (
              <div className="mt-6">
                <button
                  onClick={() => handleJoinPlace(selectedPlace)}
                  disabled={isJoining}
                  className="w-full rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Inscription en cours...
                    </span>
                  ) : (
                    "Rejoindre cette place"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

