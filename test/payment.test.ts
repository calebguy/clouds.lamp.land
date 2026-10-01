import { beforeEach, describe, expect, it, vi } from "vitest";

const { jwtVerifyMock } = vi.hoisted(() => ({
  jwtVerifyMock: vi.fn(),
}));

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => "mock-jwks"),
  jwtVerify: jwtVerifyMock,
}));

import { verifyPayment } from "../worker/payment";

const paymentRequest = new Request("https://cloud-402.test/cloud", {
  headers: { "payment-context": "signed-payment-context" },
});

beforeEach(() => {
  jwtVerifyMock.mockReset();
});

describe("verifyPayment", () => {
  it("accepts an exact authorization for the static cloud price", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { scheme: "exact", amount: "40200" },
    });

    await expect(verifyPayment(paymentRequest, "false")).resolves.toMatchObject({
      developmentBypass: false,
    });
  });

  it("rejects a variable-price authorization", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { scheme: "upto", amount: "40200" },
    });

    await expect(verifyPayment(paymentRequest, "false")).rejects.toThrow(
      "Expected an exact-price payment authorization",
    );
  });

  it("rejects an exact authorization for the wrong amount", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { scheme: "exact", amount: "40201" },
    });

    await expect(verifyPayment(paymentRequest, "false")).rejects.toThrow(
      "Payment amount does not match the cloud price",
    );
  });
});
