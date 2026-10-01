import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { renderCloudSvg } from "../shared/art";
import { GIFTS } from "../shared/catalog";

const outputDirectory = join(import.meta.dirname, "..", "public", "clouds");
await mkdir(outputDirectory, { recursive: true });

await Promise.all(
  GIFTS.map(async (gift) => {
    const outputPath = join(outputDirectory, `${gift.id}.webp`);
    await sharp(Buffer.from(renderCloudSvg(gift)))
      .resize(960, 720, { fit: "cover" })
      .webp({ quality: 92 })
      .toFile(outputPath);
  }),
);

console.log(`Generated ${GIFTS.length} cloud editions in ${outputDirectory}`);
