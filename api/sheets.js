/**
 * Vercel Serverless Function
 * Google Sheets 데이터를 서버 사이드에서 가져와서 반환합니다.
 * Sheets ID는 환경 변수에서만 읽어오므로 클라이언트에 노출되지 않습니다.
 */

export default async function handler(req, res) {
    // GET 요청만 허용
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 환경 변수에서 Google Sheets ID 가져오기
        const sheetId = process.env.GOOGLE_SHEETS_ID;
        
        if (!sheetId) {
            console.error('GOOGLE_SHEETS_ID 환경 변수가 설정되지 않았습니다.');
            return res.status(500).json({ 
                error: '서버 설정 오류: Google Sheets ID가 설정되지 않았습니다.' 
            });
        }

        // 시트 이름 (선택사항, 쿼리 파라미터로 받을 수 있음)
        const sheetName = req.query.sheet || '제주 공항근처';
        
        // 여러 방법 시도 (CORS 문제 해결을 위해)
        const methods = [
            // 방법 1: 직접 접근 (공개 시트인 경우)
            `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=0`,
            // 방법 2: 시트 이름 사용
            `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
            // 방법 3: export 형식 사용
            `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`
        ];
        
        let csvText = null;
        let lastError = null;
        
        // 각 방법을 순차적으로 시도
        for (const url of methods) {
            try {
                console.log(`시도 중: ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    },
                    cache: 'no-cache'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                csvText = await response.text();
                
                // CSV 데이터가 유효한지 확인
                if (csvText && csvText.length > 100 && csvText.includes(',')) {
                    console.log('데이터 로드 성공!');
                    break;
                } else {
                    throw new Error('유효하지 않은 데이터');
                }
            } catch (err) {
                console.warn(`방법 실패: ${err.message}`);
                lastError = err;
                continue;
            }
        }
        
        if (!csvText) {
            throw new Error(`모든 방법이 실패했습니다: ${lastError?.message || '알 수 없는 오류'}`);
        }
        
        // CSV 데이터를 클라이언트에 반환
        res.status(200).json({
            success: true,
            data: csvText
        });
        
    } catch (error) {
        console.error('Google Sheets 데이터 로드 오류:', error);
        res.status(500).json({
            error: '데이터를 불러올 수 없습니다.',
            message: error.message
        });
    }
}

