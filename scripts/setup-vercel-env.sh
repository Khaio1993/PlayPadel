#!/bin/bash

# Script pour configurer les variables d'environnement Firebase sur Vercel
# Usage: ./scripts/setup-vercel-env.sh

echo "Configuration des variables d'environnement Firebase sur Vercel..."
echo ""

# Supprimer les anciennes variables
echo "Suppression des anciennes variables..."
vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY --yes
vercel env rm NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN --yes
vercel env rm NEXT_PUBLIC_FIREBASE_PROJECT_ID --yes
vercel env rm NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET --yes
vercel env rm NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --yes
vercel env rm NEXT_PUBLIC_FIREBASE_APP_ID --yes

echo ""
echo "Ajout des nouvelles variables (vous devrez entrer les valeurs)..."

# Ajouter les variables (l'utilisateur devra entrer les valeurs)
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production preview development
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production preview development
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production preview development
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production preview development
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production preview development
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production preview development

echo ""
echo "✅ Variables d'environnement configurées !"
echo "Vous pouvez maintenant redéployer avec: vercel --prod"

