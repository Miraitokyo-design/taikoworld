import type {
  SeasonThemeCatalog,
  SeasonThemeConfig,
  ThemeWeatherType,
  WorldEnvironmentConfig,
} from '../types/content';
import type { Obstacle, SpaceConfig } from '../types/world';

/**
 * 3D 씬(하늘·조명·바닥 색상·날씨·야외 소품)에 최종 적용되는 통합 분위기 설정
 * - 운영자가 배포한 시즌 이벤트가 활성 중이면 시즌 분위기가 모든 사용자에게 일괄 적용되고,
 *   평상시에는 사용자가 메뉴에서 고른 기본 배경 테마(잔디 공원·연습실·눈오는 들판 등)가 적용됩니다.
 */
export interface EffectiveWorldAtmosphere {
  skyColor: string;
  ambientSkyColor: string;
  ambientGroundColor: string;
  sunColor: string;
  sunIntensity: number;
  groundColor: string;
  outerGroundColor: string;
  borderColor: string;
  weather: ThemeWeatherType;
  showOutdoorDecor: boolean;
  /** 현재 활성 시즌 테마 (운영자 배포 / 날짜 자동 적용) */
  seasonTheme: SeasonThemeConfig;
  /** 현재 사용자가 선택한 기본 배경 테마 */
  environment: WorldEnvironmentConfig;
}

/**
 * MM-DD 문자열을 비교하기 쉬운 숫자(월 * 100 + 일, 예: "12-01" -> 1201)로 변환하는 보조 함수
 */
function parseMonthDay(mmdd: string): number {
  const [m, d] = mmdd.split('-').map(Number);
  return (m || 1) * 100 + (d || 1);
}

/**
 * 운영자가 themes.json에 지정한 activeOverride 또는 오늘 날짜(dateRange)에 따라
 * 모든 사용자에게 일괄 적용될 시즌 테마를 결정하는 함수
 * - 사용자는 시즌 테마를 임의로 변경할 수 없고, 제작자가 themes.json을 수정·배포해 일괄 제어합니다.
 * @param catalog - src/data/themes.json 데이터
 * @param now - 기준 날짜 (기본값: 현재 시각)
 * @returns 일괄 적용할 시즌 테마 (평상시에는 id === 'default')
 */
export function resolveDeployedSeasonTheme(
  catalog: SeasonThemeCatalog,
  now: Date = new Date()
): SeasonThemeConfig {
  const { activeOverride, themes } = catalog;

  // 1) 제작자가 themes.json의 activeOverride에 특정 시즌 ID를 넣어 배포한 경우 최우선 일괄 적용
  if (activeOverride) {
    const forced = themes.find((theme) => theme.id === activeOverride);
    if (forced) return forced;
  }

  // 2) activeOverride가 null이면 오늘 날짜에 해당하는 시즌(dateRange) 자동 적용
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
      // 연말~연초처럼 시작일이 종료일보다 큰 경우(예: 12-27 ~ 02-19)
      if (todayCode >= startCode || todayCode <= endCode) {
        return theme;
      }
    }
  }

  return themes.find((theme) => theme.id === 'default') ?? themes[0];
}

/**
 * 사용자가 선택한 기본 배경 테마와 운영자 일괄 시즌 테마를 합쳐
 * 3D Scene과 Space에 적용할 최종 분위기(EffectiveWorldAtmosphere)를 생성하는 함수
 */
export function composeWorldAtmosphere(
  environment: WorldEnvironmentConfig,
  seasonTheme: SeasonThemeConfig
): EffectiveWorldAtmosphere {
  const isSeasonActive = seasonTheme.id !== 'default';

  if (isSeasonActive) {
    return {
      skyColor: seasonTheme.skyColor,
      ambientSkyColor: seasonTheme.ambientSkyColor,
      ambientGroundColor: seasonTheme.ambientGroundColor,
      sunColor: seasonTheme.sunColor,
      sunIntensity: seasonTheme.sunIntensity,
      groundColor: seasonTheme.groundColor ?? environment.groundColor,
      outerGroundColor: seasonTheme.outerGroundColor ?? environment.outerGroundColor,
      borderColor: seasonTheme.borderColor ?? environment.borderColor,
      weather: seasonTheme.weather,
      showOutdoorDecor: environment.showOutdoorDecor,
      seasonTheme,
      environment,
    };
  }

  return {
    skyColor: environment.skyColor,
    ambientSkyColor: environment.ambientSkyColor,
    ambientGroundColor: environment.ambientGroundColor,
    sunColor: environment.sunColor,
    sunIntensity: environment.sunIntensity,
    groundColor: environment.groundColor,
    outerGroundColor: environment.outerGroundColor,
    borderColor: environment.borderColor,
    weather: environment.weather,
    showOutdoorDecor: environment.showOutdoorDecor,
    seasonTheme,
    environment,
  };
}

/**
 * 현재 공간 설정(spaces.json)에 활성 시즌 소품의 원형 장애물을 안전하게 합쳐 반환하는 함수
 */
export function buildSpaceWithThemeObstacles(
  baseSpace: SpaceConfig,
  seasonTheme: SeasonThemeConfig
): SpaceConfig {
  if (seasonTheme.props.length === 0) return baseSpace;

  const themeObstacles: Obstacle[] = seasonTheme.props
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
