"use client";

import Image from "next/image";
import Link from "next/link";
import BottomNav from "../components/BottomNav";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Trophy, Users, Timer, Lock } from "lucide-react";

export default function TournoiPage() {
  const tournamentTypes = [
    {
      id: "americano-mixte",
      title: "Americano Mixte",
      description: "Format mixte avec rotation des partenaires",
      icon: Users,
      available: true,
      color: "from-primary to-primary/80",
      textColor: "text-primary-foreground",
    },
    {
      id: "americano",
      title: "Americano",
      description: "Format classique avec rotation",
      icon: Trophy,
      available: false,
      color: "from-muted to-muted",
      textColor: "text-muted-foreground",
    },
    {
      id: "mexicano",
      title: "Mexicano",
      description: "Format mexicano avec scoring spécial",
      icon: Timer,
      available: false,
      color: "from-muted to-muted",
      textColor: "text-muted-foreground",
    },
    {
      id: "tournoi-complet",
      title: "Tournoi Complet",
      description: "Format tournoi avec élimination",
      icon: Trophy,
      available: false,
      color: "from-muted to-muted",
      textColor: "text-muted-foreground",
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
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Créer un tournoi
          </h1>
          <p className="mt-2 text-muted-foreground">
            Choisissez le type de tournoi que vous souhaitez organiser
          </p>
        </div>

        {/* Liste des types de tournois */}
        <div className="space-y-4">
          {tournamentTypes.map((tournament) => {
            const Icon = tournament.icon;
            const isAvailable = tournament.available;

            const CardContent = (
              <div
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 shadow-lg transition-all duration-300 ${
                  isAvailable
                    ? `${tournament.color} hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]`
                    : `${tournament.color} cursor-not-allowed opacity-60`
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3
                        className={`text-xl font-semibold ${tournament.textColor}`}
                      >
                        {tournament.title}
                      </h3>
                      {!isAvailable && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p
                      className={`text-sm ${
                        isAvailable
                          ? "text-primary-foreground/90"
                          : "text-muted-foreground"
                      }`}
                    >
                      {tournament.description}
                    </p>
                    {!isAvailable && (
                      <p className="mt-2 text-xs font-medium text-muted-foreground">
                        Bientôt disponible
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full ${
                      isAvailable
                        ? "bg-white/20 backdrop-blur-sm"
                        : "bg-muted-foreground/10"
                    }`}
                  >
                    <Icon
                      className={`h-7 w-7 ${
                        isAvailable
                          ? tournament.textColor
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                </div>

                {/* Effet hover uniquement pour les cartes disponibles */}
                {isAvailable && (
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/0 to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                )}
              </div>
            );

            return isAvailable ? (
              <Link
                key={tournament.id}
                href={`/tournoi/${tournament.id}`}
                className="block"
              >
                {CardContent}
              </Link>
            ) : (
              <div key={tournament.id}>{CardContent}</div>
            );
          })}
        </div>

        {/* Info supplémentaire */}
        <div className="mt-8 rounded-xl bg-accent/50 p-4">
          <p className="text-sm text-accent-foreground">
            💡 <span className="font-medium">Astuce :</span> L'Americano Mixte
            est parfait pour les groupes avec joueurs et joueuses. Chaque match
            sera équilibré automatiquement !
          </p>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
      </div>
    </ProtectedRoute>
  );
}

