/* Everything the app knows before it reads a script: colours, the default tag
   registry, every setting with its default, and how the settings screen is laid out. */

/* Each colour is [dark-mode shade, light-mode shade]. Tuned to sit with the calm blue look. */
export const PALETTE: Record<string, [string, string]> = {
  slate: ['#94a3b8', '#64748b'],
  blue: ['#60a5fa', '#2563eb'],
  cyan: ['#22d3ee', '#0891b2'],
  teal: ['#2dd4bf', '#0d9488'],
  green: ['#4ade80', '#16a34a'],
  amber: ['#fbbf24', '#d97706'],
  orange: ['#fb923c', '#ea580c'],
  red: ['#f87171', '#dc2626'],
  pink: ['#f472b6', '#db2777'],
  violet: ['#a78bfa', '#7c3aed'],
};
export const PKEYS = Object.keys(PALETTE);

export type TagDef = { render: string; color: string; split: string; auto?: boolean };

export const DEFAULT_TAGS: Record<string, TagDef> = {
  CONTEXT: { render: 'prose', color: 'blue', split: 'none' },
  'B-ROLL': { render: 'prose', color: 'teal', split: 'none' },
  IMAGE: { render: 'prose', color: 'amber', split: 'none' },
  'ARTICLE SHOT': { render: 'chips', color: 'violet', split: 'auto' },
  'ARTICLE SHOTS': { render: 'chips', color: 'violet', split: 'auto' },
  'SEARCH TERMS': { render: 'chips', color: 'green', split: 'auto' },
  'TEXT OVERLAY': { render: 'overlay', color: 'pink', split: '—' },
  'INSERT VIDEO': { render: 'prose', color: 'orange', split: 'none' },
  SOURCES: { render: 'links', color: 'slate', split: 'none' },
  TRANSCRIPT: { render: 'prose', color: 'slate', split: 'none' },
};

export function mergeTags(saved?: Record<string, TagDef> | null) {
  const incoming = saved || {};
  const out = { ...DEFAULT_TAGS, ...incoming };
  Object.keys(DEFAULT_TAGS).forEach((k) => {
    if (incoming[k] && incoming[k].auto) out[k] = { ...DEFAULT_TAGS[k] };
  });
  return out;
}

/* settings schema: 4 = the calm blue redesign (fonts, accent, paper and sizes re-baselined) */
export const SETTINGS_SCHEMA = 4;

export const DEFAULTS = {
  schema: SETTINGS_SCHEMA,
  scale: 100,
  theme: 'system', paper: 'cool', accent: 'blue', density: 'cozy', radius: 12,
  cardBorders: true, cardShadow: true, maxWidth: 1120,
  viewStyle: 'cards', docTight: 0.82, docHeadTint: true, docZebra: false, docGuideIndent: true,
  scriptFont: 'inter', scriptSize: 14, scriptWeight: 650, scriptLeading: 1.5,
  bodyFont: 'inter', uiFont: 'inter', bodySize: 11.5, labelSize: 8, lhBody: 1.62, lhChip: 2,
  guideColumns: '2', columnRule: true, sourcesPosition: 'flow', chipShape: 'pill',
  labelStyle: 'pill', cardGap: 8, itemGap: 7, sectionGap: 16, colGap: 18, padGuide: 10,
  autoPad: true, padRatio: 0.62, padTopRatio: 0.4, padBottomRatio: 0.4,
  numSize: 9.5, numWeight: 500, numColor: 'faint', numStyle: 'plain',
  panelInset: true, panelBorder: true, sidebarWidth: 272, showSidebar: true, treeHeight: 300,
  defaultSideTab: 'files', foldersFirst: true, showReadyCount: true, confirmTrash: false,
  defaultShareRole: 'viewer', autoRefreshShare: true, sharePublicByDefault: false,
  cloudSync: true, syncSettings: true,
  showLineNumbers: true, showChecks: true, showCopyBtn: true, showTranscript: true,
  stickyHeaders: true, collapseDefault: false,
  focusMode: false, dimAmount: 45, activeStyle: 'ring', rememberLine: true,
  chipClick: 'copy', searchEngine: 'youtube', copyFormat: 'plain', copyJoin: 'comma',
  searchScope: 'context', searchHighlight: true, searchExpand: true,
  searchHideEmpty: true, searchLineNumber: true,
  openNewTab: true, showFavicons: true, showDomain: false,
  autoDetect: true, defaultSplit: 'auto', unknownAs: 'auto',
  scriptCol: 'script line', visualCol: 'visual guide', showExtraCols: true,
  resolveNumRefs: true, resolveTitleRefs: true, keepBrokenCells: true,
  phoneScale: 100, tabletCols: 'same', myDesigns: [] as { id: string; name: string; values: Record<string, any> }[],
};
export type Settings = typeof DEFAULTS & Record<string, any>;

/* keys re-baselined in schema 2 and 4 — a stale saved value would hide the new defaults */
const RESET_IN_V2 = ['scriptFont', 'scriptSize', 'scriptWeight', 'scriptLeading', 'bodySize', 'labelSize', 'radius', 'maxWidth', 'density'];
const RESET_IN_V4 = ['accent', 'paper', 'uiFont', 'scriptFont', 'bodyFont', 'radius', 'sidebarWidth', 'scriptWeight', 'numWeight', 'cardGap'];

/** Saved settings (local, cloud or inside a share) → full settings on today's schema. */
export function migrateSettings(saved: any, localVersion?: number): Settings {
  const s = { ...(saved || {}) };
  if (localVersion !== undefined && localVersion < 2) RESET_IN_V2.forEach((k) => delete s[k]);
  if (!s.schema || s.schema < SETTINGS_SCHEMA) RESET_IN_V4.forEach((k) => delete s[k]);
  return { ...DEFAULTS, ...s, schema: SETTINGS_SCHEMA };
}

export type SettingsTab = { id: string; label: string; title?: string; hint?: string; group?: string };

export const TABS: SettingsTab[] = [
  { id: 'general', label: 'General', group: 'App', hint: 'Theme, page tone, font and the sidebar.' },
  { id: 'reading', label: 'Reading', hint: 'Sections, sticky headers and the active line.' },
  { id: 'search', label: 'Search', hint: 'What a search looks through and how matches show.' },
  { id: 'behavior', label: 'Copy & links', hint: 'What a click on a chip does and how links open.' },
  { id: 'parsing', label: 'Parsing', group: 'Scripts', hint: 'How the markdown is read: columns, splits and references.' },
  { id: 'tags', label: 'Tags & labels', hint: 'How each tag renders, its colour and where it splits.' },
  { id: 'library', label: 'Library', hint: 'Open, rename, duplicate or delete your scripts.' },
  { id: 'account', label: 'Account & sync', group: 'Account', hint: 'Google sign-in, cloud sync and where settings are saved.' },
  { id: 'sharing', label: 'Sharing', hint: 'Defaults for share links and invites.' },
  { id: 'data', label: 'Data', hint: 'Downloads, exports and clean-up.' },
  { id: 'danger', label: 'Danger zone', group: 'System', hint: 'Resets that cannot be undone.' },
];

export const FONT_OPTIONS: [string, string][] = [
  ['inter', 'Inter'], ['sans', 'Instrument Sans'], ['plex', 'IBM Plex Sans'], ['manrope', 'Manrope'],
  ['atkinson', 'Atkinson Hyperlegible'], ['serif', 'Newsreader (serif)'], ['literata', 'Literata (serif)'],
  ['source', 'Source Serif 4 (serif)'], ['lora', 'Lora (serif)'], ['mono', 'JetBrains Mono'],
];

export type FieldDef = {
  key: string; type: 'range' | 'select' | 'toggle' | 'swatch' | 'text' | 'action'; label: string; hint?: string;
  min?: number; max?: number; step?: number; unit?: string; options?: [string, string][]; actionLabel?: string; danger?: boolean;
};

export const FIELDS: Record<string, FieldDef[]> = {
  general: [
    { key: 'theme', type: 'select', label: 'Theme', options: [['system', 'Same as Windows / macOS'], ['light', 'Light'], ['dark', 'Dark']] },
    { key: 'paper', type: 'select', label: 'Page tone', hint: 'Light theme only', options: [['cool', 'Calm blue'], ['neutral', 'Neutral grey'], ['warm', 'Warm paper']] },
    { key: 'uiFont', type: 'select', label: 'App font', hint: 'Sidebar, buttons and labels', options: [['inter', 'Inter'], ['sans', 'Instrument Sans'], ['plex', 'IBM Plex Sans'], ['manrope', 'Manrope'], ['system', 'System UI'], ['serif', 'Newsreader']] },
    { key: 'showSidebar', type: 'toggle', label: 'Open sidebar', hint: 'Off shows a slim icon rail instead' },
    { key: 'sidebarWidth', type: 'range', label: 'Sidebar width', min: 220, max: 360, step: 2, unit: 'px' },
  ],
  reading: [
    { key: 'stickyHeaders', type: 'toggle', label: 'Sticky section headers', hint: 'The section title stays at the top while you scroll' },
    { key: 'collapseDefault', type: 'toggle', label: 'Start with sections collapsed' },
    { key: 'rememberLine', type: 'toggle', label: 'Remember the active line', hint: 'Come back to the same line next time' },
  ],
  search: [
    { key: 'searchScope', type: 'select', label: 'Search looks in', hint: 'Which text a query is matched against', options: [['context', 'Script line + context'], ['script', 'Script line only'], ['guide', 'Script line + whole guide']] },
    { key: 'searchHighlight', type: 'toggle', label: 'Highlight matches', hint: 'The found words stand out in the result' },
    { key: 'searchExpand', type: 'toggle', label: 'Open sections while searching', hint: 'A collapsed section can never hide a match' },
    { key: 'searchHideEmpty', type: 'toggle', label: 'Hide sections with no match', hint: 'Only sections with a hit stay visible' },
    { key: 'searchLineNumber', type: 'toggle', label: 'A number opens that line', hint: 'Only that line — add a space to search the number as a word' },
  ],
  behavior: [
    { key: 'chipClick', type: 'select', label: 'Click on a chip', options: [['copy', 'Copy it'], ['search', 'Open a search'], ['both', 'Copy + open search']] },
    { key: 'searchEngine', type: 'select', label: 'Search opens in', options: [['youtube', 'YouTube'], ['google', 'Google'], ['gimages', 'Google Images'], ['pexels', 'Pexels'], ['pixabay', 'Pixabay'], ['unsplash', 'Unsplash']] },
    { key: 'copyFormat', type: 'select', label: 'Copy format', options: [['plain', 'Plain text'], ['quoted', 'In "quotes"'], ['prefixed', 'With tag prefix']] },
    { key: 'copyJoin', type: 'select', label: 'Copy-all separator', options: [['comma', 'Comma'], ['newline', 'New line'], ['pipe', 'Pipe |']] },
    { key: 'openNewTab', type: 'toggle', label: 'Open links in a new tab' },
  ],
  parsing: [
    { key: 'autoDetect', type: 'toggle', label: 'Auto-detect unknown tags', hint: 'Guess the type of a new tag by itself' },
    { key: 'unknownAs', type: 'select', label: 'Unknown tag renders as', options: [['auto', 'Auto guess'], ['prose', 'Always prose'], ['chips', 'Always chips']] },
    { key: 'defaultSplit', type: 'select', label: 'Default chip split', options: [['auto', 'Auto (; then ,)'], [';', 'Semicolon'], [',', 'Comma']] },
    { key: 'scriptCol', type: 'text', label: 'Script column header', hint: 'Used to find the script column' },
    { key: 'visualCol', type: 'text', label: 'Visual guide column header' },
    { key: 'showExtraCols', type: 'toggle', label: 'Show extra columns', hint: 'Each extra column becomes a labelled item, coloured like the tag of the same name' },
    { key: 'resolveNumRefs', type: 'toggle', label: 'Resolve [[10]] numbered refs' },
    { key: 'resolveTitleRefs', type: 'toggle', label: 'Resolve ▶️(Title) refs by name' },
    { key: 'keepBrokenCells', type: 'toggle', label: 'Repair broken table cells', hint: 'A | inside a link does not split the cell' },
  ],
  account: [
    { key: 'cloudSync', type: 'toggle', label: 'Cloud sync', hint: 'Live sync through the realtime database' },
    { key: 'syncSettings', type: 'toggle', label: 'Sync settings with your account' },
    { key: 'exportSettings', type: 'action', label: 'Export settings and tags (.json)', actionLabel: 'Export' },
  ],
  sharing: [
    { key: 'defaultShareRole', type: 'select', label: 'Default invite role', options: [['viewer', 'Viewer'], ['commenter', 'Commenter'], ['editor', 'Editor'], ['manager', 'Manager']] },
    { key: 'sharePublicByDefault', type: 'toggle', label: 'Turn the public link on for new shares' },
    { key: 'autoRefreshShare', type: 'toggle', label: 'Update the public copy when content changes' },
    { key: 'defaultSideTab', type: 'select', label: 'Sidebar opens on', options: [['files', 'Scripts'], ['review', 'Review']] },
    { key: 'foldersFirst', type: 'toggle', label: 'Show folders first' },
    { key: 'showReadyCount', type: 'toggle', label: 'Show the ready count in the tree' },
    { key: 'confirmTrash', type: 'toggle', label: 'Ask before moving to trash' },
  ],
  data: [
    { key: 'exportMd', type: 'action', label: 'Download this script (.md)', actionLabel: 'Download' },
    { key: 'exportTerms', type: 'action', label: 'Download all search terms (.txt)', actionLabel: 'Download' },
    { key: 'exportSettings', type: 'action', label: 'Export settings and tags (.json)', actionLabel: 'Export' },
    { key: 'clearDone', type: 'action', label: 'Clear every ready mark on this script', actionLabel: 'Clear', danger: true },
    { key: 'emptyTrash', type: 'action', label: 'Empty trash', actionLabel: 'Empty', danger: true },
  ],
};

export const SEARCH_URLS: Record<string, string> = {
  youtube: 'https://www.youtube.com/results?search_query=',
  google: 'https://www.google.com/search?q=',
  gimages: 'https://www.google.com/search?tbm=isch&q=',
  pexels: 'https://www.pexels.com/search/videos/',
  pixabay: 'https://pixabay.com/videos/search/',
  unsplash: 'https://unsplash.com/s/photos/',
};
const SLUG_ENGINES: Record<string, 1> = { pexels: 1, pixabay: 1, unsplash: 1 };
export function searchUrl(engine: string, term: string) {
  const base = SEARCH_URLS[engine] || SEARCH_URLS.youtube;
  const q = String(term).trim();
  return SLUG_ENGINES[engine] ? base + encodeURIComponent(q.replace(/\s+/g, '-').toLowerCase()) + '/' : base + encodeURIComponent(q);
}

export const ROLES = ['viewer', 'commenter', 'editor', 'manager', 'owner'];
export const RANK: Record<string, number> = { viewer: 1, commenter: 2, editor: 3, manager: 4, owner: 5 };
export const ROLE_SHORT: Record<string, string> = { viewer: 'Viewer', commenter: 'Commenter', editor: 'Editor', manager: 'Manager', owner: 'Owner' };
export const ROLE_HINT: Record<string, string> = {
  viewer: 'Can view and tick lines as ready.',
  commenter: 'Can view, tick lines as ready and write notes.',
  editor: 'Can also change the raw markdown and rename.',
  manager: 'Can do everything and share it further.',
  owner: 'Full control, including delete.',
};

export const APP_TITLE = 'Alamza Scripts';
export const NEW_SCRIPT_MD = '# New section\n\n| Script Line | Visual Guide |\n|---|---|\n|  |  |\n';

export const FONT_FAMILIES: Record<string, string> = {
  inter: "'Inter Variable','Inter','Segoe UI',system-ui,sans-serif",
  sans: "'Instrument Sans',system-ui,sans-serif",
  plex: "'IBM Plex Sans',system-ui,sans-serif",
  manrope: "'Manrope',system-ui,sans-serif",
  atkinson: "'Atkinson Hyperlegible','Inter Variable',system-ui,sans-serif",
  system: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  serif: "'Newsreader',Georgia,serif",
  literata: "'Literata',Georgia,serif",
  source: "'Source Serif 4',Georgia,serif",
  lora: "'Lora',Georgia,serif",
  mono: "'JetBrains Mono',ui-monospace,monospace",
};
