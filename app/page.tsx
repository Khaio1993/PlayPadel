"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      {/* Image de fond en plein écran */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/GetStartedImage.png"
          alt="Terrain de padel"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </div>

      {/* Overlay avec gradient blur progressif en haut */}
      <div className="absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-background/90 via-background/50 via-30% to-transparent backdrop-blur-md" />
      
      {/* Deuxième layer de gradient pour plus de fluidité */}
      <div className="absolute inset-x-0 top-0 z-[9] h-64 bg-gradient-to-b from-background/60 via-background/20 via-40% to-transparent" />

      {/* Overlay sombre subtil pour améliorer la lisibilité */}
      <div className="absolute inset-0 z-[5] bg-black/5" />

      {/* Contenu */}
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-between px-6 py-12 pb-8">
        {/* Logo en haut */}
        <div className="w-full max-w-[200px] pt-4">
          {/* Logo Light - visible en mode clair */}
          <Image
            src="/logoPPLight.svg"
            alt="PlayPadel Logo"
            width={600}
            height={200}
            priority
            className="h-auto w-full drop-shadow-lg dark:hidden"
          />
          {/* Logo Dark - visible en mode sombre */}
          <Image
            src="/logoPPDark.svg"
            alt="PlayPadel Logo"
            width={600}
            height={200}
            priority
            className="hidden h-auto w-full drop-shadow-lg dark:block"
          />
        </div>

        {/* Texte central */}
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white drop-shadow-2xl text-center px-4">
            Whenever you want.
          </h1>
        </div>

        {/* Bouton Get Started en bas */}
        <div className="w-full max-w-md">
          <Link href="/home">
            <button className="w-full rounded-full bg-white px-8 py-4 text-lg font-semibold text-black shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-95">
              Get started
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
