# 보안 가이드

## 🔒 보안 체크리스트

GitHub에 퍼블릭으로 올리기 전에 반드시 확인하세요.

### ✅ 완료된 보안 조치

1. **API 키 환경 변수화**
   - ✅ Google Maps API 키를 환경 변수로 분리
   - ✅ 하드코딩된 API 키 제거

2. **서버 사이드 데이터 보호** ⭐
   - ✅ Google Sheets ID를 서버 사이드에서만 사용
   - ✅ Vercel Serverless Function으로 데이터 프록시 구현
   - ✅ 클라이언트에 Sheets ID 노출 방지
   - ✅ `/api/sheets` 엔드포인트를 통한 안전한 데이터 접근

3. **파일 보호**
   - ✅ `.gitignore`에 `.env` 파일 추가
   - ✅ `.gitignore`에 `config.js` 추가 (빌드 시 생성됨)
   - ✅ 민감한 정보가 포함된 파일 보호

4. **빌드 프로세스**
   - ✅ 빌드 스크립트로 환경 변수 주입
   - ✅ Vercel 배포 설정 완료

## ⚠️ 배포 전 필수 확인 사항

### 1. Git 상태 확인

```bash
# 커밋 전에 확인
git status

# 다음 파일들이 포함되지 않았는지 확인:
# - .env
# - .env.local
# - config.js (실제 API 키가 포함된 경우)
```

### 2. 코드 검색

다음 명령어로 하드코딩된 API 키가 있는지 확인:

```bash
# API 키 패턴 검색 (Google Maps API 키는 보통 AIza로 시작)
grep -r "AIza" . --exclude-dir=node_modules

# 환경 변수 확인
grep -r "GOOGLE_MAPS_API_KEY" . --exclude-dir=node_modules
```

### 3. Google Cloud Console 설정

1. **API 키 제한 설정**
   - [Google Cloud Console](https://console.cloud.google.com/) 접속
   - "API 및 서비스" > "사용자 인증 정보" 선택
   - API 키 클릭
   - **애플리케이션 제한사항**: "HTTP 리퍼러(웹사이트)" 선택
   - **허용된 리퍼러** 추가:
     ```
     https://your-project.vercel.app/*
     http://localhost:*
     ```
   - **API 제한사항**: "Maps JavaScript API"만 선택

2. **사용량 제한 설정** (선택사항)
   - "할당량" 탭에서 일일 사용량 제한 설정
   - 예: 일일 1,000회 요청 제한

### 4. Vercel 환경 변수 설정

1. Vercel 대시보드 접속
2. 프로젝트 선택 > Settings > Environment Variables
3. 다음 변수 추가:
   - `GOOGLE_MAPS_API_KEY`: 실제 API 키 값 (클라이언트에서 사용)
   - `GOOGLE_SHEETS_ID`: Google Sheets ID (서버 사이드에서만 사용) ⭐
4. Production, Preview, Development 모두에 적용

**중요**: `GOOGLE_SHEETS_ID`는 서버 사이드 API(`/api/sheets`)에서만 사용되므로 클라이언트에 노출되지 않습니다. 이는 데이터 보안을 위한 중요한 조치입니다.

## 🚨 보안 사고 발생 시 대응

만약 API 키가 실수로 GitHub에 노출되었다면:

1. **즉시 API 키 비활성화**
   - Google Cloud Console에서 해당 API 키 삭제 또는 제한
   - 새 API 키 생성

2. **GitHub 히스토리 정리** (필요시)
   ```bash
   # Git 히스토리에서 파일 제거 (주의: 팀과 협의 필요)
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env config.js" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **새 API 키로 교체**
   - Vercel 환경 변수 업데이트
   - 재배포

## 🔐 서버 사이드 보안 (Google Sheets ID 보호)

### 현재 구현 방식

Google Sheets ID는 **서버 사이드에서만 사용**되도록 구현되었습니다:

1. **Vercel Serverless Function** (`/api/sheets.js`)
   - 서버 사이드에서만 실행됨
   - 환경 변수에서 `GOOGLE_SHEETS_ID` 읽기
   - 클라이언트에 Sheets ID 노출 없음

2. **클라이언트 코드**
   - `/api/sheets` 엔드포인트만 호출
   - Sheets ID를 직접 사용하지 않음
   - `config.js`에 Sheets ID 포함되지 않음

### 보안 이점

- ✅ **Sheets ID 노출 방지**: 클라이언트 코드나 네트워크 요청에서 확인 불가
- ✅ **데이터 접근 제어**: 서버에서 접근 로직 제어 가능
- ✅ **CORS 문제 해결**: 서버 사이드에서 처리하므로 CORS 이슈 없음
- ✅ **추가 보안 레이어**: 향후 인증/인가 로직 추가 가능

## 📋 추가 보안 권장사항

1. **정기적인 보안 감사**
   - 주기적으로 코드에서 하드코딩된 키 검색
   - API 사용량 모니터링
   - 서버 사이드 API 엔드포인트 접근 로그 확인

2. **API 키 로테이션**
   - 정기적으로 API 키 교체 (예: 분기별)

3. **접근 제어**
   - Google Cloud Console에서 불필요한 사용자 제거
   - 최소 권한 원칙 적용
   - Google Sheets 접근 권한 관리

4. **모니터링**
   - Google Cloud Console에서 API 사용량 모니터링
   - 비정상적인 사용 패턴 감지
   - Vercel 함수 실행 로그 모니터링

5. **추가 보안 강화** (선택사항)
   - API 엔드포인트에 Rate Limiting 추가
   - API 키 기반 인증 추가 (향후)
   - IP 화이트리스트 설정 (필요시)

## 📚 참고 자료

- [Google Maps API 보안 가이드](https://developers.google.com/maps/api-security-best-practices)
- [Vercel 환경 변수 문서](https://vercel.com/docs/concepts/projects/environment-variables)
- [Git 보안 가이드](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)

