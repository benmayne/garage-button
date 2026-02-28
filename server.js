import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  HA_URL,
  HA_TOKEN,
  HA_ENTITY_ID = 'cover.msg100_6122_garage_door',
  PORT = '3000',
} = process.env;

if (!HA_URL || !HA_TOKEN) {
  console.error('Missing required env vars: HA_URL, HA_TOKEN');
  process.exit(1);
}

const app = express();
app.use(express.static(join(__dirname, 'public')));

const haFetch = (path, options = {}) =>
  fetch(`${HA_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

app.get('/api/state', async (req, res) => {
  try {
    const r = await haFetch(`/api/states/${HA_ENTITY_ID}`);
    if (!r.ok) throw new Error(`HA responded ${r.status}`);
    const { state } = await r.json();
    res.json({ state });
  } catch (err) {
    console.error('state fetch failed:', err.message);
    res.status(502).json({ error: 'Failed to reach Home Assistant' });
  }
});

app.post('/api/open', async (req, res) => {
  try {
    const r = await haFetch('/api/services/cover/open_cover', {
      method: 'POST',
      body: JSON.stringify({ entity_id: HA_ENTITY_ID }),
    });
    if (!r.ok) throw new Error(`HA responded ${r.status}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('open failed:', err.message);
    res.status(502).json({ error: 'Failed to open cover' });
  }
});

app.post('/api/close', async (req, res) => {
  try {
    const r = await haFetch('/api/services/cover/close_cover', {
      method: 'POST',
      body: JSON.stringify({ entity_id: HA_ENTITY_ID }),
    });
    if (!r.ok) throw new Error(`HA responded ${r.status}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('close failed:', err.message);
    res.status(502).json({ error: 'Failed to close cover' });
  }
});

app.listen(parseInt(PORT), () =>
  console.log(`Garage button running on :${PORT} (entity: ${HA_ENTITY_ID})`)
);
