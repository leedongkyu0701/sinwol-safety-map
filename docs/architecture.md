# Architecture

## Overview

신월동 안전지도는 별도 애플리케이션 서버 없이, 검증된 공공데이터 Snapshot을 Browser에서 읽어 지도와 목록으로 제공한다.

```text
Official Source
→ ETL and validation
→ Published JSON
→ GitHub
→ Vercel
→ Browser
```

검증되지 않은 데이터는 기존 Published Snapshot을 대체하지 않는다.

## Runtime

```text
Browser
→ Next.js static assets
→ public/data/*.json
→ Runtime Zod validation
→ Facility[]
→ Facility features and NAVER Maps
```

Runtime Client는 `public/data/*.json`만 읽고, 원천 공공데이터 API를 직접 호출하지 않는다. 검색, 필터, Haversine 직선거리 계산과 결과 정렬은 Browser에서 수행한다.

현재 데이터 규모는 정적 Read-only Dataset에 적합하므로 별도 Backend Server, Database, Spatial Query Layer를 두지 않는다.

## Data Flow

각 Source ETL은 `scripts/data`에서 원천 데이터를 읽거나 가져와 정규화, Domain Rule 적용, Schema 검증과 Audit을 거쳐 `public/data`와 `metadata.json`을 만든다. Runtime은 이 Published 결과만 사용한다.

Source별 필터, Identity, Published 필드와 Snapshot 기준은 [Data Policy](data-policy.md), 실행 명령과 배포 전 절차는 [Operations](operations.md)에서 관리한다.

## Frontend Boundaries

- `src/app`: Route composition, metadata와 Next.js error boundary
- `src/features/facilities`: Facility Data, 검색·필터·목록·상세·Interaction
- `src/features/current-location`: Browser Geolocation 요청과 상태
- `src/features/safety-map`: NAVER Map lifecycle, Facility Marker와 Cluster, User Location Overlay
- `src/features/service-info`: `/info`와 `/privacy`의 정적 정보 화면
- `src/shared`: 여러 Feature에서 실제로 재사용되는 Schema, Type, 상수, Utility와 최소 UI

Feature 전용 UI와 상태를 `shared`로 미리 올리지 않는다. Route는 조합만 담당하고, 실제 사용자 기능은 해당 Feature가 소유한다.

## State Ownership

Zustand에는 여러 UI가 공유하는 최소 Interaction State만 저장한다.

- `selectedCategory`
- `searchQuery`
- `selectedFacilityId`

`Facility[]`, 검색·필터 결과, 거리 정렬 결과와 visible ID는 원본 데이터와 Interaction State에서 derive한다. User Location은 `useCurrentLocation`의 React State에 두며 Zustand에 persist하지 않는다. NAVER Map, Marker, Cluster instance와 Runtime Data Cache도 Store에 넣지 않는다.

## Map and Marker Lifecycle

```text
useNaverMap
→ NAVER Map lifecycle

FacilityMarkerManager
→ Facility Marker Registry, click listener and selected presentation

FacilityClusterController
→ visible Result Marker presentation

useUserLocationOverlay
→ current location Marker and accuracy Circle
```

Facility Marker는 `facility.id`를 Registry identity로 사용하고 Filter·Search 때 재생성하지 않는다. 선택 상태는 기존 Marker의 아이콘과 z-index만 갱신한다. Cluster Controller는 기존 Marker Registry에서 결과에 해당하는 Marker만 지도에 표현한다. User Location Overlay는 Facility Cluster와 별도 생명주기와 z-index를 가진다.

목록과 지도 선택은 같은 Facility ID를 사용한다. 긴 목록은 `@tanstack/react-virtual`로 화면에 필요한 행만 렌더링한다.

## User Location

사용자가 현재 위치 버튼을 누르고 Browser 권한을 허용한 경우에만 `navigator.geolocation.getCurrentPosition()`을 호출한다. `latitude`, `longitude`, `accuracy`는 현재 페이지의 React State에서 지도 이동, User Location Overlay와 시설까지의 직선거리 계산에 사용한다.

애플리케이션은 위치를 자체 서버, URL, Cookie, Storage, Analytics 또는 오류 추적 서비스에 저장하거나 전송하지 않는다. Browser, NAVER Maps SDK와 Hosting provider의 처리까지 이 Repository가 보장하는 것으로 표현하지 않는다.

## Service Information Routes

`/info`는 Commit된 `public/data/metadata.json`을 기존 Schema로 검증해 시설 수와 Source별 날짜를 정적 Server Component로 표시한다. `/privacy`는 현재 코드에서 확인되는 위치 처리, 외부 서비스와 분석 도구 사용 여부만 안내하며 Runtime Data를 추가로 요청하지 않는다.

## Deployment and Automation

- Frontend: Vercel
- Repository: GitHub
- Branches: `main`, `feature/*`
- CI: `.github/workflows/ci.yml`에서 Published Data Test, Verify, TypeScript, Lint, Build 실행
- Scheduled Sync: `.github/workflows/sync-public-data.yml`에서 Shelter, AED와 Heat Shelter Snapshot 갱신

정기 동기화가 실패하면 기존 Repository Snapshot을 유지한다. Fire Water와 Fire Organization Snapshot은 수동 갱신 대상이다.
