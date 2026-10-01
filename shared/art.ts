import type { CloudPattern, Gift } from "./catalog";

const ORANGE = "#f48120";
const INK = "#1b1a18";
const PAPER = "#f5f0e5";

const CLOUD_PATHS = [
  "M120 316 C82 300 72 246 102 218 C120 201 144 197 165 206 C171 157 210 122 258 126 C293 129 320 149 334 178 C354 155 383 145 412 152 C453 161 480 197 474 236 C507 238 534 266 532 301 C530 330 508 350 476 352 L153 352 C139 352 127 339 120 316 Z",
  "M105 323 C78 302 77 261 99 237 C115 220 137 213 159 218 C168 168 208 139 251 143 C283 146 308 165 321 192 C342 165 374 153 406 162 C443 172 465 205 460 241 C500 239 530 269 528 306 C526 335 503 354 470 354 L145 354 C127 354 114 343 105 323 Z",
  "M112 320 C80 298 82 250 108 228 C124 214 145 210 164 217 C180 167 219 141 263 147 C295 152 318 173 327 199 C351 170 389 161 421 177 C452 192 468 223 460 253 C497 253 523 280 519 315 C516 339 496 355 468 355 L148 355 C131 355 119 342 112 320 Z",
] as const;

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function patternMarkup(pattern: CloudPattern, clipId: string): string {
  const clip = `clip-path="url(#${clipId})"`;

  switch (pattern) {
    case "pocket":
      return `<path d="${CLOUD_PATHS[0]}" fill="${ORANGE}" transform="translate(84 58) scale(.72)"/>`;
    case "solid":
      return `<path d="${CLOUD_PATHS[1]}" fill="${ORANGE}"/>`;
    case "outline":
      return "";
    case "vertical":
      return `<g ${clip}>${Array.from({ length: 10 }, (_, index) => `<rect x="${112 + index * 40}" y="120" width="15" height="250" rx="7" fill="${ORANGE}"/>`).join("")}</g>`;
    case "horizontal":
      return `<g ${clip}>${Array.from({ length: 7 }, (_, index) => `<rect x="82" y="${157 + index * 30}" width="450" height="11" rx="5" fill="${ORANGE}"/>`).join("")}</g>`;
    case "grid":
      return `<g ${clip}>${Array.from({ length: 9 }, (_, index) => `<rect x="${116 + index * 42}" y="130" width="10" height="240" fill="${ORANGE}"/>`).join("")}${Array.from({ length: 6 }, (_, index) => `<rect x="90" y="${173 + index * 34}" width="440" height="10" fill="${ORANGE}"/>`).join("")}</g>`;
    case "spiral":
      return `<g ${clip} fill="none" stroke="${ORANGE}" stroke-width="13" stroke-linecap="round"><path d="M150 309 C114 264 146 212 197 220 C244 228 248 290 210 304 C175 317 154 281 174 258 C191 239 219 253 214 274"/><path d="M274 288 C239 245 267 190 319 194 C370 198 381 262 342 283 C304 304 276 269 294 242 C309 221 340 228 340 254"/><path d="M386 304 C360 269 379 225 421 227 C462 228 474 279 444 299 C414 320 389 292 401 270 C411 250 436 253 438 274"/></g>`;
    case "wave":
      return `<g ${clip} fill="none" stroke="${ORANGE}" stroke-width="16" stroke-linecap="round"><path d="M110 277 C145 224 176 328 213 274 S279 222 315 276 S383 326 421 273 S483 225 521 275"/></g>`;
  }
}

export function renderCloudSvg(gift: Gift): string {
  const cloudPath = CLOUD_PATHS[(gift.variant - 1) % CLOUD_PATHS.length];
  const clipId = `cloud-shape-${gift.number}`;
  const title = escapeXml(gift.name);
  const number = String(gift.number).padStart(2, "0");
  const artwork = patternMarkup(gift.pattern, clipId);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img" aria-labelledby="title description">
  <title id="title">Cloud ${number}: ${title}</title>
  <desc id="description">An orange and black hand-drawn cloud edition.</desc>
  <defs>
    <filter id="paper" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="${gift.number}" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
      <feComponentTransfer in="gray"><feFuncA type="table" tableValues="0 .055"/></feComponentTransfer>
    </filter>
    <filter id="wobble"><feTurbulence baseFrequency=".012" numOctaves="2" seed="${gift.number + 10}" result="turbulence"/><feDisplacementMap in="SourceGraphic" in2="turbulence" scale="2.2"/></filter>
    <clipPath id="${clipId}"><path d="${cloudPath}"/></clipPath>
  </defs>
  <rect width="640" height="480" rx="22" fill="${PAPER}"/>
  <rect width="640" height="480" rx="22" filter="url(#paper)" opacity=".5"/>
  <g filter="url(#wobble)">
    ${artwork}
    <path d="${cloudPath}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g fill="${INK}">
    <text x="40" y="55" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="16" letter-spacing="2">CLOUD ${number}</text>
    <text x="600" y="431" text-anchor="end" font-family="Georgia, serif" font-size="14" font-style="italic">one of one</text>
  </g>
</svg>`;
}
