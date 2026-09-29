# THE MORI APPLY — 독서모임 신청 앱

THE MORI 독서모임의 모임 신청·관리용 PWA(모바일 웹앱). 빌드 도구 없이 순수 HTML/CSS/JS로 작성되어 있고,
GitHub Pages(`/the-mori-apply/` 경로)에서 `main` 브랜치가 그대로 배포된다. 백엔드는 Firebase(Auth, Firestore, Cloud Messaging).

## 소통 규칙
- 사용자는 비개발자이며 한국어로 요청한다. 답변과 설명은 한국어로, 전문용어는 쉽게 풀어서 설명한다.
- UI 문구도 모두 한국어. 기존 말투(친근한 존댓말 + 이모지 약간, 예: `모임이 추가되었어요 ✅`)를 따른다.

## 파일 구조
| 파일 | 역할 |
|---|---|
| `index.html` | 메인 앱 (로그인, 가입 신청서, 모임 목록/신청/취소, 소모임, 캘린더, 대기열, 알림, 프로필, 모임관리). HTML·CSS·JS가 한 파일에 들어 있음 |
| `admin.html` | 관리자 페이지 (멤버 관리, 설정, 신청서 편집, 히스토리). 역시 단일 파일 |
| `sw.js` | 실제 사용 중인 서비스워커 (오프라인 캐시 + FCM 푸시). `index.html`에서 `/the-mori-apply/sw.js`로 등록 |
| `manifest.json` | PWA 매니페스트 |
| `firebase-messaging-sw.js` | 주석 한 줄뿐인 빈 파일 (FCM 처리는 `sw.js`에서 함) |
| `icon-192.png`, `icon-512.png` | 앱 아이콘 |

## ⚠️ 수정할 때 반드시 지킬 것
1. **수정할 때마다 `sw.js`의 캐시 버전을 올린다.** `const CACHE = 'mori-apply-vNNN';` 숫자를 +1.
   화면(HTML)은 서비스워커가 네트워크 우선으로 받아와서 창만 열면 자동 반영되지만(3초 넘게 걸리거나 오프라인이면 저장본),
   버전을 올려야 열려 있던 앱도 새로고침되고 아이콘·매니페스트도 갱신된다. 프로필 화면에 이 버전이 표시되고,
   옆의 "🔄 최신 버전으로 업데이트" 버튼(`forceAppUpdate()`)은 저장된 캐시·서비스워커를 지우고 다시 불러온다.
2. **관리자 이메일 목록 `ADMIN_EMAILS`는 `index.html`과 `admin.html` 두 곳에 있다.** 바꿀 때 둘 다 수정.
3. Firebase SDK는 CDN의 **compat 버전 10.12.2**(`firebase.firestore()` 형태)를 쓴다. 모듈식(v9 modular) 문법 섞지 말 것.
   `sw.js`의 SDK 버전도 동일하게 맞춘다.
4. 파일 분리·프레임워크 도입·빌드 도구 추가는 사용자가 요청할 때만. 기존의 한 파일 구조와 코딩 스타일(짧은 함수, 인라인 `onclick`, 템플릿 문자열로 HTML 생성)을 유지.
5. Firestore에 새 필드를 추가할 때는 기존 문서에 그 필드가 없을 수 있으니 기본값 처리(`d.x !== undefined ? d.x : 기본값`)를 한다.
6. 경로는 GitHub Pages 기준 `/the-mori-apply/...` 절대경로를 쓴다.

## 사용자 역할 (`users/{email}.role`)
- `pending` 가입 신청 후 승인 대기 → 관리자가 승인하면 `member`
- `member` 참여자 / `staff` 스탭 / `smallstaff` 소모임장 / `cancelled` 대기 취소됨
- 관리자는 role 값이 아니라 `ADMIN_EMAILS`에 포함된 이메일로 판별 (`isAdmin()`)
- 권한 헬퍼 (`index.html`): `isAdmin()`, `isStaff()`, `isSmallStaff()`, `canManage()`(admin/staff/smallstaff), `canViewApplicants()`(admin/staff)

## Firestore 데이터 구조
- `users/{email}` — 이름, 사진, 성별, 생년월일, 연락처, `memberType`, 신청서 답변 `answers`, `role`,
  `applyToken`(기본 4) / `cancelToken`(기본 2), `notifSettings`, 신청·찜 목록 배열 등
  - `users/{email}/history` — 신청/취소 등 이력
- `notifications/{email}/items` — 개인 알림 (앱 내 알림 패널)
- `meetings/{id}` — 독서모임: `title, author, topic, host, hostEmail, date, time, place, max, minMembers, applied, closed, createdAt`
  - `meetings/{id}/applicants/{email}` — 신청자
  - `meetings/{id}/waitlist/{email}` — 대기자
- `smallGroups/{id}` — 소모임: `name, host, hostEmail, date, time, place, max` (하위에 `applicants`)
- `settings/config` — 사이트 설정: 공지(`noticeBoard`, `waitingNotice`), 취소 잠금(`cancelLockEnabled`, `cancelLockHours`), 최소인원 자동마감, 찜 알림 등
- `settings/formConfig` — 가입 신청서 질문/옵션 구성 (admin.html의 "신청서 편집"에서 관리)

## 주요 기능 흐름 (index.html)
- 로그인: Google 로그인 → `auth.onAuthStateChanged`에서 role에 따라 신청서/대기/메인 화면 분기
- 탭: 독서모임(`all`) · 소모임(`small`) · 신청한 모임(`applied`) · 캘린더(`calendar`) · 모임관리(`manage`, 권한자만) · 프로필(`profile`) — `switchTab()`
- 모임 신청/취소: `applyMeeting()`, `doCancelMeeting()` — 신청권·취소권 토큰 차감, 취소 잠금 시간 체크(`isCancelLocked`)
- 대기열: `applyWaitlist()`, `promoteWaitlist()`, `cancelWaitlist()`
- 푸시: `registerFCMToken()` (VAPID 키 사용), 앱 내 알림 `addNotification()`

## 디자인
- 남색 다크 테마: 배경 `#0a1628`, 네비/카드 `#0d1f3c`, 흰 글씨와 `rgba(255,255,255,.x)` 투명도로 위계 표현
- 폰트 `'Apple SD Gothic Neo', sans-serif`, 모바일 우선 (세로 화면)
- 알림 메시지는 `showToast('...')` 사용

## 작업 방식
- 테스트 코드나 빌드 과정 없음. 수정 후 문법 오류가 없는지 꼼꼼히 확인 (단일 파일이라 한 곳의 오류가 앱 전체를 멈추게 함).
- 작업 브랜치에 커밋·푸시 → PR로 `main`에 병합되면 배포된다.
- 커밋 메시지는 무엇을 바꿨는지 한국어로 간단히.
