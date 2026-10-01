export const GIFT_PRICE_USD = "0.0402";
export const GIFT_PRICE_ATOMIC_UNITS = "40200";

export interface Gift {
  id: string;
  number: number;
  name: string;
  description: string;
  moods: readonly string[];
  occasions: readonly string[];
  pattern: CloudPattern;
  variant: number;
}

export const CLOUD_PATTERNS = [
  "pocket",
  "solid",
  "outline",
  "vertical",
  "horizontal",
  "grid",
  "spiral",
  "wave",
] as const;
export type CloudPattern = (typeof CLOUD_PATTERNS)[number];

const editions: ReadonlyArray<Omit<Gift, "id" | "number">> = [
  { name: "Pocket Forecast", description: "A tiny orange system with one optimistic process.", moods: ["hopeful", "small"], occasions: ["encouragement", "new-start"], pattern: "pocket", variant: 1 },
  { name: "Small but Operational", description: "Not much cloud, but more than enough uptime.", moods: ["determined", "cute"], occasions: ["launch", "encouragement"], pattern: "pocket", variant: 2 },
  { name: "The Orange Lining", description: "Evidence that the bright side has an API.", moods: ["optimistic", "warm"], occasions: ["thank-you", "celebration"], pattern: "pocket", variant: 3 },
  { name: "Ship Shape", description: "A sturdy cloud for a surprisingly calm deployment.", moods: ["proud", "steady"], occasions: ["launch", "finished-project"], pattern: "solid", variant: 1 },
  { name: "Soft Launch", description: "A gentle rollout with no sharp edges.", moods: ["relieved", "quiet"], occasions: ["launch", "new-job"], pattern: "solid", variant: 2 },
  { name: "Load-Bearing Puff", description: "It looks soft. It is holding up production.", moods: ["capable", "funny"], occasions: ["launch", "thank-you"], pattern: "solid", variant: 3 },
  { name: "Mostly an Outline", description: "A cloud comfortable with leaving room for interpretation.", moods: ["thoughtful", "minimal"], occasions: ["new-start", "just-because"], pattern: "outline", variant: 1 },
  { name: "Boundary Condition", description: "All edge, excellent manners.", moods: ["dry", "precise"], occasions: ["debugging", "finished-project"], pattern: "outline", variant: 2 },
  { name: "Open to Possibility", description: "A blank interior awaiting one good idea.", moods: ["curious", "calm"], occasions: ["new-start", "encouragement"], pattern: "outline", variant: 3 },
  { name: "Parallel Weather", description: "Several orange thoughts happening at once.", moods: ["busy", "energetic"], occasions: ["launch", "teamwork"], pattern: "vertical", variant: 1 },
  { name: "Bandwidth Forecast", description: "Vertical capacity, locally sourced.", moods: ["focused", "technical"], occasions: ["thank-you", "debugging"], pattern: "vertical", variant: 2 },
  { name: "Many Tiny Lanes", description: "Everyone gets a stripe and nobody blocks.", moods: ["collaborative", "cheerful"], occasions: ["teamwork", "celebration"], pattern: "vertical", variant: 3 },
  { name: "Horizontally Scalable", description: "More stripes can be added as demand increases.", moods: ["confident", "technical"], occasions: ["launch", "promotion"], pattern: "horizontal", variant: 1 },
  { name: "Layer Seven", description: "A cloud with exactly enough layers to be suspicious.", moods: ["dry", "clever"], occasions: ["debugging", "just-because"], pattern: "horizontal", variant: 2 },
  { name: "Striped for Production", description: "Dressed formally for its first real request.", moods: ["proud", "playful"], occasions: ["launch", "finished-project"], pattern: "horizontal", variant: 3 },
  { name: "Checked and Balanced", description: "A small grid maintaining excellent internal controls.", moods: ["orderly", "satisfied"], occasions: ["finished-project", "thank-you"], pattern: "grid", variant: 1 },
  { name: "Grid With Benefits", description: "Structure, but with an orange sense of humor.", moods: ["funny", "organized"], occasions: ["teamwork", "just-because"], pattern: "grid", variant: 2 },
  { name: "Cross-Region Optimist", description: "Cheerfully replicated in both directions.", moods: ["optimistic", "technical"], occasions: ["launch", "promotion"], pattern: "grid", variant: 3 },
  { name: "Recursive Forecast", description: "A cloud thinking about a cloud thinking about a cloud.", moods: ["weird", "contemplative"], occasions: ["debugging", "just-because"], pattern: "spiral", variant: 1 },
  { name: "Eventual Sunshine", description: "Consistency is coming. It has taken the scenic route.", moods: ["patient", "hopeful"], occasions: ["encouragement", "debugging"], pattern: "spiral", variant: 2 },
  { name: "Spiraling Up", description: "Technically spiraling, directionally excellent.", moods: ["chaotic", "optimistic"], occasions: ["promotion", "new-start"], pattern: "spiral", variant: 3 },
  { name: "Gentle Degradation", description: "Still charming under partial failure.", moods: ["resilient", "calm"], occasions: ["debugging", "encouragement"], pattern: "wave", variant: 1 },
  { name: "Wavy Availability", description: "Nine-ish nines and a very nice curve.", moods: ["relaxed", "funny"], occasions: ["finished-project", "just-because"], pattern: "wave", variant: 2 },
  { name: "Four Oh Too Cute", description: "Payment required. Delight included.", moods: ["silly", "celebratory"], occasions: ["launch", "celebration"], pattern: "wave", variant: 3 },
];

export const GIFTS: readonly Gift[] = editions.map((edition, index) => ({
  ...edition,
  id: `cloud-${String(index + 1).padStart(2, "0")}`,
  number: index + 1,
}));

export function findGift(giftId: string): Gift | undefined {
  return GIFTS.find(({ id }) => id === giftId);
}
