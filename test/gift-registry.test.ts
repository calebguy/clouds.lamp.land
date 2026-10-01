import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

function freshRegistry() {
  return env.GIFT_REGISTRY.getByName(`test-${crypto.randomUUID()}`);
}

describe("GiftRegistry", () => {
  it("randomly sells each of the 24 clouds exactly once", async () => {
    const registry = freshRegistry();
    const purchases = await Promise.all(
      Array.from({ length: 24 }, (_, index) =>
        registry.purchase(`payment-${index}`, 1_000 + index),
      ),
    );
    const soldOut = await registry.purchase("payment-25", 2_000);
    const cloudIds = purchases.flatMap(({ purchase }) =>
      purchase === undefined ? [] : [purchase.cloudId],
    );

    expect({
      successfulPurchases: purchases.filter(({ ok }) => ok).length,
      uniqueClouds: new Set(cloudIds).size,
      soldOut,
    }).toMatchObject({
      successfulPurchases: 24,
      uniqueClouds: 24,
      soldOut: {
        ok: false,
        replayed: false,
        reason: "sold_out",
        availability: { available: 0, purchased: 24, total: 24 },
      },
    });
  });

  it("returns the same cloud for a repeated payment fingerprint", async () => {
    const registry = freshRegistry();
    const purchase = await registry.purchase("payment-one", 1_000);
    const replay = await registry.purchase("payment-one", 2_000);

    expect({ purchase, replay }).toMatchObject({
      purchase: {
        ok: true,
        replayed: false,
        purchase: {
          cloudId: expect.stringMatching(/^cloud-\d{2}$/),
          purchasedAt: new Date(1_000).toISOString(),
        },
        availability: { available: 23, purchased: 1, total: 24 },
      },
      replay: {
        ok: true,
        replayed: true,
        purchase: purchase.purchase,
        availability: { available: 23, purchased: 1, total: 24 },
      },
    });
  });

  it("lists only completed purchases without payment fingerprints", async () => {
    const registry = freshRegistry();
    await registry.purchase("private-payment-one", 1_000);
    await registry.purchase("private-payment-two", 2_000);

    const edition = await registry.getEdition();

    expect(edition).toMatchObject({
      availability: { available: 22, purchased: 2, total: 24 },
      purchases: [
        {
          cloudId: expect.stringMatching(/^cloud-\d{2}$/),
          purchasedAt: new Date(1_000).toISOString(),
        },
        {
          cloudId: expect.stringMatching(/^cloud-\d{2}$/),
          purchasedAt: new Date(2_000).toISOString(),
        },
      ],
    });
    expect(JSON.stringify(edition)).not.toContain("private-payment");
  });
});
