import type { SongConfig, TrackInstrumentId } from '../types/content';

/** 특정 박자(stepIndex)에서 동시에 울려야 하는 악기별 음표 1건 */
export interface ActiveLayerNote {
  instrumentId: TrackInstrumentId;
  note: string;
}

/**
 * 악보의 한 칸이 쉼표인지 판별하는 보조 함수
 * @param token - 악보 칸 문자열
 * @returns 쉼표("-", "·", 빈 문자열)이면 true
 */
export function isRestToken(token: string | undefined): boolean {
  if (!token) return true;
  const trimmed = token.trim();
  return trimmed === '' || trimmed === '-' || trimmed === '·';
}

/**
 * 곡의 BPM(분당 박자 수)으로부터 악보 1칸(8분음표 = 반 박자)의 재생 간격(초)을 계산하는 함수
 * @param bpm - 곡의 템포 (예: 116)
 * @returns 한 칸 간격 (초)
 */
export function getStepDurationSeconds(bpm: number): number {
  const safeBpm = Math.max(40, Math.min(240, bpm));
  return 60 / safeBpm / 2;
}

/**
 * 멀티 레이어 곡의 특정 스텝(stepIndex)에서 동시에 재생해야 하는 모든 악기 음표를 모으는 함수
 * - NPC 합주와 악보 미리듣기(레이어별 음소거 지원)가 모두 이 함수를 공유합니다.
 * @param song - 재생할 SongConfig 객체
 * @param stepIndex - 현재 스텝 인덱스 (0 ~ totalSteps - 1)
 * @param mutedInstrumentIds - (선택) 미리듣기에서 음소거한 레이어 ID 집합
 * @returns 해당 스텝에서 울릴 { instrumentId, note } 배열
 */
export function getSongStepNotes(
  song: SongConfig,
  stepIndex: number,
  mutedInstrumentIds?: ReadonlySet<string>
): ActiveLayerNote[] {
  const activeNotes: ActiveLayerNote[] = [];

  for (const layer of song.layers) {
    if (mutedInstrumentIds?.has(layer.instrumentId)) continue;
    const token = layer.steps[stepIndex];
    if (isRestToken(token)) continue;
    activeNotes.push({
      instrumentId: layer.instrumentId,
      note: token.trim(),
    });
  }

  return activeNotes;
}
