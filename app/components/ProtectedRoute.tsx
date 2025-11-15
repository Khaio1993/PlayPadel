"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { getUserById } from "@/lib/users";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }

    // Vérifier l'onboarding si l'utilisateur est connecté et n'est pas déjà sur la page onboarding
    if (!loading && user && pathname !== "/onboarding") {
      checkOnboarding();
    } else if (pathname === "/onboarding") {
      // Si on est sur la page onboarding, ne pas vérifier (pour éviter la boucle)
      setCheckingOnboarding(false);
    } else {
      setCheckingOnboarding(false);
    }
  }, [user, loading, router, pathname]);

  const checkOnboarding = async () => {
    if (!user) return;

    try {
      const userData = await getUserById(user.uid);
      if (!userData || !userData.onboardingCompleted) {
        // Rediriger vers l'onboarding
        router.push("/onboarding");
        return;
      }
    } catch (error) {
      console.error("Error checking onboarding:", error);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  if (loading || checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

