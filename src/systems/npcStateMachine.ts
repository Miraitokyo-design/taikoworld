import type { SpaceConfig, Vec3 } from '../types/world';
import type { TaikoHitType } from './audioManager';
import { getDistance2D, resolvePlayerPosition } from './collision';
import { lerpAngle } from './inputController';

/**
 * NPC 상태머신의 상태 목록
 * - 현재는 idle(대기) -> walk(걷기) -> play(연주 연습) 순환 구조이며,
 *   추후 'talk'(대화) 같은 새 상태를 쉽게 추가할 수 있습니다.
 */
export type NpcState = 'idle' | 'walk' | 'play';

/** 타이코 연주/활동 중 NPC 머리 위로 떠오르는 추임새(掛け声) 문구 목록 */
export const TAIKO_KAKEGOE_PHRASES = ['それ！', 'はっ', 'ちょいさ〜！'] as const;

/**
 * NPC 한 명의 실시간 런타임 상태 객체
 */
export interface NpcRuntime {
  state: NpcState;
  position: Vec3;
  rotationY: number;
  /** 현재 목표 경로 지점(웨이포인트) 인덱스 */
  waypointIndex: number;
  /** idle 또는 play 상태를 유지할 남은 시간 (초) */
  stateTimer: number;
  /** play 상태에서 리듬 박자를 맞추기 위한 누적 타이머 (초) */
  beatTimer: number;
  /** play 상태에서 돈/카 번갈아 치기 위한 카운터 */
  beatCount: number;
  /** 다음 추임새(掛け声)가 떠오를 때까지 남은 시간 (초) */
  kakegoeTimer: number;
}

/** 한 프레임 업데이트 후 외부(오디오·화면 연출)에 알릴 이벤트 결과 */
export interface NpcStepResult {
  /** 이번 프레임에 NPC가 연주 박자를 쳤다면 'don' 또는 'ka', 아니면 null */
  hitBeat: TaikoHitType | null;
  /** 이번 프레임에 NPC가 추임새를 외쳤다면 해당 문구, 아니면 null */
  kakegoe: string | null;
}

/** NPC 걷기 속도 (플레이어보다 여유로운 산책 속도, m/s) */
const NPC_WALK_SPEED = 1.65;
/** NPC 2D 충돌 반지름 (m) */
const NPC_RADIUS = 0.36;
/** 경로 지점 도착 판정 거리 (m) */
const WAYPOINT_THRESHOLD = 0.22;
/** play 상태에서 한 박자 간격 (초) */
const PLAY_BEAT_INTERVAL = 0.72;

/**
 * 최소~최대 범위의 난수(초)를 반환하는 보조 함수
 */
function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 타이코 추임새 목록에서 무작위로 하나를 뽑는 보조 함수
 */
function pickRandomKakegoe(): string {
  const index = Math.floor(Math.random() * TAIKO_KAKEGOE_PHRASES.length);
  return TAIKO_KAKEGOE_PHRASES[index];
}

/**
 * NPC 초기 런타임 상태를 생성하는 함수
 * - 멤버 번호(memberIndex)에 따라 시작 상태와 추임새 타이머를 다르게 분산시켜,
 *   입장하자마자 공원이 자연스럽게 살아 움직이는 느낌을 줍니다.
 * @param route - spaces.json에서 읽어온 NPC 이동 경로 좌표 배열
 * @param memberIndex - 멤버 순번 (0, 1, 2, ...)
 * @returns 초기 NpcRuntime 상태 객체
 */
export function createInitialNpcRuntime(
  route: Vec3[],
  memberIndex: number
): NpcRuntime {
  const startPoint: Vec3 = route.length > 0 ? [...route[0]] : [2 + memberIndex, 0, 0];
  const initialStates: NpcState[] = ['play', 'walk', 'idle', 'walk'];
  const initialState = initialStates[memberIndex % initialStates.length];

  return {
    state: initialState,
    position: startPoint,
    rotationY: Math.atan2(-startPoint[0], -1 - startPoint[2]),
    waypointIndex: route.length > 1 ? 1 : 0,
    stateTimer:
      initialState === 'play'
        ? 3.2 + (memberIndex % 3) * 0.8
        : 1.8 + (memberIndex % 3) * 0.7,
    beatTimer: (memberIndex % 4) * 0.18,
    beatCount: 0,
    // 멤버마다 1.5~6초 사이로 엇갈리게 시작해 한꺼번에 겹치지 않도록 분산
    kakegoeTimer: 1.5 + memberIndex * 1.4,
  };
}

/**
 * NPC 상태머신을 1프레임(delta 초) 진행시키는 핵심 함수
 * - idle -> walk -> play(또는 idle) 흐름으로 상태를 전환하며, 행동 중 주기적으로 추임새를 발생시킵니다.
 * @param runtime - 갱신할 NPC 런타임 상태 객체
 * @param route - 이 NPC의 이동 경로 웨이포인트 목록
 * @param space - 2D 충돌 보정에 사용할 공간 설정
 * @param delta - 이전 프레임과의 시간 차 (초)
 * @returns 이번 프레임 타격·추임새 이벤트 정보
 */
export function stepNpcStateMachine(
  runtime: NpcRuntime,
  route: Vec3[],
  space: SpaceConfig,
  delta: number
): NpcStepResult {
  let hitBeat: TaikoHitType | null = null;
  let kakegoe: string | null = null;

  // 행동 중 일정 간격으로 추임새(それ！ / はっ / ちょいさ〜！) 발생
  // - 연주(play) 중에는 조금 더 자주, 걷거나 쉴 때는 가끔 흥겹게 외침
  runtime.kakegoeTimer -= delta;
  if (runtime.kakegoeTimer <= 0) {
    kakegoe = pickRandomKakegoe();
    runtime.kakegoeTimer =
      runtime.state === 'play' ? randomRange(2.8, 4.8) : randomRange(6.5, 11.0);
  }

  // 1) IDLE (잠시 서서 쉬기) -> 시간이 끝나면 다음 지점으로 WALK 시작
  if (runtime.state === 'idle') {
    runtime.stateTimer -= delta;
    if (runtime.stateTimer <= 0) {
      if (route.length > 1) {
        runtime.waypointIndex = (runtime.waypointIndex + 1) % route.length;
        runtime.state = 'walk';
      } else {
        runtime.state = 'play';
        runtime.stateTimer = randomRange(3.5, 5.5);
      }
    }
    return { hitBeat, kakegoe };
  }

  // 2) WALK (경로 지점을 향해 부드럽게 이동) -> 도착하면 PLAY 또는 IDLE 전환
  if (runtime.state === 'walk') {
    if (route.length === 0) {
      runtime.state = 'idle';
      runtime.stateTimer = 2.5;
      return { hitBeat, kakegoe };
    }

    const [curX, , curZ] = runtime.position;
    const [targetX, , targetZ] = route[runtime.waypointIndex % route.length];
    const dist = getDistance2D(curX, curZ, targetX, targetZ);

    if (dist <= WAYPOINT_THRESHOLD) {
      // 도착 시 60% 확률로 타이코 리듬 연습(play), 40% 확률로 잠깐 휴식(idle)
      if (Math.random() < 0.6) {
        runtime.state = 'play';
        runtime.stateTimer = randomRange(3.6, 6.2);
        runtime.beatTimer = 0.25;
        runtime.beatCount = 0;
        // 연주를 시작하면 너무 오래 기다리지 않고 곧 추임새가 나오도록 타이머 조정
        runtime.kakegoeTimer = Math.min(runtime.kakegoeTimer, randomRange(1.0, 2.2));
      } else {
        runtime.state = 'idle';
        runtime.stateTimer = randomRange(2.0, 4.2);
      }
      return { hitBeat, kakegoe };
    }

    // 방향 벡터 계산 후 2D 경계·장애물 충돌 보정을 거쳐 이동
    const dirX = (targetX - curX) / dist;
    const dirZ = (targetZ - curZ) / dist;
    const step = Math.min(NPC_WALK_SPEED * delta, dist);

    const resolved = resolvePlayerPosition(
      curX + dirX * step,
      curZ + dirZ * step,
      space,
      NPC_RADIUS
    );

    runtime.position[0] = resolved.x;
    runtime.position[2] = resolved.z;

    const targetRot = Math.atan2(dirX, dirZ);
    runtime.rotationY = lerpAngle(runtime.rotationY, targetRot, delta * 8);
    return { hitBeat, kakegoe };
  }

  // 3) PLAY (제자리에서 북채를 흔들며 타이코 리듬 연습) -> 끝나면 IDLE 복귀
  if (runtime.state === 'play') {
    // 광장 중앙 북 방향(0, -1)을 향해 자연스럽게 몸을 돌림
    const [curX, , curZ] = runtime.position;
    const faceTaikoRot = Math.atan2(0 - curX, -1 - curZ);
    runtime.rotationY = lerpAngle(runtime.rotationY, faceTaikoRot, delta * 6);

    runtime.stateTimer -= delta;
    runtime.beatTimer += delta;

    // 일정 리듬(돈-돈-카-돈 패턴)에 맞춰 타격 이벤트 발생
    if (runtime.beatTimer >= PLAY_BEAT_INTERVAL) {
      runtime.beatTimer -= PLAY_BEAT_INTERVAL;
      hitBeat = runtime.beatCount % 4 === 2 ? 'ka' : 'don';
      runtime.beatCount += 1;
    }

    if (runtime.stateTimer <= 0) {
      runtime.state = 'idle';
      runtime.stateTimer = randomRange(1.8, 3.6);
    }
  }

  return { hitBeat, kakegoe };
}
