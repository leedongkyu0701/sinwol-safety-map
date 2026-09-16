# 신월동 안전지도

서울특별시 양천구 신월동의 공공 안전시설을 하나의 모바일 우선 지도에서 확인하기 위한 웹서비스입니다. 현재는 Phase 0 프로젝트 초기 설정만 완료한 상태이며 지도와 데이터 기능은 구현하지 않았습니다.

## Tech Stack

- Next.js 16.3.5
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
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

## Documents

- [Architecture](docs/architecture.md)
- [Data Policy](docs/data-policy.md)
