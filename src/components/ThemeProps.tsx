import { memo, useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { SeasonThemeConfig, ThemePropConfig } from '../types/content';
import { GlbModel } from './GlbModel';

interface ThemePropsComponentProps {
  /** 현재 활성 시즌 · 이벤트 테마 */
  theme: SeasonThemeConfig;
}

/**
 * 졸업식·입학식·축제 문구를 2D CanvasTexture(512x256)로 그려 3D 현수막/표지판에 붙이는 Hook
 * - 3D 텍스트 메쉬 대신 2D 캔버스 1장을 써서 한글·이모지를 깔끔하고 가볍게 표현합니다.
 */
function useBannerTexture(
  title: string | undefined,
  subText: string | undefined,
  themeId: string
): CanvasTexture | null {
  const texture = useMemo(() => {
    if (!title) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 시즌별 따뜻한 배너 배경색 및 테두리색 선택
    const paletteMap: Record<
      string,
      { bg: string; border: string; title: string; sub: string }
    > = {
      christmas: {
        bg: '#1c3b2b',
        border: '#f4c95d',
        title: '#fff7d6',
        sub: '#ffd6d6',
      },
      graduation: {
        bg: '#fff7f9',
        border: '#f29eb6',
        title: '#8e2d4c',
        sub: '#6b4c57',
      },
      entrance: {
        bg: '#f5fcf7',
        border: '#6ec288',
        title: '#24663c',
        sub: '#4d6b57',
      },
      obon: {
        bg: '#321c2a',
        border: '#f26a4b',
        title: '#ffe5a3',
        sub: '#ffd3c4',
      },
      summer: {
        bg: '#fffbe6',
        border: '#f5a623',
        title: '#9c4e08',
        sub: '#6d5a3b',
      },
    };
    const palette = paletteMap[themeId] ?? paletteMap.graduation;

    // 둥근 현수막 바탕
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, 488, 232);

    // 메인 축하/환영 문구
    ctx.fillStyle = palette.title;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 34px "Pretendard", "Apple SD Gothic Neo", sans-serif';
    ctx.fillText(title, 256, subText ? 104 : 128, 456);

    // 보조 안내 문구
    if (subText) {
      ctx.fillStyle = palette.sub;
      ctx.font = '700 22px "Pretendard", "Apple SD Gothic Neo", sans-serif';
      ctx.fillText(subText, 256, 162, 456);
    }

    const canvasTex = new CanvasTexture(canvas);
    canvasTex.colorSpace = SRGBColorSpace;
    return canvasTex;
  }, [title, subText, themeId]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  return texture;
}

/** 임시 대형 크리스마스 트리 + 빛나는 별 + 오너먼트 + 선물 상자 */
function PlaceholderChristmasTree({ bannerTexture }: { bannerTexture: CanvasTexture | null }) {
  const ornaments: Array<{ pos: [number, number, number]; color: string }> = [
    { pos: [0.72, 1.3, 0.55], color: '#e63946' },
    { pos: [-0.68, 1.45, 0.58], color: '#ffd166' },
    { pos: [0.45, 2.25, 0.48], color: '#4cc9f0' },
    { pos: [-0.48, 2.35, 0.42], color: '#e63946' },
    { pos: [0.08, 3.05, 0.4], color: '#ffd166' },
    { pos: [-0.25, 3.2, -0.25], color: '#ff8fab' },
    { pos: [0.55, 1.5, -0.55], color: '#ffd166' },
    { pos: [-0.55, 2.2, -0.45], color: '#4cc9f0' },
  ];

  return (
    <group>
      {/* 바닥 블롭 그림자 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[1.55, 24]} />
        <meshBasicMaterial color="#1d352e" transparent opacity={0.38} />
      </mesh>

      {/* 나무 기둥 */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.24, 0.32, 0.9, 10]} />
        <meshStandardMaterial color="#6e4427" roughness={0.9} />
      </mesh>

      {/* 3단 원뿔 소나무 잎 */}
      <mesh position={[0, 1.55, 0]}>
        <coneGeometry args={[1.45, 1.75, 12]} />
        <meshStandardMaterial color="#236b43" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 2.55, 0]}>
        <coneGeometry args={[1.1, 1.5, 12]} />
        <meshStandardMaterial color="#2b7f50" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 3.45, 0]}>
        <coneGeometry args={[0.75, 1.25, 12]} />
        <meshStandardMaterial color="#34945e" roughness={0.85} flatShading />
      </mesh>

      {/* 꼭대기 빛나는 노란 별 */}
      <mesh position={[0, 4.25, 0]} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial
          color="#ffe066"
          emissive="#ffbe0b"
          emissiveIntensity={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* 반짝이는 오너먼트 볼 */}
      {ornaments.map((orn, idx) => (
        <mesh key={idx} position={orn.pos}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshStandardMaterial
            color={orn.color}
            emissive={orn.color}
            emissiveIntensity={0.35}
            roughness={0.35}
          />
        </mesh>
      ))}

      {/* 트리 아래 알록달록 선물 상자 3개 */}
      <mesh position={[-0.72, 0.22, 0.65]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        <meshStandardMaterial color="#d94b38" roughness={0.7} />
      </mesh>
      <mesh position={[0.75, 0.18, 0.6]} rotation={[0, -0.25, 0]}>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshStandardMaterial color="#2f74c0" roughness={0.7} />
      </mesh>
      <mesh position={[0.18, 0.16, 0.92]} rotation={[0, 0.15, 0]}>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial color="#f4c95d" roughness={0.7} />
      </mesh>

      {/* 트리 앞쪽 작은 크리스마스 안내 표지판 */}
      {bannerTexture && (
        <group position={[0, 0.72, 1.38]}>
          <mesh position={[0, -0.36, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 0.72, 8]} />
            <meshStandardMaterial color="#7a5134" roughness={0.85} />
          </mesh>
          <mesh name="Mat_Banner" position={[0, 0.08, 0]}>
            <boxGeometry args={[1.95, 0.92, 0.07]} />
            <meshStandardMaterial map={bannerTexture} roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** 졸업식 / 입학식 환영 · 축하 아치 + 2D CanvasTexture 현수막 (Mat_Banner) */
function PlaceholderEventArch({
  bannerTexture,
  themeId,
}: {
  bannerTexture: CanvasTexture | null;
  themeId: string;
}) {
  const pillarColor = themeId === 'entrance' ? '#5ea873' : '#e88da8';
  const flowerColor = themeId === 'entrance' ? '#a6e3b5' : '#ffb7cc';

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[1.5, 24]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.28} />
      </mesh>

      {/* 좌/우 아치 기둥 */}
      <mesh position={[-1.45, 1.35, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 2.7, 10]} />
        <meshStandardMaterial color="#f5ead4" roughness={0.8} />
      </mesh>
      <mesh position={[1.45, 1.35, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 2.7, 10]} />
        <meshStandardMaterial color="#f5ead4" roughness={0.8} />
      </mesh>

      {/* 상단 장식 가로대 */}
      <mesh position={[0, 2.72, 0]}>
        <boxGeometry args={[3.35, 0.2, 0.24]} />
        <meshStandardMaterial color={pillarColor} roughness={0.75} />
      </mesh>

      {/* 양끝 꽃 장식 뭉치 */}
      <mesh position={[-1.45, 2.75, 0.08]}>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={flowerColor} roughness={0.8} flatShading />
      </mesh>
      <mesh position={[1.45, 2.75, 0.08]}>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={flowerColor} roughness={0.8} flatShading />
      </mesh>

      {/* 중앙 현수막 (Mat_Banner) */}
      {bannerTexture && (
        <mesh name="Mat_Banner" position={[0, 2.02, 0.04]}>
          <boxGeometry args={[2.75, 1.28, 0.08]} />
          <meshStandardMaterial map={bannerTexture} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

/** 오봉 여름 축제 목조 야구라(축제 탑) + 붉은 제등(초칭) */
function PlaceholderObonYagura({
  bannerTexture,
}: {
  bannerTexture: CanvasTexture | null;
}) {
  const lanternPositions: Array<[number, number, number]> = [
    [-1.1, 2.35, 0.8],
    [0, 2.48, 0.95],
    [1.1, 2.35, 0.8],
    [-1.1, 2.35, -0.8],
    [1.1, 2.35, -0.8],
  ];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[1.5, 24]} />
        <meshBasicMaterial color="#1f1a33" transparent opacity={0.42} />
      </mesh>

      {/* 야구라 목조 기단 & 기둥 4개 */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.9, 1.1, 1.9]} />
        <meshStandardMaterial color="#8f2d28" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.14, 0]}>
        <boxGeometry args={[2.1, 0.14, 2.1]} />
        <meshStandardMaterial color="#f5e6cc" roughness={0.85} />
      </mesh>
      {[
        [-0.82, 2.1, -0.82],
        [0.82, 2.1, -0.82],
        [-0.82, 2.1, 0.82],
        [0.82, 2.1, 0.82],
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.08, 0.09, 2.0, 8]} />
          <meshStandardMaterial color="#7a4c2f" roughness={0.85} />
        </mesh>
      ))}

      {/* 전통 박공 지붕 */}
      <mesh position={[0, 3.35, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.75, 0.95, 4]} />
        <meshStandardMaterial color="#3c374f" roughness={0.85} flatShading />
      </mesh>

      {/* 따뜻하게 빛나는 붉은 제등(초칭) */}
      {lanternPositions.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <sphereGeometry args={[0.19, 10, 10]} />
          <meshStandardMaterial
            color="#ff5a43"
            emissive="#ff6b35"
            emissiveIntensity={0.95}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* 앞면 축제 배너 */}
      {bannerTexture && (
        <mesh name="Mat_Banner" position={[0, 0.62, 0.99]}>
          <planeGeometry args={[1.75, 0.86]} />
          <meshBasicMaterial map={bannerTexture} />
        </mesh>
      )}
    </group>
  );
}

/** 여름방학 파라솔 + 해바라기 화단 */
function PlaceholderSummerDecor({
  bannerTexture,
}: {
  bannerTexture: CanvasTexture | null;
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[1.45, 24]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.32} />
      </mesh>

      {/* 파라솔 기둥 & 지붕 */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 2.7, 8]} />
        <meshStandardMaterial color="#f6ede0" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.65, 0]}>
        <coneGeometry args={[1.55, 0.65, 10]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.75} flatShading />
      </mesh>
      <mesh position={[0, 2.98, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#fff8e1" roughness={0.7} />
      </mesh>

      {/* 해바라기 3송이 */}
      {[-0.82, 0.85, 0.1].map((xPos, idx) => (
        <group
          key={idx}
          position={[xPos, 0, idx === 2 ? 0.72 : 0.45]}
        >
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.035, 0.04, 0.9, 6]} />
            <meshStandardMaterial color="#3d9946" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.95, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.05, 12]} />
            <meshStandardMaterial color="#ffca28" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.95, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.06, 10]} />
            <meshStandardMaterial color="#5c3a21" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* 앞쪽 여름 안내 표지판 */}
      {bannerTexture && (
        <mesh name="Mat_Banner" position={[0, 1.48, 0.62]}>
          <boxGeometry args={[1.85, 0.86, 0.06]} />
          <meshStandardMaterial map={bannerTexture} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

/** 개별 시즌 소품 1개를 GlbModel 자동 로더 + 임시 로우폴리 모델로 렌더링하는 내부 컴포넌트 */
function SingleThemeProp({
  prop,
  theme,
  bannerTexture,
}: {
  prop: ThemePropConfig;
  theme: SeasonThemeConfig;
  bannerTexture: CanvasTexture | null;
}) {
  const fallbackModel = (() => {
    switch (prop.variant) {
      case 'xmas_tree':
        return <PlaceholderChristmasTree bannerTexture={bannerTexture} />;
      case 'event_arch':
        return <PlaceholderEventArch bannerTexture={bannerTexture} themeId={theme.id} />;
      case 'obon_yagura':
        return <PlaceholderObonYagura bannerTexture={bannerTexture} />;
      case 'summer_decor':
      default:
        return <PlaceholderSummerDecor bannerTexture={bannerTexture} />;
    }
  })();

  return (
    <group name={prop.id} position={prop.position}>
      <GlbModel url={prop.modelPath} fallback={fallbackModel} />
    </group>
  );
}

/**
 * 활성 시즌 · 이벤트 테마에 맞춰 공원 장식(트리, 졸업·입학 아치, 오봉 야구라 등)을 배치하는 컴포넌트
 * - public/models/themes/*.glb 파일이 추가되면 임시 로우폴리 모델이 실제 Blender 에셋으로 자동 교체됩니다.
 */
export const ThemeProps = memo(function ThemeProps({ theme }: ThemePropsComponentProps) {
  const bannerTexture = useBannerTexture(
    theme.bannerText,
    theme.bannerSubText,
    theme.id
  );

  if (theme.props.length === 0) return null;

  return (
    <group name={`theme_props_${theme.id}`}>
      {theme.props.map((prop) => (
        <SingleThemeProp
          key={prop.id}
          prop={prop}
          theme={theme}
          bannerTexture={bannerTexture}
        />
      ))}
    </group>
  );
});
