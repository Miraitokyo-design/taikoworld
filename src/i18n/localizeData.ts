import type {
  CircleInfo,
  SeasonThemeConfig,
  SongConfig,
  TaikoGroupConfig,
  TaikoGuideData,
  TaikoTrackDefinition,
  WorldEnvironmentConfig,
} from '../types/content';
import type { InstrumentConfig } from '../types/world';
import type { LocalizedText, SupportedLanguage } from './I18nContext';
import guideTranslations from '../locales/taikoGuide.json';
import contentTranslations from '../locales/content.json';

type LocaleDict = Record<string, unknown>;

const guideDict = guideTranslations as LocaleDict;
const contentDict = contentTranslations as LocaleDict;

/** 병렬 번역 객체({ ja, ko })에서 현재 언어 문자열을 안전하게 꺼내는 보조 함수 */
function pickLang(
  entry: Partial<LocalizedText> | undefined,
  lang: SupportedLanguage,
  fallback: string
): string {
  if (!entry) return fallback;
  return entry[lang] ?? entry.ja ?? entry.ko ?? fallback;
}

/**
 * circle.json 데이터를 현재 언어(ja/ko)에 맞춰 변환하는 함수
 */
export function localizeCircleInfo(
  circle: CircleInfo,
  lang: SupportedLanguage
): CircleInfo {
  const dict = contentDict.circle as {
    name?: LocalizedText;
    tagline?: LocalizedText;
    description?: LocalizedText;
    practiceInfo?: LocalizedText;
    links?: Record<string, LocalizedText>;
    instagramQrCaption?: LocalizedText;
    siteQrCaption?: LocalizedText;
  };

  return {
    ...circle,
    name: pickLang(dict?.name, lang, circle.name),
    tagline: pickLang(dict?.tagline, lang, circle.tagline),
    description: pickLang(dict?.description, lang, circle.description),
    practiceInfo: pickLang(dict?.practiceInfo, lang, circle.practiceInfo),
    links: circle.links.map((link) => ({
      ...link,
      label: pickLang(dict?.links?.[link.type], lang, link.label),
    })),
    instagramQr: circle.instagramQr
      ? {
          ...circle.instagramQr,
          caption: pickLang(
            dict?.instagramQrCaption,
            lang,
            circle.instagramQr.caption
          ),
        }
      : undefined,
    siteQr: circle.siteQr
      ? {
          ...circle.siteQr,
          caption: pickLang(dict?.siteQrCaption, lang, circle.siteQr.caption),
        }
      : undefined,
  };
}

/**
 * groups.json 단체 정보(소속 대학, 종족 표시명)를 현재 언어에 맞춰 변환하는 함수
 */
export function localizeGroup(
  group: TaikoGroupConfig,
  lang: SupportedLanguage
): TaikoGroupConfig {
  const dict = (
    contentDict.groups as Record<
      string,
      { affiliation?: LocalizedText; speciesLabel?: LocalizedText }
    >
  )[group.id];
  if (!dict) return group;

  return {
    ...group,
    affiliation: pickLang(dict.affiliation, lang, group.affiliation),
    speciesLabel: pickLang(dict.speciesLabel, lang, group.speciesLabel),
  };
}

/**
 * taikoGuide.json(타이코 10종 + 지역 단체 2곳)을 현재 언어에 맞춰 변환하는 함수
 */
export function localizeTaikoGuide(
  guide: TaikoGuideData,
  lang: SupportedLanguage
): TaikoGuideData {
  const instDict = guideDict.instruments as Record<
    string,
    {
      name?: LocalizedText;
      reading?: LocalizedText;
      posture?: LocalizedText;
      role?: LocalizedText;
      soundsLabel?: LocalizedText;
      description?: LocalizedText;
    }
  >;
  const groupDict = guideDict.localGroups as Record<
    string,
    {
      name?: LocalizedText;
      reading?: LocalizedText;
      affiliation?: LocalizedText;
      tagline?: LocalizedText;
      description?: LocalizedText;
      tags?: LocalizedText[];
    }
  >;

  return {
    intro: pickLang(guideDict.intro as LocalizedText, lang, guide.intro),
    editNotice: pickLang(
      guideDict.editNotice as LocalizedText,
      lang,
      guide.editNotice
    ),
    instruments: guide.instruments.map((item) => {
      const tr = instDict[item.id];
      if (!tr) return item;
      return {
        ...item,
        name: pickLang(tr.name, lang, item.name),
        reading: pickLang(tr.reading, lang, item.reading),
        posture: pickLang(tr.posture, lang, item.posture),
        role: pickLang(tr.role, lang, item.role),
        soundsLabel: pickLang(tr.soundsLabel, lang, item.soundsLabel),
        description: pickLang(tr.description, lang, item.description),
      };
    }),
    localGroups: guide.localGroups.map((group) => {
      const tr = groupDict[group.id];
      if (!tr) return group;
      return {
        ...group,
        name: pickLang(tr.name, lang, group.name),
        reading: pickLang(tr.reading, lang, group.reading),
        affiliation: pickLang(tr.affiliation, lang, group.affiliation),
        tagline: pickLang(tr.tagline, lang, group.tagline),
        description: pickLang(tr.description, lang, group.description),
        tags: tr.tags
          ? tr.tags.map((tagEntry, idx) =>
              pickLang(tagEntry, lang, group.tags[idx] ?? '')
            )
          : group.tags,
      };
    }),
  };
}

/**
 * worldEnvironments.json(기본 배경 테마 4종)을 현재 언어에 맞춰 변환하는 함수
 */
export function localizeEnvironments(
  environments: WorldEnvironmentConfig[],
  lang: SupportedLanguage
): WorldEnvironmentConfig[] {
  const dict = contentDict.environments as Record<
    string,
    { name?: LocalizedText; description?: LocalizedText }
  >;

  return environments.map((env) => {
    const tr = dict[env.id];
    if (!tr) return env;
    return {
      ...env,
      name: pickLang(tr.name, lang, env.name),
      description: pickLang(tr.description, lang, env.description),
    };
  });
}

/**
 * 활성 시즌 테마(themes.json)의 이름과 배너 문구를 현재 언어에 맞춰 변환하는 함수
 */
export function localizeSeasonTheme(
  theme: SeasonThemeConfig,
  lang: SupportedLanguage
): SeasonThemeConfig {
  const dict = (
    contentDict.themes as Record<
      string,
      {
        name?: LocalizedText;
        bannerText?: LocalizedText;
        bannerSubText?: LocalizedText;
      }
    >
  )[theme.id];
  if (!dict) return theme;

  return {
    ...theme,
    name: pickLang(dict.name, lang, theme.name),
    bannerText: theme.bannerText
      ? pickLang(dict.bannerText, lang, theme.bannerText)
      : theme.bannerText,
    bannerSubText: theme.bannerSubText
      ? pickLang(dict.bannerSubText, lang, theme.bannerSubText)
      : theme.bannerSubText,
  };
}

/**
 * instruments.json(광장 중앙 체험 타이코)의 표시 이름을 현재 언어에 맞춰 변환하는 함수
 */
export function localizeInstruments(
  instruments: InstrumentConfig[],
  lang: SupportedLanguage
): InstrumentConfig[] {
  const dict = contentDict.instruments as Record<
    string,
    { name?: LocalizedText }
  >;

  return instruments.map((inst) => {
    const tr = dict[inst.id];
    if (!tr) return inst;
    return {
      ...inst,
      name: pickLang(tr.name, lang, inst.name),
    };
  });
}

/**
 * songs.json 기본 수록곡 목록을 현재 언어에 맞춰 변환하는 함수
 */
export function localizeSongs(
  songs: SongConfig[],
  lang: SupportedLanguage
): SongConfig[] {
  const dict = contentDict.songs as Record<
    string,
    {
      title?: LocalizedText;
      subtitle?: LocalizedText;
      description?: LocalizedText;
    }
  >;

  return songs.map((song) => {
    const tr = dict[song.id];
    if (!tr) return song;
    return {
      ...song,
      title: pickLang(tr.title, lang, song.title),
      subtitle: pickLang(tr.subtitle, lang, song.subtitle),
      description: pickLang(tr.description, lang, song.description),
    };
  });
}

/**
 * taikoTracks.json(18개 악기 트랙 설명)을 현재 언어에 맞춰 변환하는 함수
 */
export function localizeTaikoTracks(
  tracks: TaikoTrackDefinition[],
  lang: SupportedLanguage
): TaikoTrackDefinition[] {
  const dict = contentDict.tracks as Record<
    string,
    { fullName?: LocalizedText; summary?: LocalizedText }
  >;

  return tracks.map((track) => {
    const tr = dict[track.id];
    if (!tr) return track;
    return {
      ...track,
      fullName: pickLang(tr.fullName, lang, track.fullName),
      summary: pickLang(tr.summary, lang, track.summary),
    };
  });
}
