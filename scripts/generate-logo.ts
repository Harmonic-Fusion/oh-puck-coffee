#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import toIco from "to-ico";

const ESPRESSO_CUP_SVG = join(__dirname, "../public/icons/espresso-cup-thumb.svg");
const OUTPUT_DIR = join(__dirname, "../public/icons");
const FAVICON_OUTPUT = join(__dirname, "../src/app/favicon.ico");

async function generateLogo() {
  console.log("☕ Generating logo from espresso cup image...");

  // Read the espresso cup SVG and extract inner content
  const svgContent = readFileSync(ESPRESSO_CUP_SVG, "utf-8");
  // Extract content between <svg> tags (remove svg wrapper)
  const innerContent = svgContent
    .replace(/<svg[^>]*>/, "")
    .replace("</svg>", "")
    .trim();

  // Generate icon-192.svg - embed espresso cup in a 192x192 canvas with dark background
  // Scale: 192/32 = 6, but use 4.5 for padding (centered: (192 - 32*4.5)/2 = 24)
  const icon192Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <rect width="192" height="192" rx="32" fill="#1c1917"/>
  <g transform="translate(24, 24) scale(4.5)">
    ${innerContent}
  </g>
</svg>`;

  writeFileSync(join(OUTPUT_DIR, "icon-192.svg"), icon192Svg);
  console.log("✓ Generated icon-192.svg");

  // Generate icon-512.svg - embed espresso cup in a 512x512 canvas with dark background
  // Scale: 512/32 = 16, but use 12 for padding (centered: (512 - 32*12)/2 = 64)
  const icon512Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#1c1917"/>
  <g transform="translate(64, 64) scale(12)">
    ${innerContent}
  </g>
</svg>`;

  writeFileSync(join(OUTPUT_DIR, "icon-512.svg"), icon512Svg);
  console.log("✓ Generated icon-512.svg");

  // Generate favicon.ico - convert SVG to ICO format
  try {
    // Convert SVG to PNG at multiple sizes for ICO
    const sizes = [16, 32, 48];
    const pngBuffers = await Promise.all(
      sizes.map((size) =>
        sharp(Buffer.from(icon192Svg))
          .resize(size, size)
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
    const pngBuffer = await sharp(Buffer.from(icon192Svg))
      .resize(32, 32)
      .png()
      .toBuffer();
    writeFileSync(FAVICON_OUTPUT.replace(".ico", ".png"), pngBuffer);
    console.log("⚠ Generated favicon.png as fallback");
  }

  console.log("\n✅ Logo generation complete!");
  console.log(`   - ${join(OUTPUT_DIR, "icon-192.svg")}`);
  console.log(`   - ${join(OUTPUT_DIR, "icon-512.svg")}`);
  console.log(`   - ${FAVICON_OUTPUT}`);
}

generateLogo().catch((error) => {
  console.error("Error generating logo:", error);
  process.exit(1);
});
