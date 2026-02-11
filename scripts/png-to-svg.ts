#!/usr/bin/env tsx

import { join } from "path";
import { writeFileSync } from "fs";
import sharp from "sharp";
import potrace from "potrace";

const INPUT_IMAGE = join(__dirname, "../Icon Monochrome.png");
const OUTPUT_SVG = join(__dirname, "../Icon Monochrome.svg");

// Potrace options for better Figma compatibility
const POTRACE_OPTIONS = {
  threshold: 128, // Threshold for black/white (0-255)
  optTolerance: 0.4, // Curve optimization tolerance (lower = more accurate, more points)
  turdSize: 2, // Remove small spots smaller than this
  optCurve: true, // Optimize curves
  color: '#000000', // Color of the traced paths
  background: 'transparent', // Background color (transparent for Figma)
};

async function convertPngToSvg() {
  console.log("🎨 Converting PNG to editable SVG for Figma...");
  console.log(`   Input: ${INPUT_IMAGE}`);
  console.log(`   Output: ${OUTPUT_SVG}`);

  try {
    // Read the input image
    const image = sharp(INPUT_IMAGE);
    const metadata = await image.metadata();
    console.log(`📐 Input image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

    // Convert to a format potrace can work with (PNG buffer is fine)
    const imageBuffer = await image.png().toBuffer();

    // Trace the image to SVG using potrace
    console.log("🔄 Tracing image to vector paths...");
    
    // Wrap potrace callback in a promise
    const svg = await new Promise<string>((resolve, reject) => {
      potrace.trace(imageBuffer, POTRACE_OPTIONS, (err, svg) => {
        if (err) {
          reject(err);
        } else {
          resolve(svg);
        }
      });
    });

    // Write the SVG file
    writeFileSync(OUTPUT_SVG, svg);
    console.log(`✅ Generated SVG: ${OUTPUT_SVG}`);
    console.log(`\n✨ Done! The SVG is ready to import into Figma.`);
    console.log(`   The paths are editable and you can modify the design.`);

  } catch (error) {
    console.error("❌ Error processing image:", error);
    process.exit(1);
  }
}

convertPngToSvg().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
