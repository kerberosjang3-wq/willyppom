// Run: node public/icons/generate-icons.js (requires sharp: npm i sharp -D)
// This script generates PNG icons from SVG.
// For CI/CD use, icons are pre-generated and committed to repo.
const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, 'icon.svg');

async function generate() {
  await sharp(svgPath).resize(192, 192).png().toFile(path.join(__dirname, 'icon-192.png'));
  await sharp(svgPath).resize(512, 512).png().toFile(path.join(__dirname, 'icon-512.png'));
  console.log('Icons generated!');
}

generate().catch(console.error);
