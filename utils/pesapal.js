const axios = require('axios');
const crypto = require('crypto');
const logger = require('./logger');

const SANDBOX = 'https://cybqa.pesapal.com/v3';
const LIVE = 'https://pay.pesapal.com/v3';

let _baseURL, _consumerKey, _consumerSecret, _token, _tokenExpiry;
let _ipnSecretKey = process.env.PESAPAL_IPN_SECRET || '';

function init({ consumer_key, consumer_secret, env, callback_url, ipn_url, ipn_secret }) {
  _consumerKey = consumer_key;
  _consumerSecret = consumer_secret;
  _baseURL = env === 'live' ? LIVE : SANDBOX;
  if (callback_url) process.env.PESAPAL_CALLBACK_URL = callback_url;
  if (ipn_url) process.env.PESAPAL_IPN_URL = ipn_url;
  if (ipn_secret) _ipnSecretKey = ipn_secret;
}

/**
 * Verify PesaPal IPN notification signature
 * PesaPal v3 uses HMAC-SHA512 with the IPN secret key
 */
function verifyIPNSignature(orderTrackingId, merchantReference, status, signature) {
  if (!_ipnSecretKey) {
    logger.warn('PesaPal IPN secret key not configured - skipping verification');
    return true; // Allow if not configured (dev mode)
  }

  try {
    const payload = `${orderTrackingId}${merchantReference || ''}${status || ''}`;
    const expectedSignature = crypto
      .createHmac('sha512', _ipnSecretKey)
      .update(payload)
      .digest('hex');
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature || '', 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    
    if (!isValid) {
      logger.warn('PesaPal IPN signature mismatch', { orderTrackingId });
    }
    return isValid;
  } catch (error) {
    logger.error('IPN signature verification error', { error: error.message });
    return false;
  }
}

/**
 * Verify PesaPal callback signature (for redirect callbacks)
 */
function verifyCallbackSignature(orderTrackingId, status, signature) {
  if (!_ipnSecretKey) {
    return true;
  }

  try {
    const payload = `${orderTrackingId}${status || ''}`;
    const expectedSignature = crypto
      .createHmac('sha512', _ipnSecretKey)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature || '', 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Callback signature verification error', { error: error.message });
    return false;
  }
}

async function _getToken() {
  if (_token && _tokenExpiry && Date.now() < _tokenExpiry) return _token;

  const { data } = await axios.post(`${_baseURL}/api/Auth/RequestToken`, {
    consumer_key: _consumerKey,
    consumer_secret: _consumerSecret,
  });
  _token = data.token;
  _tokenExpiry = Date.now() + 3500 * 1000;
  return _token;
}

async function registerIPN(url) {
  const token = await _getToken();
  const { data } = await axios.post(`${_baseURL}/api/URLSetup/RegisterIPN`, {
    url,
    ipn_notification_type: 'GET',
  }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  return data;
}

async function submitOrder({ id, amount, description, callback_url, notification_id, email, phone, firstName, lastName }) {
  const token = await _getToken();
  const { data } = await axios.post(`${_baseURL}/api/Transactions/SubmitOrderRequest`, {
    id,
    currency: 'TZS',
    amount,
    description,
    callback_url: callback_url || process.env.PESAPAL_CALLBACK_URL || '',
    notification_id,
    billing_address: {
      email_address: email || '',
      phone_number: phone || '',
      country_code: 'TZ',
      first_name: firstName || '',
      last_name: lastName || '',
      line_1: 'HotBando',
    },
  }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  return data;
}

async function getPaymentStatus(orderTrackingId) {
  const token = await _getToken();
  const { data } = await axios.get(`${_baseURL}/api/Transactions/GetTransactionStatus`, {
    params: { orderTrackingId },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

module.exports = { 
  init, 
  registerIPN, 
  submitOrder, 
  getPaymentStatus,
  verifyIPNSignature,
  verifyCallbackSignature
};
