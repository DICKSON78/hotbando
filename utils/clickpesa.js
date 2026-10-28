const axios = require('axios');
const crypto = require('crypto');
const logger = require('./logger');

const BASE_URL = process.env.CLICKPESA_BASE_URL || 'https://api.clickpesa.com/third-parties';
const CLIENT_ID = process.env.CLICKPESA_CLIENT_ID || '';
const API_KEY = process.env.CLICKPESA_API_KEY || '';
const CHECKSUM_KEY = process.env.CLICKPESA_CHECKSUM_KEY || '';
const TEST_MODE = process.env.CLICKPESA_TEST_MODE === 'true' || process.env.NODE_ENV === 'development';

let _token = null;
let _tokenExpiry = 0;

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(canonicalize);
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = canonicalize(obj[key]);
    return acc;
  }, {});
}

function createChecksum(payload) {
  if (!CHECKSUM_KEY) return undefined;
  const canonicalPayload = canonicalize(payload);
  const payloadString = JSON.stringify(canonicalPayload);
  return crypto.createHmac('sha256', CHECKSUM_KEY).update(payloadString).digest('hex');
}

function verifyWebhookChecksum(payload, receivedChecksum) {
  if (!CHECKSUM_KEY) {
    logger.warn('ClickPesa CHECKSUM_KEY not configured — checksum verification unavailable');
    return false;
  }
  if (!receivedChecksum) {
    logger.warn('ClickPesa webhook received without checksum header');
    return false;
  }
  const payloadForValidation = { ...payload };
  delete payloadForValidation.checksum;
  delete payloadForValidation.checksumMethod;
  const computed = createChecksum(payloadForValidation);
  try {
    if (Buffer.byteLength(computed) !== Buffer.byteLength(receivedChecksum)) return false;
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(receivedChecksum));
  } catch (e) {
    return computed === receivedChecksum;
  }
}

function verifyClickPesaWebhookSignature(rawBody, signature, headerName) {
  const WEBHOOK_SECRET = process.env.CLICKPESA_WEBHOOK_SECRET || '';
  if (!WEBHOOK_SECRET) {
    logger.warn('CLICKPESA_WEBHOOK_SECRET not configured');
    return false;
  }
  if (!signature) {
    return false;
  }
  const sig = Array.isArray(signature) ? signature[0] : signature;
  // Try HMAC-SHA256 hex
  const hmacHex = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    if (Buffer.byteLength(hmacHex) === Buffer.byteLength(sig) && crypto.timingSafeEqual(Buffer.from(hmacHex), Buffer.from(sig))) {
      return true;
    }
  } catch (e) {}
  // Try base64
  try {
    const hmacB64 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('base64');
    if (Buffer.byteLength(hmacB64) === Buffer.byteLength(sig) && crypto.timingSafeEqual(Buffer.from(hmacB64), Buffer.from(sig))) {
      return true;
    }
  } catch (e) {}
  // Try with sha256= prefix
  const stripped = sig.replace(/^sha256=/i, '');
  try {
    if (Buffer.byteLength(hmacHex) === Buffer.byteLength(stripped) && crypto.timingSafeEqual(Buffer.from(hmacHex), Buffer.from(stripped))) {
      return true;
    }
  } catch (e) {}
  return false;
}

async function getToken() {
  if (TEST_MODE) {
    return 'TEST_TOKEN_' + Date.now();
  }
  if (_token && Date.now() < _tokenExpiry) return _token;

  if (!CLIENT_ID || !API_KEY) throw new Error('ClickPesa credentials not configured');

  const { data } = await axios.post(`${BASE_URL}/generate-token`, null, {
    headers: { 'client-id': CLIENT_ID, 'api-key': API_KEY },
    timeout: 15000,
  });

  _token = data.token;
  _tokenExpiry = Date.now() + 55 * 60 * 1000;
  return _token;
}

async function previewUSSDPush({ amount, phoneNumber, orderReference }) {
  const token = await getToken();
  const payload = { amount: String(amount), currency: 'TZS', orderReference, phoneNumber, fetchSenderDetails: true };
  if (CHECKSUM_KEY) payload.checksum = createChecksum(payload);

  const { data } = await axios.post(`${BASE_URL}/payments/preview-ussd-push-request`, payload, {
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return data;
}

async function initiateUSSDPush({ amount, phoneNumber, orderReference }) {
  if (TEST_MODE) {
    // Simulate successful USSD push initiation
    return {
      status: 'PROCESSING',
      channel: 'USSD',
      id: 'TEST_' + orderReference,
      message: 'USSD push sent (TEST MODE)'
    };
  }

  const token = await getToken();
  const payload = { amount: String(amount), currency: 'TZS', orderReference, phoneNumber };
  if (CHECKSUM_KEY) payload.checksum = createChecksum(payload);

  const { data } = await axios.post(`${BASE_URL}/payments/initiate-ussd-push-request`, payload, {
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return data;
}

async function queryPaymentStatus(orderReference) {
  if (TEST_MODE) {
    // In test mode, simulate a completed payment after a short delay
    return {
      status: 'SUCCESS',
      channel: 'USSD',
      id: 'TEST_' + orderReference,
      amount: '500',
      phoneNumber: '255678960706'
    };
  }

  const token = await getToken();
  const { data } = await axios.get(`${BASE_URL}/payments/${orderReference}`, {
    headers: { Authorization: token },
    timeout: 15000,
  });
  return data;
}

async function queryPayoutStatus(orderReference) {
  const token = await getToken();
  const { data } = await axios.get(`${BASE_URL}/payouts/${encodeURIComponent(orderReference)}`, {
    headers: { Authorization: token },
    timeout: 15000,
  });
  return data;
}

async function getBalance() {
  const token = await getToken();
  const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  const { data } = await axios.get(`${BASE_URL}/account/balance`, {
    headers: { Authorization: authHeader },
    timeout: 15000,
  });
  return data;
}

async function queryAllPayments({ channel, status, startDate, limit } = {}) {
  const token = await getToken();
  const params = {};
  if (channel) params.channel = channel;
  if (status) params.status = status;
  if (startDate) params.startDate = startDate;
  if (limit) params.limit = limit;

  const { data } = await axios.get(`${BASE_URL}/payments/all`, {
    headers: { Authorization: token },
    params,
    timeout: 30000,
  });
  return data;
}

module.exports = {
  createChecksum,
  verifyWebhookChecksum,
  verifyClickPesaWebhookSignature,
  getToken,
  previewUSSDPush,
  initiateUSSDPush,
  queryPaymentStatus,
  queryPayoutStatus,
  getBalance,
  queryAllPayments,
};
