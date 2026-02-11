#!/usr/bin/env tsx

import { join } from "path";
import { writeFileSync } from "fs";
import sharp from "sharp";

const INPUT_IMAGE = join(__dirname, "../Icon No Background.png");
const OUTPUT_IMAGE = join(__dirname, "../Icon Monochrome.png");

// Color to use for all non-background pixels (RGB values 0-255)
// Default: black (0, 0, 0). Change to any color you want, e.g.:
// - Dark gray: { r: 64, g: 64, b: 64 }
// - White: { r: 255, g: 255, b: 255 }
// - Any color: { r: 100, g: 150, b: 200 }
const MONOCHROME_COLOR = { r: 0, g: 0, b: 0 }; // Black

async function flattenToMonochrome() {
  console.log("🎨 Converting all non-background pixels to a single color...");
  console.log(`   Using color: RGB(${MONOCHROME_COLOR.r}, ${MONOCHROME_COLOR.g}, ${MONOCHROME_COLOR.b})`);

  try {
    // Read the input image
    const image = sharp(INPUT_IMAGE);

    // Get image metadata to check current format
    const metadata = await image.metadata();
    console.log(`📐 Input image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

    // Get the raw pixel data to extract alpha channel properly
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Create a new buffer with the monochrome color and original alpha
    const channels = info.channels;
    const width = info.width;
    const height = info.height;
    const newData = Buffer.allocUnsafe(width * height * channels);

    for (let i = 0; i < width * height; i++) {
      const pixelOffset = i * channels;
      const alphaOffset = pixelOffset + 3; // Alpha is the 4th channel (index 3)
      
      // Set RGB to monochrome color
      newData[pixelOffset] = MONOCHROME_COLOR.r;     // R
      newData[pixelOffset + 1] = MONOCHROME_COLOR.g; // G
      newData[pixelOffset + 2] = MONOCHROME_COLOR.b; // B
      // Preserve original alpha
      newData[alphaOffset] = data[alphaOffset];
    }

    // Create the final image from the processed buffer
    const processedBuffer = await sharp(newData, {
      raw: {
        width: width,
        height: height,
        channels: channels
      }
    })
      .png()
      .toBuffer();

    // Write the output
    writeFileSync(OUTPUT_IMAGE, processedBuffer);
    console.log(`✅ Generated monochrome image: ${OUTPUT_IMAGE}`);

    // Get output metadata
    const outputMetadata = await sharp(processedBuffer).metadata();
    console.log(`📐 Output image: ${outputMetadata.width}x${outputMetadata.height}, format: ${outputMetadata.format}`);
    console.log(`\n✨ Done! All non-background pixels have been converted to a single color.`);
  } catch (error) {
    console.error("❌ Error processing image:", error);
    process.exit(1);
  }
}

flattenToMonochrome().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
