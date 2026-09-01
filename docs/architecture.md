# 기술 아키텍처

## 시스템 구성도

```
[사용자 브라우저/앱]
        │
        ▼
[Vercel — Next.js 프론트엔드]
        │
        ├─── Firebase Auth (Google 로그인)
        ├─── Firestore (데이터)
        ├─── Firebase Storage (이미지, 문서, 녹음)
        ├─── Firebase Functions (서버리스 백엔드)
        │         │
        │         ├─── Claude API (문서 분석, 요약, 변환)
        │         ├─── OCR API (영수증/공고문 텍스트 추출)
        │         ├─── STT API (회의 녹음 → 텍스트)
        │         └─── TTS API (나레이션 음성 생성)
        │
        └─── 외부 API
                  ├─── 마을종합지원센터 (마을 정보 크롤링)
                  └─── 행정안전부 API (마을 기본 데이터)
```

## 프로젝트 디렉토리 구조

```
/
├── public/
│   └── assets/              # 정적 이미지, 아이콘
├── src/
│   ├── app/                 # Next.js App Router 페이지
│   │   ├── layout.tsx
│   │   ├── page.tsx         # 메인 피드
│   │   ├── login/
│   │   ├── village/
│   │   │   ├── setup/       # 마을 지정/생성
│   │   │   └── [id]/
│   │   │       ├── page.tsx # 대시보드
│   │   │       ├── feed/
│   │   │       ├── ai/
│   │   │       └── docs/
│   │   ├── mypage/
│   │   └── search/
│   ├── components/
│   │   ├── common/          # Header, BottomTabBar, ThemeToggle 등
│   │   ├── feed/            # FeedCard, ImageGallery, FeedActions
│   │   ├── dashboard/       # StatCard, TodoList, SidebarMenu 등
│   │   ├── auth/            # GoogleLoginButton, VillageSelector
│   │   └── ai/              # AI 기능별 UI 컴포넌트
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts    # Firebase 초기화
│   │   │   ├── auth.ts      # 인증 유틸
│   │   │   ├── firestore.ts # DB CRUD
│   │   │   └── storage.ts   # 파일 업로드/다운로드
│   │   ├── ai/
│   │   │   ├── claude.ts    # Claude API 호출
│   │   │   ├── ocr.ts       # OCR 처리
│   │   │   ├── stt.ts       # 음성→텍스트
│   │   │   └── tts.ts       # 텍스트→음성
│   │   └── village/
│   │       └── search.ts    # 마을 검색/매칭 API
│   ├── hooks/               # 커스텀 훅
│   │   ├── useAuth.ts
│   │   ├── useVillage.ts
│   │   ├── useTheme.ts
│   │   └── useFeed.ts
│   ├── types/               # TypeScript 타입 정의
│   │   ├── user.ts
│   │   ├── village.ts
│   │   ├── feed.ts
│   │   └── ai.ts
│   └── styles/
│       └── globals.css      # Tailwind + CSS 변수
├── functions/               # Firebase Functions
│   ├── src/
│   │   ├── ai/
│   │   ├── village/
│   │   └── index.ts
│   └── package.json
├── claude.md
├── docs/
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

## Firebase 구성

### Firestore 컬렉션 구조

```
users/{userId}
villages/{villageId}
villages/{villageId}/posts/{postId}
villages/{villageId}/events/{eventId}
villages/{villageId}/documents/{docId}
villages/{villageId}/todos/{todoId}
villages/{villageId}/finances/{financeId}
```

### Firebase Storage 구조

```
villages/{villageId}/photos/
villages/{villageId}/documents/
villages/{villageId}/receipts/
villages/{villageId}/recordings/
villages/{villageId}/narrations/
```

### Firebase Functions

- `onUserCreate` — 신규 사용자 생성 시 기본 프로필 세팅
- `analyzeDocument` — Claude API로 공고문 분석
- `convertReceipt` — OCR + AI로 영수증 → 엑셀 변환
- `transcribeMeeting` — STT + AI로 회의록 정리
- `generateNarration` — TTS로 나레이션 음성 생성
- `formatDocument` — 텍스트 → 양식 변환

## 환경 변수

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Claude API
CLAUDE_API_KEY=

# 외부 API
VILLAGE_CENTER_API_URL=
```

## 배포 파이프라인

1. `main` 브랜치 push → Vercel 자동 배포
2. `functions/` 변경 시 → `firebase deploy --only functions`
3. Firestore 보안 규칙: `firebase deploy --only firestore:rules`
