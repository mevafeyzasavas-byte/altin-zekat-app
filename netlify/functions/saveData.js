const BIN_ID  = process.env.JSONBIN_BIN_ID  || '6a3cfb1bda38895dfefc7ccc';
const API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$GhDAl4ts887p.JChRGcize.sD0naZdeZzQUWMDHtBBGl31qkX/wWm';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store'
};

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  try {
    const params = new URLSearchParams(event.body);
    const num = (k, d) => { const n = parseFloat(params.get(k)); return isNaN(n) ? d : n; };
    const veriler = {
      gramMiktar:        num('gramMiktar', 65),
      ceyrekMiktar:      num('ceyrekMiktar', 13),
      nGramMiktar:       num('nGramMiktar', 95),
      nCeyrekMiktar:     num('nCeyrekMiktar', 13),
      gramFiyat:         num('gramFiyat', 0),
      ceyrekFiyat:       num('ceyrekFiyat', 0),
      manuelGramFiyat:   num('manuelGramFiyat', 0),
      manuelCeyrekFiyat: num('manuelCeyrekFiyat', 0),
      sonGuncelleme:     new Date().toISOString()
    };

    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
      body: JSON.stringify(veriler)
    });

    // ESKİ HATA: JSONBin cevabı kontrol edilmiyordu, PUT başarısız olsa bile "success" dönüyordu.
    if (!res.ok) {
      const txt = await res.text();
      return {
        statusCode: 502,
        headers: HEADERS,
        body: JSON.stringify({ status: 'error', message: `JSONBin ${res.status}: ${txt.substring(0, 120)}` })
      };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ status: 'success', sonGuncelleme: veriler.sonGuncelleme, timestamp: Date.now() })
    };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ status: 'error', message: e.message }) };
  }
};
