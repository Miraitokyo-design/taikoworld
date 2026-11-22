import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry } from 'three';
import type { Points } from 'three';
import type { ThemeWeatherType } from '../types/content';

interface ThemeWeatherProps {
  /** 현재 활성 시즌 테마의 날씨 파티클 종류 */
  weather: ThemeWeatherType;
}

/** 모바일 60fps 유지를 위한 경량 파티클 개수 (단일 Draw Call로 렌더링) */
const PARTICLE_COUNT = 90;
const SPREAD_RADIUS = 13;
const MAX_HEIGHT = 8.5;

/**
 * 시즌별 가벼운 날씨 파티클(눈, 벚꽃잎, 반딧불이, 여름 햇살)을 그리는 컴포넌트
 * - 메시를 90개 따로 만들지 않고 THREE.Points 1개로 합쳐 모바일에서도 거의 0에 가까운 부하로 동작합니다.
 */
export const ThemeWeather = memo(function ThemeWeather({
  weather,
}: ThemeWeatherProps) {
  const pointsRef = useRef<Points>(null);

  // 각 파티클의 초기 좌표와 개별 낙하/흔들림 속도 시드 생성
  const { geometry, speeds, phases } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const speedArr = new Float32Array(PARTICLE_COUNT);
    const phaseArr = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD_RADIUS * 2;
      positions[i * 3 + 1] = Math.random() * MAX_HEIGHT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD_RADIUS * 2;
      speedArr[i] = 0.6 + Math.random() * 0.9;
      phaseArr[i] = Math.random() * Math.PI * 2;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    return { geometry: geo, speeds: speedArr, phases: phaseArr };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(({ clock }, rawDelta) => {
    if (weather === 'none' || !pointsRef.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const elapsed = clock.getElapsedTime();
    const posAttr = geometry.getAttribute('position') as BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      const spd = speeds[i];
      const ph = phases[i];

      if (weather === 'firefly' || weather === 'sparkle') {
        // 반딧불이·여름 반짝임: 천천히 위로 떠오르며 좌우로 부드럽게 유영
        arr[idx] += Math.sin(elapsed * 0.9 + ph) * delta * 0.35;
        arr[idx + 1] += spd * delta * (weather === 'firefly' ? 0.35 : 0.25);
        arr[idx + 2] += Math.cos(elapsed * 0.8 + ph) * delta * 0.35;

        if (arr[idx + 1] > MAX_HEIGHT) {
          arr[idx + 1] = 0.35;
        }
      } else {
        // 눈(snow) · 벚꽃잎(sakura): 바람에 살랑이며 위에서 아래로 낙하
        const fallRate = weather === 'sakura' ? 0.72 : 1.05;
        const swayAmp = weather === 'sakura' ? 0.75 : 0.35;

        arr[idx] += Math.sin(elapsed * 1.1 + ph) * delta * swayAmp;
        arr[idx + 1] -= spd * delta * fallRate;
        arr[idx + 2] += Math.cos(elapsed * 0.9 + ph) * delta * (swayAmp * 0.6);

        if (arr[idx + 1] < 0.08) {
          arr[idx + 1] = MAX_HEIGHT;
          arr[idx] = (Math.random() - 0.5) * SPREAD_RADIUS * 2;
          arr[idx + 2] = (Math.random() - 0.5) * SPREAD_RADIUS * 2;
        }
      }
    }

    posAttr.needsUpdate = true;
  });

  if (weather === 'none') return null;

  const styleMap: Record<
    Exclude<ThemeWeatherType, 'none'>,
    { color: string; size: number; opacity: number }
  > = {
    snow: { color: '#ffffff', size: 0.16, opacity: 0.9 },
    sakura: { color: '#ffb3c6', size: 0.19, opacity: 0.92 },
    firefly: { color: '#ffe066', size: 0.18, opacity: 0.88 },
    sparkle: { color: '#fff4a3', size: 0.14, opacity: 0.72 },
  };
  const style = styleMap[weather];

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color={style.color}
        size={style.size}
        transparent
        opacity={style.opacity}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
});
