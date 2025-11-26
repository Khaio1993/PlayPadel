"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, User, Calendar } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/home", icon: Home, label: "Accueil" },
    { href: "/tournoi", icon: Trophy, label: "Tournoi" },
    { href: "/calendar", icon: Calendar, label: "Calendrier" },
    { href: "/profile", icon: User, label: "Profil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto flex h-20 max-w-lg items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 transition-all duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`transition-all duration-200 ${
                  isActive ? "h-6 w-6 stroke-[2.5]" : "h-5 w-5"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  isActive ? "font-semibold" : ""
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

