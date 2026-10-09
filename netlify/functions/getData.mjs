import { getStore } from '@netlify/blobs';

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

async function miktarlariOku() {
  // Yeni (v2) fonksiyon biçiminde Blobs bağlantısı, strong okuma için gereken
  // uncachedEdgeURL dahil, ortamdan otomatik gelir (connectLambda gerekmez).
  const store = getStore({ name: 'altin' });

  // Önce garanti-güncel ("strong") okuma dene — az önce kaydedilen değeri
  // kesin getirir. Bu ortamda desteklenmiyorsa veya hata verirse (örn. "Depo
  // hatası"), sessizce normal ("eventual") okumaya düş — uygulama asla
  // kullanıcıya hata göstermeden çalışmaya devam eder.
  let kayit;
  let okumaTuru = 'strong';
  let okumaHata = null;
  try {
    kayit = await store.get('veriler', { type: 'json', consistency: 'strong' });
  } catch (e) {
    console.warn('Strong okuma başarısız, eventual okumaya düşülüyor:', e.message);
    okumaTuru = 'eventual'; // bu modda yeni kayıt 60 sn'ye kadar görünmeyebilir
    okumaHata = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e));
    kayit = await store.get('veriler', { type: 'json' });
  }

  if (!kayit) {
    kayit = ILK_VERI;
    await store.setJSON('veriler', kayit);
  }

  // Fiyat-only kayıt (otomatik senkron) daha yeniyse sadece fiyatları üstüne bindir
  try {
    const f = await store.get('fiyatlar', { type: 'json' });
    if (f && f.sonGuncelleme > (kayit.sonGuncelleme || '')) {
      kayit = { ...kayit, gramFiyat: f.gramFiyat, ceyrekFiyat: f.ceyrekFiyat };
    }
  } catch (e) { /* fiyatlar yoksa/okunamazsa sessizce geç */ }
  const sonuc = { ...kayit, okumaTuru };
  if (okumaHata) sonuc.okumaHata = okumaHata;
  return sonuc;
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

const CORS_ON = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With'
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: CORS_ON });
  }

  const [miktar, fiyat] = await Promise.allSettled([miktarlariOku(), fiyatlariOku()]);

  if (miktar.status !== 'fulfilled') {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Depo hatası: ' + miktar.reason.message }),
      { status: 502, headers: HEADERS }
    );
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
  return new Response(JSON.stringify(veriler), { status: 200, headers: HEADERS });
};
