"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Mail, User as UserIcon } from "lucide-react";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24">
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

      <main className="mx-auto max-w-lg px-6 py-8">
        <h1 className="text-3xl font-bold text-foreground">Profil</h1>
        <p className="mt-2 text-muted-foreground">
          Gérez votre compte et vos préférences
        </p>

        {/* Informations utilisateur */}
        {user && (
          <div className="mt-8 space-y-4 rounded-2xl bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <UserIcon className="h-8 w-8 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {user.displayName || "Utilisateur"}
                </h2>
                {user.email && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bouton de déconnexion */}
        <div className="mt-6">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-destructive/20 bg-destructive/10 px-6 py-4 font-semibold text-destructive transition-all hover:bg-destructive/20 active:scale-95"
          >
            <LogOut className="h-5 w-5" />
            Se déconnecter
          </button>
        </div>
      </main>

      <BottomNav />
      </div>
    </ProtectedRoute>
  );
}

