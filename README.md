# 신월동 안전지도

서울특별시 양천구 신월동의 소방용수, 민방위 대피시설, AED, 119안전센터를 한 지도에서 확인하는 모바일 우선 웹서비스입니다.

## 현재 기능

- 공공데이터 4종을 검증된 Published Snapshot으로 표시
- 시설명·주소 검색 및 카테고리 필터
- NAVER 지도 Marker와 밀도 기반 Cluster
- 시설 상세 정보와 거리순 결과
- 사용자 요청 기반 현재 위치와 직선거리 계산

현재 위치는 사용자가 버튼을 누르고 브라우저 권한을 허용한 경우에만 사용합니다. 좌표는 이 애플리케이션의 페이지 메모리에서만 사용하며 서버나 브라우저 저장소에 저장하지 않습니다. 지도 SDK와 브라우저 등 외부 서비스의 처리에는 각 제공자의 정책이 적용될 수 있습니다.

## 시작하기

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

NAVER Cloud Application의 Web Service URL에 로컬 주소를 등록해야 합니다. 공공데이터 API 키는 Browser Runtime에서 사용하지 않습니다.

## 검증

```bash
npm run data:test-utils
npm run data:audit
npm run data:verify
npm run typecheck
npm run lint
npm run build
```

Pull Request와 `main` Push의 CI는 외부 API를 호출하지 않고 Commit된 Published Data, TypeScript, Lint와 Build를 검증합니다.

## 데이터

Browser Runtime은 `public/data/*.json`만 읽습니다. 원천 공공데이터를 Browser에서 직접 호출하지 않습니다.

- `public/data/fire-water.json`: 소방용수시설
- `public/data/shelters.json`: 사용중 민방위 대피시설
- `public/data/aeds.json`: 검토가 끝난 고정형 AED
- `public/data/other.json`: 기타 안전시설
- `public/data/metadata.json`: Published count와 Source 요약

Raw Source 파일은 Git에 커밋하지 않습니다. 데이터 갱신과 검증 절차는 [데이터 운영 가이드](docs/operations.md)를 따릅니다.

## 문서

- [Architecture](docs/architecture.md): Runtime, Feature, Map, Marker, Data 경계
- [Data Policy](docs/data-policy.md): Category, Published Schema, Source별 Domain 규칙
- [Operations](docs/operations.md): 데이터 갱신, 검증, CI·동기화 운영 절차

## 주요 명령

```bash
npm run dev                 # 개발 서버
npm run build               # 운영 빌드
npm run start               # 운영 빌드 실행
npm run lint                # ESLint
npm run typecheck           # TypeScript
```
