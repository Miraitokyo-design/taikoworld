# Taiko World (P.Taiko) — 타이코 서클 3D 가상공간 웹사이트 기획서

## 1. 프로젝트 개요
지역 타이코 동아리/서클 **P.Taiko** 활성화를 위한 웹 프로젝트 **Taiko World**.
방문자가 동물의 숲·포코피아 같은 **저폴리(폴리곤 수가 적어 가볍고 아기자기한)·따뜻한 스타일**의 3D 가상공간을 귀여운 동물 캐릭터로 돌아다니며 다음을 경험할 수 있다.

- **연주 일정 확인**: 화면 상단의 가장 빠른 일정 배너와 구글 시트 연동 월간 캘린더로 공연/행사 일정 확인
- **타이코 체험 & 악보 감상·작곡**: 잔디 공원의 북을 직접 쳐보고, 다층 레이어 악보로 합주곡 감상 및 직접 작곡 체험
- **멤버·지역 단체 구경**: 공간에서 자유롭게 산책하다 모여 합주하는 NPC 멤버 프로필과 좌/우 지역 단체 아지트(転太鼓舞·鶴亀太鼓 등) 소개 구경 → 서클 소개 및 체험/가입 문의로 연결
- **계절·이벤트 분위기 변화**: 크리스마스, 졸업식, 입학식, 오봉, 여름 등 시즌에 따라 공간 장식·조명·날씨·추천 곡이 변화하는 살아 있는 세계

### 핵심 타겟 & 방문자 동선 (CTA, 최종 유도 행동)
- **주요 방문자**: 지역 주민, 공연 관객, 타이코 체험/입부에 관심 있는 학생·일반인
- **목표 동선**: 입장(랜덤 캐릭터 즉시 진입) → 잔디 공원 구경 & 타이코 체험 → NPC 합주·프로필 & 단체 아지트 구경 → 캐릭터 꾸미기·악보 체험 → 상단 배너·캘린더로 연주 일정 확인 → **대학교 홈페이지·인스타그램(QR) 등 서클 안내/문의로 이동**

---

## 2. 목표 기능 구성 (1차 MVP + 에셋 투입 전 모듈화 확장)

### 공간 & 이동
- **원형 잔디 공원 광장** (반지름 9m, 스폰 `[0, 0, 3.6]`): 나무·꽃이 소박하게 배치된 밝고 가벼운 야외 공간
- **지역 타이코 단체 아지트**: 입장 시 바라보는 방향의 앞쪽 좌/우에 배치 (`転太鼓舞`, `鶴亀太鼓` 등 — 추후 단체 추가 가능), 가까이 다가가면 `[! E]` 말풍선으로 해당 단체 소개 바로 열기
- **카메라 & 이동**: 쿼터뷰(부드러운 추적 카메라) + 모바일 플로팅 가상 조이스틱(터치·드래그) + PC `WASD`/방향키(한글 입력 상태 대응) 및 바닥 클릭 이동

### 모듈식 동물 캐릭터 & 게스트 커스터마이징
- **단체 ↔ 동물 종족 고정 구조**: 각 지역 타이코 단체마다 고유 동물 캐릭터 종족과 공통 `法被(하피)` 의상을 가짐
  - `転太鼓舞` (조형대학) → **토끼(`rabbit`)** + 오렌지·블랙 계열 공통 `法被`
  - `鶴亀太鼓` (기술대학) → **거북이(`turtle`)** + 네이비 계열 공통 `法被`
  - *(추후 새 단체 추가 시 `groups.json`에 종족·하피 텍스처만 추가해 무한 확장)*
- **게스트 입장 & 자동 저장**:
  - **첫 입장**: 복잡한 생성 화면 없이 **랜덤 커스터마이징된 캐릭터로 즉시 월드 진입**
  - **재방문**: 커스터마이징 결과가 브라우저 `localStorage`에 자동 저장되어 다음 접속 시 기존 캐릭터 그대로 유지
  - **언제든 꾸미기**: 화면 하단 `[🎨 꾸미기]` 버튼으로 원하는 단체(종족 + `法被`), 2D 얼굴(눈·코·입 모양/크기/위치), 헤어 스타일, 좋아하는 타이코 장비 선택 가능
- **2D 캔버스(`CanvasTexture`) 얼굴 시스템**:
  - 3D 얼굴 메쉬(별도 폴리곤)를 늘리지 않고 `256×256px` 2D 캔버스에 눈·코·입·볼터치 이미지를 합성해 얼굴 머티리얼에 투영
  - 자동 눈 깜빡임 + 상태별 표정 변화(`idle`, `play`, `happy`)를 폴리곤 증가 0으로 구현
- **귀엽고 부드러운 로우폴리 애니메이션**:
  - 공통 뼈대(`Armature`) 기반 클립(`idle`, `walk`, `play_strong`, `play_weak`) 간 부드러운 크로스페이드(0.2초)
  - 토끼 귀·하피 등의 보조 모션(오버랩)과 스쿼시&스트레치 탄력감 적용

### NPC 멤버 & 공통 곡 합주 시스템 (15~20명 확장 대응)
- 각 멤버는 소속 단체(종족 + 공통 `法被`), 개성 있는 2D 얼굴, 헤어, 좋아하는 타이코 장비, 연주 가능한 곡 목록(`playableSongs`)을 보유
- 고정 경로 대신 잔디 광장을 자유 랜덤 산책 → **공통 연주 가능 곡을 가진 NPC들이 곡의 최소 합주 인원(3명 이상)만큼 바로 옆에 모이면 같은 방향을 바라보고 자동 합주 시작** + 머리 위 추임새 텍스트(`それ！`, `はっ`, `ちょいさ〜！`) 연출
- 플레이어가 가까이 접근하면 가장 가까운 NPC 머리 위에 `[! E]` 말풍선 표시 → 클릭/터치 또는 `E` 키로 미니 프로필 카드 열기/닫기 (1.3× 캐릭터 일러스트, `타이코력 / 학년·졸업 정보`, 연주 가능 곡 칩)

### 타이코 체험 & 다층 레이어 악보/작곡기
- **직접 타이코 체험**: 중앙 나가도 다이코 근처에서 `[연주하기]` 또는 `Space`로 진입 → 북 중앙(`돈`, `F/J`)·테두리(`카`, `D/K`) 멀티터치/키보드 연주
- **다층 레이어 구전보 악보 (`taikoTracks.json`, `songs.json`)**:
  - 지원 악기 레이어: `笛`(4음계 `レ·ミ·ソ·ラ`), `締め`(`う·さ`), `尺 2·4·6`(`う·さ·かっ`), `沖`(`どん·かっ`), `チャッパ`(`チャン·チッ`) — 추후 서서 치는 타이코 레이어 추가 예정
  - 레이어별 볼륨 조절·음소거, 강약 기호(`f` 강하게, `p` 약하게, `<` 점점 크게, `>` 점점 작게), 재생 바 이동 + 가로 자동 스크롤
  - **직접 작곡하기**: 노트 클릭 입력·강약 브러시·로컬 저장(`localStorage`)·내 곡 내보내기(추후 확장)

### 시즌 · 이벤트 테마 시스템 (`themes.json`)
- **자동 적용 + 수동 미리보기**: 달력 날짜 기준으로 시즌 테마 자동 전환 + 메뉴 내 테마 미리보기 선택기 제공
- **지원 예정 시즌**:
  - `default` (기본 잔디 공원)
  - `christmas` (12월): 중앙 대형 크리스마스 트리 + 선물 소품 + 눈 파티클 + 캐롤 타이코 곡
  - `graduation` (2~3월): 중앙/아치 **"졸업을 축하해요 / 고마웠어요"** 배너 + 벚꽃/꽃가루 파티클
  - `entrance` (3~4월): 중앙/아치 **"입학을 환영합니다!"** 배너 + 벚꽃 파티클
  - `obon` (8월): 등불·야구라(축제 탑) + 여름밤 따뜻한 조명 + 오봉 축제 곡
  - `summer` (7~8월): 해바라기·파라솔 + 맑고 청량한 여름 하늘

### 정보 UI · 메뉴 · 오디오
- **통합 메뉴바**: 연주 일정(구글 시트 CSV 실시간 연동 캘린더), 멤버 도감, 곡 정보/악보·작곡기, 타이코 종류 & 지역 단체 소개, 서클 소개(대학교 링크 + 인스타그램 QR 박스), 시즌 테마 미리보기 — 모든 하위 창에서 `[← 메뉴]` 복귀 지원
- **소리 설정 세분화**: `[🥁 직접 연주음]`과 `[🎵 NPC 합주음]` 개별 ON/OFF + 메뉴/팝업/연주 모드 진입 시 NPC 합주 볼륨 자동 축소(덕킹 20%)
- **모바일 우선**, 서버 없는 정적 사이트 (Vercel 자동 배포)

---

## 3. 이번 단계에서 하지 않는 것 (Out of Scope)
- 실시간 멀티플레이, 채팅, 로그인, 별도 백엔드 서버/DB
- 복수 공간 간 포털 이동 (1개 원형 잔디 공원 중심, 단 `spaces.json` 배열 구조로 추후 확장 가능)
- 리듬게임 점수/채보 판정 시스템
- *(참고: 게스트 캐릭터 커스터마이징과 작곡 저장은 서버 없이 브라우저 `localStorage`만으로 가볍게 구현하여 본 단계에 포함한다.)*

---

## 4. 사용자 흐름 (UX Flow)

1. **입장 화면 (Landing)**
   - 로딩 완료 후 **`[타이코 월드 입장]`** 버튼 노출 (첫 클릭/터치 시 브라우저 오디오 활성화)
   - **첫 방문자**: 랜덤 커스터마이징(단체 종족·하피·얼굴·헤어·악기)된 캐릭터로 즉시 잔디 공원 진입 + `localStorage` 자동 저장
   - **재방문자**: 저장해 둔 본인 캐릭터 그대로 바로 입장
2. **타이코 월드 탐색 화면 (잔디 공원)**
   - 모바일: 화면 터치·드래그 **플로팅 가상 조이스틱** / PC: `WASD`·방향키 + 바닥 클릭 이동
   - **상시 HUD (최소 UI)**:
     - **좌상단**: `[☰ 메뉴]` 버튼
     - **상단 중앙**: 가장 빠른 다가오는 연주 일정 1건 배너 (예: `📅 4/12 봄맞이 지역 축제 오프닝 연주 ▸`)
     - **우상단**: `[🔊 소리]` 팝오버 (직접 연주음 ON/OFF, NPC 합주음 ON/OFF)
     - **하단**: `[🎨 꾸미기]` 버튼 (북 근처에서는 하단 중앙 `[🥁 연주하기]` 버튼 노출)
3. **캐릭터 꾸미기 모드 (`[🎨 꾸미기]`)**
   - 클릭 시 카메라가 내 캐릭터를 클로즈업하고 하단/측면에 꾸미기 패널 오픈
   - **단체 선택**(토끼/거북이 종족 + 공통 `法被` 연동), **얼굴**(눈·코·입 모양 + 크기/위치 슬라이더), **헤어**, **장비 타이코**, **[🎲 랜덤]** 버튼 제공 → 변경 즉시 3D 반영 및 `localStorage` 자동 저장
4. **타이코 연주 모드**
   - 북 근처 접근 시 `[연주하기]` 또는 `Space`로 진입, NPC 합주 소리 자동 덕킹(20%)
   - 북 중앙(`돈`) / 테두리(`카`) 탭·키보드 연주 → `[← 월드로 돌아가기]` 또는 `Space`로 복귀
5. **NPC 및 지역 단체 아지트 상호작용**
   - NPC 또는 좌/우 지역 단체 아지트 근처 접근 → 머리/지붕 위 `[! E]` 말풍선 표시 → 클릭/터치 또는 `E` 키로 프로필 카드 / 단체 소개 모달 열기·닫기
6. **통합 메뉴바 & 시즌 테마**
   - `[☰ 메뉴]`에서 연주 일정 캘린더, 멤버 도감, 곡 정보/다층 악보·직접 작곡기, 타이코 종류 & 지역 단체, 서클/문의, 시즌 테마 미리보기 진입 가능

---

## 5. 기술 스택
- **프론트엔드**: Vite + TypeScript + React
- **3D 엔진**: Three.js + React Three Fiber (`@react-three/fiber`) + drei (`@react-three/drei`)
- **오디오**: Web Audio API (사전 디코딩 + 합성 폴백 + 멀티채널 게인 분리)
- **3D 에셋**: Blender → **GLB(glTF 2.0)**, Draco 압축 (`docs/ASSET_MODULAR_GUIDE.md` 규격 준수)
- **일정 연동**: Google Sheets 웹 게시 CSV (`VITE_SCHEDULE_CSV_URL`, 실패 시 `schedule.json` 자동 폴백)
- **배포**: **Vercel** (GitHub 연동 자동 배포, OG 태그 포함)
- **상태관리**: React 기본 State + `localStorage` (정말 필요해질 때만 Zustand 도입)

---

## 6. 폴더 구조
```text
taikoworld/
├─ TAIKO_WORLD_PLAN.md          # 프로젝트 기획서 (본 문서)
├─ AGENTS.md                    # AI 협업·코딩·설계 규칙
├─ README.md
├─ package.json
├─ vite.config.ts
├─ .env.example                 # 구글 시트 CSV URL 환경변수 예시
├─ docs/
│  └─ ASSET_MODULAR_GUIDE.md    # Blender 3D 에셋·모듈화 제작 레퍼런스 가이드
├─ public/
│  ├─ models/                   # 배포용 GLB (spaces/, characters/, instruments/, props/, themes/)
│  ├─ textures/                 # happi/ (단체별 하피 텍스처), banners/
│  ├─ images/                   # characters/ (멤버 일러스트), faces/ (2D 얼굴 파츠 PNG), og/, instagram-qr.png
│  └─ audio/                    # taiko/ (악기·음별 mp3), sfx/, bgm/
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ components/               # Scene, Space, Player, Npc, NpcGroup, Character, Taiko, GroupHideout, GlbModel, ui/
│  ├─ systems/                  # npcStateMachine, audioManager, inputController, collision, faceCanvasRenderer
│  ├─ hooks/                    # useScheduleEvents, usePlayerCustomization, useActiveTheme
│  ├─ data/                     # groups.json, members.json, spaces.json, instruments.json,
│  │                            # taikoTracks.json, songs.json, taikoGuide.json, schedule.json, circle.json, themes.json
│  ├─ types/                    # 데이터 스키마용 TypeScript 타입
│  └─ utils/                    # scheduleSheetLoader, songScoreUtils, customSongsStorage, appearanceStorage
└─ assets-src/                  # 원본 .blend, 일러스트 원본, 녹음 원본 (배포 제외)
```

---

## 7. 데이터 스키마
> 스키마를 변경할 때는 `src/types/`의 TypeScript 타입과 `src/data/*.json`을 **항상 함께** 수정한다.

### `groups.json` — 지역 타이코 단체 (종족 + 공통 `法被` 고정 매핑)
```jsonc
[
  {
    "id": "group_tentaikomai",
    "name": "転太鼓舞",
    "reading": "텐타이코마이",
    "affiliation": "조형대학 타이코 서클",
    "species": "rabbit",
    "happiTexture": "/textures/happi/happi_tentaikomai.webp",
    "primaryColor": "#c96a2b",
    "accentColor": "#1c1917"
  },
  {
    "id": "group_tsurukamedaiko",
    "name": "鶴亀太鼓",
    "reading": "츠루카메타이코",
    "affiliation": "기술대학 타이코 서클",
    "species": "turtle",
    "happiTexture": "/textures/happi/happi_tsurukamedaiko.webp",
    "primaryColor": "#1d2d50",
    "accentColor": "#f4d35e"
  }
]
```

### `members.json` — 서클 멤버 (개인정보 보호: 닉네임 + 캐릭터 일러스트만 사용, 실명/실제 얼굴 금지)
```jsonc
[
  {
    "id": "m01",
    "nickname": "돈타로",
    "groupId": "group_tentaikomai",
    "role": "沖 (큰 어깨북)",
    "illustration": "/images/characters/m01.webp",
    "appearance": {
      "hair": "hair_hachimaki",
      "equippedInstrument": "oki",
      "face": {
        "eyes": "eyes_round",
        "eyeScale": 1.0,
        "eyeY": 0,
        "nose": "nose_rabbit",
        "mouth": "mouth_smile",
        "mouthScale": 1.0,
        "mouthY": 0,
        "blush": true
      }
    },
    "playableSongs": ["song_matsuri", "song_daichi"],
    "profile": {
      "experience": "타이코력 3년",
      "status": "OO대학 3학년",
      "personality": "에너지 넘치는 분위기 메이커",
      "traits": "큰 북만 보면 눈이 반짝거림",
      "favoriteTaiko": "沖 (오키 · 큰 어깨북)",
      "oneLiner": "일단 한 번 크게 쳐보면 스트레스 싹 풀려요!"
    }
  }
]
```

### `themes.json` — 시즌 · 이벤트 테마 (날짜 자동 적용 + 메뉴 미리보기)
```jsonc
[
  {
    "id": "christmas",
    "name": "크리스마스",
    "dateRange": { "start": "12-01", "end": "12-26" },
    "skyColor": "#1e2a4a",
    "ambientColor": "#b8d0ff",
    "weather": "snow",
    "bannerText": "Merry Christmas! 🎄",
    "props": [
      { "id": "xmas_tree", "modelPath": "/models/themes/prop_xmas_tree.glb", "position": [0, 0, -4.4], "obstacleRadius": 1.1 }
    ],
    "featuredSongs": ["song_carol_taiko"]
  },
  {
    "id": "graduation",
    "name": "졸업식",
    "dateRange": { "start": "02-20", "end": "03-19" },
    "skyColor": "#ffe6ea",
    "ambientColor": "#fff3e6",
    "weather": "sakura",
    "bannerText": "졸업을 축하합니다! 함께 두드려줘서 고마웠어요 🌸",
    "props": [
      { "id": "grad_arch", "modelPath": "/models/themes/prop_event_arch.glb", "position": [0, 0, -4.8], "obstacleRadius": 0.9 }
    ],
    "featuredSongs": []
  }
]
```

### `spaces.json` — 공간 설정 (원형 경계 + 장애물 + 지역 단체 아지트)
```jsonc
[
  {
    "id": "park_grass",
    "name": "잔디 공원",
    "modelPath": "/models/spaces/space_park_grass.glb",
    "spawnPoint": [0, 0, 3.6],
    "walkableBounds": { "shape": "circle", "centerX": 0, "centerZ": 0, "radius": 9 },
    "obstacles": [
      { "id": "main_taiko", "type": "circle", "x": 0, "z": -1, "radius": 0.9 },
      { "id": "hideout_tentaikomai", "type": "circle", "x": -5.1, "z": -1.4, "radius": 1.2 },
      { "id": "hideout_tsurukamedaiko", "type": "circle", "x": 5.1, "z": -1.4, "radius": 1.2 }
    ],
    "hideouts": [
      { "id": "hideout_tentaikomai", "groupId": "group_tentaikomai", "name": "転太鼓舞", "modelPath": "/models/props/hideout_tentaikomai.glb", "position": [-5.1, 0, -1.4], "interactRadius": 2.6 }
    ]
  }
]
```

### 기타 데이터 파일
- `taikoTracks.json`: 악기별 트랙 정의(`fue`, `shime`, `shaku_2/4/6`, `oki`, `chappa`), 음 목록, 오디오 경로
- `songs.json`: 다층 레이어 악보(`minPlayers`, `bpm`, 레이어별 `volume`·`steps`·`dynamics`)
- `taikoGuide.json`: 타이코 종류 소개 + 지역 타이코 단체 소개(`localGroups`)
- `schedule.json`: 연주 일정 기본 데이터 (구글 시트 CSV 연결 시 실시간 데이터 우선)
- `circle.json`: 서클 소개, 활동 시간, 대학교·인스타그램 링크 및 QR 경로
- `instruments.json`: 중앙 체험용 나가도 다이코 위치·상호작용 반경·사운드 경로

---

## 8. 성능 예산 & 기술 규칙 (모바일 기준)

### 렌더링 & 용량 예산
- **첫 로딩 총 용량**: **10MB 이하** 목표 (GLB Draco 압축, 모달 UI `React.lazy` 코드 분할, 시즌 에셋은 활성 테마만 지연 로딩)
- **폴리곤 수**: 캐릭터(바디+하피+헤어+악기 합계) ≤ 3,000 tris / 중앙 타이코 ≤ 5,000 tris / 공간 전체 ≤ 50,000 tris
- **텍스처 해상도**: 얼굴 2D 캔버스 `256×256px` / 하피·캐릭터 `512×512px` / 공간·소품 최대 `1024×1024px`
- **최적화**: 스킨드 캐릭터는 `SkeletonUtils.clone`, 정적 모델은 `GlbModel` 클론, `devicePixelRatio` 최대 2 제한, 블롭 그림자 사용, 2D 경계/원형 충돌 체크

### 오디오 규칙
- 입장 화면 첫 터치 이후 오디오 컨텍스트 활성화
- 타격음 사전 디코딩 + 연타 시 겹침 재생
- **직접 연주음**과 **NPC 합주음** 개별 ON/OFF 제공 + 메뉴/모달/연주 모드 진입 시 NPC 합주 볼륨 자동 축소(덕킹 20%)

---

## 9. 에셋 제작 규칙 (Blender → 웹)
> **상세 제작 규격(뼈대 이름, 소켓 위치, 2D 얼굴 UV, 애니메이션 클립, 파일명 매핑표, 내보내기 옵션)**은 전용 문서 **[`docs/ASSET_MODULAR_GUIDE.md`](./docs/ASSET_MODULAR_GUIDE.md)** 를 참고한다.

- **파일명**: `category_name_variant.glb` (예: `char_body_rabbit.glb`, `char_happi_base.glb`, `space_park_grass.glb`)
- **좌표/크기**: 스케일 `1 = 1m`, 원점(Origin)은 바닥 중심, 내보내기 시 **+Y Up**, 변환 적용(Apply All Transforms) 완료
- **애니메이션 클립 이름 통일**: `idle`, `walk`, `play_strong`, `play_weak`
- **캐릭터 일러스트 (2D)**: WebP 또는 압축 PNG (`public/images/characters/`), 얼굴 파츠 PNG (`public/images/faces/`)

---

## 10. 로드맵 체크리스트
- [x] **0. 기획 & 모듈화 설계 확정**: 기획서(`TAIKO_WORLD_PLAN.md`) 및 Blender 3D 에셋 제작 가이드(`docs/ASSET_MODULAR_GUIDE.md`) 작성 완료 *(멤버 실제 프로필 공개 동의 및 실대·인스타 주소는 공개 전 최종 반영)*
- [x] **1. 기술 검증 (프로토타입)**: 임시 모델로 원형 잔디 광장 쿼터뷰 이동(모바일 플로팅 조이스틱 + PC WASD/클릭) + 북 연주 모드(돈/카, `Space`) + Vercel 배포 + 스마트폰 실기 테스트
- [x] **2. 핵심 시스템 & 사전 최적화**: 모듈식 NPC(6명 샘플, 15~20명 확장 대응) 자유 산책 + 공통 곡 최소 인원(3명 이상) 근접 합주·추임새, 근접 `[! E]` 프로필/아지트 상호작용, 지역 단체 아지트(転太鼓舞·鶴亀太鼓), 다층 레이어 악보·강약 기호·볼륨 조절·직접 작곡기, 통합 메뉴바, 구글 시트 CSV 실시간 일정 캘린더, 소리 설정 세분화(직접/NPC 분리 + 팝업 덕킹), `GlbModel` 자동 로더 + `React.lazy` 코드 분할
- [ ] **2.5 에셋 투입 전 캐릭터·커스터마이징·시즌 구조 구현**:
  - [ ] **Step A (캐릭터 통합 구조)**: `groups.json`(단체-종족 고정) + 토끼/거북이 임시 파츠 + 단체 공통 `法被` + 2D `CanvasTexture` 얼굴(자동 깜빡임·표정) + 장비 타이코 + 첫 입장 랜덤 생성 & `localStorage` 자동 저장
  - [ ] **Step B (게스트 커스터마이징 UI)**: 하단 `[🎨 꾸미기]` 버튼 + 3D 클로즈업 프리뷰(단체·얼굴 크기/위치·헤어·악기 선택 + 랜덤 버튼)
  - [ ] **Step C (시즌·이벤트 테마 엔진)**: `themes.json` 날짜 자동 적용 + 메뉴 미리보기 + 크리스마스 트리/졸업·입학 배너/오봉 등불/날씨 파티클 + 시즌 전용 곡 연동
  - [ ] **Step D (스킨드 GLB 애니메이션 로더)**: `SkeletonUtils.clone` + `useAnimations` 크로스페이드(0.2초) + 스쿼시&스트레치·보조 모션
- [ ] **3. 에셋 제작 (`docs/ASSET_MODULAR_GUIDE.md` 기준)**: 중앙 나가도 타이코, 단체 아지트 2종, 원형 잔디 공원, 토끼·거북이 공통 리그 바디 & `法被` 텍스처, 2D 얼굴 파츠, 헤어·어깨북 파츠, 시즌 소품, 멤버 일러스트, 타이코 타격음 녹음
- [ ] **4. 통합/최적화**: 임시 에셋을 Blender GLB/오디오로 1개씩 교체 검증, 실제 대학교/인스타그램 URL·QR 이미지 적용, 10MB 이하 로딩·모바일 프레임 최적화, OG 썸네일 적용
- [ ] **5. 테스트 및 공개**: 서클 멤버 모바일 테스트 → 피드백 반영 → 정식 공개
- [ ] **(확장 아이디어)**: 실내 연습실·축제 무대 등 공간 추가, 서서 치는 타이코 추가, NPC 대화(`talk`) 연출, 실시간 멀티플레이
