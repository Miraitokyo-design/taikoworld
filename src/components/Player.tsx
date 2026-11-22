import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Group } from 'three';
import type { CharacterAppearance } from '../types/content';
import type {
  GroupHideoutConfig,
  InstrumentConfig,
  MoveVector,
  PlayerAction,
  PlayerState,
  SpaceConfig,
} from '../types/world';
import { getDistance2D, resolvePlayerPosition } from '../systems/collision';
import { getKeyboardDirection, lerpAngle } from '../systems/inputController';
import { Character } from './Character';

interface PlayerProps {
  /** 플레이어의 위치·방향·행동을 하나로 관리하는 단일 상태 ref */
  playerStateRef: MutableRefObject<PlayerState>;
  /** 게스트 캐릭터의 5-레이어 외형 설정 (첫 방문 시 랜덤 생성 + localStorage 저장) */
  appearance: CharacterAppearance;
  /** 경계 및 장애물 충돌 계산에 쓰이는 현재 공간 데이터 */
  space: SpaceConfig;
  /** 거리 감지에 사용하는 악기 목록 */
  instruments: InstrumentConfig[];
  /** 현재 연주 중인 악기 (탐색 모드일 때는 null) */
  activeInstrument: InstrumentConfig | null;
  /** 입장 화면이나 모달 표시 중에는 이동 입력을 잠시 막는 옵션 */
  canMove: boolean;
  /** 캐릭터 꾸미기 모드 활성화 여부 (true일 때 캐릭터 정면 클로즈업 카메라 작동) */
  isCustomizing: boolean;
  /** 꾸미기 프리뷰 중 캐릭터 좌/우 회전 각도(라디안) */
  customizeRotationOffset: number;
  /** 꾸미기 프리뷰 중 연주('play') 포즈 테스트 여부 */
  isCustomizePlaying: boolean;
  /** PC 마우스 바닥 클릭으로 지정된 이동 목적지 [x, z] */
  targetPoint: [number, number] | null;
  /** 목적지 도착 또는 키보드·조이스틱 전환 시 목적지 표시를 지우는 콜백 */
  onClearTarget: () => void;
  /** 상호작용 반경 안에 들어온 악기가 바뀔 때만 호출되는 콜백 */
  onNearbyInstrumentChange: (instrument: InstrumentConfig | null) => void;
  /** 상호작용 반경 안에 들어온 지역 단체 아지트가 바뀔 때만 호출되는 콜백 */
  onNearbyHideoutChange: (hideout: GroupHideoutConfig | null) => void;
  /** 현재 눌린 키보드 키 목록 ref */
  pressedKeysRef: MutableRefObject<Set<string>>;
  /** 모바일 플로팅 조이스틱 방향 벡터 ref */
  joystickVectorRef: MutableRefObject<MoveVector>;
}

/** 캐릭터 걷기 속도 (초당 미터) */
const MOVE_SPEED = 3.8;
/** 목적지에 도착했다고 판정할 거리 임계값 (m) */
const ARRIVAL_THRESHOLD = 0.12;
/** 쿼터뷰 카메라가 플레이어로부터 떨어져 있는 상대 위치 [x, y, z] */
const CAMERA_OFFSET = new Vector3(0, 8.2, 9.2);

/**
 * 게스트 캐릭터의 이동(조이스틱 + WASD + 클릭), 2D 충돌, 악기 근접 감지, 카메라 제어를 처리하는 컴포넌트
 * - 외형과 걷기/연주 애니메이션은 NPC와 동일한 5-레이어 모듈식 Character 컴포넌트를 공유합니다.
 */
export function Player({
  playerStateRef,
  appearance,
  space,
  instruments,
  activeInstrument,
  canMove,
  isCustomizing,
  customizeRotationOffset,
  isCustomizePlaying,
  targetPoint,
  onClearTarget,
  onNearbyInstrumentChange,
  onNearbyHideoutChange,
  pressedKeysRef,
  joystickVectorRef,
}: PlayerProps) {
  const rootGroupRef = useRef<Group>(null);
  const actionRef = useRef<PlayerAction>(playerStateRef.current.action);

  // 장애물에 걸렸을 때 멈추기 위한 타이머 & 직전 근처 악기/아지트 ID
  const stuckTimeRef = useRef(0);
  const lastNearbyIdRef = useRef<string | null>(null);
  const lastNearbyHideoutIdRef = useRef<string | null>(null);

  // 카메라가 부드럽게 따라가기 위한 임시 3D 벡터(매 프레임 객체 생성을 피해 메모리 절약)
  const desiredCameraPosRef = useRef(new Vector3());
  const desiredLookAtRef = useRef(new Vector3());
  const cameraLookAtRef = useRef(
    new Vector3(
      playerStateRef.current.position[0],
      0.4,
      playerStateRef.current.position[2] - 0.3
    )
  );

  // useFrame: Three.js가 매 화면 프레임(약 초당 60회)마다 호출하는 루프 Hook
  useFrame((state, rawDelta) => {
    // 탭 전환 직후 큰 시간 간격으로 캐릭터가 순간이동하지 않도록 최대 0.05초로 제한
    const delta = Math.min(rawDelta, 0.05);
    const player = playerStateRef.current;

    // A) 연주 모드일 때: 이동 중지 + 플레이어 상태 'play' + 카메라를 북 앞쪽으로 클로즈업
    if (activeInstrument) {
      player.action = 'play';
      actionRef.current = 'play';
      const [ix, iy, iz] = activeInstrument.position;

      desiredCameraPosRef.current.set(ix, iy + 2.35, iz + 3.1);
      state.camera.position.lerp(desiredCameraPosRef.current, Math.min(delta * 5, 1));

      desiredLookAtRef.current.set(ix, iy + 0.88, iz);
      cameraLookAtRef.current.lerp(desiredLookAtRef.current, Math.min(delta * 6, 1));
      state.camera.lookAt(cameraLookAtRef.current);
      return;
    }

    // A-2) 캐릭터 꾸미기 모드일 때: 캐릭터를 카메라 정면(+Z)으로 부드럽게 돌리고 클로즈업
    // - 모바일(세로 화면)은 하단 시트를 피해 캐릭터를 화면 위쪽에 배치
    // - PC(가로 화면)는 우측 패널을 피해 캐릭터를 화면 왼쪽에 배치
    if (isCustomizing) {
      const previewAction: PlayerAction = isCustomizePlaying ? 'play' : 'idle';
      player.action = previewAction;
      actionRef.current = previewAction;

      const [px, py, pz] = player.position;
      const targetRot = customizeRotationOffset;
      player.rotationY = lerpAngle(player.rotationY, targetRot, delta * 10);

      if (rootGroupRef.current) {
        rootGroupRef.current.position.set(px, py, pz);
        rootGroupRef.current.rotation.y = player.rotationY;
      }

      const isMobilePortrait = state.size.width < 768;
      if (isMobilePortrait) {
        desiredCameraPosRef.current.set(px, py + 1.05, pz + 3.15);
        desiredLookAtRef.current.set(px, py + 0.36, pz);
      } else {
        desiredCameraPosRef.current.set(px + 0.62, py + 1.12, pz + 2.75);
        desiredLookAtRef.current.set(px + 0.62, py + 0.72, pz);
      }

      state.camera.position.lerp(desiredCameraPosRef.current, Math.min(delta * 6, 1));
      cameraLookAtRef.current.lerp(desiredLookAtRef.current, Math.min(delta * 7, 1));
      state.camera.lookAt(cameraLookAtRef.current);
      return;
    }

    const [curX, , curZ] = player.position;
    let moveDirX = 0;
    let moveDirZ = 0;
    let maxStepDistance = MOVE_SPEED * delta;
    let isUsingTapTarget = false;

    if (canMove) {
      // 1) PC 키보드(WASD / 방향키) 입력 확인
      const keyDir = getKeyboardDirection(pressedKeysRef.current);
      const joyVec = joystickVectorRef.current;
      const joyMagnitude = Math.min(1, Math.hypot(joyVec.x, joyVec.z));

      if (keyDir.x !== 0 || keyDir.z !== 0) {
        moveDirX = keyDir.x;
        moveDirZ = keyDir.z;
        stuckTimeRef.current = 0;

        if (targetPoint !== null) {
          onClearTarget();
        }
      } else if (joyMagnitude > 0) {
        // 2) 모바일 플로팅 조이스틱 입력 (기울기 크기에 비례해 천천히~빠르게 이동)
        moveDirX = joyVec.x / joyMagnitude;
        moveDirZ = joyVec.z / joyMagnitude;
        maxStepDistance = MOVE_SPEED * joyMagnitude * delta;
        stuckTimeRef.current = 0;

        if (targetPoint !== null) {
          onClearTarget();
        }
      } else if (targetPoint !== null) {
        // 3) PC 바닥 클릭 목적지까지 이동 방향 계산
        const [targetX, targetZ] = targetPoint;
        const distToTarget = getDistance2D(curX, curZ, targetX, targetZ);

        if (distToTarget <= ARRIVAL_THRESHOLD) {
          stuckTimeRef.current = 0;
          onClearTarget();
        } else {
          moveDirX = (targetX - curX) / distToTarget;
          moveDirZ = (targetZ - curZ) / distToTarget;
          maxStepDistance = Math.min(maxStepDistance, distToTarget);
          isUsingTapTarget = true;
        }
      }
    }

    const isMoving = moveDirX !== 0 || moveDirZ !== 0;

    if (isMoving) {
      // 4) 다음 예상 위치를 계산한 뒤 spaces.json 경계 + 원형 장애물 충돌 보정 적용
      const candidateX = curX + moveDirX * maxStepDistance;
      const candidateZ = curZ + moveDirZ * maxStepDistance;
      const resolved = resolvePlayerPosition(candidateX, candidateZ, space);

      const movedDistance = getDistance2D(curX, curZ, resolved.x, resolved.z);

      // 단일 플레이어 상태 객체 업데이트
      player.position[0] = resolved.x;
      player.position[2] = resolved.z;

      // 이동 방향을 바라보도록 Y축 회전 각도를 부드럽게 보간 (+Z가 캐릭터 정면)
      const targetRotation = Math.atan2(moveDirX, moveDirZ);
      player.rotationY = lerpAngle(player.rotationY, targetRotation, delta * 12);
      player.action = 'walk';

      // 클릭 이동 중 장애물에 정면으로 막혀 제자리에 머물면 자연스럽게 멈춤
      if (isUsingTapTarget) {
        if (movedDistance < 0.003) {
          stuckTimeRef.current += delta;
          if (stuckTimeRef.current > 0.25) {
            stuckTimeRef.current = 0;
            onClearTarget();
          }
        } else {
          stuckTimeRef.current = 0;
        }
      }
    } else {
      player.action = 'idle';
      stuckTimeRef.current = 0;
    }

    // 모듈식 Character 애니메이션에 최신 행동 상태 전달
    actionRef.current = player.action;

    // 5) 계산된 위치·회전을 실제 3D 캐릭터 그룹에 반영
    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(
        player.position[0],
        player.position[1],
        player.position[2]
      );
      rootGroupRef.current.rotation.y = player.rotationY;
    }

    // 6) 근처 악기(interactRadius 이내) 감지 — 상태가 바뀔 때만 상위 콜백 호출
    const [px, , pz] = player.position;
    let foundNearby: InstrumentConfig | null = null;
    for (const inst of instruments) {
      const dist = getDistance2D(px, pz, inst.position[0], inst.position[2]);
      if (dist <= inst.interactRadius) {
        foundNearby = inst;
        break;
      }
    }

    const foundId = foundNearby ? foundNearby.id : null;
    if (foundId !== lastNearbyIdRef.current) {
      lastNearbyIdRef.current = foundId;
      onNearbyInstrumentChange(foundNearby);
    }

    // 6-2) 근처 지역 단체 아지트(interactRadius 이내) 감지 — 바뀔 때만 콜백 호출
    let foundHideout: GroupHideoutConfig | null = null;
    for (const hideout of space.hideouts ?? []) {
      const dist = getDistance2D(px, pz, hideout.position[0], hideout.position[2]);
      if (dist <= hideout.interactRadius) {
        foundHideout = hideout;
        break;
      }
    }

    const foundHideoutId = foundHideout ? foundHideout.id : null;
    if (foundHideoutId !== lastNearbyHideoutIdRef.current) {
      lastNearbyHideoutIdRef.current = foundHideoutId;
      onNearbyHideoutChange(foundHideout);
    }

    // 7) 쿼터뷰 카메라가 플레이어를 부드럽게 따라가도록 이동
    desiredCameraPosRef.current.set(
      px + CAMERA_OFFSET.x,
      CAMERA_OFFSET.y,
      pz + CAMERA_OFFSET.z
    );
    state.camera.position.lerp(desiredCameraPosRef.current, Math.min(delta * 5, 1));

    desiredLookAtRef.current.set(px, 0.4, pz - 0.3);
    cameraLookAtRef.current.lerp(desiredLookAtRef.current, Math.min(delta * 6, 1));
    state.camera.lookAt(cameraLookAtRef.current);
  });

  const [initialX, initialY, initialZ] = playerStateRef.current.position;

  return (
    <group
      ref={rootGroupRef}
      name="guest_player"
      position={[initialX, initialY, initialZ]}
      rotation={[0, playerStateRef.current.rotationY, 0]}
    >
      <Character appearance={appearance} actionRef={actionRef} />
    </group>
  );
}
