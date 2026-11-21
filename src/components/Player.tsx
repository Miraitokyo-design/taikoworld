import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Group } from 'three';
import type { InstrumentConfig, MoveVector, PlayerState, SpaceConfig } from '../types/world';
import { getDistance2D, resolvePlayerPosition } from '../systems/collision';
import { getKeyboardDirection, lerpAngle } from '../systems/inputController';

interface PlayerProps {
  /** 플레이어의 위치·방향·행동을 하나로 관리하는 단일 상태 ref */
  playerStateRef: MutableRefObject<PlayerState>;
  /** 경계 및 장애물 충돌 계산에 쓰이는 현재 공간 데이터 */
  space: SpaceConfig;
  /** 거리 감지에 사용하는 악기 목록 */
  instruments: InstrumentConfig[];
  /** 현재 연주 중인 악기 (탐색 모드일 때는 null) */
  activeInstrument: InstrumentConfig | null;
  /** 입장 화면 표시 중에는 이동 입력을 잠시 막는 옵션 */
  canMove: boolean;
  /** PC 마우스 바닥 클릭으로 지정된 이동 목적지 [x, z] */
  targetPoint: [number, number] | null;
  /** 목적지 도착 또는 키보드·조이스틱 전환 시 목적지 표시를 지우는 콜백 */
  onClearTarget: () => void;
  /** 상호작용 반경 안에 들어온 악기가 바뀔 때만 호출되는 콜백 */
  onNearbyInstrumentChange: (instrument: InstrumentConfig | null) => void;
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
 * 게스트 캐릭터의 렌더링, 이동(조이스틱 + WASD + 클릭), 2D 충돌, 악기 근접 감지, 카메라 제어를 처리하는 컴포넌트
 * - 연주 모드에 들어가면 이동을 멈추고 3D 카메라가 북 앞쪽으로 부드럽게 클로즈업됩니다.
 * - 원점(Origin)이 바닥(y = 0)에 있어 추후 Blender 캐릭터 GLB로 그대로 교체할 수 있습니다.
 */
export function Player({
  playerStateRef,
  space,
  instruments,
  activeInstrument,
  canMove,
  targetPoint,
  onClearTarget,
  onNearbyInstrumentChange,
  pressedKeysRef,
  joystickVectorRef,
}: PlayerProps) {
  const rootGroupRef = useRef<Group>(null);
  const bodyGroupRef = useRef<Group>(null);

  // 걷기 애니메이션 위상 및 장애물에 걸렸을 때 멈추기 위한 타이머
  const walkPhaseRef = useRef(0);
  const stuckTimeRef = useRef(0);
  // 직전 프레임에 감지된 근처 악기 ID (바뀔 때만 React 상태를 갱신해 성능 절약)
  const lastNearbyIdRef = useRef<string | null>(null);

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
      const [ix, iy, iz] = activeInstrument.position;

      // 카메라가 북 정면 살짝 위쪽에서 북을 확대해 바라보도록 부드럽게 이동
      desiredCameraPosRef.current.set(ix, iy + 2.35, iz + 3.1);
      state.camera.position.lerp(desiredCameraPosRef.current, Math.min(delta * 5, 1));

      desiredLookAtRef.current.set(ix, iy + 0.88, iz);
      cameraLookAtRef.current.lerp(desiredLookAtRef.current, Math.min(delta * 6, 1));
      state.camera.lookAt(cameraLookAtRef.current);

      // 연주 중에는 캐릭터 걷기 흔들림을 멈추고 정자세 유지
      if (bodyGroupRef.current) {
        bodyGroupRef.current.position.y *= 0.8;
        bodyGroupRef.current.rotation.z *= 0.8;
      }
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

    // 5) 계산된 위치·회전을 실제 3D 캐릭터 그룹에 반영
    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(
        player.position[0],
        player.position[1],
        player.position[2]
      );
      rootGroupRef.current.rotation.y = player.rotationY;
    }

    // 6) 임시 캐릭터 걷기 애니메이션 (걸을 때 통통 뛰고 살짝 좌우로 흔들림)
    if (bodyGroupRef.current) {
      if (player.action === 'walk') {
        walkPhaseRef.current += delta * 14;
        bodyGroupRef.current.position.y = Math.abs(Math.sin(walkPhaseRef.current)) * 0.09;
        bodyGroupRef.current.rotation.z = Math.sin(walkPhaseRef.current) * 0.06;
      } else {
        bodyGroupRef.current.position.y *= 0.8;
        bodyGroupRef.current.rotation.z *= 0.8;
      }
    }

    // 7) 근처 악기(interactRadius 이내) 감지 — 상태가 바뀔 때만 상위 콜백 호출
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

    // 8) 쿼터뷰 카메라가 플레이어를 부드럽게 따라가도록 이동
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
      {/* 가벼운 블롭 그림자 (바닥에 고정) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.38, 16]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.35} />
      </mesh>

      {/* 걸을 때 통통 움직이는 캐릭터 본체 그룹 */}
      <group ref={bodyGroupRef}>
        {/* 왼발 / 오른발 */}
        <mesh position={[-0.12, 0.1, 0]}>
          <boxGeometry args={[0.14, 0.2, 0.18]} />
          <meshStandardMaterial color="#3a3a4a" roughness={0.8} />
        </mesh>
        <mesh position={[0.12, 0.1, 0]}>
          <boxGeometry args={[0.14, 0.2, 0.18]} />
          <meshStandardMaterial color="#3a3a4a" roughness={0.8} />
        </mesh>

        {/* 몸통 (하피 느낌의 파란 상의) */}
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.22, 0.28, 0.56, 12]} />
          <meshStandardMaterial color="#3b7dd8" roughness={0.75} />
        </mesh>

        {/* 허리띠(오비) 포인트 */}
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.255, 0.265, 0.1, 12]} />
          <meshStandardMaterial color="#f6c445" roughness={0.7} />
        </mesh>

        {/* 머리 */}
        <mesh position={[0, 0.98, 0]}>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color="#ffe0bd" roughness={0.75} />
        </mesh>

        {/* 머리띠(하치마키) */}
        <mesh position={[0, 1.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.245, 0.035, 8, 20]} />
          <meshStandardMaterial color="#e04f3e" roughness={0.7} />
        </mesh>

        {/* 앞 방향을 쉽게 알아볼 수 있는 두 눈 (+Z 방향이 정면) */}
        <mesh position={[-0.09, 0.98, 0.23]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshBasicMaterial color="#2b2623" />
        </mesh>
        <mesh position={[0.09, 0.98, 0.23]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshBasicMaterial color="#2b2623" />
        </mesh>
      </group>
    </group>
  );
}
