import test from "node:test";
import assert from "node:assert/strict";
import { PaymentsService } from "../src/payments/PaymentsService.ts";

test.describe("PaymentsService Normalization", () => {
    test("normalizes SUCCESS to paid", async () => {
        const service = new PaymentsService();
        const result = await service.charge({ amount: 100, currency: "UAH", token: "fake_success", orderId: "1" });
        assert.equal(result.status, "paid");
    });

    test("normalizes PROCESSING to processing", async () => {
        const service = new PaymentsService();
        const result = await service.charge({ amount: 100, currency: "UAH", token: "fake_processing", orderId: "1" });
        assert.equal(result.status, "processing");
    });

    test("normalizes ERROR to failed", async () => {
        const service = new PaymentsService();
        const result = await service.charge({ amount: 100, currency: "UAH", token: "fake_fail", orderId: "1" });
        assert.equal(result.status, "failed");
    });

    test("normalizes UNKNOWN to failed (safe fallback)", async () => {
        const service = new PaymentsService();
        // Використовуємо токен, який поверне UNKNOWN
        const result = await service.charge({ amount: 100, currency: "UAH", token: "fake_unknown", orderId: "1" });
        assert.equal(result.status, "failed");
    });
});