import { getDb, saveDb } from './storage.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const { device_id } = await req.json();
    if (!device_id) {
      return Response.json({ allowed: true, message: '' }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const db = await getDb();
    const device = db.devices.find(d => d.device_id === device_id);

    if (!device) {
      return Response.json({ allowed: true, message: '' }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    device.last_seen = new Date().toISOString();
    
    // Non-blocking save to avoid slowing down the heartbeat check
    saveDb(db).catch(() => {});

    const allowed = device.status !== 'revoked';
    const message = allowed ? '' : 'Your license has been revoked. Contact @miradegen11 on Telegram for unlocking.';

    return Response.json({ allowed, message }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return Response.json({ allowed: true, message: '' }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
