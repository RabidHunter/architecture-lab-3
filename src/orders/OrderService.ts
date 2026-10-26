import { database } from "../database.ts";
import type { CartLine } from "../shared/calculateTotal.ts";
import { PaymentsService } from "../payments/PaymentsService.ts";

export class OrderService {
  private readonly payments: PaymentsService;

  constructor(payments = new PaymentsService()) {
    this.payments = payments;
  }

  async placeOrder(orderId: string, lines: CartLine[], total: number, paymentToken: string, currency: string) {
    for (const line of lines) {
      const row = database.stock.get(line.productId);
      if (!row || row.available < line.quantity) {
        throw new Error(`Insufficient stock for ${line.productId}`);
      }

      database.stock.set(line.productId, {
        productId: line.productId,
        available: row.available - line.quantity,
      });
    }

    database.orders.set(orderId, { id: orderId, status: "created", total });

    const paymentResult = await this.payments.charge({
      amount: total,
      currency,
      token: paymentToken,
      orderId
    });

    const order = database.orders.get(orderId)!;
    order.paymentStatus = paymentResult.status;

    if (paymentResult.status === "paid") {
      order.status = "confirmed";
    } else if (paymentResult.status === "processing") {
      order.status = "processing";
    } else {
      order.status = "payment_pending";
    }

    return { ...order };
  }
}