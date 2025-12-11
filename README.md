# 제주 공항근처 맛집 지도

Google Sheets에서 음식점 데이터를 가져와 Google Maps에 표시하는 웹 애플리케이션입니다.

## 기능

- Google Sheets에서 음식점 데이터 자동 로드
- Google Maps에 음식점 위치 마커 표시
- 각 음식점의 상세 정보 표시 (이름, 주소, 매출, 면적 등)
- 정보 패널에서 음식점 목록 확인 및 클릭하여 지도에서 위치 확인
- 사용자 위치 기반 지도 초기화 (제주도 범위 내)

## 보안 설정 (중요!)

⚠️ **GitHub에 퍼블릭으로 올리기 전에 반드시 확인하세요!**

이 프로젝트는 환경 변수를 사용하여 API 키와 민감한 정보를 보호합니다. 절대로 API 키를 코드에 직접 하드코딩하지 마세요.

## 배포 방법

### Vercel 배포

1. **GitHub에 저장소 푸시**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

2. **Vercel에 프로젝트 연결**
   - [Vercel](https://vercel.com)에 로그인
   - "New Project" 클릭
   - GitHub 저장소 선택

3. **환경 변수 설정**
   Vercel 대시보드에서 다음 환경 변수를 설정하세요:
   - `GOOGLE_MAPS_API_KEY`: Google Maps API 키 (클라이언트에서 사용)
   - `GOOGLE_SHEETS_ID`: Google Sheets ID (서버 사이드에서만 사용) ⭐

   **설정 방법:**
   - 프로젝트 설정 > Environment Variables
   - 각 변수 추가 후 "Save" 클릭
   - Production, Preview, Development 모두에 적용

   **보안 참고**: `GOOGLE_SHEETS_ID`는 서버 사이드 API(`/api/sheets`)에서만 사용되므로 클라이언트에 노출되지 않습니다. 이는 데이터 보안을 위한 중요한 조치입니다.

4. **배포**
   - 환경 변수 설정 후 자동으로 재배포됩니다
   - 또는 "Redeploy" 버튼 클릭

### 로컬 개발

1. **환경 변수 파일 생성**
   프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:
   ```
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   GOOGLE_SHEETS_ID=your_google_sheets_id_here
   ```

2. **빌드 실행**
   ```bash
   npm install
   npm run build
   ```

3. **로컬 개발 서버 실행**

   **방법 1: Vercel CLI 사용 (권장 - API 엔드포인트 작동)**
   ```bash
   # Vercel CLI 설치 (처음 한 번만)
   npm install -g vercel
   
   # 개발 서버 실행
   npm run dev
   # 또는
   vercel dev
   ```
   이렇게 하면 `http://localhost:3000`에서 실행되며 `/api/sheets` 엔드포인트가 정상 작동합니다.

   **방법 2: 간단한 HTTP 서버 (정적 파일만)**
   ```bash
   npm run serve
   # 또는
   python3 -m http.server 3000
   # 또는
   npx serve . -p 3000
   ```
   ⚠️ 주의: 이 방법은 `/api/sheets` 엔드포인트가 작동하지 않습니다. 
   데이터 불러오기 기능을 테스트하려면 방법 1을 사용하세요.

   **중요**: `file://` 프로토콜로 직접 HTML 파일을 열면 API가 작동하지 않습니다.
   반드시 HTTP 서버를 통해 접근해야 합니다.

## 설정 방법

### 1. Google Maps API 키 발급 및 보안 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" > "라이브러리"로 이동
4. "Maps JavaScript API" 활성화
5. "사용자 인증 정보"에서 API 키 생성

**⚠️ 중요: API 키 보안 설정**
- "API 키 제한사항" 설정에서:
  - **애플리케이션 제한사항**: "HTTP 리퍼러(웹사이트)" 선택
  - **허용된 리퍼러**: 배포할 도메인 추가
    - `https://your-project.vercel.app/*`
    - `http://localhost:*` (로컬 개발용)
  - **API 제한사항**: "Maps JavaScript API"만 선택

### 2. Google Sheets 공개 설정

Google Sheets 파일이 공개로 설정되어 있어야 합니다:

1. Google Sheets 파일 열기
2. "공유" 버튼 클릭
3. "링크가 있는 모든 사용자" 선택
4. "뷰어" 권한으로 설정

### 3. Google Sheets ID 확인

Google Sheets URL에서 `/d/` 뒤의 ID를 복사하세요:
```
https://docs.google.com/spreadsheets/d/[여기가_ID]/edit
```

### 4. 시트 이름 확인

코드에서 시트 이름이 "제주 공항근처"로 설정되어 있습니다. 
만약 다른 이름을 사용한다면 `app.js` 파일의 `loadRestaurantData` 함수에서 시트 이름을 수정하세요.

## 사용 방법

1. 웹 브라우저에서 `index.html` 파일을 엽니다
2. "데이터 불러오기" 버튼을 클릭합니다
3. 지도에 음식점 마커가 표시됩니다
4. 마커를 클릭하면 해당 음식점의 상세 정보를 볼 수 있습니다
5. 하단 정보 패널에서 음식점 목록을 확인하고 클릭하여 지도에서 위치를 확인할 수 있습니다

## 파일 구조

```
map/
├── index.html      # 메인 HTML 파일
├── styles.css      # 스타일시트
├── app.js          # JavaScript 로직
├── config.js       # 환경 변수 설정 (빌드 시 자동 생성)
├── build.js        # 빌드 스크립트
├── package.json    # Node.js 설정
├── vercel.json     # Vercel 배포 설정
├── .gitignore      # Git 제외 파일 목록
└── README.md       # 설명서
```

## 보안 체크리스트

배포 전에 다음 사항을 확인하세요:

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] 코드에 API 키가 하드코딩되어 있지 않은지 확인
- [ ] GitHub에 푸시하기 전에 `git status`로 민감한 파일이 포함되지 않았는지 확인
- [ ] Google Maps API 키에 HTTP 리퍼러 제한 설정
- [ ] Vercel 환경 변수가 올바르게 설정되었는지 확인

## 주의사항

- ⚠️ **Google Maps API는 사용량에 따라 과금될 수 있습니다**
  - 무료 할당량: 월 28,000회 로드
  - API 키에 사용량 제한을 설정하는 것을 권장합니다
- Google Sheets 파일이 공개로 설정되어 있어야 데이터를 가져올 수 있습니다
- 시트의 컬럼 이름이 정확해야 데이터가 올바르게 파싱됩니다
- 환경 변수는 절대로 GitHub에 커밋하지 마세요




