# AI 음성 인터뷰 페이지

주소: `/live-plan`. 기존 사업계획서 작성 화면과 분리된 독립 페이지입니다.

GPT-Live(`gpt-live-1`)를 WebRTC로 연결하고, client delegation으로 기존 Claude를 호출해 대화에서 8개 답변을 정리합니다. 글로 답변한 내용도 같은 서버 인터뷰 로직을 이용합니다. API 키는 서버에만 둡니다. 미설정·연결 실패 시 오류를 표시하며 가짜 AI 답변으로 대체하지 않습니다.

## 로컬 실행

기존 `.env.local`의 `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`(또는 `CLAUDE_API_KEY`)를 사용합니다. `OPENAI_LIVE_MODEL`은 선택 사항입니다. `npm run dev -- --hostname 127.0.0.1 --port 3108` 후 `http://127.0.0.1:3108/live-plan`을 엽니다. localhost/127.0.0.1의 development 모드에서는 Redis 체험 세션 없이 테스트할 수 있습니다. 시간당 음성 연결 10회·답변 정리 160회·초안 생성 10회로 제한합니다.

## 공개 운영

production 및 비로컬 요청은 기존 체험 세션/Redis 설정과 제한을 적용합니다(`docs/experience.md` 참고). 세션별 음성 연결 3회·답변 정리 80회·문서 생성 2회, 일별 전체 상한을 별도로 적용합니다. 음성의 15분 종료는 브라우저 인터페이스 제한이며, 서버에서 강제하는 통화시간 할당량은 아닙니다. 공개 출시 전 공급자 지출 한도·동시 접속 정책과 서버측 통화 종료 제어를 검토해야 합니다.

시작 전 음성/텍스트 전송 동의를 받습니다. 인터뷰 기록은 이 브라우저의 별도 localStorage 키에 24시간 보관합니다. 원본 녹음 파일은 저장하지 않으며 `store:false`로 Live 세션을 생성합니다. 이것이 공급자의 모든 보존 정책을 비활성화한다는 뜻은 아닙니다. 대표자·주소·연락처 입력란은 모델 프롬프트에서 제외하고 파일에만 사용합니다. 음성으로 말한 정보는 음성 모델에 전달됩니다.

## 데이터와 출력

API: `/api/experience/live/{config,session,turn,plan}`. 8개 항목, 문서 기본정보, 건너뛴 항목, 대화를 관리합니다. 음성 자막은 화자별 시간축으로 합칩니다. 처리 중 정정이 도착하면 이전 결과를 버리고 최신 상태로 다시 정리합니다. 문서는 사용자 버튼으로만 생성하며 미확정 사실은 `[입력 필요]`로 남깁니다. 마을공동체 HWPX는 기존 `/api/experience/export`를 이용하고 행복마을관리소는 TXT를 제공합니다.

## 확인할 시나리오

- 음성 질문/답변, 중간 끼어들기, 한국어 발음·금액 인식, 마이크 거부와 재연결
- 글 답변, 한 답변이 여러 항목에 해당하는 경우, 정정, 모른다고 답하기
- 대화 도중 연결 종료/화면 이동 시 마이크 해제, 답변 복원, 최신 내용으로 문서 생성
- 사업계획서 수정, TXT/HWPX 다운로드, 모바일 화면과 실제 Safari/Chrome

공식 API 근거: https://developers.openai.com/api/docs/guides/voice-webrtc , https://developers.openai.com/api/docs/guides/live-delegation , https://developers.openai.com/api/docs/guides/live-conversations
