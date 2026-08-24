import type { DbClient } from "../../db/pool";

export interface AuditLogEntry {
  actorId?: string | null | undefined;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | undefined;
}

export async function writeAuditLog(db: DbClient, entry: AuditLogEntry): Promise<void> {
  await db.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, ip)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.actorId ?? null,
      entry.action,
      entry.entityType ?? null,
      entry.entityId ?? null,
      JSON.stringify(entry.metadata ?? {}),
      entry.ip ?? null,
    ],
  );
}
