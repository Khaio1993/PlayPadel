"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Trophy, MapPin, Clock, Users, FileText } from "lucide-react";
import { getTournamentById, updateTournament } from "@/lib/tournaments";
import { getMatchesByTournament, createMatches, updateMatch } from "@/lib/matches";
import { generateMatches, formatTeamName } from "@/lib/matchGenerator";
import { Tournament, Match, Player } from "@/lib/types";

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const saveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    loadTournament();
  }, [tournamentId]);

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
      alert("Erreur lors de la génération des matchs");
    } finally {
      setIsGenerating(false);
    }
  };

  // Sauvegarder automatiquement avec debounce
  const saveScore = useCallback(async (matchId: string, score: { team1: number; team2: number }) => {
    // Annuler le timeout précédent s'il existe
    const existingTimeout = saveTimeouts.current.get(matchId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Mettre à jour localement immédiatement pour un feedback visuel
    setMatches((prevMatches) =>
      prevMatches.map((m) =>
        m.id === matchId
          ? { ...m, score, status: score.team1 > 0 || score.team2 > 0 ? "completed" : m.status }
          : m
      )
    );

    // Sauvegarder dans Firebase après 1 seconde d'inactivité
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

  // Nettoyer les timeouts au démontage
  useEffect(() => {
    return () => {
      saveTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const getPlayerName = (playerId: string): string => {
    return tournament?.players.find((p) => p.id === playerId)?.name || "Inconnu";
  };

  const getCourtName = (courtId: string): string => {
    return tournament?.courts.find((c) => c.id === courtId)?.name || "Court inconnu";
  };

  const getMatchesByRound = (round: number): Match[] => {
    return matches.filter((m) => m.round === round);
  };

  const rounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;

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

      {/* Titre de la page avec bouton retour */}
      <div className="mx-auto max-w-lg px-6 pt-8 pb-4">
        <Link href="/home">
          <button className="mb-4 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Retour</span>
          </button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">{tournament.name}</h1>
        <p className="mt-2 text-muted-foreground">Détails et matchs du tournoi</p>
      </div>

      {/* Contenu principal */}
      <main className="mx-auto max-w-lg px-6 py-4">
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
                {tournament.players.length} joueurs ({tournament.players.filter((p) => p.gender === "M").length}H / {tournament.players.filter((p) => p.gender === "F").length}F)
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

        {/* Génération des matchs */}
        {matches.length === 0 && (
          <div className="mb-8 rounded-xl bg-primary/10 border border-primary/20 p-6 text-center">
            <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Aucun match généré
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Générez les matchs pour commencer le tournoi. Les matchs seront créés selon les règles de l'Americano Mixte.
            </p>
            <button
              onClick={handleGenerateMatches}
              disabled={isGenerating}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? "Génération..." : "Générer les matchs"}
            </button>
          </div>
        )}

        {/* Liste des rounds */}
        {matches.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Rounds</h3>
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
                              className="w-14 text-right text-3xl font-bold text-foreground outline-none border-2 border-border focus:border-primary rounded px-2 py-1 bg-transparent transition-colors"
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
                              className="w-14 text-right text-3xl font-bold text-foreground outline-none border-2 border-border focus:border-primary rounded px-2 py-1 bg-transparent transition-colors"
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
          </div>
        )}
      </main>
    </div>
  );
}

