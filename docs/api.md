# API 및 데이터 모델

## Firestore 컬렉션 스키마

### users

```typescript
// Collection: users/{userId}
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  villageId: string | null;
  role: 'resident' | 'leader' | 'secretary';
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  settings: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
  };
}
```

### villages

```typescript
// Collection: villages/{villageId}
interface Village {
  id: string;
  name: string;
  address: string;
  regionCode: string;
  description: string;
  photoURL: string;
  bannerURL: string;
  population: number | null;
  specialties: string[];
  createdBy: string;
  createdAt: Timestamp;
  memberCount: number;
  settings: {
    isPublic: boolean;
    requireApproval: boolean;
    inviteOnly: boolean;
  };
}
```

### posts (서브컬렉션)

```typescript
// Collection: villages/{villageId}/posts/{postId}
interface Post {
  id: string;
  villageId: string;
  villageName: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  type: 'news' | 'event' | 'product';
  title: string;
  content: string;
  images: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPublic: boolean;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### comments (서브컬렉션)

```typescript
// Collection: villages/{villageId}/posts/{postId}/comments/{commentId}
interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  content: string;
  createdAt: Timestamp;
}
```

### likes (서브컬렉션)

```typescript
// Collection: villages/{villageId}/posts/{postId}/likes/{userId}
interface Like {
  userId: string;
  createdAt: Timestamp;
}
```

### todos (서브컬렉션)

```typescript
// Collection: villages/{villageId}/todos/{todoId}
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  assignedTo: string;
  createdBy: string;
  createdAt: Timestamp;
  dueDate: Timestamp | null;
}
```

### documents (서브컬렉션)

```typescript
// Collection: villages/{villageId}/documents/{docId}
interface Document {
  id: string;
  villageId: string;
  type: 'announcement' | 'receipt' | 'formatted' | 'minutes' | 'narration' | 'photo';
  title: string;
  description: string;
  fileURL: string;
  thumbnailURL: string;
  fileSize: number;
  mimeType: string;
  createdBy: string;
  createdAt: Timestamp;
  aiGenerated: boolean;
  metadata: Record<string, any>;
}
```

### finances (서브컬렉션)

```typescript
// Collection: villages/{villageId}/finances/{financeId}
interface Finance {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  receiptURL: string | null;
  date: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
}
```

### invites

```typescript
// Collection: invites/{inviteCode}
interface Invite {
  code: string;
  villageId: string;
  villageName: string;
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  usedBy: string[];
  maxUses: number;
  isActive: boolean;
}
```

## Firebase Functions API

### 인증 관련

| 함수 | 트리거 | 설명 |
|------|--------|------|
| `onUserCreate` | Auth onCreate | 신규 사용자 Firestore 문서 생성 |
| `onUserDelete` | Auth onDelete | 사용자 데이터 정리 |

### AI 기능

| 함수 | HTTP Method | 경로 | 설명 |
|------|-------------|------|------|
| `analyzeAnnouncement` | POST | `/api/ai/announcement` | 공고문 분석 |
| `convertReceipt` | POST | `/api/ai/receipt` | 영수증 → 엑셀 |
| `formatDocument` | POST | `/api/ai/format` | 텍스트 → 양식 변환 |
| `transcribeMeeting` | POST | `/api/ai/transcribe` | 회의록 정리 |
| `generateNarration` | POST | `/api/ai/narration` | 나레이션 생성 |

### AI API 요청/응답 예시

#### 공고문 분석

**Request:**
```json
POST /api/ai/announcement
{
  "villageId": "village_123",
  "fileURL": "gs://bucket/villages/village_123/receipts/file.png",
  "fileType": "image/png"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "projectName": "2026 농촌 태양광 보급사업",
    "summary": "농가 지붕 태양광 설치 지원",
    "eligibility": "농촌 지역 농가, 5년 이상 거주자",
    "amount": "가구당 최대 300만원",
    "deadline": "2026-10-31",
    "requiredDocs": ["신청서", "거주확인서", "토지대장"],
    "actionItems": ["10월 15일까지 주민 대상 안내", "신청서 양식 배포"]
  },
  "documentId": "doc_456"
}
```

#### 영수증 → 엑셀

**Request:**
```json
POST /api/ai/receipt
{
  "villageId": "village_123",
  "fileURLs": [
    "gs://bucket/villages/village_123/receipts/receipt1.jpg",
    "gs://bucket/villages/village_123/receipts/receipt2.jpg"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "items": [
      {
        "date": "2026-08-15",
        "vendor": "제주농협마트",
        "item": "행사용 음료",
        "quantity": 30,
        "unitPrice": 1500,
        "total": 45000,
        "category": "행사비"
      }
    ],
    "totalAmount": 245000,
    "excelURL": "gs://bucket/villages/village_123/documents/receipt_2026-08.xlsx"
  },
  "documentId": "doc_789"
}
```

## 마을 검색 API

### 내부 검색 (Firestore)

```typescript
async function searchVillages(query: string): Promise<Village[]> {
  // Firestore에서 name 필드 prefix 검색
  const snapshot = await getDocs(
    query(
      collection(db, 'villages'),
      where('name', '>=', query),
      where('name', '<=', query + '\uf8ff'),
      limit(10)
    )
  );
  return snapshot.docs.map(doc => doc.data() as Village);
}
```

### 외부 API (마을 정보 수집)

마을종합지원센터 또는 행정안전부 데이터:
- 크롤링 결과를 Firestore `villageRegistry` 컬렉션에 캐싱
- 캐시 TTL: 24시간
- 실패 시 사용자 수동 입력 폴백

## Firestore 인덱스

```
# firestore.indexes.json 에 추가 필요
villages/{villageId}/posts:
  - createdAt DESC (기본 정렬)
  - type ASC, createdAt DESC (카테고리 필터)
  - isPublic ASC, createdAt DESC (공개 피드)

villages/{villageId}/todos:
  - completed ASC, dueDate ASC

villages/{villageId}/finances:
  - date DESC
  - type ASC, date DESC
```

## 에러 코드

| 코드 | 설명 |
|------|------|
| `AUTH_REQUIRED` | 로그인 필요 |
| `PERMISSION_DENIED` | 권한 부족 (이장/사무장 전용 기능) |
| `VILLAGE_NOT_FOUND` | 마을 ID 없음 |
| `FILE_TOO_LARGE` | 파일 크기 초과 (이미지 10MB, 녹음 100MB) |
| `AI_PROCESSING_FAILED` | AI 처리 실패 |
| `QUOTA_EXCEEDED` | AI API 일일 한도 초과 |
