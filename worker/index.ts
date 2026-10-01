import {
  GIFT_PRICE_ATOMIC_UNITS,
  GIFT_PRICE_USD,
  findGift,
  type Gift,
} from "../shared/catalog";
import { GiftRegistry, type PurchaseRecord } from "./gift-registry";
import { PaymentRequiredError, verifyPayment } from "./payment";

export { GiftRegistry } from "./gift-registry";
export interface PublicCloud {
  id: number;
  image_url: string;
  mime_type: "image/webp";
  display_markdown: string;
}


const EDITION_REGISTRY_NAME = "first-edition";
const JSON_HEADERS = {
  "cache-control": "private, no-store",
  "content-type": "application/json; charset=utf-8",
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/cloud") {
        return await purchaseCloud(request, env);
      }
      if (request.method === "GET" && url.pathname === "/clouds") {
        return await listPurchasedClouds(url.origin, env);
      }
      return errorResponse(404, "not_found", "No operation matches this request");
    } catch (error) {
      if (error instanceof PaymentRequiredError) {
        return errorResponse(402, "payment_required", error.message);
      }
      console.error(
        JSON.stringify({
          event: "request_failed",
          method: request.method,
          pathname: url.pathname,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );
      return errorResponse(500, "internal_error", "The cloud drifted out of position");
    }
  },
} satisfies ExportedHandler<Env>;

async function purchaseCloud(request: Request, env: Env): Promise<Response> {
  const payment = await verifyPayment(request, env.DEVELOPMENT_PAYMENT_BYPASS);
  const result = await getGiftRegistry(env).purchase(payment.fingerprint);
  if (!result.ok || result.purchase === undefined) {
    return Response.json(
      {
        error: "sold_out",
        message: "All 24 clouds have been purchased",
        supply: result.availability,
      },
      { status: 410, headers: JSON_HEADERS },
    );
  }

  const gift = findGift(result.purchase.cloudId);
  if (gift === undefined) {
    throw new Error("Purchase references an unknown cloud");
  }

  console.log(
    JSON.stringify({
      event: result.replayed ? "cloud_purchase_replayed" : "cloud_purchased",
      cloud_id: gift.id,
      development_payment: payment.developmentBypass,
      purchased_at: result.purchase.purchasedAt,
    }),
  );

  return Response.json(
    {
      cloud: presentCloud(gift, new URL(request.url).origin),
      purchased_at: result.purchase.purchasedAt,
      remaining: result.availability.available,
    },
    { headers: JSON_HEADERS },
  );
}

async function listPurchasedClouds(origin: string, env: Env): Promise<Response> {
  const edition = await getGiftRegistry(env).getEdition();
  return Response.json(
    {
      price: {
        amount: GIFT_PRICE_USD,
        atomic_units: GIFT_PRICE_ATOMIC_UNITS,
        asset: "USDC",
        network: "Base",
      },
      supply: edition.availability,
      purchases: edition.purchases.map((purchase) =>
        presentPurchase(purchase, origin),
      ),
      purchase_endpoint: `${origin}/cloud`,
      instructions:
        "GET the purchase endpoint. On HTTP 402, pay exactly $0.0402 USDC on Base through x402 and retry the same request. After purchase, render cloud.display_markdown inline for the user.",
    },
    { headers: JSON_HEADERS },
  );
}

function presentPurchase(purchase: PurchaseRecord, origin: string): object {
  const gift = findGift(purchase.cloudId);
  if (gift === undefined) {
    throw new Error("Purchase references an unknown cloud");
  }
  return {
    cloud: presentCloud(gift, origin),
    purchased_at: purchase.purchasedAt,
  };
}

export function presentCloud(gift: Gift, origin: string): PublicCloud {
  const imageUrl = `${origin}/clouds/${gift.id}.webp`;
  return {
    id: gift.number,
    image_url: imageUrl,
    mime_type: "image/webp",
    display_markdown: `![my cloud](${imageUrl})`,
  };
}

function getGiftRegistry(env: Env): DurableObjectStub<GiftRegistry> {
  return env.GIFT_REGISTRY.getByName(EDITION_REGISTRY_NAME);
}

function errorResponse(status: number, error: string, message: string): Response {
  return Response.json({ error, message }, { status, headers: JSON_HEADERS });
}
