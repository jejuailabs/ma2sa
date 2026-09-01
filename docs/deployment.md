# 배포 및 환경 설정 가이드

## 개발 환경 셋업

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Vercel CLI (`npm install -g vercel`) — 선택사항

### 초기 설정

```bash
# 1. 프로젝트 클론
git clone <repo-url>
cd village-ai-secretary

# 2. 의존성 설치
npm install

# 3. Firebase Functions 의존성
cd functions && npm install && cd ..

# 4. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 Firebase/Claude API 키 입력

# 5. 개발 서버 실행
npm run dev
```

### .env.local 예시

```env
# Firebase (클라이언트)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Claude API (서버 전용 — Functions에서 사용)
CLAUDE_API_KEY=sk-ant-...

# 환경
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Firebase 프로젝트 설정

### 1. Firebase 콘솔에서 프로젝트 생성

- https://console.firebase.google.com
- 프로젝트 이름: `village-ai-secretary`
- Google Analytics: 선택 사항

### 2. 서비스 활성화

- **Authentication**: Google 로그인 활성화
- **Firestore Database**: 프로덕션 모드로 생성 (아시아 리전 권장: `asia-northeast3`)
- **Storage**: 기본 버킷 생성
- **Functions**: Blaze 요금제 필요 (종량제)

### 3. Firebase 초기화

```bash
firebase login
firebase init

# 선택:
# ✅ Firestore
# ✅ Functions (TypeScript)
# ✅ Storage
# ✅ Emulators
```

### 4. Firestore 보안 규칙 배포

```bash
firebase deploy --only firestore:rules
```

### 5. Storage 보안 규칙

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /villages/{villageId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024; // 10MB
    }
  }
}
```

## Vercel 배포

### 1. Vercel 연결

```bash
vercel link
# 또는 Vercel 대시보드에서 Git 리포 연결
```

### 2. 환경 변수 설정

Vercel 대시보드 → Settings → Environment Variables에서 `.env.local`의 모든 변수 등록.

### 3. 배포

```bash
# 자동 배포: main 브랜치 push 시 자동
git push origin main

# 수동 배포
vercel --prod
```

### 4. 도메인 설정 (선택)

Vercel 대시보드 → Settings → Domains에서 커스텀 도메인 연결.

## Firebase Functions 배포

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Functions 환경 변수

```bash
firebase functions:config:set claude.api_key="sk-ant-..."
```

또는 `.env` 파일 사용 (Firebase Functions v2):

```env
# functions/.env
CLAUDE_API_KEY=sk-ant-...
```

## 로컬 개발 (에뮬레이터)

Firebase 에뮬레이터로 로컬 테스트:

```bash
# 에뮬레이터 시작
firebase emulators:start

# 별도 터미널에서 Next.js 개발 서버
npm run dev
```

에뮬레이터 포트:
- Auth: `http://localhost:9099`
- Firestore: `http://localhost:8080`
- Storage: `http://localhost:9199`
- Functions: `http://localhost:5001`
- Emulator UI: `http://localhost:4000`

### 에뮬레이터 연결 코드

```typescript
// lib/firebase/config.ts
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';

if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

## CI/CD 파이프라인

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'functions/')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: cd functions && npm ci && npm run build
      - uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

  # Vercel은 Git 연동으로 자동 배포
```

## 모니터링

- **Vercel Analytics**: 프론트엔드 성능
- **Firebase Console**: Auth 사용자, Firestore 사용량, Storage 용량
- **Firebase Crashlytics**: 에러 추적 (선택)
- **Claude API Usage**: Anthropic 콘솔에서 API 사용량 모니터링
