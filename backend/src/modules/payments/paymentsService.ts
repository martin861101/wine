import { db, withTransaction } from "../../db/db";
import { AppError } from "../../lib/errors";
import { getPaymentProvider } from "../../integrations/payments";
import { writeAuditLog } from "../audit/auditLog";
import { env } from "../../config/env";

export type PaymentType = "EVENT" | "CONTRIBUTION" | "MERCHANDISE" | "MEMBERSHIP" | "DONATION";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";

export interface PaymentCreate {
  userId: string;
  eventId?: string | undefined;
  type: PaymentType;
  amount: number;
  currency?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

function mapPaymentRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    eventId: row.event_id ? String(row.event_id) : null,
    provider: String(row.provider),
    providerReference: row.provider_reference ? String(row.provider_reference) : null,
    type: String(row.type),
    amount: Number(row.amount),
    currency: String(row.currency),
    status: String(row.status),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: new Date(String(row.created_at)).toISOString(),
    paidAt: row.paid_at ? new Date(String(row.paid_at)).toISOString() : null,
  };
}

export const paymentsService = {
  async create(input: PaymentCreate): Promise<ReturnType<typeof mapPaymentRow>> {
    if (!Number.isInteger(input.amount) || input.amount < 1)
      throw new AppError("Amount must be a positive minor currency unit.", 400);
    let amount = input.amount;
    const currency = input.currency ?? "ZAR";

    if (input.type === "EVENT") {
      if (!input.eventId) throw new AppError("An event payment must reference an event.", 400);
      const event = await db.query(
        `SELECT contribution_amount FROM events WHERE id = $1 AND status = 'PUBLISHED'`,
        [input.eventId],
      );
      const row = event.rows[0] as { contribution_amount: number | null } | undefined;
      if (!row) throw new AppError("Event not found or unavailable for payment.", 404);
      if (row.contribution_amount == null)
        throw new AppError("This event does not require a payment.", 400);
      amount = Number(row.contribution_amount);
    } else if (input.eventId) {
      const event = await db.query("SELECT 1 FROM events WHERE id = $1", [input.eventId]);
      if (!event.rowCount) throw new AppError("Event not found.", 404);
    }

    const result = await db.query(
      `INSERT INTO payments (user_id, event_id, provider, type, amount, currency, status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING',$7)
       RETURNING *`,
      [
        input.userId,
        input.eventId ?? null,
        "paystack",
        input.type,
        amount,
        currency.toUpperCase(),
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    const payment = mapPaymentRow(result.rows[0] as Record<string, unknown>);
    void writeAuditLog(db, {
      actorId: input.userId,
      action: "payment.created",
      entityType: "payment",
      entityId: payment.id,
    });
    return payment;
  },

  async createCheckout(paymentId: string) {
    const payment = await this.getById(paymentId);
    const provider = getPaymentProvider();
    if (!provider) {
      throw new AppError(
        "Payments are not configured. Set PAYSTACK_SECRET_KEY to enable online payments.",
        503,
        "PAYMENTS_NOT_CONFIGURED",
      );
    }
    const origin = env.PUBLIC_APP_URL;
    const userResult = await db.query("SELECT email FROM users WHERE id = $1", [payment.userId]);
    const userRow = userResult.rows[0] as { email?: string } | undefined;
    const result = await provider.createCheckout({
      amount: payment.amount,
      currency: payment.currency,
      description: `Wine & Chapters ${payment.type.toLowerCase()} contribution`,
      reference: payment.id,
      ...(userRow?.email ? { email: userRow.email } : {}),
      successUrl: `${origin}/portal?payment=success`,
      cancelUrl: `${origin}/portal?payment=cancelled`,
      metadata: { paymentId: payment.id, userId: payment.userId },
    });
    if (result.providerReference) {
      await db.query(`UPDATE payments SET provider_reference = $1 WHERE id = $2`, [
        result.providerReference,
        payment.id,
      ]);
    }
    return result;
  },

  async getById(id: string) {
    const result = await db.query("SELECT * FROM payments WHERE id = $1", [id]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Payment not found", 404);
    return mapPaymentRow(row);
  },

  async listForUser(userId: string) {
    const result = await db.query(
      `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map((row: Record<string, unknown>) => mapPaymentRow(row));
  },

  async listAll() {
    const result = await db.query(`SELECT * FROM payments ORDER BY created_at DESC`);
    return result.rows.map((row: Record<string, unknown>) => mapPaymentRow(row));
  },

  async setStatus(id: string, status: PaymentStatus) {
    const paidAt = status === "PAID" ? new Date().toISOString() : null;
    await db.query(
      `UPDATE payments SET status = $1, paid_at = COALESCE($2, paid_at) WHERE id = $3`,
      [status, paidAt, id],
    );
    void writeAuditLog(db, {
      action: `payment.${status.toLowerCase()}`,
      entityType: "payment",
      entityId: id,
    });
  },

  async markPaidByProviderReference(providerReference: string, metadata?: Record<string, unknown>) {
    const result = await db.query(
      `UPDATE payments
       SET status = 'PAID', paid_at = now(),
           metadata = COALESCE($2, metadata)
       WHERE provider_reference = $1 AND status = 'PENDING'
       RETURNING *`,
      [providerReference, metadata ? JSON.stringify(metadata) : null],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (row) {
      void writeAuditLog(db, {
        action: "payment.marked_paid",
        entityType: "payment",
        entityId: String(row.id),
      });
    }
    return row ? mapPaymentRow(row) : null;
  },

  async refund(paymentId: string, actorId: string): Promise<void> {
    const payment = await this.getById(paymentId);
    const provider = getPaymentProvider();
    if (!provider) {
      throw new AppError("Payments are not configured.", 503, "PAYMENTS_NOT_CONFIGURED");
    }
    if (payment.status !== "PAID" || !payment.providerReference) {
      throw new AppError("Only paid payments with a provider reference can be refunded.", 400);
    }
    await provider.refundPayment(payment.providerReference);
    await this.setStatus(paymentId, "REFUNDED");
    void writeAuditLog(db, {
      actorId,
      action: "payment.refunded",
      entityType: "payment",
      entityId: paymentId,
    });
  },

  async processWebhook(request: Request): Promise<{ received: boolean }> {
    const provider = getPaymentProvider();
    if (!provider) {
      throw new AppError("Payments are not configured.", 503, "PAYMENTS_NOT_CONFIGURED");
    }
    const event = await provider.handleWebhook(request);
    if (!event) return { received: true };

    await withTransaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO payment_webhook_events (provider, event_id, type, payload)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (provider, event_id) DO NOTHING
         RETURNING id`,
        ["paystack", event.eventId, event.type, JSON.stringify(event.payload)],
      );
      if (!inserted.rowCount) return;

      await writeAuditLog(client, {
        action: "payment.webhook_received",
        entityType: "paystack_event",
        entityId: event.eventId,
      });

      const data = event.payload as {
        reference?: string;
        status?: string;
      };
      const reference = data.reference;
      if (!reference) return;

      if (event.type === "charge.success" && data.status === "success") {
        const paid = await client.query(
          `UPDATE payments SET status = 'PAID', paid_at = now()
           WHERE provider_reference = $1 AND status = 'PENDING' RETURNING id`,
          [reference],
        );
        if (paid.rowCount) {
          await writeAuditLog(client, {
            action: "payment.marked_paid",
            entityType: "payment",
            entityId: String((paid.rows[0] as { id: string }).id),
          });
        }
      } else if (event.type === "charge.failed") {
        await client.query(
          `UPDATE payments SET status = 'FAILED' WHERE provider_reference = $1 AND status = 'PENDING'`,
          [reference],
        );
      }
    });
    return { received: true };
  },
};
