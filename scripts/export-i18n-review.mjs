/**
 * src/locales/*.json 파일의 모든 다국어 항목(ja / ko / en)을 읽어
 * 제작자가 한눈에 검수하기 좋은 비교표 마크다운(docs/TRANSLATION_REVIEW.md)을 생성하는 스크립트.
 *
 * 실행 방법: npm run i18n:review
 */
import fs from 'node:fs';
import path from 'node:path';

const LOCALE_SOURCES = [
  {
    file: 'src/locales/ui.json',
    title: '1. UI 화면 문구 (`src/locales/ui.json`)',
    desc: '입장 화면, HUD, 메뉴바, 소리 설정, 캘린더, 멤버, 연주 패드, 꾸미기, 악보/작곡기 문구',
  },
  {
    file: 'src/locales/taikoGuide.json',
    title: '2. 타이코 종류 · 지역 단체 안내 (`src/locales/taikoGuide.json`)',
    desc: '타이코 10종 구조/자세/설명 및 転太鼓舞·鶴亀会 소개글',
  },
  {
    file: 'src/locales/content.json',
    title: '3. 서클 · 배경/시즌 테마 · 악곡 · 트랙 (`src/locales/content.json`)',
    desc: '서클 안내, 배경 테마 4종, 시즌 테마 7종, 수록곡 4곡, 18개 악기 트랙 설명',
  },
];

/** 마크다운 표 셀 안의 줄바꿈·파이프(|) 문자를 안전하게 이스케이프 */
function escapeCell(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>');
}

/** 중첩 JSON에서 { ja, ko } 말단 번역 객체를 순서대로 수집 */
function collectEntries(node, prefix = '', rows = [], missing = []) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      collectEntries(item, `${prefix}[${index}]`, rows, missing);
    });
    return rows;
  }

  if (node && typeof node === 'object') {
    const keys = Object.keys(node);
    const isTranslationLeaf = keys.includes('ja') || keys.includes('ko') || keys.includes('en');
    if (isTranslationLeaf && typeof (node.ja ?? node.ko ?? node.en) === 'string') {
      const ja = node.ja ?? '';
      const ko = node.ko ?? '';
      const en = node.en ?? '';
      if (!ja.trim()) missing.push(`${prefix} (missing: ja)`);
      if (!ko.trim()) missing.push(`${prefix} (missing: ko)`);
      rows.push({ key: prefix, ja, ko, en });
      return rows;
    }

    for (const key of keys) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      collectEntries(node[key], nextPrefix, rows, missing);
    }
  }

  return rows;
}

const lines = [
  '# Taiko World — 다국어 번역 검수표 (日本語 ↔ 한국어)',
  '',
  '> 이 문서는 `npm run i18n:review` 명령어로 [`src/locales/`](../src/locales/) 폴더의 JSON 사전을 읽어 **자동 생성**됩니다.',
  '> 일본어와 한국어 표현이 어색한 부분을 찾으시면 해당 키 경로를 보고 `src/locales/*.json`의 `"ja"` 또는 `"ko"` 값을 바로 고치실 수 있습니다.',
  '> 추후 영어를 추가할 때도 같은 블록 안에 `"en": "..."` 한 줄만 추가하면 됩니다.',
  '',
];

let totalCount = 0;
const allMissing = [];
const sectionBlocks = [];

for (const source of LOCALE_SOURCES) {
  const fullPath = path.resolve(process.cwd(), source.file);
  const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const rows = [];
  const missing = [];
  collectEntries(json, '', rows, missing);

  totalCount += rows.length;
  allMissing.push(...missing.map((m) => `${source.file}: ${m}`));

  const block = [
    `## ${source.title}`,
    `${source.desc} (총 **${rows.length}개** 항목)`,
    '',
    '| 키 경로 (수정 위치) | 🇯🇵 일본어 (`ja`, 기본) | 🇰🇷 한국어 (`ko`) |',
    '| --- | --- | --- |',
    ...rows.map(
      (r) => `| \`${r.key}\` | ${escapeCell(r.ja)} | ${escapeCell(r.ko)} |`
    ),
    '',
  ];
  sectionBlocks.push(block.join('\n'));
}

lines.push(
  `- **총 검수 항목 수**: ${totalCount}개`,
  `- **누락 번역 키**: ${allMissing.length}건`,
  ''
);

if (allMissing.length > 0) {
  lines.push('### ⚠️ 누락된 번역 키', ...allMissing.map((m) => `- ${m}`), '');
}

lines.push('---', '', ...sectionBlocks);

const outPath = path.resolve(process.cwd(), 'docs/TRANSLATION_REVIEW.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(
  `Generated docs/TRANSLATION_REVIEW.md (${totalCount} entries, ${allMissing.length} missing).`
);

if (allMissing.length > 0) {
  console.error('Missing translation keys detected:\n' + allMissing.join('\n'));
  process.exit(1);
}
