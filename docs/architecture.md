# Architecture

## Project Goal

서울특별시 양천구 신월동의 공공 안전시설 데이터를 모바일 우선 지도에서 제공한다.

## Runtime Architecture

```text
Browser
→ Vercel
→ Next.js Static Assets
→ public/data/*.json
→ Runtime Zod Validation
→ Facility[]
→ NAVER Marker Layer
→ NAVER Dynamic Map
```

사용자 요청 시 공공데이터 API를 직접 호출하지 않는다. Runtime Client는 저장소에서 검증되어 배포된 정적 JSON만 읽는다.

## Data Pipeline

```text
Official Public Data
→ Read/Fetch
→ Raw Response Validation
→ Source Field Normalization
→ Region/Status Filter
→ Domain Normalization
→ Published Schema Validation
→ Domain Rules and Audit
→ Static JSON
→ Git
→ Vercel
```

검증이 실패하면 신규 JSON을 Publish하지 않고 기존 정상 Snapshot을 유지한다. 프로덕션 빌드는 ETL이나 외부 공공데이터 API 호출을 실행하지 않는다.

## Backend Policy

별도 Backend Server를 두지 않는다. NestJS, Express, Database, Redis를 사용하지 않는다.

## Database Policy

현재 Dataset은 약 1천 건의 Read Only 데이터다. Filter, Search, Haversine 거리 계산은 브라우저에서 처리하므로 Database를 사용하지 않는다.

사용자 데이터, 관리자 CRUD, 시설 제보, 전국 단위 대규모 데이터, 복잡한 Spatial Query 또는 History 저장이 필요해지면 재검토한다.

## Map

NAVER Maps JavaScript API v3 Dynamic Map을 직접 사용한다. `app/page.tsx`는 Server Component로 Route composition만 담당하고, `SafetyMap`에서 Client Component boundary를 시작한다.

```text
SafetyMap Feature
→ singleton NAVER SDK Loader
→ useNaverMap lifecycle
→ NAVER Map instance
```

SDK script는 Application Runtime에서 재사용하고 Map instance, ResizeObserver, Component listener는 mount 단위로 정리한다. 초기 범위에서는 Geocoding, Reverse Geocoding, Directions, Static Map을 사용하지 않는다.

`features/facilities`는 네 Published JSON을 병렬로 읽고 기존 Shared Zod Schema와 전역 Facility ID를 검증한다. Dataset 하나라도 실패하면 전체 Runtime load를 실패시킨다. `features/safety-map`은 검증된 `Facility[]`만 받아 NAVER Marker lifecycle을 관리하며 JSON Source 구조를 알지 않는다. Marker는 `facility.id`를 Registry identity로 사용하고 cleanup 시 `setMap(null)`로 모두 제거한다.

Facility Interaction State는 작은 Zustand Store에서 `selectedCategory`와 `selectedFacilityId`만 관리한다. Published `Facility[]`, NAVER Map/Marker 객체와 Runtime load 상태는 Store에 넣지 않는다. Category Filter는 기존 Marker Registry의 `setMap()`만 갱신하므로 JSON을 다시 요청하거나 Marker를 재생성하지 않는다. Marker click은 Facility ID만 React 영역으로 전달하고, 기존 `Facility[]`에서 선택 시설을 derive해 React Detail Panel로 표시한다.

## Frontend Structure

- `app`: Route composition과 Next.js의 `not-found`, route error, global error boundary를 담당한다.
- `features`: 사용자 기능에 종속된 Component, Hook, Config와 Library를 함께 둔다.
- `shared`: 둘 이상의 화면이나 Feature에서 재사용되는 Domain Contract, Utility와 최소 공용 UI만 둔다.

공용 UI의 조건부 class 조합은 `cn()`으로 통일한다. `clsx`가 조건을 조합하고 `tailwind-merge`가 Tailwind utility 충돌을 정리한다. Feature 전용 UI는 재사용 가능성을 예상해 미리 `shared`로 올리지 않는다.

## User Location

`navigator.geolocation`으로 브라우저에서만 위치를 얻는다. GPS는 페이지 세션의 React State에만 두고 서버, URL, Cookie, Storage, Analytics 또는 오류 추적 서비스로 전송하거나 저장하지 않는다.

## Update Architecture

Hybrid Snapshot Strategy를 사용한다.

- Fire Water: 공식 최신 XLSX Snapshot을 명시적으로 갱신
- Shelter: 서울 Open Data API Snapshot, GitHub Actions Daily Sync
- AED: 국립중앙의료원 API Snapshot. 미검토 이동형 후보만 Tracked Pending 목록에 보류하고 나머지는 GitHub Actions Daily Sync로 Publish
- Other: Source별 독립 ETL 결과를 하나의 `other.json`으로 병합. 현재 119 조직은 공식 API를 사용하는 수동 Snapshot

시설 데이터가 바뀌지 않으면 Published JSON과 Metadata를 갱신하거나 Commit하지 않는다. Metadata의 `fetchedAt`과 `generatedAt`은 현재 Published Snapshot을 만든 시점을 의미하며, 변경 없는 동기화 시도는 GitHub Actions 실행 기록으로 남긴다.

각 Source ETL은 기존 `metadata.json`을 읽고 자신의 Source 항목만 갱신한다. 다른 Source의 count와 시각 정보는 그대로 보존한다. File 기반 Source는 가능한 경우 SHA-256을 기록해 Published Snapshot과 원본의 연관성을 확인할 수 있게 한다.

OTHER는 상위 Category 하나를 유지하면서 내부 Variant를 subtype과 Source별 ID namespace로 구분한다. Source ETL은 자신이 소유한 prefix의 행만 교체하고 다른 OTHER 행을 보존한다. Source별 요약은 `metadata.sources.other.datasets`에 두며, 전체 count는 병합된 `other.json`과 일치시킨다.

일반 CI는 외부 API Key 없이 Commit된 Published Snapshot, TypeScript, Lint와 Build를 검증한다. 정기 동기화는 GitHub Repository Secrets로 Shelter와 AED만 갱신하고, 검증을 통과한 허용 목록의 Data File에 실제 변경이 있을 때만 `GITHUB_TOKEN`으로 Commit한다. 동기화 실패 시 기존 정상 Snapshot은 Repository에 그대로 유지된다.

## Deployment

- Frontend: Vercel
- Automation: GitHub Actions
- Repository: GitHub
- Branches: `main`과 `feature/*`; `develop`은 사용하지 않음
