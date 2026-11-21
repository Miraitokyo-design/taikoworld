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
 * 모듈식 NPC 캐릭터 외형 파츠 타입
 */
export interface MemberParts {
  head: string;
  outfit: string;
  color: string;
}

/**
 * NPC 멤버 미니 프로필 카드 내용 타입
 * - 개인정보 보호 규칙: 실명과 실제 사진은 절대 넣지 않고 가벼운 서클 프로필만 담습니다.
 */
export interface MemberProfile {
  experience: string;
  /** 현재 소속/학년·졸업 여부 표시 (예: "OO대학 3학년", "OO대학 25년 졸") */
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
  parts: MemberParts;
  route: string;
  /** 이 멤버가 합주할 수 있는 곡 ID 목록 (songs.json의 id와 연결) */
  playableSongs: string[];
  profile: MemberProfile;
}

/**
 * 악보 레이어에서 사용하는 악기 ID 타입
 * - 尺(2,4,6), 沖, 締め, 笛, チャッパ + 추후 서서 치는 타이코(standing_*) 확장 가능
 */
export type TrackInstrumentId =
  | 'shaku_2'
  | 'shaku_4'
  | 'shaku_6'
  | 'oki'
  | 'shime'
  | 'fue'
  | 'chappa'
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
  /** 이 곡에서 실제로 연주되는 타이코/악기 레이어 목록만 포함 */
  layers: SongLayer[];
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
