import type { SeasonThemeConfig } from '../types/content';
import type { Obstacle, SpaceConfig } from '../types/world';

/**
 * MM-DD 문자열을 비교하기 쉬운 숫자(월 * 100 + 일, 예: "12-01" -> 1201)로 변환하는 보조 함수
 */
function parseMonthDay(mmdd: string): number {
  const [m, d] = mmdd.split('-').map(Number);
  return (m || 1) * 100 + (d || 1);
}

/**
 * 오늘 날짜(또는 지정된 날짜)에 해당하는 시즌 테마를 자동으로 선택하는 함수
 * - 연도를 넘어가는 기간(예: 12-20 ~ 01-05)도 안전하게 처리합니다.
 * - 해당하는 시즌이 없으면 id === 'default' 기본 잔디 공원 테마를 반환합니다.
 * @param themes - themes.json에서 불러온 전체 시즌 테마 목록
 * @param now - 기준 날짜 (기본값: 현재 시각)
 * @returns 현재 날짜에 자동 적용될 시즌 테마
 */
export function resolveThemeByDate(
  themes: SeasonThemeConfig[],
  now: Date = new Date()
): SeasonThemeConfig {
  const todayCode = (now.getMonth() + 1) * 100 + now.getDate();

  for (const theme of themes) {
    if (!theme.dateRange) continue;
    const startCode = parseMonthDay(theme.dateRange.start);
    const endCode = parseMonthDay(theme.dateRange.end);

    if (startCode <= endCode) {
      if (todayCode >= startCode && todayCode <= endCode) {
        return theme;
      }
    } else {
      // 연말~연초처럼 시작일이 종료일보다 큰 경우(예: 12-20 ~ 01-05)
      if (todayCode >= startCode || todayCode <= endCode) {
        return theme;
      }
    }
  }

  return themes.find((theme) => theme.id === 'default') ?? themes[0];
}

/**
 * 테마 ID로 특정 시즌 테마를 조회하는 함수 (메뉴 미리보기용)
 */
export function getThemeById(
  themes: SeasonThemeConfig[],
  themeId: string
): SeasonThemeConfig | undefined {
  return themes.find((theme) => theme.id === themeId);
}

/**
 * 현재 공간 설정(spaces.json)에 활성 시즌 소품의 원형 장애물을 안전하게 합쳐 반환하는 함수
 * - 원본 space 객체를 직접 수정하지 않고 새 배열을 만들어, 크리스마스 트리나
 *   졸업·입학 아치 안으로 플레이어나 NPC가 뚫고 들어가지 않도록 막아줍니다.
 * @param baseSpace - 기본 공간 설정
 * @param activeTheme - 현재 활성 시즌 테마
 * @returns 시즌 소품 충돌 영역이 포함된 공간 설정
 */
export function buildSpaceWithThemeObstacles(
  baseSpace: SpaceConfig,
  activeTheme: SeasonThemeConfig
): SpaceConfig {
  if (activeTheme.props.length === 0) return baseSpace;

  const themeObstacles: Obstacle[] = activeTheme.props
    .filter((prop) => prop.obstacleRadius > 0)
    .map((prop) => ({
      id: prop.id,
      type: 'circle',
      x: prop.position[0],
      z: prop.position[2],
      radius: prop.obstacleRadius,
    }));

  return {
    ...baseSpace,
    obstacles: [...baseSpace.obstacles, ...themeObstacles],
  };
}
