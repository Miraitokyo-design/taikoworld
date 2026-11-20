import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

/** 이동에 사용하는 물리 키 코드 목록 */
const MOVEMENT_KEY_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

/**
 * 키보드(WASD / 방향키) 눌림 상태를 실시간으로 추적하는 커스텀 React Hook
 * - useRef를 사용해 키를 누를 때마다 불필요한 화면 재렌더링이 발생하지 않게 합니다.
 * - 브라우저 창 포커스를 잃을 때(blur) 눌린 키를 초기화해 캐릭터가 계속 달리는 버그를 막습니다.
 * @returns 현재 눌린 키 코드 집합이 담긴 ref 객체
 */
export function useKeyboardInput(): MutableRefObject<Set<string>> {
  // useRef: 값이 바뀌어도 React 컴포넌트를 다시 그리지 않고 값을 유지하는 Hook
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // useEffect: 컴포넌트가 화면에 올라올 때 키보드 이벤트를 등록하고, 사라질 때 정리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!MOVEMENT_KEY_CODES.has(event.code)) return;

      // 방향키로 페이지가 스크롤되는 기본 동작 방지
      if (event.code.startsWith('Arrow')) {
        event.preventDefault();
      }
      pressedKeysRef.current.add(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.code);
    };

    const handleWindowBlur = () => {
      // 다른 창으로 전환했을 때 키가 눌린 채로 남지 않도록 전부 해제
      pressedKeysRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  return pressedKeysRef;
}
