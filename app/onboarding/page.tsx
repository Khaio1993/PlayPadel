"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { updateUserProfile, getUserById } from "@/lib/users";
import { Loader2, ArrowRight, ArrowLeft, Trophy } from "lucide-react";

type OnboardingStep = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Personal info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Step 2: Gender
  const [gender, setGender] = useState<"M" | "F" | null>(null);

  // Step 3: Level
  const [level, setLevel] = useState("");

  // Step 4: Preferred side
  const [preferredSide, setPreferredSide] = useState<"left" | "right" | null>(null);

  // Charger les données existantes si disponibles
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      const userData = await getUserById(user.uid);
      if (userData) {
        // Pré-remplir depuis Google si disponible
        if (user.displayName && !userData.firstName && !userData.lastName) {
          const nameParts = user.displayName.split(" ");
          if (nameParts.length >= 2) {
            setFirstName(nameParts[0]);
            setLastName(nameParts.slice(1).join(" "));
          } else {
            setFirstName(user.displayName);
          }
        } else {
          setFirstName(userData.firstName || "");
          setLastName(userData.lastName || "");
        }
        setDateOfBirth(userData.dateOfBirth || "");
        setPhoneNumber(userData.phoneNumber || "");
        setGender(userData.gender || null);
        setLevel(userData.level?.toString() || "");
        setPreferredSide(userData.preferredSide || null);
      } else if (user.displayName) {
        // Si pas de données mais qu'on a le displayName de Google
        const nameParts = user.displayName.split(" ");
        if (nameParts.length >= 2) {
          setFirstName(nameParts[0]);
          setLastName(nameParts.slice(1).join(" "));
        } else {
          setFirstName(user.displayName);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // Rediriger si non authentifié
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  const handleNext = async () => {
    if (currentStep === 4) {
      // Finaliser l'onboarding
      await handleComplete();
      return;
    }
    setCurrentStep((prev) => (prev + 1) as OnboardingStep);
  };

  const handleBack = () => {
    if (currentStep === 1) return;
    setCurrentStep((prev) => (prev - 1) as OnboardingStep);
  };

  const handleComplete = async () => {
    if (!user) return;

    // Validation finale
    if (!firstName || !lastName || !dateOfBirth || !gender || !level || !preferredSide) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSaving(true);
    try {
      const displayName = `${firstName} ${lastName}`.trim();
      
      await updateUserProfile(user.uid, {
        firstName,
        lastName,
        displayName,
        dateOfBirth,
        phoneNumber: phoneNumber || undefined,
        gender,
        level: parseFloat(level) || 0,
        preferredSide,
        onboardingCompleted: true,
      });

      // Rediriger vers la page d'accueil
      router.push("/home");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return firstName.trim() && lastName.trim() && dateOfBirth;
      case 2:
        return gender !== null;
      case 3:
        return level && !isNaN(parseFloat(level)) && parseFloat(level) >= 0;
      case 4:
        return preferredSide !== null;
      default:
        return false;
    }
  };

  const progress = (currentStep / 4) * 100;

  if (authLoading) {
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

      {/* Progress bar */}
      <div className="mx-auto max-w-lg px-6 pt-6">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>Étape {currentStep} sur 4</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Contenu principal */}
      <main className="mx-auto max-w-lg px-6 py-8">
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Informations personnelles
              </h1>
              <p className="text-muted-foreground">
                Commençons par en savoir un peu plus sur vous
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Votre prénom"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Nom *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Votre nom"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Date de naissance *
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Numéro de téléphone <span className="text-muted-foreground">(optionnel)</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Gender */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Votre genre
              </h1>
              <p className="text-muted-foreground">
                Cette information ne pourra plus être modifiée par la suite
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setGender("M")}
                className={`w-full rounded-xl border-2 p-6 text-left transition-all ${
                  gender === "M"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-semibold text-foreground">Homme</div>
                    <div className="text-sm text-muted-foreground mt-1">Masculin</div>
                  </div>
                  {gender === "M" && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setGender("F")}
                className={`w-full rounded-xl border-2 p-6 text-left transition-all ${
                  gender === "F"
                    ? "border-[#e05d38] bg-[#e05d38]/10"
                    : "border-border bg-card hover:border-[#e05d38]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-semibold text-foreground">Femme</div>
                    <div className="text-sm text-muted-foreground mt-1">Féminin</div>
                  </div>
                  {gender === "F" && (
                    <div className="h-6 w-6 rounded-full bg-[#e05d38] flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Level */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Votre niveau
              </h1>
              <p className="text-muted-foreground">
                Indiquez votre niveau actuel. Plus vous êtes précis, mieux c&apos;est, mais notre système calculera automatiquement votre niveau lors des tournois et matchs classés 🔥
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-card/80 p-8 shadow-lg border border-border/50">
              <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:20px_20px]" />
              
              <div className="relative text-center">
                <div className="mb-4">
                  <span className="text-6xl font-bold text-primary">
                    {level || "0.00"}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={level}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 10)) {
                      setLevel(value);
                    }
                  }}
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-center text-2xl font-semibold text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00"
                />
                <p className="mt-4 text-sm text-muted-foreground">
                  Niveau de 0.00 à 10.00
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Preferred Side */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Côté préféré
              </h1>
              <p className="text-muted-foreground">
                Choisissez votre côté de jeu préféré sur le terrain
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setPreferredSide("left")}
                className={`w-full rounded-xl border-2 p-6 text-left transition-all ${
                  preferredSide === "left"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-semibold text-foreground">Côté Gauche</div>
                    <div className="text-sm text-muted-foreground mt-1">Gauche du terrain</div>
                  </div>
                  {preferredSide === "left" && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setPreferredSide("right")}
                className={`w-full rounded-xl border-2 p-6 text-left transition-all ${
                  preferredSide === "right"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-semibold text-foreground">Côté Droit</div>
                    <div className="text-sm text-muted-foreground mt-1">Droit du terrain</div>
                  </div>
                  {preferredSide === "right" && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 rounded-xl border-2 border-border bg-card px-6 py-3 font-medium text-foreground transition-all hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-5 w-5" />
            Précédent
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed() || isSaving}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Enregistrement...
              </>
            ) : currentStep === 4 ? (
              <>
                Terminer
                <Trophy className="h-5 w-5" />
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

