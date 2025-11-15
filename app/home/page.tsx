"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { TrendingUp, Users, Trophy, Calendar, CheckCircle2, X, ChevronRight } from "lucide-react";
import { getTournaments } from "@/lib/tournaments";
import { Tournament } from "@/lib/types";
import { useAuth } from "../contexts/AuthContext";

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
    }
  }, [user]);

  // Recharger les tournois quand on revient sur la page (après création)
  useEffect(() => {
    const handleFocus = () => {
      loadTournaments();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

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

  const stats = [
    {
      label: "Tournois joués",
      value: "24",
      icon: Trophy,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Victoires",
      value: "12",
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Partenaires",
      value: "18",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Cette semaine",
      value: "3",
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

        {/* Liste des tournois créés */}
        {tournaments.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Vos tournois
            </h3>
            <div className="space-y-3">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/tournoi/${tournament.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {tournament.name}
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
              ))}
            </div>
          </div>
        )}

        {!isLoadingTournaments && tournaments.length === 0 && (
          <div className="mb-8 rounded-xl bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun tournoi créé pour le moment. Créez votre premier tournoi !
            </p>
          </div>
        )}

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
                    {stat.value}
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
          <div className="space-y-3">
            {[
              {
                title: "Tournoi Mixte - Samedi",
                date: "Il y a 2 jours",
                result: "🏆 Victoire",
              },
              {
                title: "Americano Classique",
                date: "Il y a 5 jours",
                result: "2ème place",
              },
              {
                title: "Mexicano Express",
                date: "Il y a 1 semaine",
                result: "Participation",
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {activity.title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activity.date}
                  </div>
                </div>
                <div className="text-sm font-medium text-primary">
                  {activity.result}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
      </div>
    </ProtectedRoute>
  );
}

