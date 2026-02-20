# Claw-Empire Python 독립 데스크탑 전환 계획 (Violit 기반)

- 작성일: 2026-02-20
- 기준 프로젝트: `BlankEnt` (현재 리포지토리)
- 참조 프레임워크: `https://github.com/violit-dev/violit` (main 브랜치 기준)

## 0) 목표 정의

- [ ] 최종 목표: **Node.js 런타임 없이**, Python만으로 실행 가능한 독립 데스크탑 앱으로 전환
- [ ] UI/앱 런타임: **Violit + FastAPI + WebSocket + pywebview(native mode)**
- [ ] 데이터 저장소: 기존 SQLite(`claw-empire.sqlite`) 기반 호환 유지 후 점진 정비
- [ ] 기능 목표: 현재 핵심 업무 흐름(태스크/에이전트/회의/실행/리뷰/머지) 동등 동작 확보
- [ ] 배포 목표: Windows 우선 단일 실행 패키지(설치형 또는 포터블) 제공

## 1) 사전 조사 결과 (현재 구조 확인)

### Fact (확정 사실)

- [x] 현재 앱은 `React + Vite + TypeScript` 프론트 + `Express + ws + node:sqlite` 백엔드 이원 구조
- [x] API 엔드포인트는 최소 66개(`server/modules/routes/*`, `server/security/auth.ts`)
- [x] WebSocket 이벤트 다수(`task_update`, `agent_status`, `new_message`, `chat_stream` 등)
- [x] SQLite 스키마는 핵심 테이블 16개 + 런타임 마이그레이션/인덱싱 로직 포함
- [x] 워크플로우 엔진은 Git worktree/CLI spawn/OAuth/API provider/회의 오케스트레이션까지 포함
- [x] 프론트엔드 대형 컴포넌트 존재 (`OfficeView.tsx` 2779줄, `SettingsPanel.tsx` 2187줄)
- [x] Python 파일은 현재 프로젝트에 없음(완전 신규 런타임 구축 필요)

### Fact (Violit 확인)

- [x] Violit은 Python 패키지 구조이며 FastAPI + WebSocket + pywebview 네이티브 실행 지원
- [x] `app.run(--native)` 경로로 데스크탑 실행 가능
- [x] 상태 관리는 fine-grained reactive state 패턴(`app.state`) 기반
- [x] 런타임은 웹/네이티브 모두 지원하되, 이번 목표는 네이티브 모드 중심

### Assumption (가정)

- [x] "완전 파이썬 독립"은 운영 런타임 기준 Node 제거를 의미
- [x] 1차 릴리즈는 "핵심 기능 동등성" 우선, 시각 연출(픽셀 오피스 고급 애니메이션)은 단계적 이식
- [x] 기존 SQLite 데이터 재사용이 사용자 전환 비용을 가장 낮추는 경로

## 2) 타깃 아키텍처 (제안)

```text
py-empire/
├── app/
│   ├── main.py                  # Violit 진입점 + native 실행
│   ├── bootstrap.py             # 앱 초기화(설정/DI/라이프사이클)
│   ├── core/
│   │   ├── config.py            # 환경변수/경로/런타임 모드
│   │   ├── security.py          # 세션/토큰/CORS/CSRF 정책
│   │   └── events.py            # WS 이벤트 스키마
│   ├── db/
│   │   ├── sqlite.py            # DB 연결/트랜잭션/pragma
│   │   ├── schema.py            # 테이블 정의(초기 동등 스키마)
│   │   └── migrations/          # 버전형 마이그레이션 스크립트
│   ├── domain/
│   │   ├── agents.py
│   │   ├── tasks.py
│   │   ├── meetings.py
│   │   ├── messages.py
│   │   └── settings.py
│   ├── services/
│   │   ├── workflow_engine.py   # 태스크 실행/중단/복구
│   │   ├── worktree_service.py  # git worktree 생성/병합/롤백
│   │   ├── cli_provider.py      # claude/codex/gemini/opencode 감지/실행
│   │   ├── oauth_service.py     # github/google antigravity OAuth
│   │   ├── api_provider.py      # 외부 API provider
│   │   └── gateway_service.py   # inbox/openclaw gateway
│   ├── api/
│   │   ├── routes_core.py
│   │   ├── routes_collab.py
│   │   ├── routes_ops.py
│   │   └── routes_messages.py
│   ├── ui/
│   │   ├── screens/             # dashboard/tasks/settings/chat/skills/office
│   │   ├── components/
│   │   └── themes/
│   └── adapters/
│       ├── model_mapper.py      # TS 타입 ↔ Python 모델 매핑
│       └── legacy_contract.py   # 기존 API/이벤트 호환 계층
├── scripts/
│   ├── export_legacy_contract.py
│   ├── migrate_sqlite.py
│   └── package_desktop.py
├── tests/
│   ├── contract/
│   ├── integration/
│   └── e2e/
├── pyproject.toml
└── README.md
```

## 3) 마이그레이션 원칙

- [ ] **병렬 개발 후 절체**: 기존 Node 앱은 유지, Python 앱을 병행 구축
- [ ] **계약 우선**: API 응답/WS 이벤트/DB 스키마 계약을 먼저 고정하고 구현
- [ ] **동작 우선**: 화면 완성도보다 업무 흐름 완결성(생성→할당→실행→검토→종료) 우선
- [ ] **보안 회귀 금지**: 토큰 저장/암호화/인증 경로는 기존 대비 동등 이상
- [ ] **롤백 가능성 확보**: 데이터 백업 + 구버전 실행 경로 유지

## 4) 단계별 실행 계획 (구체)

## Phase 0. 계약 고정/기준선 수집 (3~5일)

- [ ] API 계약 스냅샷 생성 (엔드포인트, 요청/응답 예시, 상태코드)
- [ ] WS 이벤트 카탈로그 생성 (이벤트명, 필수 필드, 발생 조건)
- [ ] DB 스키마 덤프 + 샘플 데이터셋 마스킹본 확보
- [ ] 핵심 사용자 시나리오 10개 골든 패스 정의
- [ ] 성능 기준선 수집(시작 시간, 태스크 실행 지연, 메시지 왕복)

완료 기준:
- [ ] `artifacts/contracts/*.json` 형태로 비교 가능한 기준 데이터 확보
- [ ] 골든 시나리오 문서화 완료

## Phase 1. Python 런타임 골격 구축 (1~2주)

- [ ] Python 프로젝트 초기화(`pyproject.toml`, lock 파일, lint/test 도구)
- [ ] Violit 기본 앱 실행(`web`, `--native`) 경로 구축
- [ ] FastAPI 라우팅 뼈대 + 공통 미들웨어(인증/에러 핸들링)
- [ ] SQLite 접근 레이어/트랜잭션 유틸 구성
- [ ] 기본 health/auth/session 엔드포인트 이식

완료 기준:
- [ ] Python 앱 단독 기동 + 네이티브 창 실행 가능
- [ ] health/auth 최소 엔드포인트 정상

## Phase 2. Core 도메인/API 동등성 확보 (2~3주)

- [ ] `departments/agents/tasks/subtasks/messages/settings/stats` API 이식
- [ ] `task run/stop/resume`, `assign`, `meeting-minutes` 핵심 경로 이식
- [ ] 기존 프론트 계약과 동일한 JSON 필드명 유지(호환 우선)
- [ ] WS 허브 구현 + 필수 이벤트 브로드캐스트 구현
- [ ] 계약 테스트(legacy vs python) 자동화

완료 기준:
- [ ] 핵심 엔드포인트 계약 테스트 통과율 95%+
- [ ] 주요 WS 이벤트 parity 확보

## Phase 3. 워크플로우/실행 엔진 이식 (2~3주)

- [ ] CLI 도구 감지(`claude/codex/gemini/opencode`) 이식
- [ ] subprocess 실행 + stdout/stderr 스트림 + 중단/타임아웃 처리
- [ ] Git worktree 생성/병합/충돌/롤백/정리 이식
- [ ] orphan task 복구/중복 로그 억제/진행률 타이머 이식
- [ ] 회의 오케스트레이션(planned/review round) 핵심 흐름 이식

완료 기준:
- [ ] 태스크 실행-종료-결과 반영 전 흐름 Python 단독 동작
- [ ] worktree merge/discard 흐름 실사용 가능

## Phase 4. 통합 기능 이식 (2~3주)

- [ ] OAuth 계정/토큰 암호화 저장 경로 이식
- [ ] API provider CRUD/test/models 이식
- [ ] gateway/inbox 연동(`INBOX_WEBHOOK_SECRET`, `OPENCLAW_CONFIG`) 이식
- [ ] CLI usage cache/refresh 경로 이식
- [ ] 보안 로그/감사 체인 로깅 이식

완료 기준:
- [ ] OAuth/API/Gateway 동작 및 보안 회귀 테스트 통과

## Phase 5. Violit UI 재구성 (2~4주)

- [ ] 화면 우선순위: `Settings` → `TaskBoard` → `Dashboard` → `Chat/Terminal` → `Skills` → `Office`
- [ ] 상태 모델 통합(기존 `src/types/index.ts` 기준 Python 모델 정렬)
- [ ] 실시간 갱신(WS 이벤트 구독) 연결
- [ ] 기존 UX 핵심 액션(태스크 생성/실행/회의/머지) UI 재현
- [ ] Office 화면 MVP 구현(초기엔 단순화 가능)

완료 기준:
- [ ] 핵심 업무 시나리오 UI에서 end-to-end 동작
- [ ] 데스크탑 모드에서 끊김/멈춤 없이 사용 가능

## Phase 6. 데스크탑 패키징/배포 전환 (1~2주)

- [ ] Windows 패키징(PyInstaller/Nuitka 중 1안 확정)
- [ ] 설치/업데이트/실행 스크립트 정리
- [ ] 기존 데이터(`claw-empire.sqlite`) 자동 마이그레이션/백업
- [ ] 운영 체크리스트/장애 복구 절차 문서화
- [ ] 릴리즈 후보(RC) 검증 후 컷오버

완료 기준:
- [ ] "Python 단독 데스크탑 앱" 산출물로 설치/실행/업데이트 가능

## 5) 기능 매핑표 (현행 → Python)

| 현행 모듈 | 대상 모듈(제안) | 우선순위 |
|---|---|---|
| `server/modules/routes/core.ts` | `app/api/routes_core.py` | 높음 |
| `server/modules/routes/collab.ts` | `app/api/routes_collab.py` | 높음 |
| `server/modules/routes/ops.ts` | `app/api/routes_ops.py` | 높음 |
| `server/modules/routes/ops/messages.ts` | `app/api/routes_messages.py` | 높음 |
| `server/modules/workflow/core.ts` | `app/services/workflow_engine.py` | 높음 |
| `server/modules/workflow/agents*.ts` | `app/services/cli_provider.py` / `oauth_service.py` | 높음 |
| `server/modules/workflow/orchestration*.ts` | `app/services/meeting_orchestrator.py` | 중간 |
| `server/security/auth.ts` | `app/core/security.py` | 높음 |
| `server/db/runtime.ts` | `app/db/sqlite.py` | 높음 |
| `src/App.tsx` | `app/ui/screens/app_shell.py` | 높음 |
| `src/components/TaskBoard.tsx` | `app/ui/screens/tasks.py` | 높음 |
| `src/components/SettingsPanel.tsx` | `app/ui/screens/settings.py` | 높음 |
| `src/components/OfficeView.tsx` | `app/ui/screens/office.py` (MVP→고도화) | 중간 |
| `src/components/ChatPanel.tsx` | `app/ui/screens/chat.py` | 중간 |

## 6) 데이터/스키마 전략

- [ ] 1차: 기존 SQLite 스키마 최대한 유지 (서비스 연속성 우선)
- [ ] 2차: Python 마이그레이션 체계(Alembic 또는 자체 버전 테이블) 도입
- [ ] 3차: 정규화/인덱스 개선은 parity 달성 후 별도 릴리즈에서 수행

검증 포인트:
- [ ] 테이블/인덱스 존재성 비교
- [ ] 주요 레코드 수 비교 (`tasks`, `agents`, `messages`, `subtasks`)
- [ ] JSON 직렬화 필드 손실 여부 검증

## 7) 검증 계획 (반드시 자동화)

### 7.1 계약 검증

- [ ] 레거시 서버와 Python 서버 동일 요청에 대한 응답 계약 비교
- [ ] 상태코드/필수필드/enum 값 일치 검증
- [ ] WS 이벤트명 + payload key 동등성 검증

### 7.2 기능 검증

- [ ] 시나리오 A: 태스크 생성→할당→실행→완료
- [ ] 시나리오 B: 태스크 실행 중 stop/resume
- [ ] 시나리오 C: worktree diff/merge/discard
- [ ] 시나리오 D: 회의록 생성/조회
- [ ] 시나리오 E: OAuth/API provider 연결 및 모델 조회

### 7.3 비기능 검증

- [ ] 앱 시작 시간
- [ ] WS 이벤트 지연
- [ ] 장시간 실행 안정성(메모리/핸들 누수)
- [ ] Windows 네이티브 창 종료/재실행 안정성

## 8) 리스크 및 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| Violit 성숙도(Pre-Alpha) | 프레임워크 버그 가능성 | Violit 버전 고정 + 회귀 테스트 + 핵심 패치 포크 전략 |
| `OfficeView` 고난도 렌더링 | 일정 지연 | MVP 단순화 후 단계적 애니메이션 복원 |
| CLI provider별 동작 차이 | 실행 실패/출력 파싱 불일치 | provider별 통합 테스트 + 파서 모듈 분리 |
| OAuth/암호화 회귀 | 보안 사고 | 암호화 호환성 테스트 + 토큰 평문 금지 감사 |
| Windows subprocess 제어 차이 | stop/interrupt 불안정 | 프로세스 그룹 관리 유틸 표준화 |

## 9) 컷오버 기준 (Go/No-Go)

- [ ] 핵심 API/WS 계약 테스트 통과율 95% 이상
- [ ] 골든 시나리오 10개 전부 통과
- [ ] 중대 보안 이슈 0건
- [ ] 기존 DB 마이그레이션 무손실 검증 완료
- [ ] Windows 패키지 설치/실행/종료/재실행 문제 없음

## 10) 초기 실행 백로그 (실행 순서 고정)

- [ ] `py-empire/` 초기 구조 생성
- [ ] Violit native 최소 앱 띄우기 (`hello-native` 수준)
- [ ] SQLite 연결 + health/session API 구현
- [ ] `departments/agents/tasks` read API 우선 이식
- [ ] WS `connected/task_update/agent_status` 3종 우선 구현
- [ ] 계약 테스트 스캐폴드 구성
- [ ] TaskBoard MVP 화면 연결

## 11) 결정 사항 (본 계획에서 기본값)

- [x] Python 버전: 3.11+ 기준
- [x] 런타임: Violit(ws mode) + native(`--native`) 병행 지원
- [x] DB: SQLite 유지, 초기 스키마 호환 우선
- [x] 전환 방식: 빅뱅 교체가 아닌 병렬 구축 후 절체
- [x] 우선순위: 기능 동등성 > 시각 효과 동등성

---

## 부록 A) 현행 규모 참고치

- API 엔드포인트: 약 66개
- 주요 백엔드 파일 규모:
  - `server/modules/routes/ops.ts` 2538줄
  - `server/modules/routes/collab.ts` 2147줄
  - `server/modules/workflow/core.ts` 1748줄
  - `server/server-main.ts` 1654줄
- 주요 프론트 파일 규모:
  - `src/components/OfficeView.tsx` 2779줄
  - `src/components/SettingsPanel.tsx` 2187줄
  - `src/components/TaskBoard.tsx` 1383줄

## 부록 B) 성공 정의

- [ ] 사용자 관점: 기존과 같은 업무를 Python 데스크탑 앱에서 동일하게 수행 가능
- [ ] 운영 관점: Node 설치 없이 배포/실행/업데이트 가능
- [ ] 개발 관점: 테스트 가능한 모듈 경계와 자동 검증 파이프라인 확보

