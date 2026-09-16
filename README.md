# 신월동 안전지도

서울특별시 양천구 신월동의 공공 안전시설을 하나의 모바일 우선 지도에서 확인하기 위한 웹서비스입니다. 현재 Fire Water 정적 데이터 Pipeline까지 구현되어 있으며 지도 UI는 아직 구현하지 않았습니다.

## Tech Stack

- Next.js 16.3.5
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- Zod 4
- SheetJS 0.20.3
- NAVER Maps JavaScript API v3 예정
- GitHub Actions 예정
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
- `npm run data:verify`: 공통 Normalize/Validation Utility 검증
- `npm run data:fire-water`: Fire Water XLSX ETL 및 Published JSON 생성

## Fire Water Data

[서울 열린데이터광장 서울시 소방용수시설 현황](https://data.seoul.go.kr/dataList/OA-21306/A/1/datasetView.do)에서 공식 현행화 XLSX를 내려받아 다음 경로에 둡니다.

```text
data/raw/fire-water/source.xlsx
```

Raw XLSX는 Git에 커밋하지 않습니다. 파일을 준비한 뒤 다음 명령으로 `public/data/fire-water.json`과 `public/data/metadata.json`을 생성합니다.

```bash
npm run data:fire-water
```

## Documents

- [Architecture](docs/architecture.md)
- [Data Policy](docs/data-policy.md)
