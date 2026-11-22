import groupsData from '../data/groups.json';
import type {
  CharacterAppearance,
  CharacterFaceConfig,
  CharacterHairStyle,
  EquippedInstrumentId,
  FaceEyeStyle,
  FaceMouthStyle,
  FaceNoseStyle,
  TaikoGroupConfig,
} from '../types/content';

/** 브라우저 localStorage에 게스트 캐릭터 외형을 저장할 때 사용하는 키 */
const GUEST_APPEARANCE_STORAGE_KEY = 'taikoworld_guest_appearance_v1';

/** src/data/groups.json에서 불러온 지역 타이코 단체 목록 */
export const TAIKO_GROUPS: TaikoGroupConfig[] = groupsData as TaikoGroupConfig[];

/** 커스터마이징과 랜덤 생성에서 선택 가능한 파츠 옵션 목록 */
export const HAIR_STYLE_OPTIONS: readonly CharacterHairStyle[] = [
  'hair_none',
  'hair_hachimaki',
  'hair_bun',
  'hair_cap',
  'hair_spiky',
  'hair_bob',
] as const;

export const EQUIPPED_INSTRUMENT_OPTIONS: readonly EquippedInstrumentId[] = [
  'none',
  'shaku_2',
  'shaku_4',
  'shaku_6',
  'oki',
  'shime',
  'fue',
  'chappa',
] as const;

export const FACE_EYE_OPTIONS: readonly FaceEyeStyle[] = [
  'round',
  'happy',
  'sleepy',
  'sparkle',
] as const;

export const FACE_NOSE_OPTIONS: readonly FaceNoseStyle[] = [
  'dot',
  'rabbit',
  'triangle',
] as const;

export const FACE_MOUTH_OPTIONS: readonly FaceMouthStyle[] = [
  'smile',
  'cat',
  'calm',
  'grin',
] as const;

/**
 * 단체 ID로 해당 단체의 설정(고정 종족, 공통 하피 색·텍스처)을 찾아 반환하는 함수
 * - 목록에 없는 ID가 들어오면 첫 번째 단체를 안전하게 기본값으로 반환합니다.
 * @param groupId - 조회할 지역 타이코 단체 ID
 * @returns 단체 설정 객체
 */
export function getTaikoGroupById(groupId: string): TaikoGroupConfig {
  return (
    TAIKO_GROUPS.find((group) => group.id === groupId) ?? TAIKO_GROUPS[0]
  );
}

/** 배열에서 무작위 원소 1개를 뽑는 내부 보조 함수 */
function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** 숫자를 [min, max] 범위로 제한하는 보조 함수 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 지정된 구간에서 소수점 둘째 자리까지 무작위 숫자를 만드는 보조 함수 */
function randomRange(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

/**
 * 첫 방문 게스트를 위해 귀엽고 자연스러운 랜덤 캐릭터 외형을 생성하는 함수
 * - 단체(토끼/거북이 + 하피), 헤어, 좋아하는 타이코, 2D 얼굴 파츠를 균형 있게 조합합니다.
 * @returns 새로 생성된 랜덤 CharacterAppearance 객체
 */
export function createRandomAppearance(): CharacterAppearance {
  const group = pickRandom(TAIKO_GROUPS);

  // 토끼는 토끼 코/동그란 코 위주, 거북이는 동그란 코/삼각 코가 잘 어울리도록 자연스럽게 선택
  const preferredNoses: readonly FaceNoseStyle[] =
    group.species === 'rabbit'
      ? ['rabbit', 'rabbit', 'dot']
      : ['dot', 'dot', 'triangle'];

  // 처음 입장할 때 빈손보다 귀여운 타이코나 피리를 하나 들고 나오면 더 즐거움
  const starterInstruments: readonly EquippedInstrumentId[] = [
    'shaku_2',
    'shaku_4',
    'shaku_6',
    'oki',
    'shime',
    'fue',
    'chappa',
  ];

  const face: CharacterFaceConfig = {
    eyes: pickRandom(FACE_EYE_OPTIONS),
    eyeScale: randomRange(0.9, 1.15),
    eyeY: Math.round(randomRange(-5, 5)),
    eyeSpacing: Math.round(randomRange(-4, 4)),
    nose: pickRandom(preferredNoses),
    noseScale: randomRange(0.9, 1.12),
    noseY: Math.round(randomRange(-3, 3)),
    mouth: pickRandom(FACE_MOUTH_OPTIONS),
    mouthScale: randomRange(0.9, 1.15),
    mouthY: Math.round(randomRange(-4, 4)),
    blush: Math.random() < 0.78,
  };

  return {
    groupId: group.id,
    hair: pickRandom(HAIR_STYLE_OPTIONS),
    equippedInstrument: pickRandom(starterInstruments),
    face,
  };
}

/**
 * localStorage에서 읽어온 데이터가 유효한 CharacterAppearance 구조인지 검증·보정하는 함수
 * - 추후 옵션이 늘어나거나 오래된 저장 데이터가 남아 있어도 앱이 깨지지 않게 방어합니다.
 */
function sanitizeAppearance(raw: unknown): CharacterAppearance | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<CharacterAppearance>;

  if (
    typeof candidate.groupId !== 'string' ||
    !TAIKO_GROUPS.some((group) => group.id === candidate.groupId)
  ) {
    return null;
  }

  const hair = HAIR_STYLE_OPTIONS.includes(candidate.hair as CharacterHairStyle)
    ? (candidate.hair as CharacterHairStyle)
    : 'hair_hachimaki';

  const equippedInstrument = EQUIPPED_INSTRUMENT_OPTIONS.includes(
    candidate.equippedInstrument as EquippedInstrumentId
  )
    ? (candidate.equippedInstrument as EquippedInstrumentId)
    : 'shaku_4';

  const rawFace = candidate.face as Partial<CharacterFaceConfig> | undefined;
  if (!rawFace || typeof rawFace !== 'object') return null;

  const face: CharacterFaceConfig = {
    eyes: FACE_EYE_OPTIONS.includes(rawFace.eyes as FaceEyeStyle)
      ? (rawFace.eyes as FaceEyeStyle)
      : 'round',
    eyeScale:
      typeof rawFace.eyeScale === 'number'
        ? clamp(rawFace.eyeScale, 0.75, 1.3)
        : 1,
    eyeY:
      typeof rawFace.eyeY === 'number' ? clamp(rawFace.eyeY, -12, 12) : 0,
    eyeSpacing:
      typeof rawFace.eyeSpacing === 'number'
        ? clamp(rawFace.eyeSpacing, -8, 8)
        : 0,
    nose: FACE_NOSE_OPTIONS.includes(rawFace.nose as FaceNoseStyle)
      ? (rawFace.nose as FaceNoseStyle)
      : 'dot',
    noseScale:
      typeof rawFace.noseScale === 'number'
        ? clamp(rawFace.noseScale, 0.75, 1.3)
        : 1,
    noseY:
      typeof rawFace.noseY === 'number' ? clamp(rawFace.noseY, -10, 10) : 0,
    mouth: FACE_MOUTH_OPTIONS.includes(rawFace.mouth as FaceMouthStyle)
      ? (rawFace.mouth as FaceMouthStyle)
      : 'smile',
    mouthScale:
      typeof rawFace.mouthScale === 'number'
        ? clamp(rawFace.mouthScale, 0.75, 1.3)
        : 1,
    mouthY:
      typeof rawFace.mouthY === 'number' ? clamp(rawFace.mouthY, -10, 10) : 0,
    blush: typeof rawFace.blush === 'boolean' ? rawFace.blush : true,
  };

  return {
    groupId: candidate.groupId,
    hair,
    equippedInstrument,
    face,
  };
}

/**
 * 게스트 캐릭터 외형을 브라우저 localStorage에 저장하는 함수
 * @param appearance - 저장할 캐릭터 외형 설정
 */
export function saveGuestAppearance(appearance: CharacterAppearance): void {
  try {
    window.localStorage.setItem(
      GUEST_APPEARANCE_STORAGE_KEY,
      JSON.stringify(appearance)
    );
  } catch {
    // 프라이빗 브라우징 등 저장 공간이 제한된 환경에서도 앱이 멈추지 않도록 무시
  }
}

/**
 * 게스트 캐릭터 외형을 불러오거나, 첫 방문이라면 랜덤 캐릭터를 만들어 즉시 저장하는 함수
 * - 첫 방문: 랜덤 커스터마이징으로 바로 월드 진입 + localStorage 자동 저장
 * - 재방문: 이전에 저장된 캐릭터 그대로 복원
 * @returns 사용할 게스트 캐릭터 외형 설정
 */
export function loadOrCreateGuestAppearance(): CharacterAppearance {
  try {
    const saved = window.localStorage.getItem(GUEST_APPEARANCE_STORAGE_KEY);
    if (saved) {
      const parsed = sanitizeAppearance(JSON.parse(saved));
      if (parsed) return parsed;
    }
  } catch {
    // 파싱 실패 시 새로 생성
  }

  const generated = createRandomAppearance();
  saveGuestAppearance(generated);
  return generated;
}
