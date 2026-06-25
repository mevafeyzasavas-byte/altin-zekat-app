exports.handler = async function(event, context) {
  const BIN_ID = '6a3cfb1bda38895dfefc7ccc';
  const API_KEY = '$2a$10$GhDAl4ts887p.JChRGcize.sD0naZdeZzQUWMDHtBBGl31qkX/wWm';

  try {
    // JSONBin'den veri oku
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY }
    });
    const json = await res.json();
    const veriler = json.record;

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
