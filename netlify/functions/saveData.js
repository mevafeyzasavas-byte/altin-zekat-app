exports.handler = async function(event, context) {
  const BIN_ID = '6a3cfb1bda38895dfefc7ccc';
  const API_KEY = '$2a$10$GhDAl4ts887p.JChRGcize.sD0naZdeZzQUWMDHtBBGl31qkX/wWm';

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
    const veriler = {
      gramMiktar:        parseFloat(params.get('gramMiktar')        || 65),
      ceyrekMiktar:      parseFloat(params.get('ceyrekMiktar')      || 13),
      nGramMiktar:       parseFloat(params.get('nGramMiktar')       || 95),
      nCeyrekMiktar:     parseFloat(params.get('nCeyrekMiktar')     || 13),
      gramFiyat:         parseFloat(params.get('gramFiyat')         || 0),
      ceyrekFiyat:       parseFloat(params.get('ceyrekFiyat')       || 0),
      manuelGramFiyat:   parseFloat(params.get('manuelGramFiyat')   || 0),
      manuelCeyrekFiyat: parseFloat(params.get('manuelCeyrekFiyat') || 0),
      sonGuncelleme:     new Date().toISOString()
    };

    // JSONBin'e kaydet
    await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY
      },
      body: JSON.stringify(veriler)
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'success', sonGuncelleme: veriler.sonGuncelleme, timestamp: Date.now() })
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'error', message: e.message })
    };
  }
};
