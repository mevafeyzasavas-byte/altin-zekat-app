exports.handler = async function(event, context) {
  try {
    const response = await fetch('https://static.altinkaynak.com/Store_Gold_2', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const json = await response.json();
    
    let gram = null, ceyrek = null;
    for (const item of json) {
      const kod = (item.Kod || '').toUpperCase().trim();
      if (kod === 'GAT' || (kod === 'GA' && !gram)) {
        gram = { alis: item.Alis, satis: item.Satis };
      }
      if (kod === 'PC' && !ceyrek) {
        ceyrek = { alis: item.Alis, satis: item.Satis };
      }
    }
    if (!ceyrek && gram) {
      ceyrek = {
        alis: String(Math.round(parseFloat(gram.alis.replace('.','').replace(',','.')) * 1.75)),
        satis: String(Math.round(parseFloat(gram.satis.replace('.','').replace(',','.')) * 1.75))
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: true, gram, ceyrek, timestamp: Date.now() })
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: e.message })
    };
  }
};
