"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback, useMemo, ChangeEvent } from "react";
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Share2, 
  Copy, 
  Check,
  Settings,
  Image as ImageIcon,
  X,
  Plus,
  Loader2,
  Globe,
  Lock,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info as InfoIcon,
  Award,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shuffle
} from "lucide-react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { getTournamentById, updateTournament, deleteTournament } from "@/lib/tournaments";
import { getMatchesByTournament, createMatches, updateMatch, deleteMatchesByTournament } from "@/lib/matches";
import { generateMatches } from "@/lib/matchGenerator";
import { Tournament, Match, Player, TournamentMedia } from "@/lib/types";
import { useAuth } from "../../contexts/AuthContext";
import { PlayerSelector } from "../../components/PlayerSelector";
import { uploadTournamentMedia, deleteTournamentMediaFile } from "@/lib/storage";
import { getUsersByIds, updateUserLevel, LevelHistoryEntry } from "@/lib/users";
import { calculateTournamentLevelChanges, LevelChange } from "@/lib/levelCalculator";

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidatingScores, setIsValidatingScores] = useState(false);
  const [isDeletingMatches, setIsDeletingMatches] = useState(false);
  const [isShufflingPlayers, setIsShufflingPlayers] = useState(false);
  const [isLoadingPlayerLevels, setIsLoadingPlayerLevels] = useState(false);
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
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "joueurs" | "matchs" | "results" | "media">("settings");
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [editingLocation, setEditingLocation] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [tempLocation, setTempLocation] = useState("");
  const [tempTime, setTempTime] = useState("");
  const [showDeleteDrawer, setShowDeleteDrawer] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const saveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaDeletingId, setMediaDeletingId] = useState<string | null>(null);

  const loadPlayerLevelInfo = useCallback(
    async (players: Player[]) => {
      if (!players || players.length === 0) {
        setPlayerLevelInfo({});
        return;
      }

      const userIds = players.filter((p) => p.userId).map((p) => p.userId!) ;
      if (userIds.length === 0) {
        setPlayerLevelInfo({});
        return;
      }

      try {
        setIsLoadingPlayerLevels(true);
        const userProfiles = await getUsersByIds(userIds);
        const info: Record<string, { currentLevel?: number; previousLevel?: number; delta?: number }> = {};

        players.forEach((player) => {
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
      } catch (error) {
        console.error("Error loading player level info:", error);
      } finally {
        setIsLoadingPlayerLevels(false);
      }
    },
    [tournamentId]
  );

  useEffect(() => {
    loadTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    if (!isLoading && tournament && user && user.uid !== tournament.userId) {
      setIsRedirecting(true);
      router.replace(`/join/${tournamentId}`);
    }
  }, [isLoading, tournament, user, router, tournamentId]);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" | "warning" = "info", duration = 4000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      dismissToast();
    }, duration);
  }, [dismissToast]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, []);

  const loadTournament = async () => {
    try {
      setIsLoading(true);
      const [tournamentData, matchesData] = await Promise.all([
        getTournamentById(tournamentId),
        getMatchesByTournament(tournamentId),
      ]);

      if (tournamentData) {
        setTournament(tournamentData);
        setMatches(matchesData);
        setTempTitle(tournamentData.name || "");
        setTempLocation(tournamentData.location || "");
        setTempTime(tournamentData.time || "");
        await loadPlayerLevelInfo(tournamentData.players);
      } else {
        router.push("/home");
      }
    } catch (error) {
      console.error("Error loading tournament:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMatches = async () => {
    if (!tournament) return;

    try {
      setIsGenerating(true);
      const generatedMatches = generateMatches(tournament.players, tournament.courts);
      
      // Ajouter l'ID du tournoi à chaque match
      const matchesWithTournamentId = generatedMatches.map((match) => ({
        ...match,
        tournamentId: tournamentId,
      }));

      await createMatches(matchesWithTournamentId);
      
      // Recharger les matchs
      const updatedMatches = await getMatchesByTournament(tournamentId);
      setMatches(updatedMatches);
      
      // Mettre à jour le statut du tournoi
      await updateTournament(tournamentId, { status: "active" });
      setTournament({ ...tournament, status: "active" });
    } catch (error) {
      console.error("Error generating matches:", error);
      showToast("Erreur lors de la génération des matchs", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShufflePlayers = () => {
    if (!tournament) return;
    const maxPlayers = tournament.maxPlayers || tournament.players.length;
    const filledPlayers = tournament.players.filter((p) => p.name.trim().length > 0);
    if (filledPlayers.length !== maxPlayers) {
      showToast("Remplir toutes les places avant de mélanger", "info");
      return;
    }

    setIsShufflingPlayers(true);
    // Mélange aléatoire simple
    const shuffled = [...filledPlayers].sort(() => Math.random() - 0.5);
    const reordered = shuffled.map((player, index) => ({
      ...player,
      placeIndex: index,
    }));

    setTournament({ ...tournament, players: reordered });
    setIsShufflingPlayers(false);
    showToast("Ordre mélangé. Pensez à sauvegarder.", "success");
  };

  const handleDeleteAllMatches = async () => {
    if (!tournament) return;
    try {
      setIsDeletingMatches(true);
      await deleteMatchesByTournament(tournamentId);
      setMatches([]);
      showToast("Tous les matchs ont été supprimés", "success");
    } catch (error) {
      console.error("Error deleting matches:", error);
      showToast("Erreur lors de la suppression des matchs", "error");
    } finally {
      setIsDeletingMatches(false);
    }
  };

  // Sauvegarder automatiquement avec debounce
  const saveScore = useCallback(async (matchId: string, score: { team1: number; team2: number }) => {
    const existingTimeout = saveTimeouts.current.get(matchId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    setMatches((prevMatches) =>
      prevMatches.map((m) =>
        m.id === matchId
          ? { ...m, score, status: score.team1 > 0 || score.team2 > 0 ? "completed" : m.status }
          : m
      )
    );

    const timeout = setTimeout(async () => {
      try {
        await updateMatch(matchId, {
          score,
          status: score.team1 > 0 || score.team2 > 0 ? "completed" : "pending",
        });
        saveTimeouts.current.delete(matchId);
      } catch (error) {
        console.error("Error saving score:", error);
      }
    }, 1000);

    saveTimeouts.current.set(matchId, timeout);
  }, []);

  useEffect(() => {
    const currentSaveTimeouts = saveTimeouts.current;
    return () => {
      currentSaveTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    tournament?.players.forEach((player) => {
      map.set(player.id, player);
    });
    return map;
  }, [tournament]);

  const mediaItems = useMemo(() => {
    if (!tournament?.media) return [];
    return [...tournament.media].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [tournament?.media]);

  const getPlayerName = (playerId: string): string => {
    return playersById.get(playerId)?.name || "Inconnu";
  };

  const getCourtName = (courtId: string): string => {
    return tournament?.courts.find((c) => c.id === courtId)?.name || "Court inconnu";
  };

  const getMatchesByRound = (round: number): Match[] => {
    return matches.filter((m) => m.round === round);
  };

  const leaderboard = useMemo(() => {
    if (!tournament || matches.length === 0) return [];

    const stats = new Map<
      string,
      {
        player: Player;
        points: number;
        matchesPlayed: number;
      }
    >();

    const addScore = (playerId: string, points: number, counted: boolean) => {
      const player = playersById.get(playerId);
      if (!player) return;
      const entry = stats.get(playerId) || { player, points: 0, matchesPlayed: 0 };
      entry.points += points;
      if (counted) {
        entry.matchesPlayed += 1;
      }
      stats.set(playerId, entry);
    };

    matches.forEach((match) => {
      if (!match.score) return;
      const { team1, team2, score } = match;
      team1.forEach((playerId) => addScore(playerId, score.team1 || 0, true));
      team2.forEach((playerId) => addScore(playerId, score.team2 || 0, true));
    });

    tournament.players.forEach((player) => {
      if (!stats.has(player.id)) {
        stats.set(player.id, { player, points: 0, matchesPlayed: 0 });
      }
    });

    return Array.from(stats.values()).sort((a, b) => {
      if (b.points === a.points) {
        return a.player.name.localeCompare(b.player.name);
      }
      return b.points - a.points;
    });
  }, [matches, playersById, tournament]);

  const scoresLocked = Boolean(tournament?.scoresValidated);
  const hasIncompleteScores = useMemo(
    () => matches.some((match) => !match.score),
    [matches]
  );

  const hasMatches = useMemo(() => matches.length > 0, [matches]);
  const isRemovalLocked = scoresLocked; // verrouillage suppression joueurs/places après validation
  const hasAnyEnteredScore = useMemo(
    () =>
      matches.some(
        (match) =>
          match.score &&
          (((match.score.team1 || 0) > 0) || ((match.score.team2 || 0) > 0))
      ),
    [matches]
  );

  const handleOpenMediaPicker = () => {
    mediaInputRef.current?.click();
  };

  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!tournament || !user) return;
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (files.length === 0) return;

    setIsUploadingMedia(true);
    try {
      const uploads: TournamentMedia[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          showToast("Seules les images sont supportées", "warning");
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          showToast("Taille maximale 10MB par image", "warning");
          continue;
        }
        const url = await uploadTournamentMedia(tournamentId, file);
        uploads.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          url,
          uploadedBy: user.uid,
          uploadedByName: user.displayName || user.email || "Organisateur",
          createdAt: new Date().toISOString(),
          likes: [],
        });
      }

      if (uploads.length === 0) {
        return;
      }

      const updatedMedia = [...(tournament.media || []), ...uploads];
      await updateTournament(tournamentId, { media: updatedMedia });
      setTournament({ ...tournament, media: updatedMedia });
      showToast("Photos ajoutées au tournoi !", "success");
    } catch (error) {
      console.error("Error uploading media:", error);
      showToast("Erreur lors de l'upload des médias", "error");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleDeleteMedia = async (media: TournamentMedia) => {
    if (!tournament) return;
    try {
      setMediaDeletingId(media.id);
      await deleteTournamentMediaFile(media.url);
      const updatedMedia = (tournament.media || []).filter((item) => item.id !== media.id);
      await updateTournament(tournamentId, { media: updatedMedia });
      setTournament({ ...tournament, media: updatedMedia });
      showToast("Photo supprimée", "success");
    } catch (error) {
      console.error("Error deleting media:", error);
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setMediaDeletingId(null);
    }
  };

  const rounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;

  const canGenerateMatches = tournament && tournament.players && tournament.players.length >= 4 && 
    tournament.players.filter((p) => p.gender === "M").length === 
    tournament.players.filter((p) => p.gender === "F").length;

  const publicTournamentUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/join/${tournamentId}`
    : "";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tournament?.name || "Tournoi PlayPadel",
          text: `Rejoignez le tournoi: ${tournament?.name}`,
          url: publicTournamentUrl,
        });
      } catch {
        console.log("Share cancelled");
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicTournamentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying link:", error);
    }
  };

  const handleSaveLocation = async () => {
    if (!tournament) return;
    setIsSaving(true);
    try {
      await updateTournament(tournamentId, { location: tempLocation });
      setTournament({ ...tournament, location: tempLocation });
      setEditingLocation(false);
    } catch (error) {
      console.error("Error saving location:", error);
      showToast("Erreur lors de la sauvegarde du lieu", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTime = async () => {
    if (!tournament) return;
    setIsSaving(true);
    try {
      await updateTournament(tournamentId, { time: tempTime });
      setTournament({ ...tournament, time: tempTime });
      setEditingTime(false);
    } catch (error) {
      console.error("Error saving time:", error);
      showToast("Erreur lors de la sauvegarde de la date", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!tournament) return;
    const trimmedTitle = tempTitle.trim();
    if (!trimmedTitle) {
      setTempTitle(tournament.name);
      setEditingTitle(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await updateTournament(tournamentId, { name: trimmedTitle });
      setTournament({ ...tournament, name: trimmedTitle });
      setEditingTitle(false);
    } catch (error) {
      console.error("Error saving title:", error);
      showToast("Erreur lors de la sauvegarde du nom", "error");
      setTempTitle(tournament.name);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!tournament) return;
    setIsSaving(true);
    try {
      const newIsPublic = !tournament.isPublic;
      await updateTournament(tournamentId, { isPublic: newIsPublic });
      setTournament({ ...tournament, isPublic: newIsPublic });
    } catch (error) {
      console.error("Error toggling public:", error);
      showToast("Erreur lors de la mise à jour de la visibilité", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournament) return;
    
    setIsDeleting(true);
    try {
      // Supprimer d'abord tous les matchs associés
      await deleteMatchesByTournament(tournamentId);
      
      // Ensuite supprimer le tournoi
      await deleteTournament(tournamentId);
      
      // Rediriger vers la page d'accueil
      router.push("/home");
    } catch (error) {
      console.error("Error deleting tournament:", error);
      showToast("Erreur lors de la suppression du tournoi", "error");
      setIsDeleting(false);
    }
  };

  const findPlayerAtPlace = (placeIndex: number, sourceTournament: Tournament | null = tournament): Player | null => {
    if (!sourceTournament) return null;
    const hasPlaceIndexDefined = sourceTournament.players.some((p) => p.placeIndex !== undefined);
    return (
      sourceTournament.players.find((p) => {
        if (p.placeIndex !== undefined) {
          return p.placeIndex === placeIndex;
        }
        if (!hasPlaceIndexDefined) {
          return sourceTournament.players.indexOf(p) === placeIndex;
        }
        return false;
      }) || null
    );
  };

  // Obtenir toutes les places (vides et occupées) pour l'affichage
  const getAllPlaces = () => {
    if (!tournament) return [];
    
    const maxPlayers = tournament.maxPlayers || tournament.players.length;
    const allPlaces: Array<{ index: number; player: Player | null; gender: "M" | "F" }> = [];
    
    for (let i = 0; i < maxPlayers; i++) {
      const existingPlayer = findPlayerAtPlace(i);
      
      allPlaces.push({
        index: i,
        player: existingPlayer,
        gender: existingPlayer?.gender || (i % 2 === 0 ? "M" : "F"),
      });
    }
    
    return allPlaces;
  };

  const handleAddPlace = () => {
    if (!tournament) return;
    
    const currentMaxPlayers = tournament.maxPlayers || tournament.players.length;
    if (currentMaxPlayers >= 12) {
      showToast("Maximum 12 places autorisées", "warning");
      return;
    }
    
    // Augmenter maxPlayers
    setTournament({
      ...tournament,
      maxPlayers: currentMaxPlayers + 1,
    });
  };

  const handleAddPlayer = (placeIndex: number) => {
    if (!tournament) return;
    
    const placeAlreadyTaken = findPlayerAtPlace(placeIndex);
    if (placeAlreadyTaken) {
      return; // Ne rien faire si la place est déjà prise
    }
    
    const placeGender: "M" | "F" = placeIndex % 2 === 0 ? "M" : "F";
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: "",
      gender: placeGender,
      placeIndex: placeIndex,
    };
    setTournament((prevTournament) => {
      if (!prevTournament) return prevTournament;
      return {
        ...prevTournament,
        players: [...prevTournament.players, newPlayer],
      };
    });
  };


  const handleRemovePlace = (placeIndex: number) => {
    setTournament((prevTournament) => {
      if (!prevTournament) return prevTournament;
      
      const playerAtPlace = findPlayerAtPlace(placeIndex, prevTournament);
      if (playerAtPlace) {
        // Première action : retirer le joueur de cette place
        return {
          ...prevTournament,
          players: prevTournament.players.filter((p) => p.id !== playerAtPlace.id),
        };
      }

      const currentMaxPlayers = prevTournament.maxPlayers || prevTournament.players.length;
      if (currentMaxPlayers <= 4) {
        showToast("Minimum 4 places requises", "warning");
        return prevTournament;
      }

      const updatedPlayers = prevTournament.players.map((p) => {
        let place = p.placeIndex;
        if (place === undefined) {
          place = prevTournament.players.indexOf(p);
        }

        if (place > placeIndex) {
          return { ...p, placeIndex: place - 1 };
        }

        if (p.placeIndex === undefined) {
          return { ...p, placeIndex: place };
        }

        return p;
      });

      return {
        ...prevTournament,
        maxPlayers: currentMaxPlayers - 1,
        players: updatedPlayers,
      };
    });
  };

  const handleUpdatePlayer = (playerId: string, playerData: { name: string; userId?: string; photoURL?: string; gender?: "M" | "F" }) => {
    if (!tournament) return;
    
    // Si le nom est vide, supprimer le joueur du tableau pour libérer la place
    if (playerData.name.trim().length === 0 && !playerData.userId && !playerData.photoURL) {
      setTournament({
        ...tournament,
        players: tournament.players.filter((p) => p.id !== playerId),
      });
    } else {
      setTournament({
        ...tournament,
        players: tournament.players.map((p) =>
          p.id === playerId
            ? { ...p, ...playerData }
            : p
        ),
      });
    }
  };

  const handleSavePlayers = async () => {
    if (!tournament) return;
    
    // Validation souple : on permet la sauvegarde même si toutes les places ne sont pas remplies
    const namedPlayers = tournament.players.filter((p) => p.name.trim().length > 0);
    
    // Vérifier les noms uniques uniquement sur les joueurs renseignés
    const playerNames = namedPlayers.map((p) => p.name.trim());
    const uniqueNames = new Set(playerNames);
    if (playerNames.length !== uniqueNames.size) {
      showToast("Les noms des joueurs doivent être uniques", "warning");
      return;
    }
    
    // Vérifier l'équilibre H/F si on a au moins 4 joueurs
    if (namedPlayers.length >= 4) {
      const namedMales = namedPlayers.filter((p) => p.gender === "M").length;
      const namedFemales = namedPlayers.filter((p) => p.gender === "F").length;
      if (namedMales !== namedFemales) {
        showToast("Le nombre d'hommes et de femmes doit être égal parmi les joueurs inscrits", "warning");
        return;
      }
    }
    
    setIsSaving(true);
    try {
      // Nettoyer les joueurs : ne garder que ceux avec un nom
      // Les places vides sont gérées par maxPlayers, pas besoin de les stocker
      const playersToSave = tournament.players.filter((p) => 
        p.name.trim().length > 0
      );
      
      await updateTournament(tournamentId, { 
        players: playersToSave,
        maxPlayers: tournament.maxPlayers,
      });
      setTournament({ ...tournament, players: playersToSave });
      await loadPlayerLevelInfo(playersToSave);
      showToast("Joueurs sauvegardés avec succès !", "success");
    } catch (error) {
      console.error("Error saving players:", error);
      showToast("Erreur lors de la sauvegarde des joueurs", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateScores = async () => {
    if (!tournament) return;
    const currentPlayers = tournament.players;

    const hasIncompleteScores = matches.some(
      (match) => match.score === undefined || match.score === null
    );

    if (matches.length === 0) {
      showToast("Aucun match à valider", "info");
      return;
    }

    if (hasIncompleteScores) {
      showToast("Complétez tous les scores avant de valider", "warning");
      return;
    }

    try {
      setIsValidatingScores(true);

      // 1. Récupérer les userIds des joueurs qui ont un compte
      const playerUserIds = tournament.players
        .filter((p) => p.userId)
        .map((p) => p.userId!);

      // 2. Récupérer les profils utilisateurs pour avoir leurs niveaux actuels
      const userProfiles = await getUsersByIds(playerUserIds);

      // 3. Créer une map playerId -> userData pour le calcul
      const playersLevelData = new Map<string, { userId: string; level: number; reliability: number }>();
      
      tournament.players.forEach((player) => {
        if (player.userId) {
          const userProfile = userProfiles.get(player.userId);
          if (userProfile) {
            playersLevelData.set(player.id, {
              userId: player.userId,
              level: userProfile.level ?? 5, // Niveau par défaut: 5
              reliability: userProfile.levelReliability ?? 0, // Fiabilité par défaut: 0%
            });
          }
        }
      });

      // 4. Calculer les changements de niveau pour tous les joueurs
      const levelChanges = calculateTournamentLevelChanges(
        matches,
        playersLevelData,
        tournamentId
      );

      // 5. Appliquer les changements de niveau à chaque utilisateur
      const updatePromises: Promise<void>[] = [];
      
      levelChanges.forEach((change, oderId) => {
        const historyEntry: LevelHistoryEntry = {
          delta: change.delta,
          oldLevel: change.oldLevel,
          newLevel: change.newLevel,
          oldReliability: change.oldReliability,
          newReliability: change.newReliability,
          tournamentId,
          tournamentName: tournament.name,
          timestamp: change.timestamp,
        };

        updatePromises.push(
          updateUserLevel(change.userId, change.newLevel, change.newReliability, historyEntry)
        );
      });

      await Promise.all(updatePromises);
      await loadPlayerLevelInfo(currentPlayers);

      // 6. Marquer le tournoi comme validé
      await updateTournament(tournamentId, {
        scoresValidated: true,
        status: "completed",
      });
      
      setTournament((prev) =>
        prev ? { ...prev, scoresValidated: true, status: "completed" } : prev
      );

      const playersUpdated = levelChanges.size;
      showToast(
        playersUpdated > 0
          ? `Scores validés ! ${playersUpdated} niveau(x) mis à jour.`
          : "Scores validés avec succès !",
        "success"
      );
    } catch (error) {
      console.error("Error validating scores:", error);
      showToast("Erreur lors de la validation des scores", "error");
    } finally {
      setIsValidatingScores(false);
    }
  };

  const toastVariants = {
    success: {
      icon: CheckCircle2,
      container: "border-emerald-500/20 bg-emerald-500/10 text-emerald-50",
      iconColor: "text-emerald-400",
    },
    error: {
      icon: AlertCircle,
      container: "border-destructive/30 bg-destructive/10 text-destructive-foreground",
      iconColor: "text-destructive",
    },
    info: {
      icon: InfoIcon,
      container: "border-border bg-card text-foreground",
      iconColor: "text-primary",
    },
    warning: {
      icon: AlertTriangle,
      container: "border-amber-400/30 bg-amber-500/10 text-amber-50",
      iconColor: "text-amber-300",
    },
  } as const;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  const isOwner = user?.uid === tournament.userId;

  if (!isOwner) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Redirection vers l&apos;espace public du tournoi...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {toast && (
        <div
          className="fixed inset-x-0 top-6 z-50 flex justify-center px-4"
          aria-live="polite"
        >
          <div
            className={`flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${toastVariants[toast.type].container}`}
          >
            {(() => {
              const Icon = toastVariants[toast.type].icon;
              return <Icon className={`h-5 w-5 ${toastVariants[toast.type].iconColor}`} />;
            })()}
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button
              onClick={dismissToast}
              className="rounded-full p-1 text-current transition-colors hover:bg-white/10"
              aria-label="Fermer la notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
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

        {/* Titre de la page avec bouton retour */}
        <div className="mx-auto max-w-lg px-6 pt-8 pb-4">
          <Link href="/home">
            <button className="mb-4 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Retour</span>
            </button>
          </Link>
          {editingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  setTempTitle(tournament.name);
                  setEditingTitle(false);
                }
              }}
              autoFocus
              className="w-full text-3xl font-bold text-foreground bg-transparent border-none outline-none focus:outline-none p-0 m-0"
              style={{ 
                fontFamily: "inherit",
                lineHeight: "inherit",
                letterSpacing: "inherit"
              }}
            />
          ) : (
            <h1 
              onClick={() => {
                setTempTitle(tournament.name);
                setEditingTitle(true);
              }}
              className="text-3xl font-bold text-foreground cursor-text"
            >
              {tournament.name}
            </h1>
          )}
          <p className="mt-2 text-muted-foreground">Gestion du tournoi</p>
        </div>

        {/* Contenu principal */}
        <main className="mx-auto max-w-lg px-6 py-4">
          {/* Navigation des tabs */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {[
              { id: "settings" as const, label: "Settings", icon: Settings },
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
            {/* Tab Settings */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Partage */}
                <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Partager ce tournoi
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleShare}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-3 font-medium text-primary transition-all hover:bg-primary/20 active:scale-95"
                    >
                      <Share2 className="h-5 w-5" />
                      Partager via...
                    </button>
                    <Link
                      href={`/join/${tournamentId}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
                    >
                      <ArrowRight className="h-5 w-5" />
                      Aller au tournoi
                    </Link>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
                      <input
                        type="text"
                        value={publicTournamentUrl}
                        readOnly
                        className="flex-1 bg-transparent text-sm text-foreground outline-none"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-green-500">Copié!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copier
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Visibilité */}
                <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Visibilité
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {tournament.isPublic ? (
                        <Globe className="h-5 w-5 text-primary" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {tournament.isPublic ? "Public" : "Privé"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tournament.isPublic 
                            ? "Tout le monde peut rejoindre ce tournoi" 
                            : "Seuls les invités peuvent rejoindre ce tournoi"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleTogglePublic}
                      disabled={isSaving}
                      className={`relative h-7 w-12 rounded-full transition-colors ${
                        tournament.isPublic ? "bg-primary" : "bg-muted"
                      } disabled:opacity-50`}
                    >
                      <div
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                          tournament.isPublic ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Informations du tournoi */}
                <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Informations du tournoi
                  </h3>
                  <div className="space-y-4">
                    {/* Lieu */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-foreground">
                        Lieu
                      </label>
                      {editingLocation ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tempLocation}
                            onChange={(e) => setTempLocation(e.target.value)}
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                            placeholder="Lieu du tournoi"
                          />
                          <button
                            onClick={handleSaveLocation}
                            disabled={isSaving}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sauver"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingLocation(false);
                              setTempLocation(tournament.location || "");
                            }}
                            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                          <span className="text-sm text-foreground">
                            {tournament.location || "Non spécifié"}
                          </span>
                          <button
                            onClick={() => setEditingLocation(true)}
                            className="text-sm text-primary hover:underline"
                          >
                            Modifier
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Date et heure */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-foreground">
                        Date et heure
                      </label>
                      {editingTime ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={tempTime ? new Date(tempTime).toISOString().slice(0, 16) : ""}
                            onChange={(e) => setTempTime(new Date(e.target.value).toISOString())}
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                          />
                          <button
                            onClick={handleSaveTime}
                            disabled={isSaving}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sauver"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingTime(false);
                              setTempTime(tournament.time || "");
                            }}
                            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                          <span className="text-sm text-foreground">
                            {tournament.time 
                              ? new Date(tournament.time).toLocaleString("fr-FR")
                              : "Non spécifié"}
                          </span>
                          <button
                            onClick={() => setEditingTime(true)}
                            className="text-sm text-primary hover:underline"
                          >
                            Modifier
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Zone de danger - Supprimer le tournoi */}
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-destructive mb-4">
                    Zone de danger
                  </h3>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      La suppression du tournoi est irréversible. Tous les matchs générés seront également supprimés.
                    </p>
                    <button
                      onClick={() => setShowDeleteDrawer(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-destructive bg-destructive/10 px-4 py-3 font-medium text-destructive transition-all hover:bg-destructive/20 active:scale-95"
                    >
                      <Trash2 className="h-5 w-5" />
                      Supprimer le tournoi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Joueurs */}
            {activeTab === "joueurs" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    Joueurs ({tournament.players.filter((p) => p.name.trim().length > 0).length}/{tournament.maxPlayers || tournament.players.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    {(tournament.maxPlayers || tournament.players.length) < 12 && (
                      <button
                        onClick={handleAddPlace}
                        className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/20"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter une place
                      </button>
                    )}
                    {(tournament.maxPlayers || tournament.players.length) ===
                      tournament.players.filter((p) => p.name.trim().length > 0).length && (
                      <button
                        onClick={handleShufflePlayers}
                        disabled={isShufflingPlayers || hasMatches || scoresLocked}
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted disabled:opacity-50"
                      >
                        {isShufflingPlayers ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Mélange...
                          </>
                        ) : (
                          <>
                            <Shuffle className="h-4 w-4" />
                            Mélanger
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {getAllPlaces().map((place) => {
                    const player = place.player;
                    const isOccupied = player !== null;
                    
                    const maxPlaces = tournament.maxPlayers || tournament.players.length;
                    const removeDisabled = (!isOccupied && maxPlaces <= 4) || isRemovalLocked;

                    return (
                      <div
                        key={place.index}
                        className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm"
                      >
                        <span className="text-sm font-medium text-muted-foreground">
                          {place.index + 1}.
                        </span>
                        <div className="flex flex-1 items-center gap-2">
                          {isOccupied && player.photoURL && (
                            <Image
                              src={player.photoURL}
                              alt={player.name}
                              width={24}
                              height={24}
                              className="h-6 w-6 rounded-full"
                            />
                          )}
                          {isOccupied ? (
                            <PlayerSelector
                              value={player.name}
                              onChange={(selectedPlayer) =>
                                handleUpdatePlayer(player.id, {
                                  name: selectedPlayer.name,
                                  userId: selectedPlayer.userId,
                                  photoURL: selectedPlayer.photoURL,
                                })
                              }
                              onRemove={
                                isRemovalLocked
                                  ? undefined
                                  : () =>
                                      handleUpdatePlayer(player.id, {
                                        name: "",
                                        userId: undefined,
                                        photoURL: undefined,
                                      })
                              }
                              gender={player.gender}
                              placeholder={`Joueur ${place.index + 1}`}
                              currentPlayerId={player.userId || undefined}
                              usedUserIds={tournament.players
                                .filter((p) => p.id !== player.id && p.userId)
                                .map((p) => p.userId!)}
                            />
                          ) : (
                            <div className="flex-1">
                              <button
                                onClick={() => handleAddPlayer(place.index)}
                                className="w-full rounded-lg border-2 border-dashed border-border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                              >
                                Place disponible ({place.gender === "M" ? "Homme" : "Femme"})
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Toggle M/F - seulement si la place est occupée */}
                        {isOccupied ? (
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
                              onClick={() =>
                                handleUpdatePlayer(player.id, {
                                  name: player.name,
                                  gender: player.gender === "M" ? "F" : "M",
                                })
                              }
                              className={`relative h-7 w-12 rounded-full transition-colors ${
                                player.gender === "M" ? "bg-primary" : "bg-[#e05d38]"
                              }`}
                            >
                              <div
                                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                                  player.gender === "M"
                                    ? "left-1"
                                    : "left-6"
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
                        ) : (
                          <div
                            className={`h-6 w-6 rounded-full ${
                              place.gender === "M" ? "bg-primary/30" : "bg-[#e05d38]/30"
                            }`}
                          />
                        )}
                        {/* Remove place button */}
                        <button
                          onClick={() => handleRemovePlace(place.index)}
                          disabled={removeDisabled}
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                            removeDisabled
                              ? "cursor-not-allowed bg-muted text-muted-foreground/50"
                              : "bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                          }`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Players Info - comme dans la page de création */}
                {(() => {
                  const namedPlayers = tournament.players.filter((p) => p.name.trim().length > 0);
                  const maleCount = namedPlayers.filter((p) => p.gender === "M").length;
                  const femaleCount = namedPlayers.filter((p) => p.gender === "F").length;
                  const isBalanced = maleCount === femaleCount;
                  const maxPlayers = tournament.maxPlayers || tournament.players.length;
                  
                  return (
                    <div className="mt-3 rounded-lg bg-muted/50 p-3 mb-4">
                      <p className="text-xs text-muted-foreground">
                        {maxPlayers} places disponibles. Minimum 4 joueurs avec noms uniques, hommes et femmes en nombre égal.
                      </p>
                      <div className="mt-2 flex gap-4 text-xs">
                        <span className="text-primary">
                          ♂ Hommes: {maleCount}
                        </span>
                        <span className="text-[#e05d38]">
                          ♀ Femmes: {femaleCount}
                        </span>
                        {namedPlayers.length >= 4 && !isBalanced && (
                          <span className="text-destructive">⚠ Non équilibré</span>
                        )}
                        {namedPlayers.length >= 4 && isBalanced && (
                          <span className="text-green-500">✓ Équilibré</span>
                        )}
                      </div>
                      <div className="mt-2 text-xs font-medium text-foreground">
                        Inscrits: {namedPlayers.length}/{maxPlayers}
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={handleSavePlayers}
                  disabled={isSaving}
                  className="w-full rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sauvegarde...
                    </span>
                  ) : (
                    "Sauvegarder les joueurs"
                  )}
                </button>
              </div>
            )}

            {/* Tab Matchs */}
            {activeTab === "matchs" && (
              <div>
                {matches.length === 0 ? (
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-6 text-center">
                    <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Aucun match généré
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Générez les matchs pour commencer le tournoi. Les matchs seront créés selon les règles de l&apos;Americano Mixte.
                    </p>
                    <button
                      onClick={handleGenerateMatches}
                      disabled={isGenerating || !canGenerateMatches}
                      className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? "Génération..." : "Générer les matchs"}
                    </button>
                    {!canGenerateMatches && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Minimum 4 joueurs avec équilibre H/F requis pour générer les matchs
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Rounds</h3>
                      <div className="flex items-center gap-2">
                        {scoresLocked ? (
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            Scores validés
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                            Scores éditables
                          </span>
                        )}
                        {!hasAnyEnteredScore && (
                          <button
                            onClick={handleDeleteAllMatches}
                            disabled={isDeletingMatches}
                            className="rounded-full border border-destructive/30 px-3 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                          >
                            {isDeletingMatches ? "Suppression..." : "Supprimer les matchs"}
                          </button>
                        )}
                      </div>
                    </div>
                    {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
                      const roundMatches = getMatchesByRound(round);
                      if (roundMatches.length === 0) return null;

                      return (
                        <div key={round} className="rounded-xl bg-card p-4 shadow-sm">
                          <h4 className="mb-4 text-base font-semibold text-foreground">
                            Round {round}
                          </h4>
                          <div className="space-y-3">
                            {roundMatches.map((match) => {
                              const currentScore = match.score || { team1: 0, team2: 0 };

                              const handleScoreChange = (team: "team1" | "team2", value: string) => {
                                const numValue = parseInt(value) || 0;
                                const newScore = {
                                  team1: team === "team1" ? numValue : currentScore.team1,
                                  team2: team === "team2" ? numValue : currentScore.team2,
                                };
                                if (match.id) {
                                  saveScore(match.id, newScore);
                                }
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
                                        {getPlayerName(match.team1[0])} & {getPlayerName(match.team1[1])}
                                      </p>
                                    </div>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={2}
                                      value={currentScore.team1 || 0}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                                        if (value === "" || parseInt(value) >= 0) {
                                          handleScoreChange("team1", value || "0");
                                        }
                                      }}
                                      onFocus={(e) => e.target.select()}
                                      disabled={scoresLocked}
                                      className={`w-14 text-right text-3xl font-bold text-foreground outline-none border-2 rounded px-2 py-1 bg-transparent transition-colors ${
                                        scoresLocked
                                          ? "border-border/50 text-muted-foreground cursor-not-allowed"
                                          : "border-border focus:border-primary"
                                      }`}
                                      style={{ fontFamily: "var(--font-digital)" }}
                                    />
                                  </div>

                                  <div className="my-2 text-center text-xs text-muted-foreground">VS</div>

                                  {/* Équipe 2 */}
                                  <div className="mb-3 flex items-center justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-foreground">
                                        {getPlayerName(match.team2[0])} & {getPlayerName(match.team2[1])}
                                      </p>
                                    </div>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={2}
                                      value={currentScore.team2 || 0}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                                        if (value === "" || parseInt(value) >= 0) {
                                          handleScoreChange("team2", value || "0");
                                        }
                                      }}
                                      onFocus={(e) => e.target.select()}
                                      disabled={scoresLocked}
                                      className={`w-14 text-right text-3xl font-bold text-foreground outline-none border-2 rounded px-2 py-1 bg-transparent transition-colors ${
                                        scoresLocked
                                          ? "border-border/50 text-muted-foreground cursor-not-allowed"
                                          : "border-border focus:border-primary"
                                      }`}
                                      style={{ fontFamily: "var(--font-digital)" }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2">
                      <button
                        onClick={handleValidateScores}
                        disabled={scoresLocked || hasIncompleteScores || isValidatingScores}
                        className="w-full rounded-full bg-primary px-6 py-3 text-center font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {scoresLocked
                          ? "Scores déjà validés"
                          : isValidatingScores
                          ? "Validation..."
                          : "Valider les scores"}
                      </button>
                      {!scoresLocked && hasIncompleteScores && (
                        <p className="mt-2 text-xs text-muted-foreground text-center">
                          Complétez tous les scores pour valider.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab Results */}
            {activeTab === "results" && (
              <div>
                {!scoresLocked ? (
                  <div className="rounded-xl bg-muted/50 border border-border p-6 text-center">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Validez les scores pour afficher le classement des joueurs.
                    </p>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="rounded-xl bg-muted/50 border border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Aucun score enregistré pour le moment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((entry, index) => {
                      const levelInfo = playerLevelInfo[entry.player.id];
                      return (
                      <div
                        key={entry.player.id}
                        className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 p-4 shadow-sm"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
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
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {entry.player.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.matchesPlayed} match{entry.matchesPlayed > 1 ? "s" : ""} joués
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
                <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Galerie du tournoi</h3>
                      <p className="text-sm text-muted-foreground">
                        Partagez des moments clés de votre tournoi avec les joueurs.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOpenMediaPicker}
                        disabled={isUploadingMedia}
                        className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUploadingMedia ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Upload...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-4 w-4" />
                            Ajouter des photos
                          </>
                        )}
                      </button>
                      <input
                        ref={mediaInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleMediaUpload}
                      />
                    </div>
                  </div>
                </div>

                {mediaItems.length === 0 ? (
                  <div className="rounded-xl bg-muted/50 border border-border p-6 text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Aucune photo pour le moment.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Ajoutez vos premières photos pour immortaliser ce tournoi.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {mediaItems.map((media) => (
                      <div
                        key={media.id}
                        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
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
                              {media.uploadedByName || "Organisateur"}
                            </p>
                            <p className="text-[11px] text-white/70">
                              {new Date(media.createdAt).toLocaleString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-[11px] text-white/80 mt-0.5 flex items-center gap-1">
                              <span>❤️</span>
                              <span>{media.likes?.length || 0}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteMedia(media)}
                            disabled={mediaDeletingId === media.id}
                            className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80 disabled:cursor-not-allowed"
                            aria-label="Supprimer la photo"
                          >
                            {mediaDeletingId === media.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Drawer de confirmation de suppression */}
        {showDeleteDrawer && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => !isDeleting && setShowDeleteDrawer(false)}
            />
            
            {/* Drawer */}
            <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg animate-in slide-in-from-bottom duration-300">
              <div className="rounded-t-3xl bg-card border-t border-l border-r border-border shadow-2xl">
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Content */}
                <div className="px-6 pb-8">
                  <div className="mb-6 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                      <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                  </div>

                  <h3 className="mb-2 text-center text-2xl font-bold text-foreground">
                    Supprimer le tournoi
                  </h3>
                  
                  <p className="mb-1 text-center text-sm text-muted-foreground">
                    Cette action est <span className="font-semibold text-destructive">irréversible</span>.
                  </p>
                  
                  <p className="mb-6 text-center text-sm text-muted-foreground">
                    Le tournoi &quot;{tournament?.name}&quot; et tous les matchs générés seront définitivement supprimés.
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={handleDeleteTournament}
                      disabled={isDeleting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-6 py-4 font-semibold text-destructive-foreground transition-all hover:bg-destructive/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Suppression en cours...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-5 w-5" />
                          Oui, supprimer définitivement
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowDeleteDrawer(false)}
                      disabled={isDeleting}
                      className="w-full rounded-xl border-2 border-border bg-background px-6 py-4 font-semibold text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
