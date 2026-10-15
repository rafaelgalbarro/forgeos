import { describe, expect, it } from "vitest";
import { signKrakenFuturesRequest } from "@/lib/brokers/kraken-futures/sign";

describe("kraken-futures sign", () => {
  it("matches the known GET /accounts vector", () => {
    expect(
      signKrakenFuturesRequest(
        "/api/v3/accounts",
        "",
        "1700000000123",
        "dGVzdC1zZWNyZXQta2V5LWZvci1rcmFrZW4tZnV0dXJlcy1zaWduLXVuaXQ=",
      ),
    ).toBe(
      "W74J3Ox9ITjlcaszjOCslIMDpi5EqQIcDYRqcpwDtqQrEb9sR6gcO86OszPW0JwqT8QksgBzAabgAvRgCeuGQg==",
    );
  });

  it("matches the known POST body-before-nonce vector", () => {
    expect(
      signKrakenFuturesRequest(
        "/api/v3/cancelorder",
        "order_id=abc",
        "1700000000999",
        "cG9zdC1ib2R5LXNpZ24ta2V5LTAxMjM0NTY3ODlhYmNkZWY=",
      ),
    ).toBe(
      "LI6GVmJYMiYjWoFw7wXAzrq3w0zC+hYqKJwfOhOscBBBUcqsZBGAXTAZAIGIVUn1g+kNoO5ipLIB2Ggsh6Z+7w==",
    );
  });
});
