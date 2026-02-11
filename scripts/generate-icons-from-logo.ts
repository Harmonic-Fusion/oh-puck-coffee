#!/usr/bin/env tsx

import { join } from "path";
import { writeFileSync } from "fs";
import sharp from "sharp";
import toIco from "to-ico";

const SOLID_LOGO = join(__dirname, "../public/logos/logo-solid.png");
const OUTPUT_DIR = join(__dirname, "../public/icons");
const FAVICON_OUTPUT = join(__dirname, "../src/app/favicon.ico");

async function generateIconsFromLogo() {
  console.log("☕ Generating icons and favicon from solid logo...");

  // Read the solid logo
  const logoBuffer = await sharp(SOLID_LOGO).toBuffer();

  // Generate icon-192.png - resize to 192x192
  const icon192Buffer = await sharp(logoBuffer)
    .resize(192, 192, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
    })
    .png()
    .toBuffer();

  writeFileSync(join(OUTPUT_DIR, "icon-192.png"), icon192Buffer);
  console.log("✓ Generated icon-192.png");

  // Generate icon-512.png - resize to 512x512
  const icon512Buffer = await sharp(logoBuffer)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
    })
    .png()
    .toBuffer();

  writeFileSync(join(OUTPUT_DIR, "icon-512.png"), icon512Buffer);
  console.log("✓ Generated icon-512.png");

  // Generate favicon.ico - convert PNG to ICO format with multiple sizes
  try {
    const sizes = [16, 32, 48];
    const pngBuffers = await Promise.all(
      sizes.map((size) =>
        sharp(logoBuffer)
          .resize(size, size, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
          })
          .png()
          .toBuffer()
      )
    );

    // Convert PNG buffers to ICO
    const icoBuffer = await toIco(pngBuffers);
    writeFileSync(FAVICON_OUTPUT, icoBuffer);
    console.log("✓ Generated favicon.ico");
  } catch (error) {
    console.error("Error generating favicon.ico:", error);
    // Fallback: generate a simple PNG favicon
    const pngBuffer = await sharp(logoBuffer)
      .resize(32, 32, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    writeFileSync(FAVICON_OUTPUT.replace(".ico", ".png"), pngBuffer);
    console.log("⚠ Generated favicon.png as fallback");
  }

  console.log("\n✅ Icon generation complete!");
  console.log(`   - ${join(OUTPUT_DIR, "icon-192.png")}`);
  console.log(`   - ${join(OUTPUT_DIR, "icon-512.png")}`);
  console.log(`   - ${FAVICON_OUTPUT}`);
}

generateIconsFromLogo().catch((error) => {
  console.error("Error generating icons:", error);
  process.exit(1);
});
