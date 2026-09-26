# Repository Instructions

## Project

`sinwol-safety-map`은 서울특별시 양천구 신월동의 공공 안전시설을 제공하는 모바일 우선 지도 서비스다.

작업 전에 다음 문서를 확인한다.

- `docs/architecture.md`
- `docs/data-policy.md`
- `docs/operations.md` (데이터 갱신·검증 작업인 경우)

## Working Method

항상 다음 순서로 작업한다.

```text
Inspect → Plan → Modify → Validate → Report
```

- 사용자가 지정한 범위만 구현한다.
- 기존 파일과 변경사항을 먼저 확인하고 필요한 부분만 수정한다.
- 라이브러리, Framework, SDK, API 또는 CLI 사용법은 현재 공식 문서를 확인한다.
- 새 Dependency는 명확한 필요성이 있을 때만 추가한다.
- 오류를 숨기거나 무분별하게 Lint 규칙을 비활성화하지 않는다.

## Architecture Boundaries

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4를 사용한다.
- `app`은 Route composition과 Next.js boundary를 담당하고, 사용자 기능은 `features`, 여러 기능에서 재사용되는 계약과 최소 UI는 `shared`에 둔다.
- Runtime Client는 검증되어 배포된 `public/data/*.json`만 읽는다. 공공데이터 API를 Browser에서 직접 호출하지 않는다.
- Zustand에는 여러 UI가 공유하는 최소 Interaction State만 저장한다. Facility Data, derived result, User Location, NAVER Map·Marker 객체와 Runtime Cache는 Store에 넣지 않는다.
- Motion은 드래그와 전환 같은 UI 표현에만 사용하고 Domain/Data State를 저장하지 않으며 reduced-motion을 존중한다.
- Facility Marker Registry와 clustering presentation은 `features/safety-map`이 소유한다. User Location Overlay는 Facility Cluster와 독립적으로 관리한다.
- `@tanstack/react-virtual`은 Facility Result의 DOM rendering 최적화에만 사용하며 결과 집합이나 UI 상태를 저장하지 않는다.
- `/info`의 시설 수와 날짜는 `public/data/metadata.json`을 Schema로 검증해 derive한다. Snapshot 값을 JSX에 hard-code하지 않는다.
- ETL은 `scripts/data`에서 실행하고, 검증을 통과한 최소 필드만 `public/data`에 Publish한다. 검증에 실패하면 기존 정상 Snapshot을 유지한다.

## Data and Security

- 상위 Category는 `FIRE_WATER`, `SHELTER`, `AED`, `OTHER` 네 개다. Category와 Source별 Domain Rule은 `docs/data-policy.md`를 따른다.
- Raw Source 파일과 `.env.local`은 Commit하지 않는다.
- `SEOUL_OPEN_DATA_KEY`, `DATA_GO_KR_SERVICE_KEY`, `SAFE182_ESNTL_ID`, `SAFE182_AUTH_KEY`에 `NEXT_PUBLIC_`을 붙이지 않는다.
- Published JSON에는 서비스에 필요한 최소 필드만 포함하고, 공개 대상이 아닌 Source 필드는 Publish하지 않는다.
- 사용자 위치는 애플리케이션의 React State에서 관리하며, 자체 서버, URL, Cookie, Storage, Analytics 또는 오류 추적 서비스에 저장하거나 전송하지 않는다. NAVER Maps SDK와 브라우저 등 외부 서비스 제공자의 처리까지 단정하지 않는다.

## Validation

변경 범위에 맞게 최소한 다음 명령을 실행한다.

```bash
npm run lint
npm run build
```

기능 또는 데이터 변경 시 관련 검증을 추가하고, 결과와 남은 제약을 최종 보고에 기록한다.

## Pull Requests

- PR을 생성하기 전에 `.github/pull_request_template.md`를 읽는다.
- PR 본문은 저장소 템플릿의 제목과 섹션 순서를 그대로 사용한다.
- 해당 사항이 없는 섹션은 삭제하지 말고 `해당 없음`이라고 명시한다.
- 템플릿이 변경되면 가장 최신 버전을 기준으로 PR 본문을 작성한다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
