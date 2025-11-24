"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import BottomNav from "../components/BottomNav";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { getUserById, updateUserProfile, getUserFullName } from "@/lib/users";
import { uploadProfileImage } from "@/lib/storage";
import { 
  LogOut, 
  Mail, 
  User as UserIcon, 
  Edit2, 
  Save, 
  X, 
  Calendar,
  Phone,
  Loader2,
  Camera,
  Trophy
} from "lucide-react";
import { UserProfile } from "@/lib/users";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // État pour l'édition
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [preferredSide, setPreferredSide] = useState<"left" | "right" | null>(null);

  // Charger le profil une seule fois au mount et quand user change
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const profile = await getUserById(user.uid);
        if (profile) {
          setUserProfile(profile);
          // Initialiser les champs seulement si on n'est pas en mode édition
          if (!isEditing) {
            setFirstName(profile.firstName || "");
            setLastName(profile.lastName || "");
            setDateOfBirth(profile.dateOfBirth || "");
            setPhoneNumber(profile.phoneNumber || "");
            setPreferredSide(profile.preferredSide || null);
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Seulement dépendre de user, pas de isEditing

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Restaurer les valeurs originales
    if (userProfile) {
      setFirstName(userProfile.firstName || "");
      setLastName(userProfile.lastName || "");
      setDateOfBirth(userProfile.dateOfBirth || "");
      setPhoneNumber(userProfile.phoneNumber || "");
      setPreferredSide(userProfile.preferredSide || null);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user || !userProfile) return;

    setIsSaving(true);
    try {
      const displayName = `${firstName} ${lastName}`.trim();
      
      // Préparer les données en ne gardant que les valeurs non vides
      const profileData: any = {
        firstName,
        lastName,
        displayName,
        dateOfBirth,
      };
      
      // Ajouter phoneNumber seulement s'il n'est pas vide
      if (phoneNumber && phoneNumber.trim().length > 0) {
        profileData.phoneNumber = phoneNumber.trim();
      }
      
      // Ajouter preferredSide seulement s'il est défini
      if (preferredSide) {
        profileData.preferredSide = preferredSide;
      }
      
      await updateUserProfile(user.uid, profileData);

      // Mettre à jour l'état local directement sans recharger
      setUserProfile({
        ...userProfile,
        firstName,
        lastName,
        displayName,
        dateOfBirth,
        phoneNumber: phoneNumber && phoneNumber.trim().length > 0 ? phoneNumber.trim() : undefined,
        preferredSide: preferredSide || undefined,
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!user || !event.target.files || event.target.files.length === 0) {
      // Réinitialiser l'input si aucun fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const file = event.target.files[0];
    
    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image est trop grande. Taille maximale : 5MB");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setIsUploadingImage(true);
    try {
      const imageUrl = await uploadProfileImage(user.uid, file);
      
      // Mettre à jour le profil avec la nouvelle URL
      await updateUserProfile(user.uid, {
        photoURL: imageUrl,
      });

      // Mettre à jour l'état local directement sans recharger
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          photoURL: imageUrl,
        });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Erreur lors de l'upload de l'image. Veuillez réessayer.");
    } finally {
      setIsUploadingImage(false);
      // Réinitialiser l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const resolvedFullName = userProfile ? getUserFullName(userProfile) || "Utilisateur" : "Utilisateur";

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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

          {/* Carte utilisateur avec avatar et infos */}
          {user && userProfile && (
            <div className="mt-8 rounded-2xl bg-card border border-border p-6 shadow-sm">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {/* Prioriser userProfile.photoURL (uploadée) sur user.photoURL (Google) */}
                  {userProfile?.photoURL ? (
                    <Image
                      src={userProfile.photoURL}
                      alt={resolvedFullName}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={resolvedFullName}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                      <UserIcon className="h-10 w-10 text-primary" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    disabled={isUploadingImage}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleImageUpload(e);
                    }}
                    className="hidden"
                  />
                </div>

                {/* Infos utilisateur */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-foreground mb-3">
                    {resolvedFullName}
                  </h2>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {/* Gender tag */}
                    {userProfile.gender && (
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${
                        userProfile.gender === "M" 
                          ? "bg-primary/10 border-primary/20" 
                          : "bg-[#e05d38]/10 border-[#e05d38]/20"
                      }`}>
                        <div className={`h-2 w-2 rounded-full ${
                          userProfile.gender === "M" ? "bg-primary" : "bg-[#e05d38]"
                        }`} />
                        <span className={`text-sm font-medium ${
                          userProfile.gender === "M" ? "text-primary" : "text-[#e05d38]"
                        }`}>
                          {userProfile.gender === "M" ? "Homme" : "Femme"}
                        </span>
                      </div>
                    )}
                    
                    {/* Preferred side tag */}
                    {userProfile.preferredSide && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 border border-border">
                        <span className="text-sm font-medium text-foreground">
                          {userProfile.preferredSide === "left" ? "⬅️ Gauche" : "➡️ Droit"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Niveau */}
          {userProfile && (
            <div className="mt-8 mb-8">
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Votre niveau
              </h3>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-card/80 p-6 shadow-lg border border-border/50">
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:20px_20px]" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="text-5xl font-bold text-primary">
                        {userProfile.level !== undefined ? userProfile.level.toFixed(2) : "0.00"}
                      </span>
                      <span className="ml-2 text-2xl font-semibold text-muted-foreground">Level</span>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-sm text-muted-foreground">Level reliability:</span>
                      <span className="text-lg font-semibold text-foreground">0%</span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border">
                        Faible
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Informations utilisateur */}
          {userProfile && (
            <div className="mt-8 space-y-4 rounded-2xl bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Informations personnelles
                </h2>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/20"
                  >
                    <Edit2 className="h-4 w-4" />
                    Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted/80"
                    >
                      <X className="h-4 w-4" />
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Sauvegarder
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Prénom */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Prénom *
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Votre prénom"
                    />
                  ) : (
                    <div className="rounded-lg border border-border bg-background px-4 py-3 text-foreground">
                      {userProfile.firstName || "Non défini"}
                    </div>
                  )}
                </div>

                {/* Nom */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Nom *
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Votre nom"
                    />
                  ) : (
                    <div className="rounded-lg border border-border bg-background px-4 py-3 text-foreground">
                      {userProfile.lastName || "Non défini"}
                    </div>
                  )}
                </div>

                {/* Email (non éditable) */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <div className="rounded-lg border border-border bg-background px-4 py-3 text-foreground">
                    {userProfile.email || user?.email || "Non défini"}
                  </div>
                </div>

                {/* Date de naissance */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Calendar className="h-4 w-4" />
                    Date de naissance
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  ) : (
                    <div className="rounded-lg border border-border bg-background px-4 py-3 text-foreground">
                      {userProfile.dateOfBirth 
                        ? new Date(userProfile.dateOfBirth).toLocaleDateString("fr-FR")
                        : "Non défini"}
                    </div>
                  )}
                </div>

                {/* Téléphone */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Phone className="h-4 w-4" />
                    Téléphone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="+33 6 12 34 56 78"
                    />
                  ) : (
                    <div className="rounded-lg border border-border bg-background px-4 py-3 text-foreground">
                      {userProfile.phoneNumber || "Non défini"}
                    </div>
                  )}
                </div>

                {/* Côté préféré */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Côté préféré
                  </label>
                  {isEditing ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setPreferredSide("left")}
                        className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                          preferredSide === "left"
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        <div className="font-medium text-foreground">Gauche</div>
                      </button>
                      <button
                        onClick={() => setPreferredSide("right")}
                        className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                          preferredSide === "right"
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        <div className="font-medium text-foreground">Droit</div>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-background px-4 py-3 text-foreground">
                      {userProfile.preferredSide === "left" 
                        ? "Gauche" 
                        : userProfile.preferredSide === "right" 
                        ? "Droit" 
                        : "Non défini"}
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
