const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const crypto = require('crypto');

  let body;
  try { body = JSON.parse(event.body); } 
  catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const hashData = (str) => {
    if (!str) return undefined;
    return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
  };

  const payload = JSON.stringify({
    data: [{
      event_name: body.eventName || 'Contact',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      test_event_code: 'TEST8000',
      event_source_url: body.eventSourceUrl || '',
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_data: {
        fbc: body.fbc || '',
        fbp: body.fbp || '',
        client_ip_address: event.headers['x-forwarded-for'] || '',
        client_user_agent: event.headers['user-agent'] || '',
      }
    }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'graph.facebook.com',
      path: `/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: data
        });
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 500, body: e.message });
    });

    req.write(payload);
    req.end();
  });
};
