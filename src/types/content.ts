/**
 * 연주 일정 1건의 데이터 타입 — src/data/schedule.json과 1:1 대응
 */
export interface ScheduleEvent {
  id: string;
  /** YYYY-MM-DD 형식의 공연 날짜 */
  date: string;
  /** HH:mm 형식의 시작 시간 */
  time: string;
  title: string;
  place: string;
  note: string;
}

/**
 * 서클 외부 링크(인스타그램, 대학교 홈페이지 등) 타입
 */
export interface CircleLink {
  label: string;
  type: 'instagram' | 'university' | 'chat' | 'youtube' | 'website';
  url: string;
}

/**
 * 인스타그램 QR코드 이미지 표시 설정 타입
 */
export interface CircleQrInfo {
  /** public/ 폴더 기준 QR코드 이미지 경로 (예: "/images/instagram-qr.png") */
  imagePath: string;
  /** QR코드 박스 아래 안내 문구 */
  caption: string;
}

/**
 * 서클 소개 및 체험·가입 문의 정보 타입 — src/data/circle.json과 1:1 대응
 */
export interface CircleInfo {
  name: string;
  tagline: string;
  description: string;
  practiceInfo: string;
  links: CircleLink[];
  /** 인스타그램 QR코드를 표시할 네모박스 설정 (선택) */
  instagramQr?: CircleQrInfo;
}

/**
 * 지역 타이코 단체별 고정 동물 캐릭터 종족 타입
 * - 転太鼓舞 = rabbit(토끼), 鶴亀会 = turtle(거북이) (추후 새 단체 추가 시 확장)
 */
export type CharacterSpecies = 'rabbit' | 'turtle';

/** 2D 캔버스 얼굴 — 눈 모양 종류 */
export type FaceEyeStyle = 'round' | 'happy' | 'sleepy' | 'sparkle';

/** 2D 캔버스 얼굴 — 코 모양 종류 */
export type FaceNoseStyle = 'dot' | 'rabbit' | 'triangle';

/** 2D 캔버스 얼굴 — 입 모양 종류 */
export type FaceMouthStyle = 'smile' | 'cat' | 'calm' | 'grin';

/** 캐릭터 머리 / 장식 파츠 ID */
export type CharacterHairStyle =
  | 'hair_none'
  | 'hair_hachimaki'
  | 'hair_bun'
  | 'hair_cap'
  | 'hair_spiky'
  | 'hair_bob';

/** 캐릭터가 몸이나 손·앞바닥에 장비하는 타이코/악기·소품 ID (転太鼓舞 우선 + 鶴亀会 전체 포함) */
export type EquippedInstrumentId =
  | 'none'
  | 'shaku_2'
  | 'shaku_4'
  | 'shaku_5'
  | 'shaku_6'
  | 'oki'
  | 'eisa'
  | 'katsugi'
  | 'shime'
  | 'hira'
  | 'chu'
  | 'odaiko'
  | 'taru'
  | 'paranku'
  | 'fue'
  | 'chappa'
  | 'jangara'
  | 'chiki'
  | 'suzu'
  | 'uchiwa';

/**
 * 2D CanvasTexture(256x256)로 얼굴을 합성할 때 사용하는 세부 커스터마이징 설정
 */
export interface CharacterFaceConfig {
  eyes: FaceEyeStyle;
  /** 눈 크기 배율 (0.75 ~ 1.3) */
  eyeScale: number;
  /** 눈 상하 위치 오프셋 (-12 ~ 12 px) */
  eyeY: number;
  /** 눈 좌우 간격 오프셋 (-8 ~ 8 px) */
  eyeSpacing: number;
  nose: FaceNoseStyle;
  /** 코 크기 배율 (0.75 ~ 1.3) */
  noseScale: number;
  /** 코 상하 위치 오프셋 (-10 ~ 10 px) */
  noseY: number;
  mouth: FaceMouthStyle;
  /** 입 크기 배율 (0.75 ~ 1.3) */
  mouthScale: number;
  /** 입 상하 위치 오프셋 (-10 ~ 10 px) */
  mouthY: number;
  /** 분홍 볼터치 표시 여부 */
  blush: boolean;
}

/**
 * 플레이어와 NPC가 공통으로 사용하는 5-레이어 모듈식 캐릭터 외형 설정
 * - 단체(groupId)를 선택하면 해당 단체의 동물 종족과 공통 法被(하피)가 자동으로 결정됩니다.
 */
export interface CharacterAppearance {
  groupId: string;
  hair: CharacterHairStyle;
  equippedInstrument: EquippedInstrumentId;
  face: CharacterFaceConfig;
}

/**
 * 지역 타이코 단체 설정 타입 — src/data/groups.json과 1:1 대응
 * - 각 단체마다 고정된 동물 종족과 공통 法被(하피) 색·텍스처를 정의합니다.
 */
export interface TaikoGroupConfig {
  id: string;
  name: string;
  reading: string;
  affiliation: string;
  species: CharacterSpecies;
  speciesLabel: string;
  /** 단체 공통 法被(하피) 주 색상 */
  happiColor: string;
  /** 단체 공통 法被(하피) 테두리·깃 색상 */
  happiBorderColor: string;
  /** 허리띠(오비) 색상 */
  obiColor: string;
  /** 동물 캐릭터 피부/털 기본 색상 */
  bodyColor: string;
  /** 포인트 색상 (토끼 귀 안쪽 / 거북이 등껍질 등) */
  accentColor: string;
  /** 추후 실제 3D 하피 GLB에 입힐 512px 텍스처 경로 */
  happiTexture: string;
  /** 추후 실제 종족 바디 GLB 경로 */
  bodyModelPath: string;
}

/**
 * NPC 멤버 미니 프로필 카드 내용 타입
 * - 개인정보 보호 규칙: 실명과 실제 사진은 절대 넣지 않고 가벼운 서클 프로필만 담습니다.
 */
export interface MemberProfile {
  experience: string;
  /** 현재 소속/학년·졸업 여부 표시 (예: "조형대학 3학년", "기술대학 25년 졸") */
  status: string;
  personality: string;
  traits: string;
  favoriteTaiko: string;
  oneLiner: string;
}

/**
 * 서클 멤버(NPC) 설정 타입 — src/data/members.json과 1:1 대응
 */
export interface MemberConfig {
  id: string;
  nickname: string;
  role: string;
  illustration: string;
  /** 5-레이어 모듈식 캐릭터 외형 (소속 단체·헤어·장비 악기·2D 캔버스 얼굴) */
  appearance: CharacterAppearance;
  route: string;
  /** 이 멤버가 합주할 수 있는 곡 ID 목록 (songs.json의 id와 연결) */
  playableSongs: string[];
  profile: MemberProfile;
}

/**
 * 악보 레이어에서 사용하는 악기 ID 타입
 * - 転太鼓舞·鶴亀会 실제 보유 악기 전체 반영 + 추후 자유 확장 가능
 */
export type TrackInstrumentId =
  | 'shaku_2'
  | 'shaku_4'
  | 'shaku_5'
  | 'shaku_6'
  | 'oki'
  | 'eisa'
  | 'katsugi'
  | 'shime'
  | 'hira'
  | 'chu'
  | 'odaiko'
  | 'taru'
  | 'paranku'
  | 'fue'
  | 'chappa'
  | 'jangara'
  | 'chiki'
  | 'suzu'
  | string;

/**
 * 악기 연주 자세/분류 타입 (추후 서서 치는 타이코 확장을 위한 카테고리)
 */
export type InstrumentCategory = 'shoulder' | 'floor_stand' | 'standing' | 'wind' | 'hand';

/**
 * 레이어 악보에 등록되는 개별 타이코/악기 정의 — src/data/taikoTracks.json과 1:1 대응
 */
export interface TaikoTrackDefinition {
  id: TrackInstrumentId;
  /** 짧은 트랙 라벨 (예: "尺(4)", "沖", "締め", "笛", "チャッパ") */
  shortName: string;
  /** 전체 이름 */
  fullName: string;
  /** 연주 자세/분류 */
  category: InstrumentCategory;
  /** 레이어 좌측 헤더 강조 색상 */
  color: string;
  /** 합주에서의 역할 한 줄 설명 */
  summary: string;
  /** 이 악기가 악보에서 사용하는 기본 음 기호 목록 (추후 직접 작곡 시 선택 팔레트로 활용) */
  notes: string[];
  /** 실제 음원 교체 시 음 기호별 .mp3 파일 경로 맵 (선택) */
  audioFiles?: Record<string, string>;
}

/**
 * 악보 각 칸에 지정할 수 있는 강약·표현(다이나믹) 기호 타입
 * - normal: 보통 (1.0배)
 * - strong: 강하게 f (1.45배)
 * - weak: 약하게 p (0.45배)
 * - cresc: 점점 크게 < (연속된 칸에 걸쳐 0.35 -> 1.45배로 점진 증가)
 * - decresc: 점점 작게 > (연속된 칸에 걸쳐 1.45 -> 0.35배로 점진 감소)
 */
export type NoteDynamic = 'normal' | 'strong' | 'weak' | 'cresc' | 'decresc';

/**
 * 한 곡 안의 개별 악기 레이어(트랙) 타입
 * - 레이어별 기본 볼륨(0 ~ 1)과 칸별 강약·점점 크게/작게 표현을 함께 저장합니다.
 */
export interface SongLayer {
  instrumentId: TrackInstrumentId;
  /** 레이어 개별 볼륨 (0.0 ~ 1.0, 미지정 시 기본 0.85) */
  volume?: number;
  /** 박자(8분음표) 단위의 음표 배열 ("-"는 쉼표) */
  steps: string[];
  /** steps와 1:1 대응하는 칸별 다이나믹(강하게/약하게/점점 크게/점점 작게) 배열 */
  dynamics?: NoteDynamic[];
}

/**
 * 멀티 레이어 타이코 곡 설정 타입 — src/data/songs.json과 1:1 대응
 */
export interface SongConfig {
  id: string;
  title: string;
  subtitle: string;
  bpm: number;
  difficulty: '입문' | '보통' | '중급';
  minPlayers: number;
  /** 한 마디당 스텝 수 (기본 8 = 4/4박자 8분음표 기준) */
  stepsPerMeasure: number;
  /** 곡 전체 길이 (스텝 수) */
  totalSteps: number;
  description: string;
  /** 시즌 테마 전용 곡인 경우 연결되는 테마 ID (예: "christmas") */
  seasonThemeId?: string;
  /** 이 곡에서 실제로 연주되는 타이코/악기 레이어 목록만 포함 */
  layers: SongLayer[];
}

/** 시즌 테마에서 사용하는 가벼운 날씨 파티클 종류 */
export type ThemeWeatherType = 'none' | 'snow' | 'sakura' | 'firefly' | 'sparkle';

/** 시즌 소품의 임시 로우폴리 형태 종류 (실제 GLB 투입 전 미리보기용) */
export type ThemePropVariant =
  | 'xmas_tree'
  | 'event_arch'
  | 'obon_yagura'
  | 'summer_decor';

/**
 * 시즌 테마에서 공간에 추가 배치하는 3D 이벤트 소품 설정 타입
 */
export interface ThemePropConfig {
  id: string;
  /** 실제 Blender GLB 경로 (파일이 생기면 GlbModel이 자동으로 교체) */
  modelPath: string;
  /** GLB가 없을 때 표시할 임시 3D 소품 디자인 종류 */
  variant: ThemePropVariant;
  /** 월드 배치 좌표 [x, y, z] */
  position: [number, number, number];
  /** 소품을 통과하지 않도록 자동 추가되는 2D 원형 장애물 반경 (m) */
  obstacleRadius: number;
}

/**
 * 시즌 · 이벤트 테마 설정 타입 — src/data/themes.json의 themes 배열 항목과 1:1 대응
 * - 사용자가 선택하는 것이 아니라, 운영자가 themes.json에서 activeOverride를 지정하거나
 *   날짜 범위(dateRange)에 맞춰 배포 시 모든 사용자에게 일괄 적용됩니다.
 */
export interface SeasonThemeConfig {
  id: string;
  name: string;
  emoji: string;
  /** 자동 적용 기간 (MM-DD 형식, default 테마는 null) */
  dateRange: { start: string; end: string } | null;
  /** 하늘색 및 원거리 안개 색상 */
  skyColor: string;
  /** 반구 조명 상단(하늘) 색 */
  ambientSkyColor: string;
  /** 반구 조명 하단(바닥 반사) 색 */
  ambientGroundColor: string;
  /** 주 조명(태양/달빛) 색상 */
  sunColor: string;
  /** 주 조명 세기 */
  sunIntensity: number;
  /** 날씨 파티클 종류 */
  weather: ThemeWeatherType;
  /** 시즌 전용 바닥 색상 오버라이드 (예: 겨울 눈밭, 선택) */
  groundColor?: string;
  /** 시즌 전용 외곽 들판 색상 오버라이드 (선택) */
  outerGroundColor?: string;
  /** 시즌 전용 바닥 테두리 색상 오버라이드 (선택) */
  borderColor?: string;
  /** 월드 중앙 배너(졸업/입학 문구 등)에 표시할 텍스트 */
  bannerText?: string;
  /** 배너 보조 문구 */
  bannerSubText?: string;
  /** 해당 시즌에만 표시되는 3D 이벤트 소품 목록 */
  props: ThemePropConfig[];
  /** 해당 시즌 추천 곡 ID 목록 */
  featuredSongs: string[];
}

/**
 * src/data/themes.json 최상위 구조
 * - activeOverride에 시즌 ID(예: "christmas")를 넣고 배포하면 날짜와 무관하게 모든 사용자에게 일괄 적용됩니다.
 * - null이면 오늘 날짜(dateRange)에 따라 자동 적용됩니다.
 */
export interface SeasonThemeCatalog {
  activeOverride: string | null;
  themes: SeasonThemeConfig[];
}

/**
 * 사용자가 메뉴에서 자유롭게 바꿀 수 있는 기본 배경(공간) 테마 타입 — src/data/worldEnvironments.json
 * - 예: 잔디 공원, 실내 연습실, 눈오는 들판, 노을 공원
 */
export interface WorldEnvironmentConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
  skyColor: string;
  ambientSkyColor: string;
  ambientGroundColor: string;
  sunColor: string;
  sunIntensity: number;
  groundColor: string;
  outerGroundColor: string;
  borderColor: string;
  weather: ThemeWeatherType;
  /** 야외 나무·꽃 장식을 표시할지 여부 (실내 연습실은 false) */
  showOutdoorDecor: boolean;
}

/**
 * "타이코의 종류와 역사" 안내 데이터 타입 — src/data/taikoGuide.json과 1:1 대응
 */
export interface TaikoGuideInstrumentItem {
  id: string;
  trackId?: TrackInstrumentId;
  name: string;
  reading: string;
  posture: string;
  role: string;
  soundsLabel: string;
  description: string;
  sampleNote?: string;
}

/**
 * 지역 타이코 단체 소개 항목 타입 — src/data/taikoGuide.json과 1:1 대응
 */
export interface LocalTaikoGroupItem {
  id: string;
  name: string;
  reading: string;
  /** 소속 대학/지역 정보 (예: "조형대학 타이코 서클") */
  affiliation: string;
  tagline: string;
  description: string;
  tags: string[];
}

export interface TaikoGuideData {
  intro: string;
  editNotice: string;
  instruments: TaikoGuideInstrumentItem[];
  localGroups: LocalTaikoGroupItem[];
}
