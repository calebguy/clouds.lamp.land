import { mkdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import sharp from "sharp";
import { GIFTS } from "../shared/catalog";

const inputArgument = process.argv[2];
if (inputArgument === undefined) {
  throw new Error(
    "Usage: bun run import:clouds -- /path/to/numbered-clouds-or-sheet",
  );
}

const sourcePath = resolve(inputArgument);
const sourceStats = await stat(sourcePath);
const outputDirectory = join(import.meta.dirname, "..", "public", "clouds");
await mkdir(outputDirectory, { recursive: true });

if (sourceStats.isDirectory()) {
  await importNumberedClouds(sourcePath);
} else {
  await importCloudSheet(sourcePath);
}

console.log(`Imported ${GIFTS.length} hand-drawn clouds from ${sourcePath}`);

async function importNumberedClouds(sourceDirectory: string): Promise<void> {
  await Promise.all(
    GIFTS.map(async (gift) => {
      const sourceFile = join(sourceDirectory, `${gift.number}.png`);
      await sharp(sourceFile, { limitInputPixels: 80_000_000 })
        .ensureAlpha()
        .resize(960, 720, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 94, alphaQuality: 100 })
        .toFile(join(outputDirectory, `${gift.id}.webp`));
    }),
  );
}

async function importCloudSheet(sheetPath: string): Promise<void> {
  const supportedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"];
  if (!supportedExtensions.includes(extname(sheetPath).toLowerCase())) {
    throw new Error("The source sheet must be a JPG, PNG, WebP, or TIFF image");
  }

  const source = sharp(sheetPath, { limitInputPixels: 80_000_000 });
  const metadata = await source.metadata();
  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error("Could not read the source sheet dimensions");
  }

  const photographedSheet = metadata.width > metadata.height;
  const oriented = photographedSheet ? source.rotate(90) : source;
  const orientedWidth = photographedSheet ? metadata.height : metadata.width;
  const orientedHeight = photographedSheet ? metadata.width : metadata.height;
  const paperBounds = photographedSheet
    ? { left: 0.138, top: 0.135, width: 0.752, height: 0.726 }
    : { left: 0, top: 0, width: 1, height: 1 };
  const paperLeft = Math.round(orientedWidth * paperBounds.left);
  const paperTop = Math.round(orientedHeight * paperBounds.top);
  const paperWidth = Math.round(orientedWidth * paperBounds.width);
  const paperHeight = Math.round(orientedHeight * paperBounds.height);
  const page = await oriented
    .extract({ left: paperLeft, top: paperTop, width: paperWidth, height: paperHeight })
    .toBuffer();
  const rowCount = 8;
  const columnCount = 3;
  const cellWidth = paperWidth / columnCount;
  const cellHeight = paperHeight / rowCount;
  const horizontalInset = Math.round(cellWidth * 0.08);
  const verticalInset = Math.round(cellHeight * 0.08);

  await Promise.all(
    GIFTS.map(async (gift, index) => {
      const row = Math.floor(index / columnCount);
      const column = index % columnCount;
      const left = Math.round(column * cellWidth) + horizontalInset;
      const top = Math.round(row * cellHeight) + verticalInset;
      const width = Math.round(cellWidth) - horizontalInset * 2;
      const height = Math.round(cellHeight) - verticalInset * 2;

      await sharp(page)
        .extract({ left, top, width, height })
        .resize(960, 720, {
          fit: "contain",
          background: { r: 247, g: 243, b: 234, alpha: 1 },
        })
        .webp({ quality: 94 })
        .toFile(join(outputDirectory, `${gift.id}.webp`));
    }),
  );
}
