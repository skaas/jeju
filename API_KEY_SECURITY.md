# Google Maps API 키 보안 가이드

## 🔑 API 키가 config.js에 있어도 괜찮은 이유

### 1. **클라이언트 사이드 API의 특성**

Google Maps JavaScript API는 **브라우저에서 직접 실행**되는 클라이언트 사이드 API입니다. 따라서:

- ✅ API 키가 브라우저에 노출되는 것은 **정상적이고 필수적**입니다
- ✅ 모든 Google Maps를 사용하는 웹사이트가 동일한 방식으로 작동합니다
- ✅ Google이 의도한 사용 방식입니다

### 2. **보안은 Google Cloud Console에서 관리**

API 키가 노출되더라도 안전한 이유:

#### 🔒 HTTP 리퍼러 제한 (가장 중요!)

Google Cloud Console에서 **어떤 웹사이트에서만** API 키를 사용할 수 있는지 제한할 수 있습니다:

```
허용된 리퍼러:
- https://your-project.vercel.app/*
- http://localhost:*
```

**효과:**
- ✅ 지정한 도메인에서만 API 키 사용 가능
- ✅ 다른 사이트에서 API 키를 복사해도 사용 불가
- ✅ 무단 사용 방지

#### 🔒 API 제한

어떤 Google API만 사용할 수 있는지 제한:

```
허용된 API:
- Maps JavaScript API만 선택
```

**효과:**
- ✅ Maps API만 사용 가능
- ✅ 다른 Google 서비스(예: YouTube, Drive)에는 사용 불가
- ✅ 피해 범위 최소화

#### 🔒 사용량 제한

일일/월간 사용량 제한 설정:

```
일일 할당량: 10,000회 요청
```

**효과:**
- ✅ 과도한 사용 방지
- ✅ 비용 제어
- ✅ 비정상적인 사용 감지

## 📊 보안 레이어 비교

### Google Maps API 키 (클라이언트 사이드)
```
노출: ✅ 브라우저에서 볼 수 있음 (정상)
보호: ✅ Google Cloud Console 제한 설정으로 보호
```

### Google Sheets ID (서버 사이드)
```
노출: ❌ 클라이언트에 노출되지 않음
보호: ✅ 서버 사이드 API에서만 사용
```

## 🛡️ 현재 프로젝트의 보안 상태

### ✅ 완료된 보안 조치

1. **GitHub 보안**
   - `config.js`는 `.gitignore`에 포함
   - GitHub에 올라가지 않음
   - 코드에 하드코딩 없음

2. **환경 변수 관리**
   - Vercel 환경 변수로 관리
   - 빌드 시점에 주입
   - 로컬 `.env` 파일 보호

3. **Google Cloud Console 설정 필요** ⚠️
   - HTTP 리퍼러 제한 설정 (필수)
   - API 제한 설정 (권장)
   - 사용량 제한 설정 (권장)

## ⚠️ 필수 보안 설정 (Google Cloud Console)

### 설정 방법

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. "API 및 서비스" > "사용자 인증 정보" 선택
4. API 키 클릭

### 1. 애플리케이션 제한사항 설정

**"HTTP 리퍼러(웹사이트)" 선택**

허용된 리퍼러에 추가:
```
https://your-project.vercel.app/*
http://localhost:*
```

### 2. API 제한사항 설정

**"API 키로 제한" 선택**

다음 API만 선택:
- ✅ Maps JavaScript API
- ❌ 다른 API는 모두 체크 해제

### 3. 사용량 제한 설정 (선택사항)

"할당량" 탭에서:
- 일일 요청 제한 설정
- 예: 10,000회/일

## 🔍 보안 체크리스트

배포 전 확인:

- [ ] Google Cloud Console에서 HTTP 리퍼러 제한 설정
- [ ] API 제한 설정 (Maps JavaScript API만)
- [ ] 사용량 제한 설정 (권장)
- [ ] `config.js`가 `.gitignore`에 포함되어 있는지 확인
- [ ] 코드에 하드코딩된 API 키가 없는지 확인

## 📚 참고 자료

- [Google Maps API 보안 모범 사례](https://developers.google.com/maps/api-security-best-practices)
- [API 키 제한 설정 가이드](https://cloud.google.com/docs/authentication/api-keys#restricting_api_keys)

## 💡 요약

**Google Maps API 키는 클라이언트 사이드에서 사용되므로 브라우저에 노출되는 것이 정상입니다.**

보안은 **Google Cloud Console의 제한 설정**으로 보완됩니다:
- ✅ HTTP 리퍼러 제한으로 도메인 제한
- ✅ API 제한으로 사용 범위 제한
- ✅ 사용량 제한으로 비용/사용량 제어

**결론**: `config.js`에 API 키가 있어도 **Google Cloud Console에서 제한을 설정하면 안전합니다!** 🛡️

