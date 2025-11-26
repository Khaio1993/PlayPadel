"use client";

import { useState } from "react";
import { Trophy, TrendingUp, TrendingDown, ChevronDown, ChevronUp, X } from "lucide-react";
import { LevelHistoryEntry } from "@/lib/users";
import { formatLevelDelta, getReliabilityCategory } from "@/lib/levelCalculator";

interface LevelCardProps {
  level: number;
  reliability: number;
  levelHistory?: LevelHistoryEntry[];
  isLoading?: boolean;
}

export function LevelCard({ level, reliability, levelHistory, isLoading }: LevelCardProps) {
  const [showHistory, setShowHistory] = useState(false);

  // Obtenir le dernier changement de niveau
  const lastChange = levelHistory && levelHistory.length > 0 ? levelHistory[0] : null;
  const hasRecentChange = lastChange !== null;
  const isPositiveChange = lastChange && lastChange.delta > 0;
  const isNegativeChange = lastChange && lastChange.delta < 0;

  const reliabilityInfo = getReliabilityCategory(reliability);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div 
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-card/80 p-6 shadow-lg border border-border/50 cursor-pointer transition-all hover:shadow-xl active:scale-[0.99]"
        onClick={() => hasRecentChange && setShowHistory(true)}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:20px_20px]" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-baseline gap-3">
              <span className="text-5xl font-bold text-primary">
                {isLoading ? "..." : level.toFixed(2)}
              </span>
              <span className="text-2xl font-semibold text-muted-foreground">Level</span>
              
              {/* Flèche de changement */}
              {hasRecentChange && !isLoading && (
                <div 
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold ${
                    isPositiveChange 
                      ? "bg-green-500/10 text-green-500" 
                      : isNegativeChange 
                      ? "bg-red-500/10 text-red-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPositiveChange ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : isNegativeChange ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : null}
                  <span>{formatLevelDelta(lastChange.delta)}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-3">
              <span className="text-sm text-muted-foreground">Level reliability:</span>
              <span className="text-lg font-semibold text-foreground">
                {isLoading ? "..." : `${Math.round(reliability)}%`}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-muted/50 border border-border ${reliabilityInfo.color}`}>
                {reliabilityInfo.label}
              </span>
            </div>

            {/* Indication cliquable */}
            {hasRecentChange && (
              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <span>Voir l&apos;historique</span>
                <ChevronDown className="h-3 w-3" />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Drawer de l'historique */}
      {showHistory && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowHistory(false)}
          />
          
          {/* Drawer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg animate-in slide-in-from-bottom duration-300">
            <div className="rounded-t-3xl bg-card border-t border-l border-r border-border shadow-2xl max-h-[70vh] overflow-hidden flex flex-col">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="px-6 pb-4 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xl font-bold text-foreground">
                  Historique du niveau
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 pb-8 overflow-y-auto flex-1">
                {levelHistory && levelHistory.length > 0 ? (
                  <div className="space-y-3">
                    {levelHistory.map((entry, index) => (
                      <div
                        key={index}
                        className="rounded-xl bg-muted/30 border border-border/50 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground truncate flex-1 mr-2">
                            {entry.tournamentName || "Tournoi"}
                          </span>
                          <div 
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold ${
                              entry.delta > 0 
                                ? "bg-green-500/10 text-green-500" 
                                : entry.delta < 0 
                                ? "bg-red-500/10 text-red-500"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {entry.delta > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : entry.delta < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            <span>{formatLevelDelta(entry.delta)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {entry.oldLevel.toFixed(2)} → {entry.newLevel.toFixed(2)}
                          </span>
                          <span>{formatDate(entry.timestamp)}</span>
                        </div>
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                          Fiabilité: {Math.round(entry.oldReliability)}% → {Math.round(entry.newReliability)}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Aucun historique de niveau pour le moment.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Jouez des tournois pour voir votre progression !
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}



