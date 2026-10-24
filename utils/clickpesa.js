const axios = require('axios');
const crypto = require('crypto');
const logger = require('./logger');

const BASE_URL = process.env.CLICKPESA_BASE_URL || 'https://api.clickpesa.com/third-parties';
const CLIENT_ID = process.env.CLICKPESA_CLIENT_ID || '';
const API_KEY = process.env.CLICKPESA_API_KEY || '';
const CHECKSUM_KEY = process.env.CLICKPESA_CHECKSUM_KEY || '';

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
    // No checksum key configured — accept but log warning
    logger.warn('ClickPesa CHECKSUM_KEY not configured — webhook checksum not verified');
    return true;
  }
  if (!receivedChecksum) {
    logger.warn('ClickPesa webhook received without checksum header');
    return false;
  }
  const payloadForValidation = { ...payload };
  delete payloadForValidation.checksum;
  delete payloadForValidation.checksumMethod;
  const computed = createChecksum(payloadForValidation);
  return computed === receivedChecksum;
}

async function getToken() {
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
  const payload = { amount: String(amount), currency: 'TZS', orderReference, phoneNumber };
  if (CHECKSUM_KEY) payload.checksum = createChecksum(payload);

  const { data } = await axios.post(`${BASE_URL}/payments/preview-ussd-push-request`, payload, {
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return data;
}

async function initiateUSSDPush({ amount, phoneNumber, orderReference }) {
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
  const token = await getToken();
  const { data } = await axios.get(`${BASE_URL}/payments/${orderReference}`, {
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
  getToken,
  previewUSSDPush,
  initiateUSSDPush,
  queryPaymentStatus,
  getBalance,
  queryAllPayments,
};
