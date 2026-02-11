#!/usr/bin/env tsx

import { join } from "path";
import sharp from "sharp";

const LOGO_PATH = join(__dirname, "../logo.png");
const OUTPUT_PATH = join(__dirname, "../logo-transparent.png");

async function removeBackground() {
  console.log("🎨 Removing background from logo...");

  try {
    // Load the image
    const image = sharp(LOGO_PATH);
    const metadata = await image.metadata();
    
    console.log(`   Image dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`   Format: ${metadata.format}`);

    // Get the raw pixel data
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Process pixels: make white/near-white pixels transparent
    const threshold = 240; // Pixels with RGB values above this will be made transparent
    const pixels = new Uint8ClampedArray(data);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // If the pixel is white or near-white, make it transparent
      if (r >= threshold && g >= threshold && b >= threshold) {
        pixels[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    // Create new image with transparent background
    const output = await sharp(pixels, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .png()
      .toFile(OUTPUT_PATH);

    console.log(`\n✅ Background removed successfully!`);
    console.log(`   Output saved to: ${OUTPUT_PATH}`);
    console.log(`   Size: ${output.width}x${output.height}`);
  } catch (error) {
    console.error("❌ Error removing background:", error);
    process.exit(1);
  }
}

removeBackground().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
