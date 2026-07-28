// Vercel Serverless API Route: Global Leaderboard (100% Real Players Only)
let inMemoryRankings = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ rankings: inMemoryRankings });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      const { name, score } = body || {};

      if (name && typeof score === 'number' && score > 0) {
        inMemoryRankings.push({
          name: String(name).trim().slice(0, 18),
          score: Math.floor(score),
          date: new Date().toLocaleDateString('pt-BR')
        });

        inMemoryRankings.sort((a, b) => b.score - a.score);
        inMemoryRankings = inMemoryRankings.slice(0, 10);
      }
    } catch (e) {}

    return res.status(200).json({ rankings: inMemoryRankings });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
