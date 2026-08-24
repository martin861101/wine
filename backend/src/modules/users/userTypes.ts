export type Role = "ADMIN" | "MEMBER";

export interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  email_verified: boolean;
  approved: boolean;
  region: string | null;
  instagram: string | null;
  created_at: Date;
  updated_at: Date;
}

export function toPublicUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    emailVerified: row.email_verified,
    approved: row.approved,
    region: row.region,
    instagram: row.instagram,
  };
}

export function mapUserRow(row: Record<string, unknown>): UserRow {
  return {
    id: String(row.id),
    email: String(row.email),
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    role: String(row.role) as Role,
    email_verified: Boolean(row.email_verified),
    approved: Boolean(row.approved),
    region: row.region ? String(row.region) : null,
    instagram: row.instagram ? String(row.instagram) : null,
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}
