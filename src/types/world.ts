/**
 * 3D 공간 좌표 [x, y, z] 타입
 * - Blender 내보내기 규칙(+Y Up, 1 = 1m)과 동일하게 사용합니다.
 */
export type Vec3 = [number, number, number];

/**
 * 플레이어가 이동할 수 있는 2D 바닥 경계 타입 (사각형 또는 원형 지원)
 * - 무거운 3D 물리 엔진 대신 2D 좌표 범위·반지름으로 가볍게 경계를 제한합니다.
 */
export type WalkableBounds =
  | {
      shape?: 'rect';
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
    }
  | {
      shape: 'circle';
      centerX: number;
      centerZ: number;
      radius: number;
    };

/**
 * 공간 안의 장애물(북, 나무 등) 2D 원형 충돌 영역 타입
 */
export interface Obstacle {
  id: string;
  type: 'circle';
  x: number;
  z: number;
  radius: number;
}

/**
 * 3D 공간에 배치되는 지역 타이코 단체 아지트(큐브) 설정 타입
 * - 사용자가 가까이 다가가면 해당 지역 단체 소개 화면으로 연결됩니다.
 */
export interface GroupHideoutConfig {
  id: string;
  /** taikoGuide.json의 localGroups[].id와 연결되는 단체 ID */
  groupId: string;
  /** 화면 표시 이름 (예: "転太鼓舞", "鶴亀会") */
  name: string;
  /** 추후 Blender 아지트 GLB로 바로 교체할 모델 경로 (예: "/models/props/hideout_tentaikomai.glb") */
  modelPath?: string;
  /** 3D 배치 좌표 [x, y, z] */
  position: Vec3;
  /** 큐브 바탕 색상 (hex) */
  color: string;
  /** 큐브 테두리 색상 (hex) */
  borderColor: string;
  /** 상호작용(! 말풍선)이 활성화되는 접근 반경 (m) */
  interactRadius: number;
}

/**
 * 하나의 3D 공간(예: 잔디 공원) 설정 타입 — src/data/spaces.json과 1:1 대응
 */
export interface SpaceConfig {
  id: string;
  name: string;
  modelPath: string;
  spawnPoint: Vec3;
  walkableBounds: WalkableBounds;
  obstacles: Obstacle[];
  /** 추후 더 많은 지역 단체가 늘어나도 JSON에만 추가하면 되는 아지트 목록 */
  hideouts?: GroupHideoutConfig[];
  routes: Record<string, Vec3[]>;
}

/**
 * 타이코 타격음(돈/카) 오디오 파일 경로 타입
 */
export interface InstrumentSounds {
  don: string;
  ka: string;
}

/**
 * 체험 가능한 악기(타이코) 설정 타입 — src/data/instruments.json과 1:1 대응
 */
export interface InstrumentConfig {
  id: string;
  name: string;
  modelPath: string;
  /** 3D GLB 모델 표시 배율 (기본값 1, 필요 시 중앙 북 크기 보정) */
  scale?: number;
  position: Vec3;
  interactRadius: number;
  sounds: InstrumentSounds;
}

/**
 * 플레이어의 현재 행동 상태
 * - 추후 멀티플레이 동기화나 애니메이션 연결 시 그대로 확장합니다.
 */
export type PlayerAction = 'idle' | 'walk' | 'play';

/**
 * 현재 공원에서 진행 중인 NPC 합주 근처에 플레이어가 다가가 참가할 수 있을 때 전달되는 정보
 */
export interface NearbyEnsembleInfo {
  songId: string;
  songTitle: string;
  participantCount: number;
  /** 합주 NPC들이 통일해 바라보고 있는 방향 각도 (라디안) */
  facingRotationY: number;
  /** 합주 그룹의 대략적 중심 [x, z] */
  center: [number, number];
}

/**
 * 플레이어 상태를 하나로 묶어 관리하는 단일 객체 타입
 */
export interface PlayerState {
  position: Vec3;
  rotationY: number;
  action: PlayerAction;
}

/**
 * 2D 평면(X, Z) 이동 방향 및 세기를 나타내는 벡터 타입
 * - 각 값의 크기(길이)는 0 ~ 1 사이로, 조이스틱 기울기나 키보드 방향을 표현합니다.
 */
export interface MoveVector {
  x: number;
  z: number;
}
