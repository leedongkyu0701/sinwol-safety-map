# 신월동 안전지도

서울특별시 양천구 신월동의 공공 안전시설을 하나의 모바일 우선 지도에서 확인하기 위한 웹서비스입니다. 현재 Fire Water, Shelter, AED, OTHER 정적 데이터 Pipeline을 구축하고 있으며 지도 UI는 아직 구현하지 않았습니다.

## Tech Stack

- Next.js 16.3.5
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- Zod 4
- SheetJS 0.20.3
- fast-xml-parser 5
- proj4 2 (ETL 전용)
- NAVER Maps JavaScript API v3 예정
- GitHub Actions
- Vercel 예정

## Getting Started

Node.js 24와 npm을 사용합니다.

```bash
npm install
npm run dev
```

브라우저에서 <http://localhost:3000>을 엽니다.

## Environment Variables

필요한 변수명은 `.env.example`을 참고합니다. 실제 Key는 `.env.local`에만 저장하며 Git에 커밋하지 않습니다.

## Scripts

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드 생성
- `npm run start`: 프로덕션 서버 실행
- `npm run lint`: ESLint 검사
- `npm run typecheck`: TypeScript 검사
- `npm run data:test-utils`: 공통 Normalize/Validation Utility 단위 검증
- `npm run data:audit`: Commit된 Published JSON과 Review Registry의 read-only 전체 감사
- `npm run data:verify`: Published JSON Schema, ID, Metadata, Source SHA 검증
- `npm run data:fire-water`: Fire Water XLSX ETL 및 Published JSON 생성
- `npm run data:shelters`: 서울 Open Data API에서 Shelter Snapshot 생성
- `npm run data:aeds`: data.go.kr API에서 AED Snapshot 생성
- `npm run data:other:fire-org`: 서울 Open Data API에서 119 조직 OTHER Snapshot 생성

## Fire Water Data

[서울 열린데이터광장 서울시 소방용수시설 현황](https://data.seoul.go.kr/dataList/OA-21306/A/1/datasetView.do)에서 공식 현행화 XLSX를 내려받아 다음 경로에 둡니다.

```text
data/raw/fire-water/source.xlsx
```

Raw XLSX는 Git에 커밋하지 않습니다. 파일을 준비한 뒤 다음 명령으로 `public/data/fire-water.json`과 `public/data/metadata.json`을 생성합니다.

```bash
npm run data:fire-water
```

ETL은 기존 Published count보다 20%를 초과해 감소하거나 결과가 0건이면 기존 Snapshot을 덮어쓰지 않습니다. `metadata.json`에서는 Fire Water 항목만 갱신하며 다른 Source의 Metadata를 보존합니다.

생성 결과는 Raw XLSX 없이도 검증할 수 있습니다. Raw XLSX가 로컬에 있으면 Source SHA-256도 함께 대조합니다.

```bash
npm run data:test-utils
npm run data:verify
```

## Shelter Data

Shelter ETL은 [서울시 민방위대피시설 인허가 정보](https://data.seoul.go.kr/dataList/OA-16149/A/1/datasetView.do)의 `LOCALDATA_114602` API를 사용합니다. `SEOUL_OPEN_DATA_KEY`를 `.env.local` 또는 실행 환경에 설정해야 하며, Key는 브라우저 Bundle이나 Published JSON에 포함하지 않습니다.

```bash
npm run data:shelters
```

서울시 전체 데이터를 동적으로 Pagination한 뒤 양천구의 신월동 시설 중 `사용중`인 데이터만 `public/data/shelters.json`에 Publish합니다. 동일한 Published 결과로 재실행하면 기존 `fetchedAt`과 `generatedAt`을 유지합니다.

## AED Data

AED ETL은 국립중앙의료원 `AEDInfoInqireService` API를 사용합니다. `DATA_GO_KR_SERVICE_KEY`를 `.env.local` 또는 실행 환경에 설정해야 하며, Key는 브라우저 Bundle이나 Published JSON에 포함하지 않습니다.

```bash
npm run data:aeds
```

서울특별시 양천구 데이터를 동적으로 Pagination하고 `buildAddress`에 `신월동`이 포함된 시설을 처리합니다. 새 이동형 후보가 탐지되면 해당 시설만 Published 대상에서 일시 제외하고, 비민감 검토 자료를 `data/review/aed-mobility-pending.json`에 갱신합니다. 나머지 AED의 Publish는 계속 진행합니다.

검토자는 Pending 목록을 확인하고 `data/review/aed-mobility.json`에 `FIXED` 또는 `MOBILE` 결정을 기록한 뒤 ETL을 다시 실행합니다. 결정된 시설은 다음 실행에서 Pending 목록에서 자동 제거됩니다. 최종 `public/data/aeds.json`에는 자동 또는 검토로 확정된 `FIXED` 시설만 포함됩니다. 동일한 Published 결과로 재실행하면 기존 `fetchedAt`과 `generatedAt`을 유지합니다.

## OTHER Data

119 조직 ETL은 서울 열린데이터광장의 `TbGiWardP` API를 사용합니다. `SEOUL_OPEN_DATA_KEY`가 필요하며, 사람이 실제 신월동 위치와 공식 주소를 검증해 `data/reference/fire-org.json`에 등록한 Source ID만 처리합니다.

```bash
npm run data:other:fire-org
```

API의 EPSG:5186 좌표를 WGS84로 변환하고 `fire-org:` 소유 행만 `public/data/other.json`에서 교체합니다. 따라서 향후 다른 OTHER Source가 추가되어도 해당 행과 Metadata를 보존할 수 있습니다. 119 조직은 시설 배치 변경 빈도가 낮은 MVP Source이므로 Daily Sync에 넣지 않고 필요할 때 수동으로 Snapshot을 갱신합니다.

## Data Automation

Pull Request와 `main` Push에서는 외부 API를 호출하지 않고 코드와 Commit된 Published Snapshot을 검증합니다. Shelter와 AED는 매일 03:17 UTC(12:17 KST)에 GitHub Actions로 동기화하며, Fire Water XLSX와 119 조직 Snapshot은 수동으로 갱신합니다.

정기 동기화에는 Repository Secrets `SEOUL_OPEN_DATA_KEY`, `DATA_GO_KR_SERVICE_KEY`가 필요합니다. 새 AED 이동형 후보는 Published에서 제외한 뒤 Pending Review File에 기록하고 나머지 데이터는 계속 갱신합니다. 데이터가 동일하면 Commit하지 않으며, API 또는 검증 실패 시 기존 정상 Snapshot을 유지합니다.

## Documents

- [Architecture](docs/architecture.md)
- [Data Policy](docs/data-policy.md)
