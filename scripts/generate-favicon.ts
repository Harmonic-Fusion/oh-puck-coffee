#!/usr/bin/env tsx

import { join } from "path";
import { writeFileSync } from "fs";
import sharp from "sharp";
import toIco from "to-ico";

const LOGO_SIMPLE = join(__dirname, "../public/logos/logo_simple.png");
const FAVICON_OUTPUT = join(__dirname, "../src/app/favicon.ico");

async function generateFavicon() {
  console.log("☕ Generating favicon from logo_simple.png...");

  // Read the logo_simple.png
  const logoBuffer = await sharp(LOGO_SIMPLE).toBuffer();

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

  console.log("\n✅ Favicon generation complete!");
  console.log(`   - ${FAVICON_OUTPUT}`);
}

generateFavicon().catch((error) => {
  console.error("Error generating favicon:", error);
  process.exit(1);
});
