# Repository Instructions

## Project

`sinwol-safety-map`은 서울특별시 양천구 신월동의 공공 안전시설을 제공하는 모바일 우선 지도 서비스다.

작업 전에 다음 문서를 확인한다.

- `docs/architecture.md`
- `docs/data-policy.md`

## Working Method

항상 다음 순서로 작업한다.

```text
Inspect → Plan → Modify → Validate → Report
```

- 사용자가 지정한 Phase 범위만 구현한다.
- 다음 Phase를 승인 없이 시작하지 않는다.
- 기존 파일과 변경사항을 먼저 확인하고 필요한 부분만 수정한다.
- 라이브러리, Framework, SDK, API 또는 CLI 사용법은 현재 공식 문서를 확인한다.
- 새 Dependency는 명확한 필요성이 있을 때만 추가한다.
- 오류를 숨기거나 무분별하게 Lint 규칙을 비활성화하지 않는다.

## Architecture Boundaries

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4를 사용한다.
- Runtime Client는 `public/data/*.json`만 읽는다.
- 사용자 요청 중 공공데이터 API를 호출하는 Backend를 만들지 않는다.
- 초기 범위에서 Database, Express, NestJS, Redis, Zustand, TanStack Query, Axios 또는 지도 Wrapper를 추가하지 않는다.
- ETL은 `scripts/data`에서 실행하고, 검증을 통과한 최소 필드만 `public/data`에 Publish한다.
- 검증 실패 시 기존 정상 Snapshot을 유지한다.

## Data and Security

- 상위 Category는 `FIRE_WATER`, `SHELTER`, `AED`, `OTHER` 네 개다.
- 소방용수 936건은 subtype과 관계없이 모두 `FIRE_WATER`다.
- 시설은 좌표가 같다는 이유로 Deduplicate하지 않는다.
- AED의 `manager`, `managerTel`은 Published JSON에 포함하지 않는다.
- MOBILE AED는 Raw/Normalized 단계에 보존하고 기본 Published JSON과 Nearby 대상에서 제외한다.
- `.env.local`과 `data/raw`의 원본 파일을 Commit하지 않는다.
- `SEOUL_OPEN_DATA_KEY`, `DATA_GO_KR_SERVICE_KEY`에 `NEXT_PUBLIC_`을 붙이지 않는다.
- 사용자 위치는 브라우저 React State에만 두고 저장하거나 전송하지 않는다.

## Validation

변경 범위에 맞게 최소한 다음 명령을 실행한다.

```bash
npm run lint
npm run build
```

기능 개발 시 관련 실행 검증을 추가하고, 결과와 남은 제약을 최종 보고에 기록한다.

## Pull Requests

- PR을 생성하기 전에 `.github/pull_request_template.md`를 읽는다.
- PR 본문은 저장소 템플릿의 제목과 섹션 순서를 그대로 사용하며, 임의의 형식으로 대체하거나 우회하지 않는다.
- 해당 사항이 없는 섹션은 삭제하지 말고 `해당 없음`이라고 명시한다.
- 템플릿이 변경되면 가장 최신 버전을 기준으로 PR 본문을 작성한다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
