import * as crypto from 'crypto';

const SALT = 'mecanicapro-salt-2026:';

const ADMIN_EMAIL_HASHES = [
  'a425840698ba1fdf5cdc0a982ee98602ddfbd0fe4c7bbf9b690502411905d59a',
  'faf7cccbe514e0e728eca920ef7118a15d1e8194ab049fb4dd6c164b9caf81d2',
];

const MASTER_KEY_HASH = '139f8b12b5fba754719357a3f2c80872c17a83a58452c82ad97ec0d729b033aa';

function hashValue(val: string): string {
  return crypto.createHash('sha256').update(SALT + val).digest('hex');
}

export function isSuperAdminEmail(email?: string): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (process.env.SUPER_ADMIN_EMAIL && normalized === process.env.SUPER_ADMIN_EMAIL.toLowerCase().trim()) {
    return true;
  }
  const digest = hashValue(normalized);
  return ADMIN_EMAIL_HASHES.includes(digest);
}

export function isValidMasterKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (process.env.ADMIN_MASTER_PASSWORD && trimmed === process.env.ADMIN_MASTER_PASSWORD.trim()) {
    return true;
  }
  const digest = hashValue(trimmed);
  return digest === MASTER_KEY_HASH;
}
