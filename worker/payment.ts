import { createRemoteJWKSet, jwtVerify } from "jose";
import { GIFT_PRICE_ATOMIC_UNITS } from "../shared/catalog";

const PAYMENT_JWKS = createRemoteJWKSet(
  new URL("https://payments.cloudflare.com/certs"),
);

export interface VerifiedPayment {
  fingerprint: string;
  developmentBypass: boolean;
}

export class PaymentRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentRequiredError";
  }
}

export async function verifyPayment(
  request: Request,
  developmentPaymentBypass: string,
): Promise<VerifiedPayment> {
  if (developmentPaymentBypass === "true") {
    const demoPaymentId = request.headers.get("x-demo-payment-id") ?? crypto.randomUUID();
    return {
      fingerprint: await sha256(`demo:${demoPaymentId}`),
      developmentBypass: true,
    };
  }

  const paymentContext = request.headers.get("payment-context");
  if (paymentContext === null) {
    throw new PaymentRequiredError("Missing PAYMENT-CONTEXT from Monetization Gateway");
  }

  try {
    const { payload } = await jwtVerify(paymentContext, PAYMENT_JWKS, {
      algorithms: ["EdDSA"],
      audience: request.url,
    });
    if (payload.scheme !== "upto") {
      throw new PaymentRequiredError("Expected a variable-price payment authorization");
    }
    if (payload.amount !== GIFT_PRICE_ATOMIC_UNITS) {
      throw new PaymentRequiredError("Payment maximum does not match the cloud price");
    }
    const idempotencyKey = request.headers.get("idempotency-key");
    return {
      fingerprint: await sha256(
        idempotencyKey === null ? paymentContext : `idempotency:${idempotencyKey}`,
      ),
      developmentBypass: false,
    };
  } catch (error) {
    if (error instanceof PaymentRequiredError) {
      throw error;
    }
    throw new PaymentRequiredError("PAYMENT-CONTEXT signature or claims are invalid");
  }
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
