import { randomBytes } from 'node:crypto';

export function createId() {
  return randomBytes(12).toString('base64url');
}

export function createToken() {
  return randomBytes(18).toString('base64url');
}
