import type { MemberConfig, SongConfig } from '../types/content';
import type { SpaceConfig, Vec3 } from '../types/world';
import { getDistance2D, resolvePlayerPosition } from './collision';
import { lerpAngle } from './inputController';
import { getSongStepNotes, getStepDurationSeconds } from '../utils/songScoreUtils';
import type { ActiveLayerNote } from '../utils/songScoreUtils';

/**
 * NPC 상태머신의 상태 목록
 * - 평소에는 공원 안을 자유롭게 랜덤 산책(walk) <-> 잠시 휴식(idle)만 반복합니다.
 * - 연주 가능한 곡이 겹치는 3명 이상이 바로 옆까지 가까이 모이면 함께 같은 방향을 보며 합주(play)합니다.
 */
export type NpcState = 'idle' | 'walk' | 'play';

/** 타이코 합주·활동 중 NPC 머리 위로 떠오르는 추임새(掛け声) 문구 목록 */
export const TAIKO_KAKEGOE_PHRASES = ['それ！', 'はっ', 'ちょいさ〜！'] as const;

/**
 * NPC 한 명의 실시간 런타임 상태 객체
 * - 향후 15~20명 이상으로 늘어나도 각 NPC가 독립 랜덤 목표 지점으로 자연스럽게 배회합니다.
 */
export interface NpcRuntime {
  memberId: string;
  playableSongs: string[];
  state: NpcState;
  position: Vec3;
  rotationY: number;
  /** 현재 랜덤으로 정해진 산책 목적지 [x, z] */
  targetPoint: [number, number];
  /** idle 상태 유지 남은 시간 (초) */
  stateTimer: number;
  /** 합주를 막 끝낸 직후 바로 같은 자리에서 다시 시작되지 않고 흩어지게 하는 개인 유예 시간 (초) */
  postPlayGrace: number;
  /** 산책/대기 중 가끔 외치는 개인 추임새 타이머 (초) */
  kakegoeTimer: number;
  /** 플레이어가 가까이 다가왔을 때 살짝 고개를 돌리는 Y축 각도 (라디안, 약 ±39° 이내) */
  headLookYaw: number;
  /** 플레이어 근접 시 걸음을 늦추는 속도 배율 (0.38 ~ 1.0) */
  walkSpeedScale: number;
}

/**
 * 3명 이상이 바로 옆에 모여 공통 곡을 연주하는 합주(Ensemble) 런타임 객체
 * - 정해진 주기 없이, 오직 "아주 가까이 모임 + 공통 연주 가능 곡 존재" 조건이 맞을 때만 자연 발생합니다.
 */
export interface EnsembleRuntime {
  isActive: boolean;
  /** 현재 합주 중인 곡 정보 (songs.json) */
  activeSong: SongConfig | null;
  /** 합주 참여 NPC 인덱스 목록 */
  participantIndices: number[];
  /** 참여자 전원이 동시에 바라보는 통일된 방향 각도 (라디안) */
  facingRotationY: number;
  /** 현재 악보 스텝 누적 타이머 (초) */
  stepTimer: number;
  /** 현재 재생 중인 악보(score) 인덱스 */
  stepIndex: number;
  /** 합주 중 추임새 순환 타이머 (초) */
  kakegoeTimer: number;
  kakegoeSpeakerCursor: number;
  /** 15~20명일 때도 성능 부담 없도록 근접 검사를 0.25초마다 수행하는 간격 타이머 */
  clusterCheckTimer: number;
}

/** 한 프레임 업데이트 후 외부(오디오·화면 연출)에 알릴 이벤트 결과 */
export interface NpcGroupStepResult {
  /** 이번 프레임에 합주 멀티 레이어 악보에서 재생해야 할 악기별 음표 목록과 곡 정보 */
  ensembleStep: {
    song: SongConfig;
    notes: ActiveLayerNote[];
    stepIndex: number;
  } | null;
  /** 이번 프레임에 추임새를 외친 NPC 목록 */
  kakegoeEvents: Array<{ memberId: string; text: string }>;
}

/** NPC 걷기 속도 (기존 1.65 m/s의 0.8배인 여유로운 산책 속도, m/s) */
const NPC_WALK_SPEED = 1.32;
/** NPC가 플레이어 접근을 눈치채고 고개를 돌리며 걸음을 늦추기 시작하는 거리 (m) */
const PLAYER_NOTICE_RADIUS = 3.2;
/** 플레이어 바로 근처에서의 최소 걸음 속도 배율 (평소의 38% 속도로 천천히 걸음) */
const MIN_NEAR_PLAYER_SPEED_SCALE = 0.38;
/** 고개를 자연스럽게 돌릴 수 있는 최대 좌우 각도 (라디안, 약 39도) */
const MAX_HEAD_LOOK_YAW = 0.68;
/** NPC 2D 충돌 반지름 (m) */
const NPC_RADIUS = 0.36;
/** 랜덤 목적지 도착 판정 거리 (m) */
const ARRIVAL_THRESHOLD = 0.28;

/** 합주가 시작되는 기본 최소 인원 수 */
const DEFAULT_MIN_ENSEMBLE_MEMBERS = 3;
/** 아주 가까이(바로 옆 정도) 모였다고 판정하는 거리 반경 (m) */
const ENSEMBLE_GATHER_RADIUS = 1.9;
/** 15~20명 배회 시 서로 유령처럼 완전히 포개지지 않게 유지하는 최소 어깨 간격 (m) */
const MIN_NPC_SPACING = 0.78;
/** 근접 클러스터 검사 주기 (초) — 20명 규모에서도 가볍게 유지 */
const CLUSTER_CHECK_INTERVAL = 0.25;

/**
 * 최소~최대 범위의 난수를 반환하는 보조 함수
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
 * 공간의 이동 가능 영역(원형 또는 사각형) 안에서 장애물을 피한 랜덤 좌표를 뽑는 함수
 * - NPC가 15~20명으로 늘어나도 별도 경로를 수동 작성하지 않고 광장 곳곳을 자연스럽게 배회합니다.
 * @param space - 현재 공간 설정
 * @returns 충돌 보정이 완료된 랜덤 [x, z] 좌표
 */
export function pickRandomWalkablePoint(space: SpaceConfig): [number, number] {
  const { walkableBounds } = space;
  let rawX = 0;
  let rawZ = 0;

  if (walkableBounds.shape === 'circle') {
    // 원 내부에 고르게 분포하도록 제곱근(Math.sqrt)을 사용해 반지름 추출
    const angle = Math.random() * Math.PI * 2;
    const maxR = Math.max(1, walkableBounds.radius - 1.1);
    const radius = Math.sqrt(Math.random()) * maxR;
    rawX = walkableBounds.centerX + Math.cos(angle) * radius;
    rawZ = walkableBounds.centerZ + Math.sin(angle) * radius;
  } else {
    rawX = randomRange(walkableBounds.minX + 0.9, walkableBounds.maxX - 0.9);
    rawZ = randomRange(walkableBounds.minZ + 0.9, walkableBounds.maxZ - 0.9);
  }

  const safe = resolvePlayerPosition(rawX, rawZ, space, NPC_RADIUS);
  return [safe.x, safe.z];
}

/**
 * 전체 NPC 그룹의 초기 런타임 상태와 합주 상태를 생성하는 함수
 * @param members - members.json 전체 멤버 목록 (4명 ~ 20명 이상 확장 대응)
 * @param space - 현재 공간 설정
 * @returns { npcs, ensemble } 초기 상태 객체
 */
export function createNpcGroupState(
  members: MemberConfig[],
  space: SpaceConfig
): { npcs: NpcRuntime[]; ensemble: EnsembleRuntime } {
  const npcs: NpcRuntime[] = members.map((member, index) => {
    // 처음 4명은 기본 스폰 좌표를 활용하고, 5번째 이상(6~20명)은 광장 내 랜덤 위치로 고르게 자동 배치
    const route = index < 4 ? space.routes[member.route] : undefined;
    const startXZ: [number, number] =
      route && route.length > 0
        ? [route[0][0], route[0][2]]
        : pickRandomWalkablePoint(space);

    const startSafe = resolvePlayerPosition(startXZ[0], startXZ[1], space, NPC_RADIUS);
    const firstTarget = pickRandomWalkablePoint(space);

    return {
      memberId: member.id,
      playableSongs: member.playableSongs ?? [],
      state: index % 3 === 0 ? 'idle' : 'walk',
      position: [startSafe.x, 0, startSafe.z],
      rotationY: Math.random() * Math.PI * 2,
      targetPoint: firstTarget,
      stateTimer: randomRange(1.0, 2.8),
      postPlayGrace: 0,
      kakegoeTimer: randomRange(4.0, 10.0) + index * 1.1,
      headLookYaw: 0,
      walkSpeedScale: 1,
    };
  });

  const ensemble: EnsembleRuntime = {
    isActive: false,
    activeSong: null,
    participantIndices: [],
    facingRotationY: 0,
    stepTimer: 0,
    stepIndex: 0,
    kakegoeTimer: 1.2,
    kakegoeSpeakerCursor: 0,
    clusterCheckTimer: 0.5,
  };

  return { npcs, ensemble };
}

/**
 * 바로 옆(ENSEMBLE_GATHER_RADIUS 이내)에 모인 NPC들 중
 * 공통으로 연주할 수 있는 곡(playableSongs 교집합)을 가진 3명 이상의 그룹을 찾는 함수
 * - 주기적 강제 실행 없이, 실제로 우연히 가까이 모였을 때만 자연스럽게 합주를 시작합니다.
 */
function findMatchingSongEnsemble(
  npcs: NpcRuntime[],
  songs: SongConfig[]
): { participants: number[]; song: SongConfig } | null {
  if (songs.length === 0 || npcs.length < DEFAULT_MIN_ENSEMBLE_MEMBERS) {
    return null;
  }

  // 합주 참여 가능 후보: 현재 연주 중이 아니고, 방금 합주를 끝낸 직후(postPlayGrace)가 아닌 NPC
  const availableIndices: number[] = [];
  for (let i = 0; i < npcs.length; i++) {
    if (npcs[i].state !== 'play' && npcs[i].postPlayGrace <= 0) {
      availableIndices.push(i);
    }
  }

  if (availableIndices.length < DEFAULT_MIN_ENSEMBLE_MEMBERS) {
    return null;
  }

  // 각 후보 NPC를 중심으로 바로 옆(1.9m 이내)에 모인 이웃 그룹을 검사
  for (const seedIdx of availableIndices) {
    const [sx, , sz] = npcs[seedIdx].position;
    const nearbyIndices = availableIndices.filter((otherIdx) => {
      const [ox, , oz] = npcs[otherIdx].position;
      return getDistance2D(sx, sz, ox, oz) <= ENSEMBLE_GATHER_RADIUS;
    });

    if (nearbyIndices.length < DEFAULT_MIN_ENSEMBLE_MEMBERS) continue;

    // 가까이 모인 NPC들이 공통으로 칠 수 있는 곡 후보 수집
    const matchedCandidates: Array<{ song: SongConfig; participants: number[] }> = [];
    for (const song of songs) {
      const minRequired = Math.max(DEFAULT_MIN_ENSEMBLE_MEMBERS, song.minPlayers);
      const songPlayers = nearbyIndices.filter((idx) =>
        npcs[idx].playableSongs.includes(song.id)
      );
      if (songPlayers.length >= minRequired) {
        matchedCandidates.push({ song, participants: songPlayers });
      }
    }

    if (matchedCandidates.length > 0) {
      // 공통 곡이 여러 개라면 무작위로 1곡 선택해 매번 다양한 곡을 연주
      const picked =
        matchedCandidates[Math.floor(Math.random() * matchedCandidates.length)];
      return picked;
    }
  }

  return null;
}

/** 각도 차이를 -PI ~ +PI 범위로 정규화하는 보조 함수 */
function normalizeAngleDiff(angle: number): number {
  let diff = angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * 전체 NPC 그룹 상태머신 + 근접 공통곡 합주(Ensemble) 시스템을 1프레임 진행시키는 핵심 함수
 * - 정해진 주기 없이 각 NPC가 자유롭게 랜덤 산책하다가,
 *   공통으로 연주할 수 있는 곡을 가진 3명 이상이 바로 옆에 모이면 같은 방향을 보며 악보대로 합주합니다.
 * - 플레이어가 가까이 다가오면 살짝 고개를 돌려 쳐다보면서 걸음이 자연스럽게 느려집니다.
 */
export function stepNpcGroup(
  npcs: NpcRuntime[],
  ensemble: EnsembleRuntime,
  songs: SongConfig[],
  space: SpaceConfig,
  delta: number,
  playerPos?: [number, number]
): NpcGroupStepResult {
  let ensembleStep: NpcGroupStepResult['ensembleStep'] = null;
  const kakegoeEvents: Array<{ memberId: string; text: string }> = [];

  // 1) 합주 진행 중 처리: 선택된 곡의 악보(score)를 BPM에 맞춰 순서대로 연주
  if (ensemble.isActive && ensemble.activeSong) {
    const song = ensemble.activeSong;
    const stepDuration = getStepDurationSeconds(song.bpm);

    ensemble.stepTimer += delta;
    ensemble.kakegoeTimer -= delta;

    // 다음 악보 칸 재생 시점 도달
    if (ensemble.stepTimer >= stepDuration) {
      ensemble.stepTimer -= stepDuration;

      if (ensemble.stepIndex < song.totalSteps) {
        const notes = getSongStepNotes(song, ensemble.stepIndex);
        if (notes.length > 0) {
          ensembleStep = {
            song,
            notes,
            stepIndex: ensemble.stepIndex,
          };
        }
        ensemble.stepIndex += 1;
      } else {
        // 곡 끝까지 연주 완료 -> 참여자들이 다시 새로운 랜덤 지점으로 자연스럽게 흩어짐
        for (const idx of ensemble.participantIndices) {
          const npc = npcs[idx];
          npc.state = 'walk';
          npc.targetPoint = pickRandomWalkablePoint(space);
          // 흩어질 시간을 확보하기 위한 개인 유예 시간 (전체 합주 주기를 강제하지 않음)
          npc.postPlayGrace = randomRange(4.5, 7.0);
        }
        ensemble.isActive = false;
        ensemble.activeSong = null;
        ensemble.participantIndices = [];
      }
    }

    // 합주 중 참여자들이 돌아가며 추임새(それ！ / はっ / ちょいさ〜！) 외치기
    if (
      ensemble.isActive &&
      ensemble.kakegoeTimer <= 0 &&
      ensemble.participantIndices.length > 0
    ) {
      const speakerIdx =
        ensemble.participantIndices[
          ensemble.kakegoeSpeakerCursor % ensemble.participantIndices.length
        ];
      ensemble.kakegoeSpeakerCursor += 1;
      kakegoeEvents.push({
        memberId: npcs[speakerIdx].memberId,
        text: pickRandomKakegoe(),
      });
      ensemble.kakegoeTimer = randomRange(1.9, 3.2);
    }
  } else {
    // 2) 합주 미진행 시: 0.25초 간격으로 "바로 옆에 3명 이상 + 공통 곡 일치" 여부만 자연 검사
    ensemble.clusterCheckTimer -= delta;
    if (ensemble.clusterCheckTimer <= 0) {
      ensemble.clusterCheckTimer = CLUSTER_CHECK_INTERVAL;
      const match = findMatchingSongEnsemble(npcs, songs);

      if (match) {
        const { participants, song } = match;
        // 참여자 전원이 통일해서 바라볼 단일 정면 방향 결정 (관객 쪽/앞쪽 또는 중앙 쪽 한 방향)
        let sumX = 0;
        let sumZ = 0;
        for (const idx of participants) {
          sumX += npcs[idx].position[0];
          sumZ += npcs[idx].position[2];
          npcs[idx].state = 'play';
        }
        const centerX = sumX / participants.length;
        const centerZ = sumZ / participants.length;

        // 모인 위치에서 광장 중앙(또는 정면 +Z)을 향하는 하나의 공통 방향 각도로 통일
        const distFromCenter = Math.hypot(centerX, centerZ);
        const unifiedFacing =
          distFromCenter > 1.2 ? Math.atan2(-centerX, -centerZ) : 0;

        ensemble.isActive = true;
        ensemble.activeSong = song;
        ensemble.participantIndices = participants;
        ensemble.facingRotationY = unifiedFacing;
        ensemble.stepTimer = getStepDurationSeconds(song.bpm) * 0.7;
        ensemble.stepIndex = 0;
        ensemble.kakegoeTimer = 0.85;
        ensemble.kakegoeSpeakerCursor = 0;
      }
    }
  }

  // 3) 개별 NPC 상태 업데이트 (랜덤 산책 / 휴식 / 합주 정렬)
  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];

    if (npc.postPlayGrace > 0) {
      npc.postPlayGrace = Math.max(0, npc.postPlayGrace - delta);
    }

    if (npc.state === 'play') {
      // 합주 참여자는 모두 똑같은 방향(ensemble.facingRotationY)을 바라보며 나란히 연주
      npc.rotationY = lerpAngle(npc.rotationY, ensemble.facingRotationY, delta * 7);
      npc.headLookYaw += (0 - npc.headLookYaw) * Math.min(delta * 6, 1);
      npc.walkSpeedScale = 1;
      continue;
    }

    // 플레이어가 가까이 다가오면 살짝 고개를 돌려 바라보고 걸음을 천천히 늦춤
    let targetHeadYaw = 0;
    let targetSpeedScale = 1;

    if (playerPos) {
      const [px, pz] = playerPos;
      const distToPlayer = getDistance2D(npc.position[0], npc.position[2], px, pz);

      if (distToPlayer < PLAYER_NOTICE_RADIUS) {
        // 가까울수록 걸음을 부드럽게 늦춤 (3.2m -> 1.0배, 1.1m 이하 -> 0.38배)
        const proximityRatio = Math.max(
          0,
          Math.min(1, (distToPlayer - 1.1) / (PLAYER_NOTICE_RADIUS - 1.1))
        );
        targetSpeedScale =
          MIN_NEAR_PLAYER_SPEED_SCALE +
          (1 - MIN_NEAR_PLAYER_SPEED_SCALE) * proximityRatio;

        // NPC 정면 기준 플레이어 방향 상대 각도를 계산해 고개만 자연스럽게 살짝 돌림
        const angleToPlayer = Math.atan2(
          px - npc.position[0],
          pz - npc.position[2]
        );
        const relAngle = normalizeAngleDiff(angleToPlayer - npc.rotationY);

        if (Math.abs(relAngle) <= Math.PI * 0.72) {
          targetHeadYaw = Math.max(
            -MAX_HEAD_LOOK_YAW,
            Math.min(MAX_HEAD_LOOK_YAW, relAngle)
          );
        }
      }
    }

    npc.headLookYaw += (targetHeadYaw - npc.headLookYaw) * Math.min(delta * 6.5, 1);
    npc.walkSpeedScale += (targetSpeedScale - npc.walkSpeedScale) * Math.min(delta * 6, 1);

    // 산책/대기 중에도 가끔 한 번씩 흥겹게 추임새 표시
    npc.kakegoeTimer -= delta;
    if (npc.kakegoeTimer <= 0) {
      kakegoeEvents.push({
        memberId: npc.memberId,
        text: pickRandomKakegoe(),
      });
      npc.kakegoeTimer = randomRange(9.0, 15.0);
    }

    if (npc.state === 'idle') {
      npc.stateTimer -= delta;
      if (npc.stateTimer <= 0) {
        npc.targetPoint = pickRandomWalkablePoint(space);
        npc.state = 'walk';
      }
      continue;
    }

    // WALK: 랜덤 목적지를 향해 이동 (2D 경계·장애물 충돌 보정 포함)
    const [curX, , curZ] = npc.position;
    const [targetX, targetZ] = npc.targetPoint;
    const dist = getDistance2D(curX, curZ, targetX, targetZ);

    if (dist <= ARRIVAL_THRESHOLD) {
      npc.state = 'idle';
      npc.stateTimer = randomRange(1.5, 3.8);
      continue;
    }

    const dirX = (targetX - curX) / dist;
    const dirZ = (targetZ - curZ) / dist;
    // 플레이어가 가까이 있으면 걸음 속도를 자연스럽게 늦춰 대화를 걸기 편하게 배려
    const step = Math.min(NPC_WALK_SPEED * npc.walkSpeedScale * delta, dist);

    const resolved = resolvePlayerPosition(
      curX + dirX * step,
      curZ + dirZ * step,
      space,
      NPC_RADIUS
    );

    npc.position[0] = resolved.x;
    npc.position[2] = resolved.z;

    const targetRot = Math.atan2(dirX, dirZ);
    npc.rotationY = lerpAngle(npc.rotationY, targetRot, delta * 8);
  }

  // 4) 15~20명 확장 대비: 서로 완전히 포개지지 않도록 아주 부드러운 최소 어깨 간격 유지
  for (let i = 0; i < npcs.length; i++) {
    for (let j = i + 1; j < npcs.length; j++) {
      const a = npcs[i];
      const b = npcs[j];
      const dx = b.position[0] - a.position[0];
      const dz = b.position[2] - a.position[2];
      const dist = Math.hypot(dx, dz);

      if (dist > 0.0001 && dist < MIN_NPC_SPACING) {
        const push = (MIN_NPC_SPACING - dist) * 0.25;
        const nx = dx / dist;
        const nz = dz / dist;

        const nextA = resolvePlayerPosition(
          a.position[0] - nx * push,
          a.position[2] - nz * push,
          space,
          NPC_RADIUS
        );
        const nextB = resolvePlayerPosition(
          b.position[0] + nx * push,
          b.position[2] + nz * push,
          space,
          NPC_RADIUS
        );

        a.position[0] = nextA.x;
        a.position[2] = nextA.z;
        b.position[0] = nextB.x;
        b.position[2] = nextB.z;
      }
    }
  }

  return { ensembleStep, kakegoeEvents };
}
