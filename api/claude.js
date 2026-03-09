// Vercel Serverless Function — Claude API 프록시 + DB 기반 컨텍스트 검색
const fs   = require('fs');
const path = require('path');

// ── DB 로딩 (콜드 스타트 1회, 이후 캐시) ─────────────────────────────────────
let _db = null;
function loadDB() {
  if (_db) return _db;
  try {
    const dbPath = path.join(__dirname, '..', 'data', 'anesthesia_db.json');
    _db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) {
    console.warn('DB 로딩 실패:', e.message);
    _db = null;
  }
  return _db;
}

// ── 키워드 매칭으로 관련 문서 검색 ────────────────────────────────────────────
function findRelevantDocs(db, conditionText) {
  if (!db || !conditionText) return [];

  const matched = new Set();
  const kwIndex = db.indexes?.by_keyword || {};

  for (const [kw, ids] of Object.entries(kwIndex)) {
    if (conditionText.includes(kw)) {
      ids.forEach(id => matched.add(id));
    }
  }

  // 매칭된 문서 최대 8개 반환
  return (db.documents || [])
    .filter(d => matched.has(d.id))
    .slice(0, 8);
}

// ── 관련 문서 → 시스템 프롬프트 컨텍스트 변환 ────────────────────────────────
function buildDBContext(docs) {
  if (!docs.length) return '';

  let ctx = '\n[참조 DB — 관련 임상 케이스]\n아래 케이스 내용을 우선 활용하고, 없는 경우에만 직접 작성하세요.\n';

  for (const doc of docs) {
    ctx += `\n▶ ${doc.title}\n`;

    // 1순위: consultation_template (협진 문구 직접 추출)
    if (doc.consultation_template && doc.consultation_template.trim()) {
      ctx += doc.consultation_template.trim() + '\n';

    // 2순위: sections (임상 관리 로직)
    } else if (doc.sections?.length) {
      for (const s of doc.sections.slice(0, 3)) {
        if (s.content && s.content.trim()) {
          ctx += `[${s.title}] ${s.content.substring(0, 600).trim()}\n`;
        }
      }

    // 3순위: summary
    } else if (doc.summary) {
      ctx += doc.summary.substring(0, 400).trim() + '\n';
    }
  }

  return ctx;
}

// ── 핸들러 ────────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'ANTHROPIC_API_KEY 환경변수가 서버에 설정되지 않았습니다. Vercel 대시보드 → Settings → Environment Variables를 확인하세요.' },
    });
  }

  // body 파싱
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { prompt, systemPrompt, conditionText } = body;

  if (!prompt) {
    return res.status(400).json({ error: { message: 'prompt가 필요합니다.' } });
  }

  // DB 검색 → 시스템 프롬프트 강화
  const db          = loadDB();
  const searchText  = conditionText || prompt;
  const relDocs     = findRelevantDocs(db, searchText);
  const dbCtx       = buildDBContext(relDocs);
  const enrichedSys = (systemPrompt || '') + dbCtx;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system:     enrichedSys,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: { message: error.message || 'Internal server error' } });
  }
};
