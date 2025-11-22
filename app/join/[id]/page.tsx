"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getTournamentById, updateTournament } from "@/lib/tournaments";
import { getMatchesByTournament } from "@/lib/matches";
import { Tournament, Player, Match } from "@/lib/types";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createOrUpdateUserProfile, getUserById } from "@/lib/users";
import { Loader2, MapPin, Clock, Users, FileText, Trophy, Image as ImageIcon, Award } from "lucide-react";

export default function JoinTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"joueurs" | "matchs" | "results" | "media">("joueurs");
  const [userGender, setUserGender] = useState<"M" | "F" | null>(null);

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
          
          // Charger les matchs
          try {
            const matchesData = await getMatchesByTournament(tournamentId);
            setMatches(matchesData);
          } catch (error) {
            console.error("Error loading matches:", error);
          }
          
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

  // Charger le genre de l'utilisateur depuis son profil
  useEffect(() => {
    const loadUserGender = async () => {
      if (!user) return;
      
      try {
        const userProfile = await getUserById(user.uid);
        if (userProfile?.gender) {
          setUserGender(userProfile.gender);
        }
      } catch (error) {
        console.error("Error loading user gender:", error);
      }
    };

    if (user) {
      loadUserGender();
    }
  }, [user]);

  // Vérifier si l'utilisateur est déjà dans le tournoi
  // Vérification stricte : seulement si userId existe ET correspond à l'UID actuel
  const isUserAlreadyInTournament = user && tournament?.players.some(
    (p) => p.userId && p.userId === user.uid
  );

  // Vérifier si l'utilisateur est le propriétaire du tournoi
  const isOwner = user && tournament?.userId === user.uid;


  // Obtenir les places disponibles
  const getAvailablePlaces = () => {
    if (!tournament) return [];
    
    const maxPlayers = tournament.maxPlayers || tournament.players.length;
    const availablePlaces: Array<{ index: number; player: Player | null; gender: "M" | "F" }> = [];
    
    // Créer un tableau de toutes les places
    for (let i = 0; i < maxPlayers; i++) {
      // Trouver le joueur qui occupe cette place par placeIndex
      // Si placeIndex n'est pas défini, utiliser l'index dans le tableau (rétrocompatibilité)
      const existingPlayer = tournament.players.find((p) => {
        if (p.placeIndex !== undefined) {
          return p.placeIndex === i;
        }
        // Rétrocompatibilité : si pas de placeIndex, utiliser l'index dans le tableau
        // mais seulement si c'est cohérent (pas de placeIndex défini ailleurs)
        const hasPlaceIndexDefined = tournament.players.some((p2) => p2.placeIndex !== undefined);
        if (!hasPlaceIndexDefined) {
          return tournament.players.indexOf(p) === i;
        }
        return false;
      }) || null;
      
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

      // Vérifier si l'utilisateur est déjà dans le tournoi (double vérification)
      // Vérification stricte : seulement si userId existe ET correspond à l'UID actuel
      if (currentTournament.players.some((p) => p.userId && p.userId === user.uid)) {
        setError("Vous êtes déjà inscrit à ce tournoi. Vous ne pouvez pas prendre une autre place.");
        setIsJoining(false);
        return;
      }

      // Déterminer le genre de la place (alternance par défaut)
      const placeGender: "M" | "F" = placeIndex % 2 === 0 ? "M" : "F";

      // Vérifier que le genre de la place correspond au genre de l'utilisateur
      if (userGender && placeGender !== userGender) {
        setError(`Cette place est réservée aux ${placeGender === "M" ? "hommes" : "femmes"}. Vous ne pouvez pas prendre cette place.`);
        setIsJoining(false);
        return;
      }

      // Vérifier si la place est déjà prise par un autre joueur
      const placeAlreadyTaken = currentTournament.players.some(
        (p) => p.placeIndex === placeIndex || (p.placeIndex === undefined && currentTournament.players.indexOf(p) === placeIndex)
      );
      
      if (placeAlreadyTaken) {
        setError("Cette place a été prise par quelqu'un d'autre");
        setIsJoining(false);
        return;
      }

      // Nettoyer les joueurs existants et s'assurer qu'ils ont un placeIndex
      const updatedPlayers: Player[] = currentTournament.players.map((p, index) => {
        const cleanPlayer: Player = {
          id: p.id,
          name: p.name,
          gender: p.gender,
          placeIndex: p.placeIndex !== undefined ? p.placeIndex : index, // Utiliser placeIndex existant ou index actuel
        };
        if (p.userId) cleanPlayer.userId = p.userId;
        if (p.photoURL) cleanPlayer.photoURL = p.photoURL;
        return cleanPlayer;
      });
      
      // Créer le nouveau joueur avec son placeIndex
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: user.displayName || "User",
        gender: placeGender,
        userId: user.uid,
        placeIndex: placeIndex, // Stocker l'index de la place
      };
      
      // Ajouter photoURL seulement si elle existe
      if (user.photoURL) {
        newPlayer.photoURL = user.photoURL;
      }
      
      // Ajouter le nouveau joueur au tableau (sans remplir les places intermédiaires)
      updatedPlayers.push(newPlayer);

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
            Retour à l&apos;accueil
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
            {isOwner && (
              <button
                onClick={() => router.push(`/tournoi/${tournamentId}`)}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Voir le tournoi →
              </button>
            )}
          </div>
        )}

        {/* Places disponibles - seulement si pas déjà inscrit */}
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
              {availablePlaces.map((place) => {
                const isOccupied = place.player !== null;
                const isSelected = selectedPlace === place.index;
                // Vérification stricte : seulement si userId existe ET correspond à l'UID actuel
                const isUserPlace = place.player?.userId && place.player.userId === user?.uid;
                
                // Vérifier si la place correspond au genre de l'utilisateur
                const isGenderMatch = !userGender || place.gender === userGender;
                const canSelect = !isOccupied && isGenderMatch;

                return (
                  <div
                    key={place.index}
                    className={`flex items-center gap-3 rounded-xl p-4 shadow-sm transition-all ${
                      isOccupied
                        ? "bg-muted/50 cursor-not-allowed opacity-60"
                        : isGenderMatch
                        ? "bg-card cursor-pointer hover:shadow-md hover:bg-card/80 active:scale-[0.98]"
                        : "bg-muted/30 cursor-not-allowed opacity-50"
                    } ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => canSelect && setSelectedPlace(place.index)}
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
                        <div className="flex flex-col">
                          <span className={`text-sm ${isGenderMatch ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            Place disponible ({place.gender === "M" ? "Homme" : "Femme"})
                          </span>
                          {!isGenderMatch && userGender && (
                            <span className="text-xs text-muted-foreground mt-0.5">
                              Réservée aux {place.gender === "M" ? "hommes" : "femmes"}
                            </span>
                          )}
                        </div>
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

        {/* Tabs - seulement si l'utilisateur est inscrit */}
        {isUserAlreadyInTournament && (
          <div className="mb-8">
            {/* Navigation des tabs */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {[
                { id: "joueurs" as const, label: "Joueurs", icon: Users },
                { id: "matchs" as const, label: "Matchs", icon: Trophy },
                { id: "results" as const, label: "Results", icon: Award },
                { id: "media" as const, label: "Media", icon: ImageIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Contenu des tabs */}
            <div className="min-h-[200px]">
              {/* Tab Joueurs */}
              {activeTab === "joueurs" && (
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    Joueurs inscrits ({tournament.players.length}/{totalPlaces})
                  </h2>
                  <div className="space-y-2">
                    {tournament.players.map((player, index) => {
                      // Vérification stricte : seulement si userId existe ET correspond à l'UID actuel
                      const isCurrentUser = user && 
                        player.userId && 
                        player.userId === user.uid;
                      // Créer une clé unique en combinant l'index et l'ID du joueur
                      const uniqueKey = player.userId 
                        ? `player-${player.userId}-${index}` 
                        : `player-${player.id || `temp-${index}`}-${index}`;
                      return (
                        <div
                          key={uniqueKey}
                          className={`flex items-center gap-3 rounded-xl p-3 ${
                            isCurrentUser
                              ? "bg-primary/10 border border-primary/20"
                              : "bg-card"
                          }`}
                        >
                          {player.photoURL ? (
                            <Image
                              src={player.photoURL}
                              alt={player.name}
                              width={32}
                              height={32}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {player.name}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-primary">(Vous)</span>
                              )}
                            </p>
                          </div>
                          <div
                            className={`h-6 w-6 rounded-full ${
                              player.gender === "M" ? "bg-primary" : "bg-[#e05d38]"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab Matchs */}
              {activeTab === "matchs" && (
                <div>
                  {matches.length === 0 ? (
                    <div className="rounded-xl bg-muted/50 border border-border p-6 text-center">
                      <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Le tirage des matchs n&apos;est pas encore réalisé.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Revenez plus tard pour voir les matchs.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.from(
                        { length: Math.max(...matches.map((m) => m.round)) },
                        (_, i) => i + 1
                      ).map((round) => {
                        const roundMatches = matches.filter((m) => m.round === round);
                        if (roundMatches.length === 0) return null;

                        return (
                          <div key={round} className="rounded-xl bg-card p-4 shadow-sm">
                            <h4 className="mb-4 text-base font-semibold text-foreground">
                              Round {round}
                            </h4>
                            <div className="space-y-3">
                              {roundMatches.map((match) => {
                                const getPlayerName = (playerId: string): string => {
                                  return (
                                    tournament?.players.find((p) => p.id === playerId)
                                      ?.name || "Inconnu"
                                  );
                                };

                                const getCourtName = (courtId: string): string => {
                                  return (
                                    tournament?.courts.find((c) => c.id === courtId)
                                      ?.name || "Court inconnu"
                                  );
                                };

                                const currentScore = match.score || {
                                  team1: 0,
                                  team2: 0,
                                };

                                return (
                                  <div
                                    key={match.id}
                                    className="rounded-lg border border-border bg-background p-4"
                                  >
                                    <div className="mb-4 text-xs font-medium text-muted-foreground">
                                      {getCourtName(match.courtId)}
                                    </div>

                                    {/* Équipe 1 */}
                                    <div className="mb-3 flex items-center justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">
                                          {getPlayerName(match.team1[0])} &{" "}
                                          {getPlayerName(match.team1[1])}
                                        </p>
                                      </div>
                                      <div className="w-14 text-right text-3xl font-bold text-foreground">
                                        {currentScore.team1}
                                      </div>
                                    </div>

                                    <div className="my-2 text-center text-xs text-muted-foreground">
                                      VS
                                    </div>

                                    {/* Équipe 2 */}
                                    <div className="mb-3 flex items-center justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">
                                          {getPlayerName(match.team2[0])} &{" "}
                                          {getPlayerName(match.team2[1])}
                                        </p>
                                      </div>
                                      <div className="w-14 text-right text-3xl font-bold text-foreground">
                                        {currentScore.team2}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Results */}
              {activeTab === "results" && (
                <div className="rounded-xl bg-muted/50 border border-border p-6 text-center">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Les résultats ne sont pas encore disponibles.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Revenez plus tard pour voir les résultats.
                  </p>
                </div>
              )}

              {/* Tab Media */}
              {activeTab === "media" && (
                <div className="rounded-xl bg-muted/50 border border-border p-6 text-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Aucun média n&apos;a été ajouté pour ce tournoi.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Revenez plus tard pour voir les médias.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

