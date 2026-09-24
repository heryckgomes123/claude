// Renders the AIVA SVG logo into the PNG sizes required by PWA / iOS / Android.
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const icon = await readFile("public/icons/aiva-icon.svg");
const mark = await readFile("public/icons/aiva-mark.svg");

for (const size of [192, 512]) await sharp(icon).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
await sharp(icon).resize(180, 180).png().toFile("src/app/apple-icon.png");

// Maskable: full-bleed background with the mark inside the 80% safe zone.
const bg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><radialGradient id="b" cx="30%" cy="18%" r="110%"><stop offset="0" stop-color="#241A4D"/><stop offset=".55" stop-color="#0E0B1F"/><stop offset="1" stop-color="#07070C"/></radialGradient></defs><rect width="512" height="512" fill="url(#b)"/></svg>`,
);
const inner = await sharp(mark).resize(330, 330).png().toBuffer();
await sharp(bg).composite([{ input: inner, top: 91, left: 91 }]).png().toFile("public/icons/maskable-512.png");

// iOS splash screens (portrait) for common iPhone sizes.
const splashes = [
  [1170, 2532], // iPhone 12–14
  [1179, 2556], // iPhone 14 Pro / 15 / 16
  [1290, 2796], // Pro Max
  [1206, 2622], // iPhone 16 Pro
  [750, 1334], // SE
];
for (const [w, h] of splashes) {
  const s = Math.round(w * 0.28);
  const logo = await sharp(icon).resize(s, s).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: "#07070C" } })
    .composite([{ input: logo, top: Math.round(h / 2 - s / 2 - h * 0.04), left: Math.round(w / 2 - s / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(`public/icons/splash-${w}x${h}.png`);
}
await writeFile("src/app/icon.svg", icon);
console.log("icons generated");
