import type { NoteDynamic, SongConfig, TrackInstrumentId } from '../types/content';

/** 특정 박자(stepIndex)에서 동시에 울려야 하는 악기별 음표 + 최종 볼륨 배율 */
export interface ActiveLayerNote {
  instrumentId: TrackInstrumentId;
  note: string;
  /** 레이어 볼륨(0~1) * 다이나믹 배율(점점 크게/작게/강하게/약하게)이 적용된 최종 음량 */
  volume: number;
}

/**
 * 악보의 한 칸이 쉼표인지 판별하는 보조 함수
 */
export function isRestToken(token: string | undefined): boolean {
  if (!token) return true;
  const trimmed = token.trim();
  return trimmed === '' || trimmed === '-' || trimmed === '·';
}

/**
 * 곡의 BPM(분당 박자 수)으로부터 악보 1칸(8분음표 = 반 박자)의 재생 간격(초)을 계산하는 함수
 */
export function getStepDurationSeconds(bpm: number): number {
  const safeBpm = Math.max(40, Math.min(240, bpm));
  return 60 / safeBpm / 2;
}

/**
 * 한 레이어의 특정 칸(stepIndex)에 적용할 다이나믹(강약) 볼륨 배율을 계산하는 함수
 * - strong(f): 1.45배
 * - weak(p): 0.45배
 * - cresc(<): 연속된 'cresc' 구간 안에서 0.35배 -> 1.45배로 점진적으로 커짐
 * - decresc(>): 연속된 'decresc' 구간 안에서 1.45배 -> 0.35배로 점진적으로 작아짐
 * @param dynamics - 레이어의 칸별 다이나믹 배열
 * @param stepIndex - 현재 재생 중인 칸 인덱스
 * @returns 최종 볼륨 배율 (약 0.35 ~ 1.45)
 */
export function computeStepDynamicGain(
  dynamics: NoteDynamic[] | undefined,
  stepIndex: number
): number {
  const dyn: NoteDynamic = dynamics?.[stepIndex] ?? 'normal';

  if (dyn === 'strong') return 1.45;
  if (dyn === 'weak') return 0.45;

  if (dyn === 'cresc' || dyn === 'decresc') {
    // 같은 표현(cresc 또는 decresc)이 연속된 시작~끝 범위를 찾아 진행 비율(0 ~ 1)을 계산
    let start = stepIndex;
    while (start > 0 && dynamics?.[start - 1] === dyn) {
      start -= 1;
    }
    let end = stepIndex;
    while (dynamics && end + 1 < dynamics.length && dynamics[end + 1] === dyn) {
      end += 1;
    }

    const span = Math.max(1, end - start);
    const progress = end === start ? 0.5 : (stepIndex - start) / span;

    // cresc: 0.35 -> 1.45 / decresc: 1.45 -> 0.35
    return dyn === 'cresc' ? 0.35 + progress * 1.1 : 1.45 - progress * 1.1;
  }

  return 1.0;
}

/**
 * 멀티 레이어 곡의 특정 스텝(stepIndex)에서 동시에 재생해야 하는 모든 악기 음표와 최종 볼륨을 계산하는 함수
 * - NPC 합주와 악보 미리듣기·작곡 재생이 모두 이 함수를 공유합니다.
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

    // 레이어 기본 볼륨(0~1, 미지정 시 0.85)에 칸별 다이나믹(강하게/약하게/점점 크게/작게)을 곱함
    const layerVolume = layer.volume ?? 0.85;
    if (layerVolume <= 0) continue;

    const dynamicGain = computeStepDynamicGain(layer.dynamics, stepIndex);
    const finalVolume = Math.max(0.05, Math.min(1.6, layerVolume * dynamicGain));

    activeNotes.push({
      instrumentId: layer.instrumentId,
      note: token.trim(),
      volume: finalVolume,
    });
  }

  return activeNotes;
}
