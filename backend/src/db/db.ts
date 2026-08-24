import type { DbClient } from "./pool";
import { pool } from "./pool";
import { withTransaction } from "./pool";

export { withTransaction };
export type { DbClient };
export const db: DbClient = pool;
