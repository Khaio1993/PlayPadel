"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getTournamentById, updateTournament } from "@/lib/tournaments";
import { getMatchesByTournament } from "@/lib/matches";
import { Tournament, Player, Match } from "@/lib/types";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createOrUpdateUserProfile, getUserById, getUserFullName, getUsersByIds } from "@/lib/users";
import { Loader2, MapPin, Clock, Users, FileText, Trophy, Image as ImageIcon, Award, Heart, ArrowLeft, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"infos" | "joueurs" | "matchs" | "results" | "media">("infos");
  const [userGender, setUserGender] = useState<"M" | "F" | null>(null);
  const [isLikingMedia, setIsLikingMedia] = useState<string | null>(null);
  const [playerLevelInfo, setPlayerLevelInfo] = useState<
    Record<
      string,
      {
        currentLevel?: number;
        previousLevel?: number;
        delta?: number;
      }
    >
  >({});

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

  // Charger les infos de niveau des joueurs (comme sur la page organisateur)
  useEffect(() => {
    const loadPlayerLevelInfo = async () => {
      if (!tournament || !tournament.players || tournament.players.length === 0) {
        setPlayerLevelInfo({});
        return;
      }

      const userIds = tournament.players.filter((p) => p.userId).map((p) => p.userId!);
      if (userIds.length === 0) {
        setPlayerLevelInfo({});
        return;
      }

      try {
        const userProfiles = await getUsersByIds(userIds);
        const info: Record<string, { currentLevel?: number; previousLevel?: number; delta?: number }> = {};

        tournament.players.forEach((player) => {
          if (!player.userId) return;
          const profile = userProfiles.get(player.userId);
          if (!profile) return;

          const tournamentEntry = profile.levelHistory?.find(
            (entry) => entry.tournamentId === tournamentId
          );

          if (tournamentEntry) {
            info[player.id] = {
              currentLevel: tournamentEntry.newLevel,
              previousLevel: tournamentEntry.oldLevel,
              delta: tournamentEntry.delta,
            };
          } else if (profile.level !== undefined) {
            info[player.id] = {
              currentLevel: profile.level,
            };
          }
        });

        setPlayerLevelInfo(info);
      } catch (err) {
        console.error("Error loading player level info (join page):", err);
      }
    };

    loadPlayerLevelInfo();
  }, [tournament, tournamentId]);

  // Vérifier si l'utilisateur est déjà dans le tournoi
  // Vérification stricte : seulement si userId existe ET correspond à l'UID actuel
  const isUserAlreadyInTournament = user && tournament?.players.some(
    (p) => p.userId && p.userId === user.uid
  );

  // Vérifier si l'utilisateur est le propriétaire du tournoi
  const isOwner = user && tournament?.userId === user.uid;

const playersById = useMemo(() => {
  const map = new Map<string, Player>();
  tournament?.players.forEach((player) => {
    map.set(player.id, player);
  });
  return map;
}, [tournament?.players]);

const leaderboard = useMemo(() => {
  if (!tournament?.scoresValidated || matches.length === 0) {
    return [];
  }

  const stats = new Map<
    string,
    {
      player: Player;
      points: number;
      matchesPlayed: number;
      wins: number;
      draws: number;
      losses: number;
    }
  >();

  const ensureEntry = (playerId: string) => {
    const player = playersById.get(playerId);
    if (!player) return null;
    const entry =
      stats.get(playerId) || {
        player,
        points: 0,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      };
    stats.set(playerId, entry);
    return entry;
  };

  matches.forEach((match) => {
    if (!match.score) return;
    const { team1, team2, score } = match;

    const team1Score = score.team1 || 0;
    const team2Score = score.team2 || 0;

    let team1Result: "win" | "draw" | "loss";
    let team2Result: "win" | "draw" | "loss";

    if (team1Score === team2Score) {
      team1Result = "draw";
      team2Result = "draw";
    } else if (team1Score > team2Score) {
      team1Result = "win";
      team2Result = "loss";
    } else {
      team1Result = "loss";
      team2Result = "win";
    }

    const updatePlayer = (playerId: string, pts: number, result: "win" | "draw" | "loss") => {
      const entry = ensureEntry(playerId);
      if (!entry) return;
      entry.points += pts;
      entry.matchesPlayed += 1;
      if (result === "win") entry.wins += 1;
      if (result === "draw") entry.draws += 1;
      if (result === "loss") entry.losses += 1;
    };

    team1.forEach((playerId) => updatePlayer(playerId, team1Score, team1Result));
    team2.forEach((playerId) => updatePlayer(playerId, team2Score, team2Result));
  });

  tournament.players.forEach((player) => {
    if (!stats.has(player.id)) {
      stats.set(player.id, {
        player,
        points: 0,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      });
    }
  });

  return Array.from(stats.values()).sort((a, b) => {
    if (b.points === a.points) {
      return a.player.name.localeCompare(b.player.name);
    }
    return b.points - a.points;
  });
}, [matches, playersById, tournament?.players, tournament?.scoresValidated]);

const mediaItems = useMemo(() => {
  if (!tournament?.media) return [];
  return [...tournament.media].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}, [tournament?.media]);

const hasValidatedScores = Boolean(tournament?.scoresValidated && matches.length > 0);


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

      const latestUserProfile = await getUserById(user.uid);

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
      const playerName =
        getUserFullName(latestUserProfile) ||
        user.displayName ||
        user.email ||
        "User";

      const newPlayer: Player = {
        id: Date.now().toString(),
        name: playerName,
        gender: placeGender,
        userId: user.uid,
        placeIndex: placeIndex, // Stocker l'index de la place
      };
      
      // Ajouter photoURL seulement si elle existe
      const playerPhoto = latestUserProfile?.photoURL || user.photoURL;
      if (playerPhoto) {
        newPlayer.photoURL = playerPhoto;
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

  const handleToggleMediaLike = async (mediaId: string) => {
    if (!user || !tournament?.media) return;
    setIsLikingMedia(mediaId);
    try {
      const updatedMedia = tournament.media.map((media) => {
        if (media.id !== mediaId) return media;
        const likes = media.likes || [];
        const hasLiked = likes.includes(user.uid);
        const newLikes = hasLiked ? likes.filter((id) => id !== user.uid) : [...likes, user.uid];
        return {
          ...media,
          likes: newLikes,
        };
      });

      await updateTournament(tournamentId, { media: updatedMedia });
      setTournament({ ...tournament, media: updatedMedia });
    } catch (error) {
      console.error("Error toggling like:", error);
      setError("Impossible de mettre à jour le like");
    } finally {
      setIsLikingMedia(null);
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
        <Link href="/home">
          <button className="mb-4 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Retour</span>
          </button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">{tournament.name}</h1>
        <p className="text-muted-foreground mb-6">Rejoignez ce tournoi</p>

        {/* Cas où l'utilisateur n'est pas encore inscrit : layout actuel (infos + places) */}
        {!isUserAlreadyInTournament && (
          <>
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
          </>
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
                { id: "infos" as const, label: "Infos", icon: FileText },
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
              {/* Tab Infos */}
              {activeTab === "infos" && (
                <div>
                  {/* Informations du tournoi */}
                  <div className="mb-6 space-y-4 rounded-2xl bg-card p-6 shadow-sm">
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
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
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
                </div>
              )}

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
                          <div
                            key={round}
                            className="rounded-3xl bg-card/80 p-4 shadow-sm border border-border/60"
                          >
                            <div className="mb-4 flex items-center justify-between">
                              <h4 className="text-base font-semibold text-foreground">
                                Round {round}
                              </h4>
                              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {roundMatches.length} match{roundMatches.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {roundMatches.map((match) => {
                                const getPlayer = (playerId: string): Player | null => {
                                  return (
                                    tournament?.players.find((p) => p.id === playerId) || null
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

                                const team1Players = match.team1
                                  .map((id) => getPlayer(id))
                                  .filter((p): p is Player => !!p);
                                const team2Players = match.team2
                                  .map((id) => getPlayer(id))
                                  .filter((p): p is Player => !!p);

                                const renderTeam = (players: Player[], alignRight?: boolean) => {
                                  return (
                                    <div className="flex items-center justify-between gap-3">
                                      {!alignRight && (
                                        <div className="flex items-center gap-2">
                                          {players.map((p) =>
                                            p.photoURL ? (
                                              <Image
                                                key={p.id}
                                                src={p.photoURL}
                                                alt={p.name}
                                                width={28}
                                                height={28}
                                                className="h-7 w-7 rounded-full object-cover ring-2 ring-background -ml-1 first:ml-0"
                                              />
                                            ) : (
                                              <div
                                                key={p.id}
                                                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted ring-2 ring-background -ml-1 first:ml-0"
                                              >
                                                <Users className="h-3 w-3 text-muted-foreground" />
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <p
                                          className={`text-sm font-medium text-foreground ${
                                            alignRight ? "text-right" : ""
                                          }`}
                                        >
                                          {players.map((p) => p.name).join(" & ")}
                                        </p>
                                      </div>
                                      {alignRight && (
                                        <div className="flex items-center gap-2">
                                          {players.map((p) =>
                                            p.photoURL ? (
                                              <Image
                                                key={p.id}
                                                src={p.photoURL}
                                                alt={p.name}
                                                width={28}
                                                height={28}
                                                className="h-7 w-7 rounded-full object-cover ring-2 ring-background -ml-1 first:ml-0"
                                              />
                                            ) : (
                                              <div
                                                key={p.id}
                                                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted ring-2 ring-background -ml-1 first:ml-0"
                                              >
                                                <Users className="h-3 w-3 text-muted-foreground" />
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                };

                                return (
                                  <div
                                    key={match.id}
                                    className="rounded-2xl border border-border bg-background p-4 shadow-xs"
                                  >
                                    <div className="mb-3 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                      <span className="uppercase tracking-wide">
                                        {getCourtName(match.courtId)}
                                      </span>
                                      <span>
                                        Match #{match.round}-{match.order || 1}
                                      </span>
                                    </div>

                                    {/* Équipe 1 */}
                                    {renderTeam(team1Players)}

                                    {/* Score central */}
                                    <div className="my-3 flex items-baseline justify-center gap-3 text-foreground">
                                      <span className="text-3xl font-bold">
                                        {currentScore.team1 || 0}
                                      </span>
                                      <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                                        VS
                                      </span>
                                      <span className="text-3xl font-bold">
                                        {currentScore.team2 || 0}
                                      </span>
                                    </div>

                                    {/* Équipe 2 */}
                                    {renderTeam(team2Players, true)}
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
                <div>
                  {!hasValidatedScores ? (
                    <div className="rounded-xl bg-muted/50 border border-border p-6 text-center">
                      <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Les résultats ne sont pas encore disponibles.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Revenez plus tard pour voir les résultats.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leaderboard.map((entry, index) => {
                        const levelInfo = playerLevelInfo[entry.player.id];

                        // Styles de rang (or, argent, bronze)
                        const getRankStyles = () => {
                          if (index === 0) {
                            return {
                              badgeClass:
                                "bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 text-[#4b3b12]",
                              textClass: "text-amber-600",
                            };
                          }
                          if (index === 1) {
                            return {
                              badgeClass:
                                "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-800",
                              textClass: "text-slate-600",
                            };
                          }
                          if (index === 2) {
                            return {
                              badgeClass:
                                "bg-gradient-to-br from-amber-700 via-amber-600 to-amber-500 text-amber-50",
                              textClass: "text-amber-700",
                            };
                          }
                          return {
                            badgeClass: "bg-primary/10 text-primary",
                            textClass: "text-primary",
                          };
                        };

                        const rankStyles = getRankStyles();

                        // Carte spéciale pour le Top 1
                        if (index === 0) {
                          return (
                            <div
                              key={entry.player.id}
                              className="flex items-center gap-4 rounded-3xl bg-card border border-amber-200/70 shadow-md p-5"
                            >
                              <div className="flex h-12 w-12 items-center justify-center rounded-full ring-4 ring-amber-100">
                                <div
                                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${rankStyles.badgeClass}`}
                                >
                                  1
                                </div>
                              </div>
                              {entry.player.photoURL ? (
                                <Image
                                  src={entry.player.photoURL}
                                  alt={entry.player.name}
                                  width={56}
                                  height={56}
                                  className="h-14 w-14 rounded-full object-cover ring-4 ring-amber-100"
                                />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted ring-4 ring-amber-100">
                                  <Users className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground">
                                  {entry.player.name}
                                  {user?.uid === entry.player.userId && (
                                    <span className="ml-2 text-xs text-primary">(Vous)</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.matchesPlayed} match
                                  {entry.matchesPlayed > 1 ? "s" : ""} joués
                                </p>
                                <p className="mt-1 text-xs">
                                  <span className="font-semibold text-emerald-500">
                                    {entry.wins}V
                                  </span>
                                  <span className="mx-1 text-muted-foreground">-</span>
                                  <span className="font-semibold text-amber-500">
                                    {entry.draws}N
                                  </span>
                                  <span className="mx-1 text-muted-foreground">-</span>
                                  <span className="font-semibold text-red-500">
                                    {entry.losses}D
                                  </span>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold text-primary">
                                  {entry.points}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Points cumulés
                                </p>
                                {levelInfo?.previousLevel !== undefined &&
                                  levelInfo?.currentLevel !== undefined && (
                                    <div className="mt-2 text-xs text-muted-foreground flex items-center justify-end gap-2">
                                      <span>{levelInfo.previousLevel.toFixed(2)}</span>
                                      {levelInfo.delta && levelInfo.delta !== 0 ? (
                                        levelInfo.delta > 0 ? (
                                          <TrendingUp className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <TrendingDown className="h-3 w-3 text-red-500" />
                                        )
                                      ) : (
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      )}
                                      <span className="font-semibold text-foreground">
                                        {levelInfo.currentLevel.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            </div>
                          );
                        }

                        // Cartes standard (avec argent / bronze pour 2 et 3)
                        return (
                          <div
                            key={entry.player.id}
                            className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 p-4 shadow-sm"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${rankStyles.badgeClass}`}
                              >
                                {index + 1}
                              </div>
                            </div>
                            {entry.player.photoURL ? (
                              <Image
                                src={entry.player.photoURL}
                                alt={entry.player.name}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-foreground">
                                {entry.player.name}
                                {user?.uid === entry.player.userId && (
                                  <span className="ml-2 text-xs text-primary">(Vous)</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {entry.matchesPlayed} match
                                {entry.matchesPlayed > 1 ? "s" : ""} joués
                              </p>
                              <p className="mt-1 text-xs">
                                <span className="font-semibold text-emerald-500">
                                  {entry.wins}V
                                </span>
                                <span className="mx-1 text-muted-foreground">-</span>
                                <span className="font-semibold text-amber-500">
                                  {entry.draws}N
                                </span>
                                <span className="mx-1 text-muted-foreground">-</span>
                                <span className="font-semibold text-red-500">
                                  {entry.losses}D
                                </span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-primary">{entry.points}</p>
                              <p className="text-xs text-muted-foreground">Points cumulés</p>
                              {levelInfo?.previousLevel !== undefined &&
                                levelInfo?.currentLevel !== undefined && (
                                  <div className="mt-2 text-xs text-muted-foreground flex items-center justify-end gap-2">
                                    <span>{levelInfo.previousLevel.toFixed(2)}</span>
                                    {levelInfo.delta && levelInfo.delta !== 0 ? (
                                      levelInfo.delta > 0 ? (
                                        <TrendingUp className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <TrendingDown className="h-3 w-3 text-red-500" />
                                      )
                                    ) : (
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <span className="font-semibold text-foreground">
                                      {levelInfo.currentLevel.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Media */}
              {activeTab === "media" && (
                <div className="space-y-4">
                  {mediaItems.length === 0 ? (
                    <div className="rounded-xl bg-muted/50 border border-border p-6 text-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Aucun média n&apos;a été ajouté pour ce tournoi.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Revenez plus tard pour voir les médias.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {mediaItems.map((media) => {
                        const likes = media.likes || [];
                        const hasLiked = user ? likes.includes(user.uid) : false;
                        return (
                          <div
                            key={media.id}
                            className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
                            onDoubleClick={() => handleToggleMediaLike(media.id)}
                          >
                            <div className="relative h-48 w-full">
                              <Image
                                src={media.url}
                                alt={media.uploadedByName || "Photo du tournoi"}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, 25vw"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 py-2 text-white">
                                <p className="text-sm font-semibold">
                                  {media.uploadedByName || "Joueur"}
                                </p>
                                <p className="text-[11px] text-white/70">
                                  {new Date(media.createdAt).toLocaleString("fr-FR", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleMediaLike(media.id);
                                }}
                                disabled={isLikingMedia === media.id}
                                className={`absolute top-2 right-2 flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold backdrop-blur ${
                                  hasLiked
                                    ? "bg-red-500/90 text-white"
                                    : "bg-black/60 text-white"
                                } disabled:cursor-not-allowed`}
                              >
                                {isLikingMedia === media.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Heart
                                    className={`h-4 w-4 ${
                                      hasLiked ? "fill-white text-white" : "text-white"
                                    }`}
                                  />
                                )}
                                <span>{likes.length}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    Astuce : double-cliquez sur une photo pour ajouter ou retirer un ❤️.
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

