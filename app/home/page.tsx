"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { TrendingUp, Users, Trophy, Calendar, CheckCircle2, X, ChevronRight } from "lucide-react";
import { getTournaments } from "@/lib/tournaments";
import { getMatchesByTournament } from "@/lib/matches";
import { Tournament, Match, Player } from "@/lib/types";
import { useAuth } from "../contexts/AuthContext";
import { getUserById, UserProfile, LevelHistoryEntry } from "@/lib/users";
import { LevelCard } from "../components/LevelCard";

function SuccessMessage() {
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const createdTournamentId = searchParams.get("created");

  useEffect(() => {
    if (createdTournamentId) {
      setShowSuccess(true);
      // Masquer le message après 5 secondes
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [createdTournamentId]);

  if (!showSuccess) return null;

  return (
    <div className="mb-6 animate-in slide-in-from-top-2 rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
            Tournoi créé avec succès !
          </p>
          <p className="text-xs text-muted-foreground">
            Votre tournoi a été enregistré.
          </p>
        </div>
      </div>
      <button
        onClick={() => setShowSuccess(false)}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [userLevel, setUserLevel] = useState<number>(5);
  const [userReliability, setUserReliability] = useState<number>(0);
  const [levelHistory, setLevelHistory] = useState<LevelHistoryEntry[]>([]);
  const [isLoadingLevel, setIsLoadingLevel] = useState(true);
  const [tournamentsPlayed, setTournamentsPlayed] = useState(0);
  const [tournamentsWon, setTournamentsWon] = useState(0);
  const [partnersCount, setPartnersCount] = useState(0);
  const [tournamentsThisWeek, setTournamentsThisWeek] = useState(0);
  const [recentActivity, setRecentActivity] = useState<
    {
      id: string;
      title: string;
      date: Date;
      resultLabel: string;
      resultType: "win" | "second" | "participation";
    }[]
  >([]);

  const loadTournaments = async () => {
    if (!user) return;
    
    try {
      setIsLoadingTournaments(true);
      const data = await getTournaments(user.uid);
      setTournaments(data);
    } catch (error) {
      console.error("Error loading tournaments:", error);
    } finally {
      setIsLoadingTournaments(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTournaments();
      loadUserLevel();
    }
  }, [user]);

  const loadUserLevel = async () => {
    if (!user) return;
    
    try {
      setIsLoadingLevel(true);
      const userData = await getUserById(user.uid);
      if (userData) {
        setUserLevel(userData.level ?? 5);
        setUserReliability(userData.levelReliability ?? 0);
        setLevelHistory(userData.levelHistory ?? []);
      }
    } catch (error) {
      console.error("Error loading user level:", error);
    } finally {
      setIsLoadingLevel(false);
    }
  };

  // Recharger les tournois quand on revient sur la page (après création)
  useEffect(() => {
    const handleFocus = () => {
      loadTournaments();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Calculer les statistiques utilisateur quand les tournois changent
  useEffect(() => {
    if (user) {
      computeUserStats(user.uid, tournaments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournaments, user]);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return `Il y a ${Math.floor(diffDays / 30)} mois`;
  };

  const computeUserStats = async (userId: string, userTournaments: Tournament[]) => {
    if (!userTournaments || userTournaments.length === 0) {
      setTournamentsPlayed(0);
      setTournamentsWon(0);
      setPartnersCount(0);
      setTournamentsThisWeek(0);
      setRecentActivity([]);
      return;
    }

    try {
      setIsLoadingStats(true);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      let played = 0;
      let wins = 0;
      const partners = new Set<string>();
      const activities: {
        id: string;
        title: string;
        date: Date;
        resultLabel: string;
        resultType: "win" | "second" | "participation";
      }[] = [];

      const relevantTournaments = userTournaments.filter(
        (t) => t.players?.some((p) => p.userId === userId) && t.scoresValidated
      );

      const promises = relevantTournaments.map(async (tournament) => {
        if (!tournament.id) return;
        const matches = await getMatchesByTournament(tournament.id);
        if (!matches || matches.length === 0) return;

        const playersById = new Map<string, Player>();
        tournament.players.forEach((p) => playersById.set(p.id, p));

        const statsMap = new Map<
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
          const entry =
            statsMap.get(playerId) || { player, points: 0, matchesPlayed: 0 };
          entry.points += points;
          if (counted) {
            entry.matchesPlayed += 1;
          }
          statsMap.set(playerId, entry);
        };

        matches.forEach((match: Match) => {
          if (!match.score) return;
          const { team1, team2, score } = match;
          team1.forEach((playerId) => addScore(playerId, score.team1 || 0, true));
          team2.forEach((playerId) => addScore(playerId, score.team2 || 0, true));
        });

        tournament.players.forEach((player) => {
          if (!statsMap.has(player.id)) {
            statsMap.set(player.id, { player, points: 0, matchesPlayed: 0 });
          }
        });

        const leaderboard = Array.from(statsMap.values()).sort((a, b) => {
          if (b.points === a.points) {
            return a.player.name.localeCompare(b.player.name);
          }
          return b.points - a.points;
        });

        const userPlayers = tournament.players.filter((p) => p.userId === userId);
        if (userPlayers.length === 0) return;

        played += 1;

        let bestRank = Infinity;
        userPlayers.forEach((p) => {
          const idx = leaderboard.findIndex((entry) => entry.player.id === p.id);
          if (idx !== -1 && idx + 1 < bestRank) {
            bestRank = idx + 1;
          }
        });

        if (bestRank === 1) {
          wins += 1;
        }

        matches.forEach((match: Match) => {
          const allTeams: [string, string][] = [match.team1, match.team2];
          allTeams.forEach((team) => {
            const userIndex = team.findIndex((pid) =>
              userPlayers.some((up) => up.id === pid)
            );
            if (userIndex !== -1) {
              const partnerId = team[userIndex === 0 ? 1 : 0];
              partners.add(partnerId);
            }
          });
        });

        const eventDate =
          tournament.time && tournament.time !== ""
            ? new Date(tournament.time)
            : tournament.createdAt instanceof Date
            ? tournament.createdAt
            : new Date(tournament.createdAt);

        let resultLabel = "Participation";
        let resultType: "win" | "second" | "participation" = "participation";

        if (bestRank === 1) {
          resultLabel = "Victoire";
          resultType = "win";
        } else if (bestRank === 2) {
          resultLabel = "2ème place";
          resultType = "second";
        }

        activities.push({
          id: tournament.id,
          title: tournament.name,
          date: eventDate,
          resultLabel,
          resultType,
        });
      });

      await Promise.all(promises);

      activities.sort((a, b) => b.date.getTime() - a.date.getTime());

      const thisWeekCount = activities.filter(
        (a) => a.date.getTime() >= weekAgo.getTime()
      ).length;

      setTournamentsPlayed(played);
      setTournamentsWon(wins);
      setPartnersCount(partners.size);
      setTournamentsThisWeek(thisWeekCount);
      setRecentActivity(activities.slice(0, 3));
    } catch (error) {
      console.error("Error computing user stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const stats = [
    {
      label: "Tournois joués",
      value: tournamentsPlayed.toString(),
      icon: Trophy,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Victoires",
      value: tournamentsWon.toString(),
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Partenaires",
      value: partnersCount.toString(),
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Cette semaine",
      value: tournamentsThisWeek.toString(),
      icon: Calendar,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24">
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

      {/* Contenu principal */}
      <main className="mx-auto max-w-lg px-6 py-8">
        {/* Message de succès */}
        <Suspense fallback={null}>
          <SuccessMessage />
        </Suspense>

        {/* Message de bienvenue */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Bienvenue sur PlayPadel
          </h1>
          <p className="mt-2 text-muted-foreground">
            Organisez vos tournois de padel facilement
          </p>
        </div>

        {/* Carte principale - Action rapide */}
        <Link href="/tournoi">
          <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-lg transition-all hover:shadow-xl active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary-foreground">
                  Nouveau tournoi
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/90">
                  Créez un tournoi Americano
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Trophy className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
          </div>
        </Link>

        {/* Liste des tournois créés et rejoints */}
        {tournaments.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Vos tournois
            </h3>
            <div className="space-y-3">
              {tournaments.map((tournament) => {
                // Déterminer si l'utilisateur est le propriétaire
                const isOwner = user && tournament.userId === user.uid;
                // Déterminer la route selon le rôle
                const tournamentRoute = isOwner 
                  ? `/tournoi/${tournament.id}` 
                  : `/join/${tournament.id}`;
                
                const isCompleted = Boolean(tournament.scoresValidated || tournament.status === "completed");

                return (
                  <Link
                    key={tournament.id}
                    href={tournamentRoute}
                    className="block"
                  >
                    <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {tournament.name}
                          </span>
                          {!isOwner && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              Participant
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Terminé
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatDate(tournament.createdAt)}</span>
                          {tournament.location && (
                            <>
                              <span>•</span>
                              <span>{tournament.location}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {tournament.players.length}/{tournament.maxPlayers || tournament.players.length} joueurs • {tournament.courts.length} terrain{tournament.courts.length > 1 ? "s" : ""}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {!isLoadingTournaments && tournaments.length === 0 && (
          <div className="mb-8 rounded-xl bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun tournoi pour le moment. Créez votre premier tournoi ou rejoignez-en un !
            </p>
          </div>
        )}

        {/* Level Section */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Votre niveau
          </h3>
          <LevelCard
            level={userLevel}
            reliability={userReliability}
            levelHistory={levelHistory}
            isLoading={isLoadingLevel}
          />
        </div>

        {/* Stats */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Vos statistiques
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="rounded-xl bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <div
                    className={`mb-3 inline-flex rounded-lg p-2 ${stat.bgColor}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {isLoadingStats ? "..." : stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activité récente */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Activité récente
          </h3>
          {isLoadingStats ? (
            <div className="rounded-xl bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Chargement de votre activité...
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="rounded-xl bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Aucune activité récente pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm"
                >
                  <div>
                    <div className="font-medium text-foreground">
                      {activity.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(activity.date)}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      activity.resultType === "win"
                        ? "text-primary"
                        : activity.resultType === "second"
                        ? "text-lime-400"
                        : "text-primary"
                    }`}
                  >
                    {activity.resultType === "win" ? "🏆 " : null}
                    {activity.resultLabel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
      </div>
    </ProtectedRoute>
  );
}

