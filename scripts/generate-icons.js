const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Créer les icônes PWA à partir du logo
async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const logoPath = path.join(publicDir, 'logoPPLight.svg');
  
  // Vérifier si le logo existe
  if (!fs.existsSync(logoPath)) {
    console.error('Logo not found:', logoPath);
    return;
  }

  // Créer une icône 192x192
  await sharp(logoPath)
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 26, g: 33, b: 45, alpha: 1 } // Couleur de fond dark mode
    })
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  console.log('✓ Created icon-192.png');

  // Créer une icône 512x512
  await sharp(logoPath)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 26, g: 33, b: 45, alpha: 1 } // Couleur de fond dark mode
    })
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  console.log('✓ Created icon-512.png');
  console.log('✓ Icons generated successfully!');
}

generateIcons().catch(console.error);

