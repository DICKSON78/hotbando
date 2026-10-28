const crypto = require('crypto');
const http = require('http');

const SECRET = process.env.CLICKPESA_WEBHOOK_SECRET || 'test_secret';
const url = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/clickpesa';

function sign(body) {
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(body);
  return hmac.digest('hex');
}

const payload = {
  eventType: 'PAYMENT RECEIVED',
  id: 'CP_TEST_' + Date.now(),
  orderReference: process.env.TEST_ORDER_REF || 'HBTEST123',
  amount: '1000',
  currency: 'TZS',
  status: 'SUCCESS'
};

const body = JSON.stringify(payload);
const signature = sign(body);

function send() {
  const req = http.request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-clickpesa-signature': signature,
      'Content-Length': Buffer.byteLength(body)
    }
  }, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('BODY:', data);
    });
  });
  req.write(body);
  req.end();
}

send();
setTimeout(send, 1000); // Send twice - second should be ignored
