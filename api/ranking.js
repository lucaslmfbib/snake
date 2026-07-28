// Vercel Serverless API Route: Global Leaderboard (Persistent Cloud Database)
const BIN_URL = 'https://extendsclass.com/api/json-storage/bin/aeefecc';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Helper to fetch current DB state
  const fetchDB = async () => {
    try {
      const response = await fetch(BIN_URL);
      if (response.ok) {
        let data = await response.json();
        
        // Se a API retornar formato empacotado: {"status": 0, "data": "{\\"rankings\\":...}"}
        if (data && data.status === 0 && typeof data.data === 'string') {
          try {
            data = JSON.parse(data.data);
          } catch(e) {}
        }
        
        if (data && Array.isArray(data.rankings)) return data.rankings;
      }
    } catch (e) {}
    return [];
  };

  if (req.method === 'GET') {
    const rankings = await fetchDB();
    return res.status(200).json({ rankings });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      const { name, score } = body || {};

      if (name && typeof score === 'number' && score > 0) {
        let currentRankings = await fetchDB();

        currentRankings.push({
          name: String(name).trim().slice(0, 18),
          score: Math.floor(score),
          date: new Date().toLocaleDateString('pt-BR')
        });

        currentRankings.sort((a, b) => b.score - a.score);
        currentRankings = currentRankings.slice(0, 10);

        // Save back to DB
        await fetch(BIN_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rankings: currentRankings })
        });

        return res.status(200).json({ rankings: currentRankings });
      }
    } catch (e) {}
    
    // In case of error, just return current state
    const rankings = await fetchDB();
    return res.status(200).json({ rankings });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
