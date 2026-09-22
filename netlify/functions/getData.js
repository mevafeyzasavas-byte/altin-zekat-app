// Veriler artık JSONBin'de değil, Netlify Blobs'ta (aynı sitede, dış servise bağımlılık yok).
const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store, max-age=0'
};

// Blobs boşsa (ilk çalışma) bu değerlerle başlar — JSONBin'deki son kayıt
const ILK_VERI = {
  gramMiktar: 71,
  ceyrekMiktar: 14,
  nGramMiktar: 71,
  nCeyrekMiktar: 14,
  gramFiyat: 6748.77,
  ceyrekFiyat: 10852.52,
  manuelGramFiyat: 8000,
  manuelCeyrekFiyat: 12500,
  sonGuncelleme: '2026-09-21T07:56:22.642Z'
};

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

async function miktarlariOku(event) {
  const { getStore, connectLambda } = await import('@netlify/blobs');
  connectLambda(event);
  const store = getStore({ name: 'altin' });
  let kayit = await store.get('veriler', { type: 'json' });
  if (!kayit) {
    kayit = ILK_VERI;
    await store.setJSON('veriler', kayit);
  }
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

exports.handler = async function(event) {
  const [miktar, fiyat] = await Promise.allSettled([miktarlariOku(event), fiyatlariOku()]);

  if (miktar.status !== 'fulfilled') {
    return {
      statusCode: 502,
      headers: HEADERS,
      body: JSON.stringify({ status: 'error', message: 'Depo hatası: ' + miktar.reason.message })
    };
  }

  const veriler = { ...miktar.value };
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
