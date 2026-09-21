const BIN_ID  = process.env.JSONBIN_BIN_ID  || '6a3cfb1bda38895dfefc7ccc';
const API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$GhDAl4ts887p.JChRGcize.sD0naZdeZzQUWMDHtBBGl31qkX/wWm';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store, max-age=0'
};

exports.handler = async function() {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false', 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) {
      const txt = await res.text();
      return {
        statusCode: 502,
        headers: HEADERS,
        body: JSON.stringify({ status: 'error', message: `JSONBin ${res.status}: ${txt.substring(0, 120)}` })
      };
    }
    const json = await res.json();
    const veriler = json.record || json;   // X-Bin-Meta:false ise direkt kayıt gelir
    if (!veriler || typeof veriler.gramMiktar === 'undefined') {
      return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ status: 'error', message: 'Kayıt boş/bozuk' }) };
    }

    // Canlı fiyat başarısız olsa bile miktarlar dönsün
    try {
      const fiyatRes = await fetch('https://static.altinkaynak.com/Store_Gold_2', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      });
      const fiyatJson = await fiyatRes.json();
      let gram = null, ceyrek = null;
      for (const item of fiyatJson) {
        const kod = (item.Kod || '').toUpperCase().trim();
        if (kod === 'GAT' || (kod === 'GA' && !gram)) gram = { alis: item.Alis, satis: item.Satis };
        if (kod === 'PC' && !ceyrek) ceyrek = { alis: item.Alis, satis: item.Satis };
      }
      veriler.gramFiyatCanli = gram;
      veriler.ceyrekFiyatCanli = ceyrek;
    } catch (_) {}

    veriler.status = 'success';
    veriler.timestamp = Date.now();
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(veriler) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ status: 'error', message: e.message }) };
  }
};
