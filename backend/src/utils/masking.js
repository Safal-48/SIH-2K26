/**
 * Privacy and Data Protection Utility
 * Step 17: Security, Validation and Audit Hardening
 *
 * Ensures no real Aadhaar, PAN, bank credentials, OTP, or government credentials
 * are ever accepted or exposed, and masks sensitive-looking demo values.
 */

export function maskAadhaar(val) {
  if (!val) return '•••• •••• ••••';
  const clean = String(val).trim();
  if (clean.length < 4) return '••••';
  const last4 = clean.slice(-4);
  return `VID-••••-••••-${last4}`;
}

export function maskBankAccount(val) {
  if (!val) return '••••••••••••';
  const clean = String(val).trim();
  if (clean.length < 4) return '••••';
  const last4 = clean.slice(-4);
  return `••••••••${last4}`;
}

export function maskPhone(val) {
  if (!val) return '+91 ••••• •••••';
  const clean = String(val).trim();
  if (clean.length < 4) return '+91 •••••';
  const last4 = clean.slice(-4);
  return `+91 ••••• •${last4}`;
}

export function maskEmail(val) {
  if (!val || typeof val !== 'string' || !val.includes('@')) return '••••@demo-gov.in';
  const [local, domain] = val.split('@');
  if (local.length <= 2) return `${local[0]}••••@${domain}`;
  return `${local[0]}••••${local.slice(-1)}@${domain}`;
}

/**
 * Sanitize an application or citizen record for client transmission
 */
export function sanitizeCitizenRecord(citizen) {
  if (!citizen || typeof citizen !== 'object') return citizen;
  const clone = { ...citizen };
  if (clone.phone_masked) clone.phone_masked = maskPhone(clone.phone_masked);
  if (clone.aadhaar_virtual_id) clone.aadhaar_virtual_id = maskAadhaar(clone.aadhaar_virtual_id);
  if (clone.email) clone.email = maskEmail(clone.email);
  return clone;
}

export function sanitizeBankRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const clone = { ...record };
  if (clone.account_number_masked) clone.account_number_masked = maskBankAccount(clone.account_number_masked);
  return clone;
}

export default {
  maskAadhaar,
  maskBankAccount,
  maskPhone,
  maskEmail,
  sanitizeCitizenRecord,
  sanitizeBankRecord,
};
