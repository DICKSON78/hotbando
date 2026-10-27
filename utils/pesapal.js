const axios = require('axios');

// PesaPal API 3.0 base URLs
// https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference
const SANDBOX = 'https://cybqa.pesapal.com/pesapalv3';
const LIVE = 'https://pay.pesapal.com/v3';

let _baseURL, _consumerKey, _consumerSecret, _token, _tokenExpiry;

function init({ consumer_key, consumer_secret, env, callback_url, ipn_url }) {
  const baseURL = env === 'live' ? LIVE : SANDBOX;
  if (_baseURL !== baseURL || _consumerKey !== consumer_key || _consumerSecret !== consumer_secret) {
    _token = null;
    _tokenExpiry = 0;
  }
  _consumerKey = consumer_key;
  _consumerSecret = consumer_secret;
  _baseURL = baseURL;
  if (callback_url) process.env.PESAPAL_CALLBACK_URL = callback_url;
  if (ipn_url) process.env.PESAPAL_IPN_URL = ipn_url;
}

function jsonHeaders(token) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function _getToken() {
  if (_token && _tokenExpiry && Date.now() < _tokenExpiry) return _token;

  const { data } = await axios.post(
    `${_baseURL}/api/Auth/RequestToken`,
    {
      consumer_key: _consumerKey,
      consumer_secret: _consumerSecret,
    },
    { headers: jsonHeaders(), timeout: 20000 }
  );

  if (!data?.token) {
    const message = data?.error?.message || data?.message || 'PesaPal did not return an access token';
    throw new Error(message);
  }

  _token = data.token;
  // PesaPal API 3.0 tokens expire after 5 minutes. Prefer the server-provided
  // expiry and keep a small safety margin; fall back to four minutes.
  const serverExpiry = data.expiryDate ? Date.parse(data.expiryDate) : NaN;
  _tokenExpiry = Number.isFinite(serverExpiry)
    ? Math.max(Date.now() + 60 * 1000, serverExpiry - 30 * 1000)
    : Date.now() + 4 * 60 * 1000;
  return _token;
}

async function registerIPN(url) {
  const token = await _getToken();
  const { data } = await axios.post(
    `${_baseURL}/api/URLSetup/RegisterIPN`,
    { url, ipn_notification_type: 'GET' },
    { headers: jsonHeaders(token), timeout: 20000 }
  );
  return data;
}

async function getIPNList() {
  const token = await _getToken();
  const { data } = await axios.get(
    `${_baseURL}/api/URLSetup/GetIpnList`,
    { headers: jsonHeaders(token), timeout: 20000 }
  );
  return data;
}

async function submitOrder({ id, amount, description, callback_url, notification_id, email, phone, firstName, lastName }) {
  const token = await _getToken();
  const { data } = await axios.post(
    `${_baseURL}/api/Transactions/SubmitOrderRequest`,
    {
      id,
      currency: 'TZS',
      amount: Number(amount),
      description: String(description || '').slice(0, 100),
      redirect_mode: 'TOP_WINDOW',
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
    },
    { headers: jsonHeaders(token), timeout: 20000 }
  );
  return data;
}

async function getPaymentStatus(orderTrackingId) {
  const token = await _getToken();
  const { data } = await axios.get(
    `${_baseURL}/api/Transactions/GetTransactionStatus`,
    { params: { orderTrackingId }, headers: jsonHeaders(token), timeout: 20000 }
  );
  return data;
}

module.exports = {
  init,
  registerIPN,
  getIPNList,
  submitOrder,
  getPaymentStatus,
};
