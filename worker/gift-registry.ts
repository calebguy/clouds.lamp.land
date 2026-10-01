import { DurableObject } from "cloudflare:workers";
import { GIFTS } from "../shared/catalog";

export interface Availability {
  available: number;
  purchased: number;
  total: number;
}

export interface PurchaseRecord {
  cloudId: string;
  purchasedAt: string;
}

export interface PurchaseResult {
  ok: boolean;
  replayed: boolean;
  reason?: "sold_out";
  purchase?: PurchaseRecord;
  availability: Availability;
}
export interface EditionState {
  availability: Availability;
  purchases: PurchaseRecord[];
}


interface CloudRow extends Record<string, SqlStorageValue> {
  cloud_id: string;
  payment_fingerprint: string | null;
  purchased_at: string | null;
}

interface CountRow extends Record<string, SqlStorageValue> {
  count: number;
}

export class GiftRegistry extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS clouds (
          cloud_id TEXT PRIMARY KEY,
          payment_fingerprint TEXT UNIQUE,
          purchased_at TEXT
        )
      `);
      this.migrateLegacyGifts();
      for (const gift of GIFTS) {
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO clouds (cloud_id) VALUES (?)",
          gift.id,
        );
      }
    });
  }

  getAvailability(): Availability {
    const purchased =
      this.ctx.storage.sql
        .exec<CountRow>(
          "SELECT COUNT(*) AS count FROM clouds WHERE payment_fingerprint IS NOT NULL",
        )
        .toArray()[0]?.count ?? 0;
    return {
      available: GIFTS.length - purchased,
      purchased,
      total: GIFTS.length,
    };
  }

  purchase(paymentFingerprint: string, now = Date.now()): PurchaseResult {
    const previousPurchase = this.ctx.storage.sql
      .exec<CloudRow>(
        "SELECT * FROM clouds WHERE payment_fingerprint = ?",
        paymentFingerprint,
      )
      .toArray()[0];
    if (previousPurchase !== undefined) {
      return {
        ok: true,
        replayed: true,
        purchase: this.toPurchase(previousPurchase),
        availability: this.getAvailability(),
      };
    }

    const availableCloud = this.ctx.storage.sql
      .exec<CloudRow>(
        "SELECT * FROM clouds WHERE payment_fingerprint IS NULL ORDER BY random() LIMIT 1",
      )
      .toArray()[0];
    if (availableCloud === undefined) {
      return {
        ok: false,
        replayed: false,
        reason: "sold_out",
        availability: this.getAvailability(),
      };
    }

    const purchasedAt = new Date(now).toISOString();
    this.ctx.storage.sql.exec(
      `UPDATE clouds
       SET payment_fingerprint = ?, purchased_at = ?
       WHERE cloud_id = ? AND payment_fingerprint IS NULL`,
      paymentFingerprint,
      purchasedAt,
      availableCloud.cloud_id,
    );
    return {
      ok: true,
      replayed: false,
      purchase: { cloudId: availableCloud.cloud_id, purchasedAt },
      availability: this.getAvailability(),
    };
  }

  listPurchases(): PurchaseRecord[] {
    return this.ctx.storage.sql
      .exec<CloudRow>(
        `SELECT * FROM clouds
         WHERE payment_fingerprint IS NOT NULL
         ORDER BY purchased_at, cloud_id`,
      )
      .toArray()
      .map((row) => this.toPurchase(row));
  }

  getEdition(): EditionState {
    return {
      availability: this.getAvailability(),
      purchases: this.listPurchases(),
    };
  }

  reset(): void {
    this.ctx.storage.sql.exec(`
      UPDATE clouds
      SET payment_fingerprint = NULL, purchased_at = NULL
    `);
  }

  private migrateLegacyGifts(): void {
    const legacyTable = this.ctx.storage.sql
      .exec<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'gifts'",
      )
      .toArray()[0];
    if (legacyTable === undefined) {
      return;
    }

    this.ctx.storage.sql.exec(`
      INSERT OR IGNORE INTO clouds (cloud_id, payment_fingerprint, purchased_at)
      SELECT gift_id, payment_fingerprint, adopted_at
      FROM gifts
      WHERE status = 'adopted'
    `);
    this.ctx.storage.sql.exec("DROP TABLE gifts");
  }

  private toPurchase(row: CloudRow): PurchaseRecord {
    if (row.payment_fingerprint === null || row.purchased_at === null) {
      throw new Error("Purchased cloud is missing payment provenance");
    }
    return {
      cloudId: row.cloud_id,
      purchasedAt: row.purchased_at,
    };
  }
}
