# Taiko World (P.Taiko) — 타이코 서클 3D 가상공간 웹사이트 기획서

## 1. 프로젝트 개요
지역 타이코 동아리/서클 **P.Taiko** 활성화를 위한 웹 프로젝트 **Taiko World**.
방문자가 동물의 숲·포코피아 같은 **저폴리(폴리곤 수가 적어 가볍고 아기자기한)·따뜻한 스타일**의 3D 가상공간을 귀여운 동물 캐릭터로 돌아다니며 다음을 경험할 수 있다.

- **연주 일정 & 멤버 확인**: 화면 상단의 가장 빠른 일정 배너와 구글 시트 CSV 실시간 연동 캘린더·멤버 도감 제공
- **타이코 체험 · 합주 참가 · 다층 레이어 악보/작곡**: 잔디 공원의 북을 직접 두드리고, 산책하다 모여 합주하는 NPC 옆에서 **`E` 키/버튼으로 함께 합주 참가**, 18개 악기 트랙 악보 감상 및 직접 작곡 체험
- **멤버·지역 단체 구경**: NPC 근접 상호작용(고개 돌림·걷기 감속·프로필 카드)과 좌/우 지역 단체 아지트(転太鼓舞·鶴亀会 등) 소개 → 서클 소개·체험/가입 문의·인스타/사이트 공유 QR로 연결
- **운영자 일괄 시즌 테마 & 기본 배경 선택**: 크리스마스(산타·트리·캐롤 합주), 졸업식, 입학식, 오봉, 여름 등 시즌 분위기와 사용자가 고를 수 있는 기본 배경 테마 지원

### 핵심 타겟 & 방문자 동선 (CTA, 최종 유도 행동)
- **주요 방문자**: 지역 주민, 공연 관객, 타이코 체험/입부에 관심 있는 학생·일반인
- **목표 동선**: 입장(랜덤 캐릭터 즉시 진입) → 잔디 공원 구경 & 타이코 체험 → NPC 합주 난입 참가·프로필·아지트 구경 → 캐릭터 꾸미기·악보 체험 → 상단 배너·캘린더로 연주 일정 확인 → **대학교 홈페이지·인스타그램(QR)·사이트 공유 QR로 연결**

---

## 2. 목표 기능 구성 (현재 구현 기준 + 확장 구조)

### 공간 & 이동
- **원형 잔디 공원 광장** (반지름 9m, 스폰 `[0, 0, 3.6]`): 나무·꽃이 소박하게 배치된 밝고 가벼운 야외 공간
- **지역 타이코 단체 아지트**: 입장 시 바라보는 방향의 앞쪽 좌/우에 배치 (`転太鼓舞`, `鶴亀会` — `spaces.json`으로 확장 가능), 가까이 다가가면 `[! E]` 말풍선으로 해당 단체 소개 바로 열기
- **카메라 & 이동**: 쿼터뷰(부드러운 추적 카메라) + 모바일 플로팅 가상 조이스틱(터치·드래그) + PC `WASD`/방향키(한글 입력 상태 대응) 및 바닥 클릭 이동

### 모듈식 동물 캐릭터 & 게스트 커스터마이징
- **단체 ↔ 동물 종족 고정 구조**: 각 지역 타이코 단체마다 고유 동물 캐릭터 종족과 공통 `法被(하피)` 의상을 가짐
  - `転太鼓舞` (조형대학) → **토끼(`rabbit`)** + 오렌지·블랙 계열 공통 `法被` *(3D 바디·하피·하치마키 GLB 투입 완료)*
  - `鶴亀会` (기술대학) → **거북이(`turtle`)** + 네이비 계열 공통 `法被` *(현재 임시 로우폴리 모델 적용, 추후 거북이 GLB 교체 예정)*
  - *(추후 새 단체 추가 시 `groups.json`에 종족·하피 설정만 추가해 확장 가능)*
- **게스트 입장 & 자동 저장**:
  - **첫 입장**: 복잡한 생성 화면 없이 **랜덤 커스터마이징된 캐릭터로 즉시 월드 진입**
  - **재방문**: 커스터마이징 결과가 브라우저 `localStorage`에 자동 저장되어 다음 접속 시 기존 캐릭터 그대로 유지
  - **언제든 꾸미기**: 화면 하단 `[🎨 꾸미기]` 버튼(3D 클로즈업 + 360° 회전·연주 포즈 미리보기)으로 원하는 단체(종족 + `法被`), 2D 얼굴(눈·코·입 모양/크기/간격/위치 + 볼터치), 헤어 스타일, 좋아하는 타이코 장비 선택 및 **`[📋 시트용 얼굴코드 복사]`** 지원
- **2D 캔버스(`CanvasTexture`) 얼굴 시스템**:
  - 3D 얼굴 메쉬 폴리곤을 늘리지 않고 `256×256px` 2D 캔버스에 눈·코·입·볼터치를 합성해 `Mat_Face` 머티리얼(피부색 `#f6f5f1` 배경 일체화)에 투영
  - 자동 눈 깜빡임 + 상태별 표정 변화(`idle`, `play`, `happy`) 구현
- **스킨드 GLB 애니메이션 로더 (`SkinnedCharacterGlb.tsx`)**:
  - Blender Rigify 공통 40본(`DEF-*`) 기반 `SkeletonUtils.clone` 복제 + `char_happi_base.glb` 자동 스켈레톤 결합 + `0.2초` 크로스페이드
  - `walk` 클립만 있을 때도 멈췄을 때 자연스러운 차렷 숨쉬기(`idle`)·양팔 타격(`play`) 포즈를 자동 보완(실제 `play_strong`/`play_weak` 클립 추가 시 자동 전환)

### NPC 멤버 · 근접 반응 · 합주 난입 참가 시스템
- 각 멤버는 구글 시트 `멤버` 탭(실패 시 `members.json` 폴백)에서 불러온 소속 단체, 2D 얼굴, 헤어, 장비 악기, 연주 가능 곡(`playableSongs`)을 보유
- 자유 랜덤 산책 중 **플레이어가 3.2m 안으로 가까이 오면** NPC가 살짝 고개(`DEF-spine.006`)를 돌리고 걸음 속도와 걷기 모션 배율을 자연스럽게 늦춤(최저 38%)
- 공통 연주 가능 곡을 가진 NPC들이 최소 합주 인원(3명 이상)만큼 모이면 같은 방향을 바라보고 자동 합주 + 추임새 텍스트(`それ！`, `はっ`, `ちょいさ〜！`) 연출
- **합주 난입 참가**: 합주 중인 NPC 그룹 근처로 가면 **`E` 키 또는 하단 버튼으로 함께 나란히 서서 합주에 참가** 가능 (`F/J` 돈, `D/K` 카, `Space` 추임새)
- NPC 가까이 접근 시 `[! E]` 말풍선 → 미니 프로필 카드 열기/닫기 (캐릭터 일러스트, `타이코력 / 학년·졸업 정보`, 연주 가능 곡 칩)

### 타이코 체험 · 보유 악기 분류(중복 통합) · 다층 레이어 악보/작곡기
- **직접 타이코 체험**: 중앙 나가도 다이코 근처에서 `[🥁 연주하기]` 또는 `Space`로 진입 → 북 중앙(`돈`, `F/J`)·테두리(`카`, `D/K`) 멀티터치/키보드 연주
- **보유 악기 종류 (중복 호칭 통합 정리, 세부 제작 규격은 [`docs/ASSET_MODULAR_GUIDE.md`](./docs/ASSET_MODULAR_GUIDE.md) 참고)**:
  - **① 桶胴太鼓 (오케도 다이코 · 밧줄 조임 통북)**: 転太鼓舞의 크기별 **`尺2·尺4·尺5·尺6`**(1尺2寸~6寸, 약 36~48cm)과 鶴亀会의 연주 방식 명칭 **`担ぎ(카츠기)`**는 같은 오케도 다이코 계열. 어깨에 비스듬히 메고 양면을 치거나(카츠기), `2据台·6据台(桶立台)`에 세로로 세워 연주
  - **② 沖縄エイサー大太鼓 (`沖 · エイサー`)**: 転太鼓舞 보유. 현장에서 부르는 `沖`과 `エイサー`는 같은 붉은 징박기 오키나와 에이사 대북. 왼손으로 북 상단 테두리를 잡아 고정하고 오른손 굵은 채 1개로 도약·춤과 함께 타격
  - **③ 長胴太鼓 (`中 · 大` 및 광장 중앙 체험북)**: 鶴亀会 보유. 통나무/두꺼운 통에 징으로 가죽을 고정한 정통 일본 북. 중형 `中`(`中足` 거치)과 대형 `大`(`大足`·`大据足(X형 거치대)`·`斜め置台`·`三宅台` 거치)로 세분화
  - **④ 締め太鼓 (`〆 · 締め`)**: 양 단체 공통. 끈으로 강하게 조인 고음 리드 북. 입식(`〆立足`/`〆立ち足`) 또는 좌식(`〆座足`/`〆座り足`) 받침대 사용
  - **⑤ 平太鼓 (`平`)**: 転太鼓舞 보유. 몸통이 납작하고 북면이 넓어 따뜻하고 긴 중저음 여운
  - **⑥ 樽太鼓 (`たる` 大·小)**: 鶴亀会 보유. 술통 형태의 건조하고 경쾌한 통 울림
  - **⑦ パーランクー (파란쿠)**: 転太鼓舞 보유. 약 21cm 붉은 한 면 손북, 왼손으로 쥐고 오른손 바치 1개로 군무 타격
  - **⑧ 笛 (篠笛 · 시노부에)**: 가로 대나무 피리, 앱 내 11음계(`ド~ソ↑`) 멜로디 연주
  - **⑨ 금속 타악기 3종 & 연출 소품 2종**: 양 단체 공통 **`チャッパ`**(미니 심벌즈)·**`ジャンガラ`**(대형 놋쇠 심벌즈/징)·**`チキ`**(아타리가네 꽹과리), 転太鼓舞 **`鈴`**(방울)·**`うちわ`**(무대 안무용 부채)
- **다층 레이어 구전보 악보 (`taikoTracks.json`, `songs.json`)**:
  - 지원 트랙 18종(하위 호환 유지): `fue`, `shime`, `shaku_2`, `shaku_4`, `shaku_5`, `shaku_6`, `oki`, `eisa`, `katsugi`, `hira`, `chu`, `odaiko`, `taru`, `paranku`, `chappa`, `jangara`, `chiki`, `suzu`
  - 레이어별 볼륨 조절·음소거, 강약 기호(`f` 강하게, `p` 약하게, `<` 점점 크게, `>` 점점 작게), 재생 바 이동 + 가로 자동 스크롤, `localStorage` 직접 작곡 저장 + 6레이어 크리스마스 캐롤(`song_carol_taiko`) 등 4곡 수록

### 시즌 · 이벤트 테마 (운영자 일괄 배포) & 기본 배경 테마 (사용자 선택)
- **운영자 일괄 시즌 테마 (`themes.json`)**: 사용자가 임의로 바꾸지 않고, 제작자가 `themes.json`의 `activeOverride` 지정 또는 달력 날짜(`dateRange`)에 맞춰 배포하면 모든 사용자에게 일괄 적용 (`christmas`, `winter`, `graduation`, `entrance`, `summer`, `obon`)
- **사용자 기본 배경 테마 (`worldEnvironments.json`)**: 메뉴에서 `🌿 잔디 공원`, `🏯 연습실`, `❄️ 눈오는 들판`, `🌇 노을 광장` 중 방문자가 자유롭게 변경 가능

### 정보 UI · 메뉴 · 오디오 · 손쉬운 문구 수정
- **통합 메뉴바**: 연주 일정(구글 시트 캘린더), 멤버 도감(카드 그리드), 곡 정보/악보·작곡기, 타이코 종류 & 지역 단체 소개, 서클 소개(대학/인스타 링크 + **인스타 QR · 사이트 공유 QR 나란히 2칸**), 기본 배경 테마, 소리 볼륨 슬라이더 — 모든 하위 창에서 `[← 메뉴]` 복귀 지원
- **소리 설정 세분화**: `[🥁 직접 연주 소리]`와 `[👥 NPC 합주 소리]` 각각 **0% ~ 100% 볼륨 슬라이더 + 음소거 토글** + 모달/연주 모드 진입 시 NPC 합주 볼륨 자동 축소(덕킹 20%)
- **문구/데이터 손쉬운 수정**: UI 문구(`siteTexts.json`), 서클(`circle.json`), 단체(`groups.json`), 멤버·일정(구글 시트)을 코드 수정 없이 편집 가능 ([`docs/CONTENT_EDIT_GUIDE.md`](./docs/CONTENT_EDIT_GUIDE.md) 참고)

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
     - **상단 중앙**: 가장 빠른 다가오는 연주 일정 1건 배너
     - **우상단**: `[🔊 소리]` 팝오버 (직접 연주·NPC 합주 개별 0~100% 슬라이더)
     - **하단**: `[🎨 꾸미기]`, `[💬 서클/문의]` 버튼 (중앙 북 근처 `[🥁 연주하기]`, NPC 합주 근처 `[🤝 합주 참가 (E)]`)
3. **캐릭터 꾸미기 모드 (`[🎨 꾸미기]`)**
   - 카메라 클로즈업 + 360° 회전·연주 포즈 토글
   - 단체(종족 + `法被`), 얼굴(눈·코·입 + 크기/간격/위치 + 볼터치), 헤어, 장비 악기 선택 + **[🎲 랜덤]** + **[📋 시트용 얼굴코드 복사]** → 즉시 3D 반영 및 `localStorage` 자동 저장
4. **타이코 연주 & 합주 참가 모드**
   - 중앙 북 근처 접근(`Space`) 또는 NPC 합주 근처 접근(`E`)으로 연주 모드 진입 (NPC 합주 소리 자동 덕킹 20%)
   - 북 중앙(`F/J` 돈) / 테두리(`D/K` 카) + 추임새(`Space`) → `[← 월드로 돌아가기]` 복귀
5. **NPC 및 지역 단체 아지트 상호작용**
   - NPC 또는 좌/우 지역 단체 아지트 근처 접근 → `[! E]` 말풍선 클릭/터치 또는 `E` 키로 프로필 카드 / 단체 소개 모달 열기·닫기
6. **통합 메뉴바 (`[☰ 메뉴]`)**
   - 연주 일정 캘린더, 멤버 도감, 곡 정보/다층 악보·직접 작곡기, 타이코 종류 & 지역 단체, 서클/문의(QR 2종), 기본 배경 테마(4종), 소리 설정 진입

---

## 5. 기술 스택
- **프론트엔드**: Vite + TypeScript + React
- **3D 엔진**: Three.js + React Three Fiber (`@react-three/fiber`) + drei (`@react-three/drei`)
- **오디오**: Web Audio API (사전 디코딩 + 악기별 합성 폴백 + 멀티채널 게인 분리)
- **3D 에셋**: Blender → **GLB(glTF 2.0)**, Draco 압축 ([`docs/ASSET_MODULAR_GUIDE.md`](./docs/ASSET_MODULAR_GUIDE.md) 규격 준수)
- **구글 시트 실시간 연동**: Google Sheets 웹 게시 CSV (`VITE_SCHEDULE_CSV_URL` 일정, `VITE_MEMBERS_CSV_URL` 멤버 — 실패 시 로컬 JSON 자동 폴백)
- **배포**: **Vercel** (GitHub `main` 푸시 시 자동 배포, OG 태그 포함)
- **상태관리**: React 기본 State + `localStorage`

---

## 6. 폴더 구조
```text
taikoworld/
├─ TAIKO_WORLD_PLAN.md              # 프로젝트 기획서 (본 문서)
├─ AGENTS.md                        # AI 협업·코딩·설계 규칙
├─ README.md
├─ package.json
├─ vite.config.ts
├─ .env.example                     # 구글 시트 CSV URL(일정·멤버) 환경변수 예시
├─ docs/
│  ├─ ASSET_MODULAR_GUIDE.md        # Blender 3D 에셋·Rigify 뼈대·모듈화 규격서
│  └─ CONTENT_EDIT_GUIDE.md         # 코드 수정 없는 문구·시트·테마 편집 가이드
├─ public/
│  ├─ models/                       # 배포용 GLB (characters/, instruments/, spaces/, props/, themes/)
│  ├─ textures/                     # happi/ (단체별 512px 하피 텍스처)
│  ├─ images/                       # characters/ (멤버 일러스트), faces/, og/, instagram-qr.png, site-qr.png
│  └─ audio/taiko/                  # 악기·음별 mp3
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ components/
│  │  ├─ Scene.tsx, Space.tsx, Player.tsx, Npc.tsx, NpcGroup.tsx
│  │  ├─ Character.tsx, SkinnedCharacterGlb.tsx, Taiko.tsx, GroupHideout.tsx
│  │  ├─ ThemeProps.tsx, ThemeWeather.tsx, DestinationMarker.tsx, GlbModel.tsx
│  │  └─ ui/                        # LandingOverlay, ScheduleBanner, SoundControl, VirtualJoystick,
│  │                                # MenuModal, ScheduleCalendarModal, MemberDirectoryModal,
│  │                                # MemberProfileModal, SongBookModal, TaikoGuideModal,
│  │                                # CircleInfoModal, CharacterCustomizerPanel, TaikoPlayOverlay
│  ├─ systems/                      # npcStateMachine, audioManager, inputController, collision, faceCanvasRenderer
│  ├─ hooks/                        # useScheduleEvents, useMembers, useKeyboardInput
│  ├─ data/                         # groups.json, members.json, spaces.json, instruments.json,
│  │                                # taikoTracks.json, songs.json, taikoGuide.json, schedule.json,
│  │                                # circle.json, themes.json, worldEnvironments.json, siteTexts.json
│  ├─ types/                        # content.ts, world.ts (데이터 스키마용 TypeScript 타입)
│  └─ utils/                        # scheduleSheetLoader, memberSheetLoader, scheduleUtils,
│                                   # characterAppearance, songScoreUtils, customSongsStorage, themeResolver
└─ assets-src/                      # 원본 .blend, 일러스트 원본, 녹음 원본 (배포 제외)
```

---

## 7. 핵심 데이터 스키마 (실제 코드 1:1 기준)
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
    "speciesLabel": "토끼",
    "happiColor": "#c96a2b",
    "happiBorderColor": "#1c1917",
    "obiColor": "#f4d35e",
    "bodyColor": "#f6f5f1",
    "accentColor": "#f7b5c4",
    "happiTexture": "/textures/happi/happi_tentaikomai.png",
    "bodyModelPath": "/models/characters/char_body_rabbit.glb"
  }
]
```

### `members.json` — 서클 멤버 (구글 시트 `멤버` 탭 실패 시 폴백, 실명·실제 사진 금지)
```jsonc
[
  {
    "id": "m01",
    "nickname": "どん",
    "role": "沖 (큰 어깨북)",
    "illustration": "/images/characters/m01.webp",
    "appearance": {
      "groupId": "group_tentaikomai",
      "hair": "hair_hachimaki",
      "equippedInstrument": "oki",
      "face": {
        "eyes": "sparkle",
        "eyeScale": 1.08,
        "eyeY": -2,
        "eyeSpacing": 2,
        "nose": "rabbit",
        "noseScale": 1.0,
        "noseY": 0,
        "mouth": "grin",
        "mouthScale": 1.08,
        "mouthY": 1,
        "blush": true
      }
    },
    "route": "park_grass_a",
    "playableSongs": ["song_matsuri", "song_daichi", "song_carol_taiko"],
    "profile": {
      "experience": "타이코력 3년",
      "status": "조형대학 3학년",
      "personality": "에너지 넘치는 분위기 메이커",
      "traits": "큰 북만 보면 눈이 반짝거림",
      "favoriteTaiko": "沖 (오키 · 큰 어깨북)",
      "oneLiner": "일단 한 번 크게 쳐보면 스트레스 싹 풀려요!"
    }
  }
]
```

### `themes.json` — 운영자 일괄 시즌 테마 (`activeOverride` 또는 날짜 `dateRange` 자동 적용)
```jsonc
{
  "activeOverride": null,
  "themes": [
    {
      "id": "christmas",
      "name": "크리스마스",
      "emoji": "🎄",
      "dateRange": { "start": "12-01", "end": "12-26" },
      "skyColor": "#24355a",
      "ambientSkyColor": "#bfd4ff",
      "ambientGroundColor": "#5b7c87",
      "sunColor": "#ffe9c7",
      "sunIntensity": 1.05,
      "weather": "snow",
      "bannerText": "Merry Christmas! 🎄",
      "props": [
        { "id": "theme_xmas_tree", "modelPath": "/models/themes/prop_xmas_tree.glb", "variant": "xmas_tree", "position": [0, 0, -4.6], "obstacleRadius": 1.2 }
      ],
      "featuredSongs": ["song_carol_taiko"]
    }
  ]
}
```

### 기타 데이터 파일 요약
- `spaces.json`: 원형 잔디 광장(반지름 9m), 장애물 7개, 좌/우 아지트 좌표, NPC 산책 경로 4종
- `taikoTracks.json`: 18종 악기 트랙 정의(피리 11음계 포함), 음 목록, 오디오 경로
- `taikoGuide.json`: 중복 통합·세분화된 타이코 10종 소개 + 지역 단체(`転太鼓舞`·`鶴亀会`) 소개
- `songs.json`: 다층 레이어 악보 4곡 (`song_carol_taiko` 16마디 6레이어 등)
- `worldEnvironments.json`: 사용자가 고를 수 있는 4종 기본 배경 테마 (잔디 공원, 연습실, 눈오는 들판, 노을 광장)
- `siteTexts.json`: 입장 화면·HUD·메뉴·모달 한글 문구 일괄 관리
- `schedule.json`: 연주 일정 기본 데이터 (`VITE_SCHEDULE_CSV_URL` 우선)
- `circle.json`: 서클 소개, 연습 시간, 링크, `instagramQr` & `siteQr` 설정
- `instruments.json`: 중앙 체험용 나가도 다이코 위치·상호작용 반경·사운드 경로

---

## 8. 성능 예산 & 에셋 요약
> 상세 수치, Rigify 40본 계층 트리, 5개 소켓 좌표, Blender Export 체크리스트, 1:1 악기 제작 상태표는 **[`docs/ASSET_MODULAR_GUIDE.md`](./docs/ASSET_MODULAR_GUIDE.md)** 를 따른다.

- **첫 로딩 총 용량**: **10MB 이하** (Draco 압축 GLB, 모달 `React.lazy` 코드 분할, 시즌 소품 조건부 로딩)
- **렌더링·충돌**: `devicePixelRatio` 최대 2 제한, 블롭 그림자, 2D 원형 경계·장애물 체크
- **오디오**: 첫 입장 터치 후 활성화, 타격음 사전 디코딩 + 연타 겹침 재생, 직접 연주음·NPC 합주음 볼륨 개별 슬라이더 + 팝업/연주 시 덕킹(20%)

---

## 9. 로드맵 체크리스트
- [x] **0. 기획 & 모듈화 설계 확정**: 기획서(`TAIKO_WORLD_PLAN.md`), 에셋 제작 가이드(`docs/ASSET_MODULAR_GUIDE.md`), 콘텐츠 수정 가이드(`docs/CONTENT_EDIT_GUIDE.md`) 작성 완료
- [x] **1. 기술 검증 (프로토타입)**: 원형 잔디 광장 이동(가상 조이스틱 + PC WASD/클릭) + 북 연주 모드(돈/카, `Space`) + Vercel 자동 배포
- [x] **2. 핵심 시스템 & 확장 UI**: NPC 자유 산책·근접 고개 돌림/감속·합주·**합주 난입 참가(`E`)**, 아지트 2종, 18트랙 다층 악보·작곡기·피리 11음계, 구글 시트 CSV 실시간 일정 & 멤버 연동, 볼륨 슬라이더 분리, 인스타/사이트 공유 QR 2종
- [x] **2.5 모듈식 캐릭터·커스터마이징·테마 엔진**:
  - [x] **Step A**: `groups.json`(단체-종족 고정) + 2D `CanvasTexture` 얼굴(깜빡임·표정) + 첫 입장 랜덤 생성 & `localStorage` 저장
  - [x] **Step B**: `[🎨 꾸미기]` 3D 프리뷰(단체·얼굴 미세조정·헤어·악기 + 랜덤 + 시트용 얼굴코드 복사)
  - [x] **Step C**: 운영자 일괄 시즌 테마(`themes.json`) + 사용자 기본 배경(`worldEnvironments.json` 4종) + 날씨 파티클·소품·16마디 캐롤 합주곡
  - [x] **Step D**: 스킨드 GLB 로더(`SkinnedCharacterGlb.tsx`) + 바디·하피 자동 스켈레톤 결합 + `idle`/`play` 자동 보완
- [ ] **3. 에셋 제작 및 교체 ([`docs/ASSET_MODULAR_GUIDE.md`](./docs/ASSET_MODULAR_GUIDE.md) 기준)**:
  - [x] 토끼 바디+뼈대+walk 모션 (`char_body_rabbit.glb`), 공통 하피 (`char_happi_base.glb`, `happi_tentaikomai.png`), 하치마키 (`hair_hachimaki.glb`)
  - [x] 타이코 · 받침대 7종 GLB (`inst_taiko_nagado.glb`, `stand_oosueashi.glb`, `inst_shaku_2.glb`, `inst_shaku_4.glb`, `inst_shaku_6.glb`, `inst_oki.glb`, `inst_shime.glb`)
  - [ ] 토끼 연주 모션(`play_strong`, `play_weak`) 및 거북이 바디(`char_body_turtle.glb`) + 추가 헤어 파츠
  - [ ] 잔여 악기/소품(`shaku_5`, `hira`, `paranku`, `fue`, `chappa`, `jangara`, `chiki`, `suzu`, `uchiwa`, `bachi`, `chu`, `odaiko`, `taru`) + 추가 받침대 선택 제작
  - [ ] 원형 잔디 공원, 단체 아지트 2종, 시즌 소품, 멤버 일러스트, QR 이미지 2종, 실제 타이코 타격음 MP3 녹음
- [ ] **4. 최종 통합/최적화**: 실제 대학/인스타 URL·QR 이미지·OG 썸네일 반영, 10MB 로딩 & 모바일 실기 프레임 최종 점검
- [ ] **5. 서클 멤버 테스트 & 정식 공개**: 서클 멤버 모바일 테스트 → 피드백 반영 → 정식 공개
- [ ] **(확장 아이디어)**: 실내 연습실·축제 무대 공간 GLB, NPC 대화(`talk`) 연출, 실시간 멀티플레이
