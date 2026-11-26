# Taiko World — 내부 정보(문구·멤버·단체·일정) 간단 수정 가이드

코드를 전혀 건드리지 않고 **구글 시트 1개 + `src/data/` 폴더의 JSON 파일**만으로 사이트 안의 모든 정보를 수정하는 치트시트입니다.

---

## 1. 무엇을 어디서 수정하나요? (한눈에 보기)

| 수정하고 싶은 내용 | 열어야 할 곳 | 배포(`git push`) 필요? |
| --- | --- | --- |
| **연주 일정 (공연 날짜·장소)** | 구글 시트 `시트1` 탭 | ❌ **불필요** (1~2분 뒤 자동 반영) |
| **멤버(NPC) 정보·얼굴·곡** | 구글 시트 `멤버` 탭 | ❌ **불필요** (1~2분 뒤 자동 반영) |
| **일본어 · 한국어 전체 번역 검수표** | `docs/TRANSLATION_REVIEW.md` *(자동 비교표)* | — (`src/locales/*.json` 수정 시 사용) |
| **화면 UI 문구 (일본어·한국어·영어)** | `src/locales/ui.json` | ⭕ 수정 후 배포 |
| **타이코 종류 · 단체 설명 (일/한)** | `src/locales/taikoGuide.json` | ⭕ 수정 후 배포 |
| **서클·테마·곡·트랙 문구 (일/한)** | `src/locales/content.json` | ⭕ 수정 후 배포 |
| **서클 링크 · 연습 시간 · QR 경로** | `src/data/circle.json` | ⭕ 수정 후 배포 |
| **단체 이름 · 색상 · 동물 종족(토끼/거북이)** | `src/data/groups.json` | ⭕ 수정 후 배포 |
| **운영자 일괄 시즌 테마 (크리스마스 등)** | `src/data/themes.json` | ⭕ 수정 후 배포 |
| **기본 배경 테마 색상/날씨 (잔디 공원·연습실 등)** | `src/data/worldEnvironments.json` | ⭕ 수정 후 배포 |

---

## 1-1. 일본어 · 한국어 번역 검수 & 추후 영어(`en`) 추가 방법

사이트는 기본 접속 언어가 **일본어(`ja`)**이며, 입장 화면과 `[☰ 메뉴]` 안에서 **日本語 ↔ 한국어**를 자유롭게 전환할 수 있습니다.

1. **한눈에 검수하기**: [`docs/TRANSLATION_REVIEW.md`](./TRANSLATION_REVIEW.md)를 열면 사이트 전체의 **일본어(`ja`) vs 한국어(`ko`)가 1:1 비교표**로 정리되어 있습니다.
2. **문구 바로 고치기 (병렬 사전)**: 각 항목은 일본어 파일과 한국어 파일이 따로 나뉘지 않고, 아래처럼 **한 블록 안에 위아래로 나란히** 들어 있습니다.
   ```json
   "enterButton": {
     "ja": "太鼓ワールドに入る",
     "ko": "타이코 월드 입장"
   }
   ```
   - `src/locales/ui.json` (메뉴·버튼·안내 문구)
   - `src/locales/taikoGuide.json` (타이코 10종 & 転太鼓舞·鶴亀会 설명)
   - `src/locales/content.json` (서클 소개·배경/시즌 테마·곡·트랙 설명)
3. **검수표 최신화 & 누락 체크**: 문구를 수정한 뒤 아래 명령어를 실행하면 누락된 번역이 없는지 검사하고 비교표를 새로 만들어 줍니다.
   ```bash
   npm run i18n:review
   ```
4. **추후 영어(`en`) 추가 시**: 각 항목 아래 `"en": "..."` 줄을 채운 뒤 [`src/i18n/I18nContext.tsx`](../src/i18n/I18nContext.tsx)의 `LANGUAGE_OPTIONS`에 `{ id: 'en', nativeLabel: 'English', flag: '🇺🇸' }` 한 줄만 켜면 메뉴에 영어 버튼이 바로 나타납니다.

---

## 2. 자주 수정하는 5가지 핵심 파일 안내

### ① 메뉴 이름 · 입장 화면 문구 (`src/data/siteTexts.json`)
입장 화면 제목, 하단 버튼(`🎨 꾸미기`, `💬 서클/문의`), 메뉴바의 모든 항목 이름과 한 줄 설명이 한곳에 모여 있습니다.
```json
{
  "menu": {
    "scheduleTitle": "연주 일정 캘린더",
    "membersTitle": "멤버 정보",
    "songsTitle": "곡 정보 · 레이어 악보 / 직접 작곡",
    "taikoGuideTitle": "타이코 종류 · 지역 단체 소개",
    "circleTitle": "서클 소개 · 문의 / 인스타 QR"
  }
}
```
> 따옴표(`"..."`) 안의 **오른쪽 한글 글자만** 원하는 이름으로 바꿔 저장하시면 됩니다!

### ② 서클 소개 · 링크 · QR 이미지 (`src/data/circle.json`)
- `name`, `tagline`, `description`, `practiceInfo`: 서클 소개 문구와 연습 시간
- `links`: 인스타그램 주소와 대학교 홈페이지 주소(`https://...`로 시작)
- `instagramQr` / `siteQr`: 각각 `public/images/instagram-qr.png`, `public/images/site-qr.png`에 이미지 파일을 넣으면 자동으로 표시됩니다.

### ③ 단체 설정 (`src/data/groups.json`) & 단체 소개글 (`src/data/taikoGuide.json`)
- **`groups.json`**: 단체의 표시 이름(`name`), 동물 종족(`rabbit` / `turtle`), 공통 `法被` 색상(`happiColor`, `happiBorderColor`), 텍스처 경로 관리
- **`taikoGuide.json`**: `localGroups` 안의 단체 소개 문단과 `instruments` 안의 각 타이코 설명 문구 관리
- *(3D 아지트 간판 이름까지 바꾸려면 `src/data/spaces.json`의 `hideouts[].name`도 함께 맞춰주세요.)*

### ④ 멤버(NPC) 정보 & 연주 일정 (구글 스프레드시트)
- **스프레드시트 바로 열기**: https://docs.google.com/spreadsheets/d/16Vaky1tf2lY2pL0fI0QKeFQrlX-T24eHrp5o17rHsM4/edit
  - **`시트1` 탭**: 공연 일정 추가·수정
  - **`멤버` 탭**: 멤버 행 추가·수정 (닉네임, 소속단체 드롭다운, 한마디, 연주가능곡, 헤어·악기 드롭다운, 얼굴코드)
  - *얼굴코드 꿀팁*: 사이트의 `[🎨 꾸미기] → 😊 얼굴`에서 눈·코·입을 맞춘 뒤 **`[📋 시트용 얼굴코드 복사]`**를 눌러 `M열`에 붙여넣으세요!
  - *(※ 오프라인 예비용 기본 데이터는 `src/data/members.json`, `src/data/schedule.json`입니다.)*

### ⑤ 운영자 일괄 시즌 테마 전환 (`src/data/themes.json`)
- 평상시: `"activeOverride": null` → 달력 날짜에 맞춰 자동 적용
- 강제 적용: `"activeOverride": "christmas"` (또는 `"graduation"`, `"entrance"`, `"obon"`, `"winter"`, `"summer"`)로 바꿔 배포하면 **모든 방문자에게 일괄 적용**됩니다.

---

## 3. JSON 파일 수정 시 주의할 점 (딱 2가지!)
1. **따옴표(`"`)와 쉼표(`,`)를 지우지 마세요**: 글자를 고칠 때는 항상 `"여기의 내용만"` 바꿔 주세요. 마지막 줄 뒤에는 쉼표를 붙이지 않습니다.
2. **수정 후 확인 & 배포 방법**:
   - 로컬 확인: 터미널에서 `npm run dev` 실행 → 화면에서 바뀐 문구 확인
   - 배포: AI에게 *"방금 수정한 JSON 배포해 줘"*라고 말하거나, 터미널에서 `npm run build` 확인 후 `git add -A && git commit -m "문구 수정" && git push`!
