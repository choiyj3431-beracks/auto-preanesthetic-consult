// Vercel Serverless Function — Claude API 프록시
// API 키: 클라이언트 입력 키 우선, 없으면 서버 환경변수 ANTHROPIC_API_KEY 사용
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { prompt, systemPrompt, apiKey: clientKey } = req.body || {};

  // 클라이언트 입력 키 우선, 없으면 서버 환경변수
  const apiKey = clientKey || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(400).json({
      error: { message: 'API 키가 없습니다. 설정에서 Anthropic API 키를 입력하거나, 서버에 ANTHROPIC_API_KEY 환경변수를 설정하세요.' },
    });
  }

  if (!prompt) {
    return res.status(400).json({ error: { message: 'prompt가 필요합니다.' } });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt || '',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: { message: error.message || 'Internal server error' } });
  }
};
