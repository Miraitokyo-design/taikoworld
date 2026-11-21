import type { Obstacle, SpaceConfig, WalkableBounds } from '../types/world';

/** 게스트 캐릭터의 2D 충돌 반지름 (단위: 미터) */
export const PLAYER_RADIUS = 0.35;

/**
 * 2D 평면(X, Z)에서 두 점 사이의 거리를 계산하는 함수
 * @param ax - 첫 번째 점의 X 좌표
 * @param az - 첫 번째 점의 Z 좌표
 * @param bx - 두 번째 점의 X 좌표
 * @param bz - 두 번째 점의 Z 좌표
 * @returns 두 점 사이의 직선 거리 (m)
 */
export function getDistance2D(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(bx - ax, bz - az);
}

/**
 * 좌표를 이동 가능 경계(원형 또는 사각형) 안쪽으로 제한하는 함수
 * - 캐릭터 반지름만큼 안쪽으로 여유(margin)를 두어 발이 경계 밖으로 나가지 않게 합니다.
 * @param x - 검사할 X 좌표
 * @param z - 검사할 Z 좌표
 * @param bounds - spaces.json의 이동 가능 경계 (원형 또는 사각형)
 * @param radius - 캐릭터 충돌 반지름
 * @returns 경계 안으로 보정된 { x, z } 좌표
 */
export function clampToWalkableBounds(
  x: number,
  z: number,
  bounds: WalkableBounds,
  radius: number = PLAYER_RADIUS
): { x: number; z: number } {
  // 원형 경계: 중심으로부터의 거리가 (광장 반지름 - 캐릭터 반지름)을 넘지 않도록 보정
  if (bounds.shape === 'circle') {
    const dx = x - bounds.centerX;
    const dz = z - bounds.centerZ;
    const distance = Math.hypot(dx, dz);
    const maxRadius = Math.max(0, bounds.radius - radius);

    if (distance > maxRadius && distance > 0) {
      const ratio = maxRadius / distance;
      return {
        x: bounds.centerX + dx * ratio,
        z: bounds.centerZ + dz * ratio,
      };
    }

    return { x, z };
  }

  // 사각형 경계: 최소~최대 범위 안으로 값을 강제로 가둠 (Clamping)
  const clampedX = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, x));
  const clampedZ = Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, z));

  return { x: clampedX, z: clampedZ };
}

/**
 * 원형 장애물(북, 나무 등)과 겹치지 않도록 바깥쪽으로 부드럽게 밀어내는 함수
 * - 무거운 3D 물리 엔진 대신 2D 원과 원의 거리 비교만으로 가볍게 충돌을 처리합니다.
 * @param x - 검사할 X 좌표
 * @param z - 검사할 Z 좌표
 * @param obstacles - spaces.json의 원형 장애물 목록
 * @param radius - 캐릭터 충돌 반지름
 * @returns 장애물 밖으로 보정된 { x, z } 좌표
 */
export function resolveCircleObstacles(
  x: number,
  z: number,
  obstacles: Obstacle[],
  radius: number = PLAYER_RADIUS
): { x: number; z: number } {
  let resolvedX = x;
  let resolvedZ = z;

  for (const obstacle of obstacles) {
    if (obstacle.type !== 'circle') continue;

    // 장애물 중심에서 캐릭터로 향하는 벡터
    const dx = resolvedX - obstacle.x;
    const dz = resolvedZ - obstacle.z;
    const distance = Math.hypot(dx, dz);
    const minDistance = obstacle.radius + radius;

    // 두 원의 중심 거리가 반지름 합보다 작으면 충돌 상태 -> 바깥으로 밀어냄
    if (distance < minDistance) {
      if (distance === 0) {
        // 정확히 중심이 겹친 예외 상황에는 앞쪽(+Z)으로 밀어냄
        resolvedZ = obstacle.z + minDistance;
      } else {
        const pushRatio = minDistance / distance;
        resolvedX = obstacle.x + dx * pushRatio;
        resolvedZ = obstacle.z + dz * pushRatio;
      }
    }
  }

  return { x: resolvedX, z: resolvedZ };
}

/**
 * 이동하려는 다음 좌표를 경계 + 장애물 충돌 규칙에 맞게 최종 보정하는 함수
 * - 장애물과 벽 모서리가 동시에 닿는 경우를 자연스럽게 처리하기 위해 2회 반복 보정합니다.
 * @param nextX - 이동 목표 X 좌표
 * @param nextZ - 이동 목표 Z 좌표
 * @param space - 현재 공간 설정 객체
 * @param radius - 캐릭터 충돌 반지름
 * @returns 충돌 처리가 완료된 최종 { x, z } 좌표
 */
export function resolvePlayerPosition(
  nextX: number,
  nextZ: number,
  space: SpaceConfig,
  radius: number = PLAYER_RADIUS
): { x: number; z: number } {
  let pos = { x: nextX, z: nextZ };

  for (let pass = 0; pass < 2; pass++) {
    pos = resolveCircleObstacles(pos.x, pos.z, space.obstacles, radius);
    pos = clampToWalkableBounds(pos.x, pos.z, space.walkableBounds, radius);
  }

  return pos;
}
