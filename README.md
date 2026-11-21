# Taiko World (P.Taiko)

지역 타이코 서클 **P.Taiko**의 3D 가상공간 웹사이트입니다.  
방문자가 따뜻한 저폴리 3D 잔디 공원을 돌아다니며 직접 타이코(돈/카)를 체험하고, 멤버·연주 일정·서클 문의를 구경할 수 있도록 만들고 있습니다.

상세 기획과 개발 규칙은 [TAIKO_WORLD_PLAN.md](./TAIKO_WORLD_PLAN.md)와 [AGENTS.md](./AGENTS.md)를 참고하세요.

---

## 로컬 실행 방법

```bash
npm install      # 의존성 패키지 설치
npm run dev      # 로컬 개발 서버 실행 (같은 와이파이 모바일 테스트 지원: --host)
npm run build    # TypeScript 검사 및 프로덕션 빌드 (dist/ 생성)
npm run preview  # 빌드된 배포 결과물 로컬 미리보기
```

---

## Vercel 배포 설정 (GitHub 연동 자동 배포)

Vercel은 이 프로젝트의 `vercel.json`과 `package.json`을 자동으로 인식합니다.

| 설정 항목 | 자동 인식 값 |
| --- | --- |
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Root Directory** | `./` (기본값 유지) |
| **Node.js Version** | `22.x` 이상 (`package.json`의 `engines` 설정 기준) |

- `main` 브랜치에 `git push`할 때마다 Vercel이 자동으로 새 버전을 빌드해 배포합니다.
