import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { signKrakenFuturesRequest } from "@/lib/brokers/kraken-futures/sign";

describe("kraken-futures sign", () => {
  it("matches Kraken v3 vector: SHA256(postData+nonce+path) then HMAC-SHA512(secret)", () => {
    const secretB64 = Buffer.from("test-secret-key-for-kraken-futures-sign-unit", "utf8").toString(
      "base64",
    );
    const endpointPath = "/api/v3/accounts";
    const nonce = "1700000000123";
    const postData = "";

    const message = `${postData}${nonce}${endpointPath}`;
    const hash = crypto.createHash("sha256").update(message, "utf8").digest();
    const expected = crypto
      .createHmac("sha512", Buffer.from(secretB64, "base64"))
      .update(hash)
      .digest("base64");

    expect(signKrakenFuturesRequest(endpointPath, postData, nonce, secretB64)).toBe(expected);
  });

  it("POST body is included before nonce in the sign message", () => {
    const secretB64 = Buffer.from("post-body-sign-key-0123456789abcdef", "utf8").toString("base64");
    const endpointPath = "/api/v3/cancelorder";
    const nonce = "1700000000999";
    const postData = `order_id=abc&nonce=${nonce}`;

    const message = `${postData}${nonce}${endpointPath}`;
    const hash = crypto.createHash("sha256").update(message, "utf8").digest();
    const expected = crypto
      .createHmac("sha512", Buffer.from(secretB64, "base64"))
      .update(hash)
      .digest("base64");

    expect(signKrakenFuturesRequest(endpointPath, postData, nonce, secretB64)).toBe(expected);
  });
});
