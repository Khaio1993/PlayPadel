"use client";

import Image from "next/image";
import BottomNav from "../components/BottomNav";

export default function CalendarPage() {
  return (
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
        <h1 className="text-3xl font-bold text-foreground">Calendrier</h1>
        <p className="mt-2 text-muted-foreground">
          Vos prochains tournois et événements
        </p>
        <div className="mt-8 flex h-64 items-center justify-center rounded-xl bg-muted/30">
          <p className="text-muted-foreground">Bientôt disponible</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

