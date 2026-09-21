const BIN_ID  = process.env.JSONBIN_BIN_ID  || '6a3cfb1bda38895dfefc7ccc';
const API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$GhDAl4ts887p.JChRGcize.sD0naZdeZzQUWMDHtBBGl31qkX/wWm';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store, max-age=0'
};

// Zaman sınırlı fetch: takılan istek fonksiyonu 30 sn kilitlemesin
async function fetchTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`${ms / 1000} sn içinde cevap yok`);
    throw e;
  } finally {
    clearTimeout(t);
  }
}

async function miktarlariOku() {
  const res = await fetchTimeout(
    `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
    { headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' } },
    8000
  );
  const txt = await res.text();
  if (!res.ok) throw new Error(`JSONBin ${res.status}: ${txt.substring(0, 120)}`);
  let json;
  try { json = JSON.parse(txt); }
  catch (_) { throw new Error(`JSONBin JSON yerine HTML döndü (HTTP ${res.status}): ${txt.substring(0, 100)}`); }
  const kayit = json.record || json;
  if (!kayit || typeof kayit.gramMiktar === 'undefined') throw new Error('JSONBin kaydı boş/bozuk');
  return kayit;
}

async function fiyatlariOku() {
  const res = await fetchTimeout(
    'https://static.altinkaynak.com/Store_Gold_2',
    { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } },
    5000
  );
  const txt = await res.text();
  let arr;
  try { arr = JSON.parse(txt); }
  catch (_) { throw new Error(`Altinkaynak JSON yerine HTML döndü (HTTP ${res.status})`); }
  let gram = null, ceyrek = null;
  for (const item of arr) {
    const kod = (item.Kod || '').toUpperCase().trim();
    if (kod === 'GAT' || (kod === 'GA' && !gram)) gram = { alis: item.Alis, satis: item.Satis };
    if (kod === 'PC' && !ceyrek) ceyrek = { alis: item.Alis, satis: item.Satis };
  }
  return { gram, ceyrek };
}

exports.handler = async function() {
  // İkisi paralel çalışır; fiyat başarısız olsa bile miktarlar dönmeli
  const [miktar, fiyat] = await Promise.allSettled([miktarlariOku(), fiyatlariOku()]);

  if (miktar.status !== 'fulfilled') {
    return {
      statusCode: 502,
      headers: HEADERS,
      body: JSON.stringify({ status: 'error', message: miktar.reason.message })
    };
  }

  const veriler = miktar.value;
  if (fiyat.status === 'fulfilled') {
    veriler.gramFiyatCanli = fiyat.value.gram;
    veriler.ceyrekFiyatCanli = fiyat.value.ceyrek;
  } else {
    veriler.fiyatHata = fiyat.reason.message;
  }
  veriler.status = 'success';
  veriler.timestamp = Date.now();
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify(veriler) };
};
