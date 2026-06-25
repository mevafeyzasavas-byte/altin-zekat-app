exports.handler = async function(event, context) {
  const VERI_URL = 'https://coreg.rf.gd/altinreal.php';
  
  try {
    // Veri oku
    const response = await fetch(VERI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=getData'
    });
    const data = await response.json();

    // Fiyatları da çek
    const fiyatRes = await fetch('https://static.altinkaynak.com/Store_Gold_2', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    const fiyatJson = await fiyatRes.json();

    let gram = null, ceyrek = null;
    for (const item of fiyatJson) {
      const kod = (item.Kod || '').toUpperCase().trim();
      if ((kod === 'GAT' || (kod === 'GA' && !gram))) {
        gram = { alis: item.Alis, satis: item.Satis };
      }
      if (kod === 'PC' && !ceyrek) {
        ceyrek = { alis: item.Alis, satis: item.Satis };
      }
    }

    data.gramFiyatCanli = gram;
    data.ceyrekFiyatCanli = ceyrek;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'error', message: e.message })
    };
  }
};
