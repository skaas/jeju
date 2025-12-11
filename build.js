#!/usr/bin/env node

/**
 * 빌드 스크립트
 * 환경 변수를 읽어서 config.js와 index.html을 생성합니다
 * Vercel 배포 시 자동으로 실행됩니다
 */

const fs = require('fs');
const path = require('path');

// .env 파일 읽기 (로컬 개발용)
function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            // 주석이나 빈 줄 건너뛰기
            if (trimmed && !trimmed.startsWith('#')) {
                const match = trimmed.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim();
                    envVars[key] = value;
                }
            }
        });
        return envVars;
    }
    return {};
}

// 환경 변수 읽기 (환경 변수 우선, 없으면 .env 파일에서 읽기)
// 참고: GOOGLE_SHEETS_ID는 서버 사이드에서만 사용하므로 클라이언트에 포함하지 않습니다
const envVars = loadEnvFile();
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || envVars.GOOGLE_MAPS_API_KEY || '';

if (!GOOGLE_MAPS_API_KEY) {
    console.warn('⚠️  경고: GOOGLE_MAPS_API_KEY 환경 변수가 설정되지 않았습니다.');
    console.warn('   Vercel 대시보드에서 환경 변수를 설정해주세요.');
}

// config.js 생성 (Google Maps API 키만 포함, Sheets ID는 서버 사이드에서만 사용)
const configContent = `// 환경 변수 설정
// 이 파일은 빌드 시점에 자동 생성됩니다
// 참고: GOOGLE_SHEETS_ID는 서버 사이드 API에서만 사용하므로 여기에 포함되지 않습니다

window.APP_CONFIG = {
    GOOGLE_MAPS_API_KEY: '${GOOGLE_MAPS_API_KEY}'
};
`;

fs.writeFileSync(path.join(__dirname, 'config.js'), configContent, 'utf8');
console.log('✅ config.js 파일이 생성되었습니다.');

// index.html 읽기 및 수정
const indexPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// 기존 API 키를 환경 변수로 교체
indexContent = indexContent.replace(
    /<script src="https:\/\/maps\.googleapis\.com\/maps\/api\/js\?key=[^&]+&libraries=places"><\/script>/,
    `<script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places"></script>`
);

// config.js 스크립트 태그 추가 (app.js 전에)
if (!indexContent.includes('config.js')) {
    indexContent = indexContent.replace(
        '<script src="app.js"></script>',
        '<script src="config.js"></script>\n    <script src="app.js"></script>'
    );
}

fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log('✅ index.html 파일이 업데이트되었습니다.');

