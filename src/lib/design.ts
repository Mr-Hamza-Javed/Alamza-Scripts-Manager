/* The card editor: which settings shape a script-line card, how the editor groups
   them, and the ready-made designs. The values live in the normal settings object,
   so old saved settings keep working. */
import { DEFAULTS, FONT_OPTIONS } from './constants';

export type CtlDef = {
  key: string;
  type: 'range' | 'choice' | 'toggle' | 'font' | 'swatch';
  label: string;
  hint?: string;
  min?: number; max?: number; step?: number; unit?: string;
  options?: [string, string][];
  /** only shown when this returns true for the current settings */
  when?: (s: any) => boolean;
};
export type EditorSection = { title: string; controls: CtlDef[] };
export type EditorGroup = { id: string; label: string; hint: string; sections: EditorSection[] };

export const EDITOR_GROUPS: EditorGroup[] = [
  {
    id: 'style', label: 'Style', hint: 'The overall shape of every card.',
    sections: [
      {
        title: 'Look',
        controls: [
          { key: 'viewStyle', type: 'choice', label: 'Layout', options: [['cards', 'Separate cards'], ['doc', 'One table']] },
          { key: 'accent', type: 'swatch', label: 'Accent colour', hint: 'Active line, progress and highlights' },
          { key: 'radius', type: 'range', label: 'Corner radius', min: 0, max: 20, step: 1, unit: 'px', when: (s) => s.viewStyle !== 'doc' },
          { key: 'density', type: 'choice', label: 'Density', options: [['compact', 'Compact'], ['cozy', 'Cozy'], ['comfortable', 'Roomy']] },
          { key: 'cardBorders', type: 'toggle', label: 'Card borders', when: (s) => s.viewStyle !== 'doc' },
          { key: 'cardShadow', type: 'toggle', label: 'Card shadow', when: (s) => s.viewStyle !== 'doc' },
        ],
      },
      {
        title: 'Table layout',
        controls: [
          { key: 'docTight', type: 'range', label: 'Row padding', min: 0.55, max: 1.3, step: 0.05, unit: '×', when: (s) => s.viewStyle === 'doc' },
          { key: 'docHeadTint', type: 'toggle', label: 'Tinted section rows', when: (s) => s.viewStyle === 'doc' },
          { key: 'docZebra', type: 'toggle', label: 'Alternating row tint', when: (s) => s.viewStyle === 'doc' },
          { key: 'docGuideIndent', type: 'toggle', label: 'Guide lines up under the script text', when: (s) => s.viewStyle === 'doc' },
        ],
      },
    ],
  },
  {
    id: 'script', label: 'Script line', hint: 'The spoken line at the top of each card.',
    sections: [
      {
        title: 'Text',
        controls: [
          { key: 'scriptFont', type: 'font', label: 'Font' },
          { key: 'scriptSize', type: 'range', label: 'Size', hint: 'Keep it only a little larger than the guide text', min: 11, max: 26, step: 0.5, unit: 'px' },
          { key: 'scriptWeight', type: 'range', label: 'Weight', min: 300, max: 800, step: 50 },
          { key: 'scriptLeading', type: 'range', label: 'Line height', min: 1.15, max: 1.9, step: 0.05 },
        ],
      },
      {
        title: 'Line number',
        controls: [
          { key: 'showLineNumbers', type: 'toggle', label: 'Show line numbers' },
          { key: 'numStyle', type: 'choice', label: 'Style', options: [['plain', 'Plain'], ['boxed', 'Boxed'], ['pill', 'Pill']], when: (s) => s.showLineNumbers },
          { key: 'numColor', type: 'choice', label: 'Colour', options: [['faint', 'Faint'], ['muted', 'Muted'], ['prose', 'Body'], ['ink', 'Strong'], ['accent', 'Accent']], when: (s) => s.showLineNumbers },
          { key: 'numSize', type: 'range', label: 'Size', min: 7, max: 16, step: 0.5, unit: 'px', when: (s) => s.showLineNumbers },
          { key: 'numWeight', type: 'range', label: 'Weight', min: 400, max: 700, step: 100, when: (s) => s.showLineNumbers },
        ],
      },
      {
        title: 'Space around the line',
        controls: [
          { key: 'autoPad', type: 'toggle', label: 'Follow the text size', hint: 'Smaller text gets less space, larger text more' },
          { key: 'padTopRatio', type: 'range', label: 'Above', min: 0, max: 1.4, step: 0.02, unit: '×' },
          { key: 'padBottomRatio', type: 'range', label: 'Below', min: 0, max: 1.4, step: 0.02, unit: '×' },
        ],
      },
    ],
  },
  {
    id: 'guide', label: 'Visual guide', hint: 'The panel of tags under each line.',
    sections: [
      {
        title: 'Text',
        controls: [
          { key: 'bodyFont', type: 'font', label: 'Font' },
          { key: 'bodySize', type: 'range', label: 'Size', min: 9, max: 17, step: 0.5, unit: 'px' },
          { key: 'lhBody', type: 'range', label: 'Line height', min: 1.3, max: 2, step: 0.02 },
        ],
      },
      {
        title: 'Columns',
        controls: [
          { key: 'guideColumns', type: 'choice', label: 'Columns', options: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['auto', 'Fit width']] },
          { key: 'columnRule', type: 'toggle', label: 'Line between columns', when: (s) => s.guideColumns !== '1' },
          { key: 'colGap', type: 'range', label: 'Column gap', min: 8, max: 40, step: 1, unit: 'px', when: (s) => s.guideColumns !== '1' },
        ],
      },
      {
        title: 'Panel',
        controls: [
          { key: 'panelInset', type: 'toggle', label: 'Tinted background' },
          { key: 'panelBorder', type: 'toggle', label: 'Border' },
          { key: 'padRatio', type: 'range', label: 'Padding', hint: 'Follows the guide text size', min: 0.25, max: 1.3, step: 0.02, unit: '×', when: (s) => s.autoPad },
          { key: 'padGuide', type: 'range', label: 'Padding', min: 4, max: 22, step: 1, unit: 'px', when: (s) => !s.autoPad },
        ],
      },
      {
        title: 'Extras',
        controls: [
          { key: 'sourcesPosition', type: 'choice', label: 'Sources', options: [['flow', 'In the flow'], ['bottom', 'Always last']] },
          { key: 'showTranscript', type: 'toggle', label: 'Video transcripts' },
        ],
      },
    ],
  },
  {
    id: 'tags', label: 'Tags & chips', hint: 'Tag labels, search-term chips and source links.',
    sections: [
      {
        title: 'Tag labels',
        controls: [
          { key: 'labelStyle', type: 'choice', label: 'Style', options: [['pill', 'Filled'], ['outline', 'Outlined'], ['plain', 'Plain text']] },
          { key: 'labelSize', type: 'range', label: 'Size', min: 6.5, max: 12, step: 0.5, unit: 'px' },
        ],
      },
      {
        title: 'Chips',
        controls: [
          { key: 'chipShape', type: 'choice', label: 'Shape', options: [['pill', 'Pill'], ['rounded', 'Rounded'], ['square', 'Square']] },
          { key: 'lhChip', type: 'range', label: 'Row spacing', min: 1.5, max: 2.6, step: 0.05 },
          { key: 'itemGap', type: 'range', label: 'Gap between tags', min: 2, max: 18, step: 1, unit: 'px' },
        ],
      },
      {
        title: 'Source links',
        controls: [
          { key: 'showFavicons', type: 'toggle', label: 'Site icons' },
          { key: 'showDomain', type: 'toggle', label: 'Domain name' },
        ],
      },
    ],
  },
  {
    id: 'active', label: 'Active line', hint: 'How the line you are working on stands out.',
    sections: [
      {
        title: 'Active line',
        controls: [
          { key: 'activeStyle', type: 'choice', label: 'Style', options: [['ring', 'Ring'], ['tint', 'Tint'], ['band', 'Band'], ['bar', 'Left bar']] },
          { key: 'focusMode', type: 'toggle', label: 'Focus mode', hint: 'Dim every other line' },
          { key: 'dimAmount', type: 'range', label: 'Dim strength', min: 10, max: 85, step: 5, unit: '%', when: (s) => s.focusMode },
        ],
      },
      {
        title: 'Buttons on each line',
        controls: [
          { key: 'showChecks', type: 'toggle', label: 'Ready tick' },
          { key: 'showCopyBtn', type: 'toggle', label: 'Copy button' },
        ],
      },
    ],
  },
  {
    id: 'sizes', label: 'Sizes', hint: 'Size, spacing and how cards fit smaller screens.',
    sections: [
      {
        title: 'Whole view',
        controls: [
          { key: 'scale', type: 'range', label: 'Scale', min: 70, max: 160, step: 2, unit: '%' },
          { key: 'maxWidth', type: 'range', label: 'Content width', min: 820, max: 1800, step: 20, unit: 'px' },
          { key: 'cardGap', type: 'range', label: 'Gap between lines', min: 0, max: 22, step: 1, unit: 'px' },
          { key: 'sectionGap', type: 'range', label: 'Gap between sections', min: 6, max: 48, step: 2, unit: 'px' },
        ],
      },
      {
        title: 'Tablets and phones',
        controls: [
          { key: 'tabletCols', type: 'choice', label: 'Guide columns on tablets', options: [['same', 'Same'], ['1', 'One'], ['2', 'Two']] },
          { key: 'phoneScale', type: 'range', label: 'Text size on phones', hint: 'Phones always show the guide in one column', min: 80, max: 125, step: 5, unit: '%' },
        ],
      },
    ],
  },
];

/* every setting the card editor owns (also what a preset or "my design" stores) */
/* focus mode is a reading switch, not part of a design: presets never change it */
export const CARD_KEYS = Array.from(new Set(EDITOR_GROUPS.flatMap((g) => g.sections.flatMap((s) => s.controls.map((c) => c.key))))).filter((k) => k !== 'focusMode');

export function cardValues(s: any) {
  const out: Record<string, any> = {};
  CARD_KEYS.forEach((k) => { out[k] = s[k]; });
  return out;
}
export function defaultCard() { return cardValues(DEFAULTS); }

export type Preset = { id: string; name: string; desc: string; values: Record<string, any> };

export const PRESETS: Preset[] = [
  { id: 'calm', name: 'Calm', desc: 'The default: clear, balanced cards', values: {} },
  {
    id: 'compact', name: 'Compact', desc: 'More lines on screen at once',
    values: { density: 'compact', scriptSize: 13, bodySize: 10.5, labelSize: 7.5, cardGap: 4, itemGap: 4, sectionGap: 10, padRatio: 0.45, padTopRatio: 0.28, padBottomRatio: 0.28, radius: 10, lhBody: 1.5, lhChip: 1.85 },
  },
  {
    id: 'reading', name: 'Reading', desc: 'Large serif lines, one calm column',
    values: { scriptFont: 'literata', scriptSize: 17, scriptWeight: 600, scriptLeading: 1.55, bodySize: 13, lhBody: 1.7, guideColumns: '1', radius: 16, cardGap: 12, sectionGap: 24, maxWidth: 960, padTopRatio: 0.55, padBottomRatio: 0.5 },
  },
  {
    id: 'document', name: 'Document', desc: 'One continuous table, like a sheet',
    values: { viewStyle: 'doc', cardShadow: false, docZebra: true, docHeadTint: true, numStyle: 'boxed', numColor: 'muted' },
  },
  {
    id: 'bold', name: 'Bold', desc: 'Strong numbers and a clear band',
    values: { scriptWeight: 750, numStyle: 'pill', numWeight: 700, numColor: 'accent', activeStyle: 'band', chipShape: 'rounded', accent: 'violet', radius: 16 },
  },
  {
    id: 'minimal', name: 'Minimal', desc: 'Plain labels, no panels or lines',
    values: { labelStyle: 'plain', panelInset: false, panelBorder: false, cardShadow: false, chipShape: 'square', columnRule: false, numColor: 'muted', radius: 8 },
  },
];

export function presetValues(p: { values: Record<string, any> }) { return { ...defaultCard(), ...p.values }; }
/** true when the current settings match these card values exactly */
export function sameCard(s: any, values: Record<string, any>) { return CARD_KEYS.every((k) => s[k] === values[k]); }

/* where a click in the preview takes the editor */
export const PART_GROUP: Record<string, string> = { card: 'style', sec: 'style', text: 'script', num: 'script', guide: 'guide', label: 'tags', chip: 'tags', check: 'active' };

export { FONT_OPTIONS };

/* the preview's own little script, used when no script is open */
export const SAMPLE_MD = `# Cold open

| Script Line | Visual Guide |
|---|---|
| In 2025, a research firm asked kids which franchises mattered most to them. | \`[CONTEXT]:\` A market research study of about 6,100 moviegoers. — \`[B-ROLL]:\` Kids on a couch absorbed in tablets and games. — \`[SEARCH TERMS]:\` kids playing tablet games b-roll, children survey footage, kids using iPad — \`[SOURCES]:\` [Gen Alpha at the Movies](https://www.nrgmr.com/) |
| Their biggest star is a YouTuber with more subscribers than the population of the United States. | \`[CONTEXT]:\` The most subscribed creator on YouTube. — \`[TEXT OVERLAY]:\` 490M+ Subscribers — \`[ARTICLE SHOT]:\` Most-subscribed YouTube channels list — \`[SOURCES]:\` [List of most-subscribed channels](https://en.wikipedia.org/wiki/List_of_most-subscribed_YouTube_channels) |
| And the company behind him is now valued at five billion dollars. | \`[IMAGE]:\` Headline about the valuation — \`[EDITOR NOTE]:\` Use the **official** chart, search {{valuation chart 2024}} and check [the report](https://www.forbes.com/) first — \`[SEARCH TERMS]:\` company valuation headline, funding round news |
`;
