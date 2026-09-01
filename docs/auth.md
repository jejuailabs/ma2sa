# 인증 및 사용자 관리

## 인증 방식

Google 로그인 전용 (Firebase Auth `GoogleAuthProvider`)

## 인증 흐름

### 비로그인 상태

```
메인 페이지 접근
├── 마을 소식 피드 열람 가능 (공개)
├── 우측 상단: [로그인] [회원가입] 버튼 표시
└── AI 기능, 대시보드, 문서함 접근 불가
```

### 로그인 프로세스

```
1. [로그인] 버튼 클릭
2. Google OAuth 팝업/리다이렉트
3. Firebase Auth 토큰 발급
4. Firestore에서 사용자 문서 조회
   ├── 기존 사용자 → 마을 정보 확인 → 대시보드 이동
   └── 신규 사용자 → 마을 지정 페이지(/village/setup)로 이동
```

### 로그인 후 UI 변화

- 우측 상단: [로그인/회원가입] → **프로필 아바타 + 이름** 으로 전환
- 프로필 클릭 → 드롭다운 메뉴:
  - 마이페이지
  - 업무모드 전환 (이장/사무장 권한자만)
  - 로그아웃

## 사용자 데이터 모델

```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL: string;               // Google 프로필 사진
  villageId: string | null;       // 소속 마을 ID
  role: 'resident' | 'leader' | 'secretary';  // 주민 / 이장 / 사무장
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

## 권한 체계

| 역할 | 코드 | 권한 |
|------|------|------|
| 주민 | `resident` | 피드 열람·작성, 댓글, 좋아요 |
| 이장 | `leader` | 주민 권한 + 대시보드 + AI 기능 전체 + 마을 관리 |
| 사무장 | `secretary` | 주민 권한 + 대시보드 + AI 기능 전체 + 자금/장부 관리 |

## 마이페이지

프로필 클릭 → 마이페이지 진입 시 표시 내용:

- 프로필 정보 (이름, 이메일, 사진)
- 소속 마을 정보
- 역할 (주민/이장/사무장)
- 업무모드 전환 버튼 (이장/사무장만 표시)
- 알림 설정
- 로그아웃

## 업무모드 전환

이장/사무장이 프로필 → 마이페이지에서 업무모드를 활성화하면:
- 메인 화면이 **대시보드 뷰**로 전환
- 좌측 사이드바 메뉴 활성화
- AI 기능 버튼 노출
- 자금 현황/장부 접근 가능

## Firestore 보안 규칙 (핵심)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 사용자: 본인만 읽기/쓰기
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 마을 정보: 마을 구성원만 읽기, 이장/사무장만 쓰기
    match /villages/{villageId} {
      allow read: if isVillageMember(villageId);
      allow write: if isVillageAdmin(villageId);
    }

    // 소식 글: 마을 구성원만 읽기/쓰기
    match /villages/{villageId}/posts/{postId} {
      allow read: if true;  // 공개 피드
      allow create: if isVillageMember(villageId);
      allow update, delete: if isPostOwner(postId) || isVillageAdmin(villageId);
    }
  }
}
```

## 초대 기능

이장/사무장이 마을 초대 링크를 생성할 수 있다:

```
https://village-ai.vercel.app/invite/{inviteCode}
```

- 초대 링크 클릭 → Google 로그인 → 해당 마을 자동 가입
- 초대 코드는 Firestore `invites` 컬렉션에서 관리
- 유효기간: 7일 (설정 가능)
