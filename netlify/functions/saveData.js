const { getStore } = require('@netlify/blobs');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  try {
    const store = getStore('altinportfoy');
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
    await store.set('veriler', JSON.stringify(veriler));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'success', sonGuncelleme: veriler.sonGuncelleme })
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'error', message: e.message })
    };
  }
};
