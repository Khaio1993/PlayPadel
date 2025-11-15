import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes publiques (accessibles sans authentification)
const publicRoutes = ["/"];

// Routes protégées (nécessitent une authentification)
const protectedRoutes = ["/home", "/tournoi", "/calendar", "/profile"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vérifier si la route est protégée
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Vérifier si la route est publique
  const isPublicRoute = publicRoutes.includes(pathname);

  // Si c'est une route protégée, on laisse passer (l'authentification sera gérée côté client)
  // Le middleware Next.js ne peut pas vérifier Firebase Auth directement
  // On utilisera plutôt une protection côté client avec le AuthContext

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

