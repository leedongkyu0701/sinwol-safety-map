# 신월동 안전지도

서울특별시 양천구 신월동의 공공 안전시설을 지도에서 확인하는 모바일 우선 웹서비스입니다.

## 기능

- 소방용수, 민방위 대피시설, AED, 119안전센터 데이터 제공
- 시설명·주소 검색과 카테고리 필터
- NAVER 지도 Marker와 밀도 기반 Cluster
- 시설 상세 정보와 현재 위치 기준 직선거리 정렬
- 서비스 정보(`/info`)와 개인정보 처리방침(`/privacy`)

## 개발

Node.js 24와 npm을 사용합니다.

```bash
npm ci
npm run dev
```

브라우저에서 <http://localhost:3000>을 엽니다.

로컬 지도 실행에는 `.env.local`에 NAVER Maps 브라우저 키가 필요합니다.

```bash
NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID=
```

NAVER Cloud Application에 로컬 주소를 Web Service URL로 등록해야 합니다. 공공데이터 API 키는 Browser Runtime에서 사용하지 않습니다.

운영 빌드는 다음처럼 실행할 수 있습니다.

```bash
npm run build
npm run start
```

## 검증

```bash
npm run data:test-utils
npm run data:audit
npm run data:verify
npm run typecheck
npm run lint
npm run build
```

`data:audit`는 Published Snapshot을 점검하는 로컬 명령입니다. Pull Request와 `main` Push의 CI는 외부 API를 호출하지 않고 Commit된 데이터, TypeScript, Lint와 Build를 검증합니다.

## 데이터

Browser Runtime은 Git에 커밋된 정적 Published Snapshot인 `public/data/*.json`만 읽습니다. 원천 공공데이터 API를 Browser에서 직접 호출하지 않습니다.

- `public/data/fire-water.json`: 소방용수시설
- `public/data/shelters.json`: 사용중 민방위 대피시설
- `public/data/aeds.json`: 검토가 끝난 고정형 AED
- `public/data/other.json`: 기타 안전시설
- `public/data/metadata.json`: Published count와 Source 요약

현재 위치는 사용자가 버튼을 누르고 브라우저 권한을 허용한 경우에만 사용합니다. 서비스는 좌표를 자체 서버나 브라우저 저장소에 보관하지 않으며, 지도 SDK와 브라우저 등 외부 서비스의 처리에는 각 제공자의 정책이 적용될 수 있습니다.

Raw Source 파일과 공공데이터 API 키는 Git에 커밋하지 않습니다. 데이터 갱신 절차는 [데이터 운영 가이드](docs/operations.md)를 따릅니다.

## 문서

- [Architecture](docs/architecture.md): Runtime, Feature, State, Map 경계
- [Data Policy](docs/data-policy.md): Category와 Source별 Domain 규칙
- [Operations](docs/operations.md): 데이터 갱신, 검증, CI·동기화 절차
