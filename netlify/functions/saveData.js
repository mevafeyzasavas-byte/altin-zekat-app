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
    const sonGuncelleme = new Date().toISOString();

    const { getStore, connectLambda } = await import('@netlify/blobs');
    connectLambda(event);
    const store = getStore({ name: 'altin' });

    // Miktar alanları geldiyse: tam kayıt. Gelmediyse (otomatik fiyat senkronu):
    // miktarlara DOKUNMA — ayrı 'fiyatlar' anahtarına yaz. (Eskiden eksik alanlar
    // varsayılan 71/14 ile yazılıp kaydedilen miktarı eziyordu.)
    const veriler = { sonGuncelleme };
    if (params.has('gramMiktar') || params.has('ceyrekMiktar')) {
      Object.assign(veriler, {
        gramMiktar:        num('gramMiktar', 71),
        ceyrekMiktar:      num('ceyrekMiktar', 14),
        nGramMiktar:       num('nGramMiktar', 71),
        nCeyrekMiktar:     num('nCeyrekMiktar', 14),
        gramFiyat:         num('gramFiyat', 0),
        ceyrekFiyat:       num('ceyrekFiyat', 0),
        manuelGramFiyat:   num('manuelGramFiyat', 0),
        manuelCeyrekFiyat: num('manuelCeyrekFiyat', 0)
      });
      await store.setJSON('veriler', veriler);
    } else {
      Object.assign(veriler, {
        gramFiyat:   num('gramFiyat', 0),
        ceyrekFiyat: num('ceyrekFiyat', 0)
      });
      await store.setJSON('fiyatlar', veriler);
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ status: 'success', sonGuncelleme: veriler.sonGuncelleme, timestamp: Date.now() })
    };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ status: 'error', message: 'Depo hatası: ' + e.message }) };
  }
};
