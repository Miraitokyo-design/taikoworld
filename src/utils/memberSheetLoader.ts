import type {
  CharacterFaceConfig,
  CharacterHairStyle,
  CharacterSpecies,
  EquippedInstrumentId,
  FaceEyeStyle,
  FaceMouthStyle,
  FaceNoseStyle,
  MemberConfig,
  SongConfig,
} from '../types/content';
import {
  FACE_EYE_OPTIONS,
  FACE_MOUTH_OPTIONS,
  FACE_NOSE_OPTIONS,
  TAIKO_GROUPS,
  getTaikoGroupById,
} from './characterAppearance';
import { parseCsvRows } from './scheduleSheetLoader';

/** 멤버 데이터를 어디서 불러왔는지 나타내는 출처 타입 */
export type MembersSource = 'local' | 'sheet';

/** 숫자를 [min, max] 범위로 안전하게 제한하는 보조 함수 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 닉네임 문자열로 일관된 해시 숫자를 만드는 보조 함수
 * - 시트에서 얼굴코드를 비워 둔 멤버라도 접속할 때마다 얼굴이 바뀌지 않고
 *   항상 같은 귀여운 기본 얼굴을 유지할 수 있게 해줍니다.
 */
function hashNickname(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * 시트의 소속단체 입력값(한국어·일본어·ID 모두 허용)을 groups.json의 groupId로 변환하는 함수
 */
function resolveGroupId(rawGroup: string): string {
  const normalized = rawGroup.trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized) return TAIKO_GROUPS[0].id;

  // 1) groups.json의 id, name, reading과 직접 일치 확인
  for (const group of TAIKO_GROUPS) {
    if (
      normalized === group.id.toLowerCase() ||
      normalized === group.name.toLowerCase() ||
      normalized === group.reading.toLowerCase() ||
      normalized === group.speciesLabel.toLowerCase() ||
      normalized === group.species.toLowerCase()
    ) {
      return group.id;
    }
  }

  // 2) 부분 키워드 매칭 (조형대학/토끼/転太鼓舞 vs 기술대학/거북이/鶴亀会)
  if (
    normalized.includes('鶴亀') ||
    normalized.includes('츠루카메') ||
    normalized.includes('tsurukame') ||
    normalized.includes('기술') ||
    normalized.includes('거북')
  ) {
    return 'group_tsurukamekai';
  }

  return TAIKO_GROUPS[0].id;
}

/**
 * 시트의 헤어 입력값(한국어 드롭다운 라벨 또는 영문 ID)을 CharacterHairStyle로 변환하는 함수
 */
function resolveHairStyle(rawHair: string): CharacterHairStyle {
  const normalized = rawHair.trim().toLowerCase().replace(/\s+/g, '');
  const hairMap: Record<string, CharacterHairStyle> = {
    없음: 'hair_none',
    민머리: 'hair_none',
    none: 'hair_none',
    hair_none: 'hair_none',
    머리띠: 'hair_hachimaki',
    하치마키: 'hair_hachimaki',
    hachimaki: 'hair_hachimaki',
    hair_hachimaki: 'hair_hachimaki',
    만두머리: 'hair_bun',
    상투: 'hair_bun',
    bun: 'hair_bun',
    hair_bun: 'hair_bun',
    모자: 'hair_cap',
    캡: 'hair_cap',
    cap: 'hair_cap',
    hair_cap: 'hair_cap',
    뾰족헤어: 'hair_spiky',
    뾰족: 'hair_spiky',
    spiky: 'hair_spiky',
    hair_spiky: 'hair_spiky',
    단발: 'hair_bob',
    단발머리: 'hair_bob',
    bob: 'hair_bob',
    hair_bob: 'hair_bob',
  };

  return hairMap[normalized] ?? 'hair_hachimaki';
}

/**
 * 시트의 장비악기 입력값(드롭다운 라벨 또는 트랙 ID)을 EquippedInstrumentId로 변환하는 함수
 */
function resolveEquippedInstrument(rawInstrument: string): EquippedInstrumentId {
  const normalized = rawInstrument.trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized || normalized === '없음' || normalized === 'none') {
    return 'none';
  }
  if (normalized.includes('shaku_2') || normalized.includes('尺(2)') || normalized.includes('샤쿠2') || normalized === '尺2') {
    return 'shaku_2';
  }
  if (normalized.includes('shaku_5') || normalized.includes('尺(5)') || normalized.includes('샤쿠5') || normalized === '尺5') {
    return 'shaku_5';
  }
  if (normalized.includes('shaku_6') || normalized.includes('尺(6)') || normalized.includes('샤쿠6') || normalized === '尺6') {
    return 'shaku_6';
  }
  if (normalized.includes('shaku_4') || normalized.includes('尺(4)') || normalized.includes('샤쿠4') || normalized.includes('尺') || normalized.includes('샤쿠')) {
    return 'shaku_4';
  }
  if (normalized.includes('eisa') || normalized.includes('エイサー') || normalized.includes('에이사')) {
    return 'eisa';
  }
  if (normalized.includes('katsugi') || normalized.includes('担ぎ') || normalized.includes('카츠기')) {
    return 'katsugi';
  }
  if (normalized.includes('oki') || normalized.includes('沖') || normalized.includes('오키')) {
    return 'oki';
  }
  if (normalized.includes('shime') || normalized.includes('締め') || normalized === '〆' || normalized.includes('시메')) {
    return 'shime';
  }
  if (normalized.includes('hira') || normalized.includes('平') || normalized.includes('평태고')) {
    return 'hira';
  }
  if (normalized.includes('odaiko') || normalized === '大' || normalized.includes('대태고')) {
    return 'odaiko';
  }
  if (normalized.includes('chu') || normalized === '中' || normalized.includes('중태고')) {
    return 'chu';
  }
  if (normalized.includes('taru') || normalized.includes('たる') || normalized.includes('타루')) {
    return 'taru';
  }
  if (normalized.includes('paranku') || normalized.includes('パーランクー') || normalized.includes('파란쿠')) {
    return 'paranku';
  }
  if (normalized.includes('fue') || normalized.includes('笛') || normalized.includes('피리') || normalized.includes('후에')) {
    return 'fue';
  }
  if (normalized.includes('jangara') || normalized.includes('ジャンガラ') || normalized.includes('쟝가라')) {
    return 'jangara';
  }
  if (normalized.includes('chiki') || normalized.includes('チキ') || normalized.includes('치키')) {
    return 'chiki';
  }
  if (normalized.includes('chappa') || normalized.includes('チャッパ') || normalized.includes('차파')) {
    return 'chappa';
  }
  if (normalized.includes('suzu') || normalized.includes('鈴') || normalized.includes('방울')) {
    return 'suzu';
  }
  if (normalized.includes('uchiwa') || normalized.includes('うちわ') || normalized.includes('부채')) {
    return 'uchiwa';
  }
  return 'shaku_4';
}

/**
 * 시트의 연주가능곡 셀("축제 한마당, 대지의 울림" 또는 "song_matsuri, song_daichi")을
 * songs.json의 곡 ID 목록으로 변환하는 함수
 */
function resolvePlayableSongs(rawSongs: string, songs: SongConfig[]): string[] {
  const tokens = rawSongs
    .split(/[,/|·]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const matchedIds: string[] = [];

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    const found = songs.find((song) => {
      const lowerId = song.id.toLowerCase();
      const lowerTitle = song.title.toLowerCase();
      const shortTitle = lowerTitle.split(' (')[0].trim();
      return (
        lowerId === lowerToken ||
        lowerTitle.includes(lowerToken) ||
        lowerToken.includes(shortTitle)
      );
    });

    if (found && !matchedIds.includes(found.id)) {
      matchedIds.push(found.id);
    }
  }

  // 입력이 비어 있거나 일치하는 곡이 없으면 기본 첫 번째 곡을 연결해 합주에 참여 가능하게 유지
  if (matchedIds.length === 0 && songs.length > 0) {
    return [songs[0].id];
  }

  return matchedIds;
}

/**
 * 얼굴코드가 비어 있는 멤버를 위해 닉네임과 종족 기반으로 일관된 기본 얼굴을 만드는 함수
 */
function createDefaultFaceForMember(
  nickname: string,
  species: CharacterSpecies
): CharacterFaceConfig {
  const hash = hashNickname(nickname);
  const eyes = FACE_EYE_OPTIONS[hash % FACE_EYE_OPTIONS.length];
  const mouth = FACE_MOUTH_OPTIONS[Math.floor(hash / 4) % FACE_MOUTH_OPTIONS.length];
  const nose: FaceNoseStyle =
    species === 'rabbit'
      ? 'rabbit'
      : FACE_NOSE_OPTIONS[Math.floor(hash / 16) % FACE_NOSE_OPTIONS.length];

  return {
    eyes,
    eyeScale: 1,
    eyeY: 0,
    eyeSpacing: 0,
    nose,
    noseScale: 1,
    noseY: 0,
    mouth,
    mouthScale: 1,
    mouthY: 0,
    blush: true,
  };
}

/**
 * CharacterFaceConfig 객체를 구글 시트 `얼굴코드` 칸에 바로 붙여넣을 수 있는 한 줄 문자열로 직렬화하는 함수
 * - 추후 Step B [🎨 꾸미기] 화면의 [📋 시트용 얼굴코드 복사] 버튼에서도 재사용됩니다.
 * @param face - 2D 얼굴 커스터마이징 객체
 * @returns "eyes=sparkle;eyeScale=1.08;..." 형식의 문자열
 */
export function serializeFaceCode(face: CharacterFaceConfig): string {
  return [
    `eyes=${face.eyes}`,
    `eyeScale=${face.eyeScale}`,
    `eyeY=${face.eyeY}`,
    `eyeSpacing=${face.eyeSpacing}`,
    `nose=${face.nose}`,
    `noseScale=${face.noseScale}`,
    `noseY=${face.noseY}`,
    `mouth=${face.mouth}`,
    `mouthScale=${face.mouthScale}`,
    `mouthY=${face.mouthY}`,
    `blush=${face.blush}`,
  ].join(';');
}

/**
 * 구글 시트의 `얼굴코드` 셀 문자열을 CharacterFaceConfig로 파싱하는 함수
 * - "eyes=sparkle;eyeScale=1.08;..." 형식과 JSON("{...}") 형식을 모두 지원합니다.
 * - 셀이 비어 있으면 닉네임 기반 기본 얼굴을 자동 생성합니다.
 */
export function parseFaceCode(
  rawCode: string,
  nickname: string,
  species: CharacterSpecies
): CharacterFaceConfig {
  const base = createDefaultFaceForMember(nickname, species);
  const trimmed = rawCode.trim();
  if (!trimmed) return base;

  const rawMap: Record<string, unknown> = {};

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      Object.assign(rawMap, parsed);
    } catch {
      return base;
    }
  } else {
    for (const pair of trimmed.split(/[;&]+/)) {
      const [rawKey, rawVal] = pair.split('=');
      if (!rawKey || rawVal === undefined) continue;
      rawMap[rawKey.trim()] = rawVal.trim();
    }
  }

  const readNumber = (key: string, fallback: number, min: number, max: number): number => {
    const rawVal = rawMap[key];
    if (rawVal === undefined || rawVal === '') return fallback;
    const num = Number(rawVal);
    return Number.isFinite(num) ? clamp(num, min, max) : fallback;
  };

  const eyes = FACE_EYE_OPTIONS.includes(rawMap.eyes as FaceEyeStyle)
    ? (rawMap.eyes as FaceEyeStyle)
    : base.eyes;
  const nose = FACE_NOSE_OPTIONS.includes(rawMap.nose as FaceNoseStyle)
    ? (rawMap.nose as FaceNoseStyle)
    : base.nose;
  const mouth = FACE_MOUTH_OPTIONS.includes(rawMap.mouth as FaceMouthStyle)
    ? (rawMap.mouth as FaceMouthStyle)
    : base.mouth;

  let blush = base.blush;
  if (typeof rawMap.blush === 'boolean') {
    blush = rawMap.blush;
  } else if (typeof rawMap.blush === 'string') {
    blush = rawMap.blush.toLowerCase() !== 'false' && rawMap.blush !== '0';
  }

  return {
    eyes,
    eyeScale: readNumber('eyeScale', base.eyeScale, 0.75, 1.3),
    eyeY: readNumber('eyeY', base.eyeY, -12, 12),
    eyeSpacing: readNumber('eyeSpacing', base.eyeSpacing, -8, 8),
    nose,
    noseScale: readNumber('noseScale', base.noseScale, 0.75, 1.3),
    noseY: readNumber('noseY', base.noseY, -10, 10),
    mouth,
    mouthScale: readNumber('mouthScale', base.mouthScale, 0.75, 1.3),
    mouthY: readNumber('mouthY', base.mouthY, -10, 10),
    blush,
  };
}

/**
 * 구글 시트 `멤버` 탭의 CSV 문자열을 MemberConfig 배열로 변환하는 함수
 * - 한국어 헤더(닉네임, 소속단체, 담당역할 등)와 영문 헤더를 모두 자동 인식합니다.
 * @param csvText - 구글 시트 CSV 원본 텍스트
 * @param songs - 곡 제목/ID 매칭용 전체 곡 목록
 * @returns 파싱된 서클 멤버 목록
 */
export function parseMembersCsv(
  csvText: string,
  songs: SongConfig[]
): MemberConfig[] {
  const rows = parseCsvRows(csvText).filter((row) =>
    row.some((cell) => cell.length > 0)
  );
  if (rows.length < 2) return [];

  const headerRow = rows[0].map((cell) =>
    cell.toLowerCase().replace(/\s+/g, '')
  );

  const findCol = (candidates: string[], fallbackIdx: number): number => {
    const found = headerRow.findIndex((header) => candidates.includes(header));
    return found >= 0 ? found : fallbackIdx;
  };

  const nicknameCol = findCol(['닉네임', 'nickname', '이름', '별명'], 0);
  const groupCol = findCol(['소속단체', '단체', 'group', 'groupid'], 1);
  const roleCol = findCol(['담당역할', '담당', '역할', 'role'], 2);
  const expCol = findCol(['타이코력', '경력', 'experience'], 3);
  const statusCol = findCol(['소속/학년', '학년', '소속', '현재정보', 'status'], 4);
  const personalityCol = findCol(['성격', 'personality'], 5);
  const traitsCol = findCol(['특징', 'traits'], 6);
  const favTaikoCol = findCol(['좋아하는타이코', '최애타이코', 'favoritetaiko'], 7);
  const oneLinerCol = findCol(['한마디', '인사말', 'oneliner'], 8);
  const songsCol = findCol(['연주가능곡', '가능곡', 'playablesongs', 'songs'], 9);
  const hairCol = findCol(['헤어', '머리', '머리스타일', 'hair'], 10);
  const instrumentCol = findCol(['장비악기', '장비타이코', '악기', 'instrument', 'equippedinstrument'], 11);
  const faceCol = findCol(['얼굴코드', '얼굴', 'face', 'facecode'], 12);
  const illustrationCol = findCol(['일러스트경로', '일러스트', 'illustration'], 13);

  const defaultRoutes = ['park_grass_a', 'park_grass_b', 'park_grass_c', 'park_grass_d'];
  const parsedMembers: MemberConfig[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const nickname = (row[nicknameCol] ?? '').trim();
    // 닉네임이 비어 있는 빈 행은 안전하게 건너뜀
    if (!nickname) continue;

    const groupId = resolveGroupId(row[groupCol] ?? '');
    const group = getTaikoGroupById(groupId);
    const equippedInstrument = resolveEquippedInstrument(row[instrumentCol] ?? '');
    const hair = resolveHairStyle(row[hairCol] ?? '');
    const face = parseFaceCode(row[faceCol] ?? '', nickname, group.species);
    const playableSongs = resolvePlayableSongs(row[songsCol] ?? '', songs);

    const role = (row[roleCol] ?? '').trim() || '타이코 멤버';
    const experience = (row[expCol] ?? '').trim() || '타이코력 1년';
    const status = (row[statusCol] ?? '').trim() || group.affiliation;
    const personality = (row[personalityCol] ?? '').trim() || '즐겁게 타이코를 치는 멤버';
    const traits = (row[traitsCol] ?? '').trim() || '북소리가 들리면 달려옴';
    const favoriteTaiko = (row[favTaikoCol] ?? '').trim() || role;
    const oneLiner = (row[oneLinerCol] ?? '').trim() || '같이 신나게 두드려 봐요!';
    const illustration =
      (row[illustrationCol] ?? '').trim() ||
      `/images/characters/m${String(rowIndex).padStart(2, '0')}.webp`;

    parsedMembers.push({
      id: `sheet-m${rowIndex}`,
      nickname,
      role,
      illustration,
      appearance: {
        groupId,
        hair,
        equippedInstrument,
        face,
      },
      route: defaultRoutes[(rowIndex - 1) % defaultRoutes.length],
      playableSongs,
      profile: {
        experience,
        status,
        personality,
        traits,
        favoriteTaiko,
        oneLiner,
      },
    });
  }

  return parsedMembers;
}

/**
 * 구글 스프레드시트 공개 CSV 주소에서 최신 서클 멤버 목록을 불러오는 비동기 함수
 * - 주소가 비어 있거나 네트워크 오류/HTML 응답 시 기본 src/data/members.json으로 안전하게 폴백합니다.
 * @param csvUrl - 환경변수(VITE_MEMBERS_CSV_URL)에 설정된 구글 시트 멤버 탭 CSV URL
 * @param fallbackMembers - 연결 실패 시 대신 사용할 기본 멤버 목록
 * @param songs - 연주 가능 곡 매칭용 전체 곡 목록
 * @returns { members, source } 멤버 목록과 데이터 출처('local' | 'sheet')
 */
export async function loadMembersFromSheet(
  csvUrl: string | undefined,
  fallbackMembers: MemberConfig[],
  songs: SongConfig[]
): Promise<{ members: MemberConfig[]; source: MembersSource }> {
  const trimmedUrl = csvUrl?.trim();
  if (!trimmedUrl) {
    return { members: fallbackMembers, source: 'local' };
  }

  if (!trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('http://')) {
    return { members: fallbackMembers, source: 'local' };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(trimmedUrl, {
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    if (
      csvText.trimStart().startsWith('<!DOCTYPE') ||
      csvText.trimStart().startsWith('<html')
    ) {
      throw new Error(
        'CSV 대신 HTML 페이지가 반환되었습니다. 웹에 게시 설정이 전체 문서(또는 멤버 탭)로 되어 있는지 확인해 주세요.'
      );
    }

    const sheetMembers = parseMembersCsv(csvText, songs);
    if (sheetMembers.length === 0) {
      return { members: fallbackMembers, source: 'local' };
    }

    return { members: sheetMembers, source: 'sheet' };
  } catch (error) {
    console.warn(
      '[Members] 구글 시트 멤버 목록을 불러오지 못해 기본 members.json을 표시합니다:',
      error
    );
    return { members: fallbackMembers, source: 'local' };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
