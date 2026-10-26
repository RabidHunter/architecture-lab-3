import { StripeClient } from "./internal/StripeClient.ts";
import { FakeProvider } from "./internal/FakeProvider.ts";

export type NormalizedPaymentStatus = "paid" | "processing" | "failed";

export type PaymentRequest = {
    amount: number;
    currency: string;
    token: string;
    orderId: string;
};

export class PaymentsService {
    private readonly stripe = new StripeClient();
    private readonly fake = new FakeProvider();

    async charge(request: PaymentRequest): Promise<{ status: NormalizedPaymentStatus }> {
        // Вибір провайдера на основі токена
        if (request.token.startsWith("fake_")) {
            const response = await this.fake.pay(request.amount, request.token);
            return { status: this.mapFakeStatus(response.status) };
        }

        // Формування provider-specific payload сховано всередині Payments
        const stripePayload = {
            id: request.token,
            amount: Math.round(request.amount * 100),
            currency: request.currency,
            metadata: { orderId: request.orderId },
        };

        const response = await this.stripe.createCharge(stripePayload);
        return { status: this.mapStripeStatus(response.state) };
    }

    private mapStripeStatus(state: string): NormalizedPaymentStatus {
        if (state === "succeeded") return "paid";
        if (state === "requires_action") return "processing";
        return "failed"; // Unknown fallback
    }

    private mapFakeStatus(state: string): NormalizedPaymentStatus {
        if (state === "SUCCESS") return "paid";
        if (state === "PROCESSING") return "processing";
        return "failed"; // Unknown fallback
    }
}