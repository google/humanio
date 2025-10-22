/*
 Copyright 2024 Google LLC
...
*/
const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
const app = express();

// لا تكشف ملفات الخادم
app.use((req, res, next) => {
  if (req.path === '/server.js') return res.status(404).send('Not found');
  next();
});

// static آمن من public/ فقط
app.use('/static', express.static(path.join(__dirname, 'public'), { fallthrough: false }));

// JSON payload limit
app.use(express.json({ limit: '50mb' }));

// --- Image caption (Replicate) كما هو مع نقل المفاتيح إلى ENV ---
async function replicateGenerateCaption(image, caption, question) {
  const apikey = process.env.REPLICATE_TOKEN || '';
  const endpoint = 'https://api.replicate.com/v1/predictions';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apikey}`
    },
    body: JSON.stringify({
      version: '4b32258c42e9efd4288bb9910bc532a69727f9acd26aa08e175713a0a857a608',
      input: { image, caption, question }
    })
  });
  return await response.json();
}

async function replicateGetCaption(id, attempt = 1, maxAttempts = 20) {
  const apikey = process.env.REPLICATE_TOKEN || '';
  const endpoint = `https://api.replicate.com/v1/predictions/${id}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${apikey}` }
  });
  const data = await response.json();
  if (data.status === 'succeeded') return data;
  if (data.status === 'failed' || data.status === 'canceled') throw new Error(`Prediction ${data.status}`);
  if (attempt >= maxAttempts) throw new Error('Polling exceeded max attempts');
  await new Promise(r => setTimeout(r, 500 * Math.min(8, attempt)));
  return await replicateGetCaption(id, attempt + 1, maxAttempts);
}

app.post('/imageCaption', async (req, res) => {
  try {
    const { image, caption, question } = req.body || {};
    if (!image) return res.status(400).json({ error: 'image required' });
    const data = await replicateGenerateCaption(image, caption, question);
    const id = data.id;
    const result = await replicateGetCaption(id);
    res.send(result);
  } catch (e) {
    res.status(500).json({ error: e.message || 'internal error' });
  }
});

// --- Proxy آمن لـ OpenAI: لا مفاتيح على الواجهة ---
app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing on server' });
    const { model = 'gpt-4o', messages = [], temperature = 0 } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] required' });
    }
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature })
    });
    const data = await r.json();
    res.status(r.ok ? 200 : (data?.error?.code ? 400 : 500)).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || 'proxy error' });
  }
});

// index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// HTTPS bootstrap (كما كان)
const privateKey = fs.readFileSync('key.pem', 'utf8');
const certificate = fs.readFileSync('cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);
httpsServer.listen(3000, () => {
  console.log('HTTPS server running on https://localhost:3000');
});

// Backend proxy for OpenAI (reads OPENAI_API_KEY from env)
app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });
    const { model = 'gpt-4o', messages = [], temperature = 0 } = req.body || {};
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature })
    });
    const data = await r.json();
    res.status(r.ok ? 200 : 500).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || 'proxy error' });
  }
});
