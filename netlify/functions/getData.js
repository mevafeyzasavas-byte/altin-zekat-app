const { getStore } = require('@netlify/blobs');

exports.handler = async function(event, context) {
  try {
    const store = getStore('altinportfoy');
    const raw = await store.get('veriler');
    
    let veriler = raw ? JSON.parse(raw) : {
      gramMiktar: 65, ceyrekMiktar: 13,
      nGramMiktar: 95, nCeyrekMiktar: 13,
      manuelGramFiyat: 0, manuelCeyrekFiyat: 0
    };

    // Altın fiyatlarını çek
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
    veriler.status = 'success';
    veriler.timestamp = Date.now();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(veriler)
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'error', message: e.message })
    };
  }
};
