import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('./public/icon.svg')

// ساخت PNG 512x512
await sharp(svg)
  .resize(512, 512)
  .png()
  .toFile('./public/icon-512.png')

// ساخت PNG 192x192  
await sharp(svg)
  .resize(192, 192)
  .png()
  .toFile('./public/icon-192.png')

console.log('Icons generated!')