// api/naver-token.js
// Vercel Serverless Function — 네이버 OAuth 토큰 교환 + 사용자 정보 조회
// GitHub 루트의 /api/ 폴더에 이 파일을 넣으면 자동으로 /api/naver-token 엔드포인트가 생성됩니다.

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', 'https://www.rosarynovena.org');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, redirect_uri } = req.body || {};

  if (!code) {
    return res.status(400).json({ error: '인가코드(code)가 없습니다.' });
  }

  const NAVER_CLIENT_ID     = process.env.NAVER_CLIENT_ID;
  const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return res.status(500).json({ error: '서버 환경변수 미설정' });
  }

  try {
    // ── 1단계: 인가코드 → 액세스 토큰 교환 ──
    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type   : 'authorization_code',
        client_id    : NAVER_CLIENT_ID,
        client_secret: NAVER_CLIENT_SECRET,
        redirect_uri : redirect_uri || 'https://www.rosarynovena.org',
        code         : code
      })
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(400).json({ error: '토큰 발급 실패', detail: tokenData });
    }

    // ── 2단계: 액세스 토큰 → 사용자 정보 조회 ──
    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token }
    });
    const profileData = await profileRes.json();

    if (profileData.resultcode !== '00') {
      return res.status(400).json({ error: '사용자 정보 조회 실패', detail: profileData });
    }

    const info = profileData.response;

    // ── 3단계: 필요한 정보만 반환 ──
    return res.status(200).json({
      id           : info.id,
      name         : info.name         || info.nickname || '네이버 사용자',
      email        : info.email        || '',
      nickname     : info.nickname     || '',
      profile_image: info.profile_image || ''
    });

  } catch (err) {
    console.error('네이버 토큰 교환 오류:', err);
    return res.status(500).json({ error: '서버 오류', message: err.message });
  }
}
