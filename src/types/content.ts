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
 * - 공통 뼈대 위에 머리·의상·색상을 조합해 멤버별 개성을 표현합니다.
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
  profile: MemberProfile;
}
