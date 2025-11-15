"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Search, User, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { searchUsers, UserProfile } from "@/lib/users";

interface PlayerSelectorProps {
  value: string;
  onChange: (player: { id: string; name: string; gender: "M" | "F"; userId?: string; photoURL?: string }) => void;
  onRemove?: () => void;
  gender: "M" | "F";
  placeholder: string;
  currentPlayerId?: string; // ID du joueur actuel dans cette position
  usedUserIds?: string[]; // Liste des userIds déjà utilisés dans le tournoi
}

export function PlayerSelector({
  value,
  onChange,
  onRemove,
  gender,
  placeholder,
  currentPlayerId,
  usedUserIds = [],
}: PlayerSelectorProps) {
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentPlayers, setRecentPlayers] = useState<UserProfile[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger les joueurs récents depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentPlayers");
    if (stored) {
      try {
        const recent = JSON.parse(stored);
        setRecentPlayers(recent.slice(0, 3));
      } catch (error) {
        console.error("Error loading recent players:", error);
      }
    }
  }, []);

  // Recherche d'utilisateurs
  useEffect(() => {
    if (searchTerm.length >= 2) {
      setIsSearching(true);
      const timeoutId = setTimeout(async () => {
        const results = await searchUsers(searchTerm, 3);
        setSearchResults(results);
        setIsSearching(false);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchTerm]);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectPlayer = (selectedUser: UserProfile) => {
    // Vérifier si cet utilisateur est déjà utilisé dans le tournoi
    if (selectedUser.id !== currentPlayerId && usedUserIds.includes(selectedUser.id)) {
      // Afficher un message d'erreur ou empêcher la sélection
      alert("Cet utilisateur est déjà sélectionné dans ce tournoi");
      return;
    }

    onChange({
      id: Date.now().toString(),
      name: selectedUser.displayName,
      gender,
      userId: selectedUser.id,
      photoURL: selectedUser.photoURL,
    });

    // Ajouter aux joueurs récents seulement si ce n'est pas le profil actuel
    if (selectedUser.id !== currentUser?.uid) {
      const stored = localStorage.getItem("recentPlayers");
      let recent: UserProfile[] = stored ? JSON.parse(stored) : [];
      
      // Retirer si déjà présent
      recent = recent.filter((p) => p.id !== selectedUser.id);
      
      // Ajouter au début
      recent.unshift(selectedUser);
      
      // Garder seulement les 3 derniers
      recent = recent.slice(0, 3);
      
      localStorage.setItem("recentPlayers", JSON.stringify(recent));
      setRecentPlayers(recent);
    }

    setIsOpen(false);
    setSearchTerm("");
  };

  const handleSelectCurrentUser = () => {
    if (currentUser) {
      handleSelectPlayer({
        id: currentUser.uid,
        email: currentUser.email || "",
        displayName: currentUser.displayName || "User",
        photoURL: currentUser.photoURL || undefined,
        createdAt: new Date(),
      });
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Ouvrir le dropdown au focus
    setIsOpen(true);
    // Charger les joueurs récents à chaque ouverture
    const stored = localStorage.getItem("recentPlayers");
    if (stored) {
      try {
        const recent = JSON.parse(stored);
        setRecentPlayers(recent.slice(0, 3));
      } catch (error) {
        console.error("Error loading recent players:", error);
      }
    }
  };

  const displayValue = value || "";
  const hasValue = displayValue.length > 0;

  return (
    <div className="relative flex-1">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => {
            // Permettre la saisie manuelle
            const newValue = e.target.value;
            onChange({
              id: "",
              name: newValue,
              gender,
            });
            // Fermer le dropdown si on tape
            if (newValue.length > 0) {
              setIsOpen(false);
            }
          }}
          onFocus={handleFocus}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          placeholder={placeholder}
          style={{ minWidth: "120px" }}
        />
        {hasValue && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange({ id: "", name: "", gender });
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="max-h-96 overflow-y-auto p-2">
            {/* Option 1: Join with my profile */}
            {currentUser && (
              <button
                onClick={handleSelectCurrentUser}
                disabled={currentUser.uid !== currentPlayerId && usedUserIds.includes(currentUser.uid)}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                  currentUser.uid !== currentPlayerId && usedUserIds.includes(currentUser.uid)
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-muted/50"
                }`}
              >
                {currentUser.photoURL ? (
                  <Image
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "You"}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    Join with my profile
                    {currentUser.uid !== currentPlayerId && usedUserIds.includes(currentUser.uid) && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (déjà sélectionné)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentUser.displayName || currentUser.email}
                  </div>
                </div>
              </button>
            )}

            {/* Option 2: Search */}
            <div className="mt-2 border-t border-border pt-2">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  autoFocus
                />
              </div>

              {isSearching && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              )}

              {!isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No users found
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-1">
                  {searchResults.map((user) => {
                    const isUsed = user.id !== currentPlayerId && usedUserIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectPlayer(user)}
                        disabled={isUsed}
                        className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                          isUsed
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        {user.photoURL ? (
                          <Image
                            src={user.photoURL}
                            alt={user.displayName}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {user.displayName}
                            {isUsed && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (déjà sélectionné)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Option 3: Recent players */}
            {recentPlayers.filter((user) => user.id !== currentUser?.uid).length > 0 && (
              <div className="mt-2 border-t border-border pt-2">
                <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                  Recent players
                </div>
                <div className="space-y-1">
                  {recentPlayers
                    .filter((user) => user.id !== currentUser?.uid)
                    .map((user) => {
                      const isUsed = user.id !== currentPlayerId && usedUserIds.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleSelectPlayer(user)}
                          disabled={isUsed}
                          className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                            isUsed
                              ? "cursor-not-allowed opacity-50"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          {user.photoURL ? (
                            <Image
                              src={user.photoURL}
                              alt={user.displayName}
                              width={32}
                              height={32}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {user.displayName}
                              {isUsed && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (déjà sélectionné)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

