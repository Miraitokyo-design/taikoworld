/**
 * 현재 눌린 키보드 키 목록(KeyboardEvent.code)을 2D 이동 방향 벡터로 변환하는 함수
 * - event.key 대신 물리 키 위치(event.code: KeyW, KeyA 등)를 사용하므로
 *   한글 입력 상태(ㅈㅁㄴㅇ)에서도 WASD 이동이 문제없이 작동합니다.
 * @param pressedKeys - 현재 눌려 있는 키 코드 집합
 * @returns 길이가 1 이하로 정규화된 이동 방향 { x, z }
 */
export function getKeyboardDirection(
  pressedKeys: ReadonlySet<string>
): { x: number; z: number } {
  let x = 0;
  let z = 0;

  // 앞/뒤 이동 (3D 화면에서 위쪽은 -Z, 아래쪽은 +Z)
  if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) z -= 1;
  if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) z += 1;

  // 좌/우 이동
  if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) x -= 1;
  if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) x += 1;

  // 대각선 이동 시 속도가 1.41배 빨라지지 않도록 벡터 길이를 1로 맞춤(정규화)
  const length = Math.hypot(x, z);
  if (length > 0) {
    x /= length;
    z /= length;
  }

  return { x, z };
}

/**
 * 현재 각도에서 목표 각도로 가장 짧은 회전 방향을 찾아 부드럽게 보간하는 함수
 * - 350도 반대편으로 빙글 도는 현상을 막아줍니다.
 * @param current - 현재 Y축 회전 각도 (라디안)
 * @param target - 목표 Y축 회전 각도 (라디안)
 * @param alpha - 회전 부드러움 계수 (0 ~ 1)
 * @returns 보간된 다음 각도 (라디안)
 */
export function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = (target - current) % (Math.PI * 2);

  // 각도 차이를 -PI ~ +PI 범위로 맞춰 항상 짧은 쪽으로 회전
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;

  return current + diff * Math.min(alpha, 1);
}
