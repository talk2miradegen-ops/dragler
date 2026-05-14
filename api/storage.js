export const config = { runtime: 'edge' };

// ════════════════════════════════════════════════════════════
// FREE STORAGE WORKAROUND USING JSONBIN.IO
// 1. Go to https://jsonbin.io/ and create a free account
// 2. Click "Create Bin" and save `{ "devices": [] }`
// 3. Copy the Bin ID and your Master API Key
// 4. In Vercel, set these Environment Variables:
//    JSONBIN_BIN_ID = your_bin_id
//    JSONBIN_API_KEY = your_master_key
// ════════════════════════════════════════════════════════════

export async function getDb() {
  const binId = process.env.JSONBIN_BIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;

  if (!binId || !apiKey) {
    return { devices: [] };
  }

  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: {
        'X-Master-Key': apiKey
      }
    });
    const data = await res.json();
    let record = data.record;
    if (!record || typeof record !== 'object') {
      record = { devices: [] };
    }
    if (!Array.isArray(record.devices)) {
      record.devices = [];
    }
    return record;
  } catch (e) {
    console.error("Failed to read DB", e);
    return { devices: [] };
  }
}

export async function saveDb(data) {
  const binId = process.env.JSONBIN_BIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;

  if (!binId || !apiKey) return;

  try {
    await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey
      },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error("Failed to save DB", e);
  }
}
