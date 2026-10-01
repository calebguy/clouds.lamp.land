import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { GIFTS } from "../shared/catalog";
import { presentCloud } from "../worker/index";

describe("Cloud 402 API", () => {
  it("publishes the anonymous purchase ledger", async () => {
    const response = await exports.default.fetch("https://cloud-402.test/clouds");
    const body = (await response.json()) as Record<string, unknown>;

    expect({ status: response.status, body }).toEqual({
      status: 200,
      body: {
        price: {
          amount: "0.0402",
          atomic_units: "40200",
          asset: "USDC",
          network: "Base",
        },
        supply: { available: 24, purchased: 0, total: 24 },
        purchases: [],
        purchase_endpoint: "https://cloud-402.test/cloud",
        instructions:
          "GET the purchase endpoint. On HTTP 402, authorize up to $0.0402 through x402 and retry the same request. After purchase, render cloud.display_markdown inline for the user.",
      },
    });
  });

  it("requires verified payment context before assigning a cloud", async () => {
    const response = await exports.default.fetch("https://cloud-402.test/cloud", {
      headers: { "idempotency-key": crypto.randomUUID() },
    });

    expect({
      status: response.status,
      cacheControl: response.headers.get("cache-control"),
      body: await response.json(),
    }).toEqual({
      status: 402,
      cacheControl: "private, no-store",
      body: {
        error: "payment_required",
        message: "Missing PAYMENT-CONTEXT from Monetization Gateway",
      },
    });
  });

  it("uses the minimal public cloud representation", () => {
    const cloud = presentCloud(GIFTS[8], "https://cloud-402.test");

    expect(cloud).toEqual({
      id: 9,
      image_url: "https://cloud-402.test/clouds/cloud-09.webp",
      mime_type: "image/webp",
      display_markdown:
        "![my cloud](https://cloud-402.test/clouds/cloud-09.webp)",
    });
  });

  it("exposes no legacy purchase operations", async () => {
    const urls = [
      "https://cloud-402.test/api",
      "https://cloud-402.test/api/status",
      "https://cloud-402.test/api/reservations",
      "https://cloud-402.test/api/claim",
      "https://cloud-402.test/openapi.json",
    ];
    const responses = await Promise.all(
      urls.map((url) => exports.default.fetch(url)),
    );

    expect(responses.map(({ status }) => status)).toEqual([404, 404, 404, 404, 404]);
  });

  it("does not accept POST purchases", async () => {
    const response = await exports.default.fetch("https://cloud-402.test/cloud", {
      method: "POST",
    });

    expect(response.status).toBe(404);
  });
});
