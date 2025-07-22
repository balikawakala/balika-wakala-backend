// api/lib/storage.js
// Shared storage module for serverless environment
// In production, replace this with a database like MongoDB or PostgreSQL

// Initialize storage as global variables
global.users = global.users || new Map();
global.payments = global.payments || new Map();
global.pendingPayments = global.pendingPayments || new Map();

// Export the storage
export const storage = {
  users: global.users,
  payments: global.payments,
  pendingPayments: global.pendingPayments
};

// Utility functions
export function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('255')) {
    cleaned = '0' + cleaned.substring(3);
  }
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('sw-TZ').format(amount) + ' TZS';
}

export function generatePaymentId() {
  const crypto = require('crypto');
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

export function hashPassword(password) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}
