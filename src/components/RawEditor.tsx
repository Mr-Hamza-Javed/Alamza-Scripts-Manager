import { useMemo } from 'react';
import { highlight } from '../lib/util';
import { ICONS } from '../ui/icons';
import { Badge, Button, IconTile } from '../ui/kit';
import type { P } from './Layout';

export function RawEditor({ app, v }: P) {
  const st = app.state;
  const a = v.a;
  const raw = st.draft === null ? a.raw : st.draft;
  const dirty = st.draft !== null && st.draft !== a.raw;
  const nl = raw.split('\n').length;
  const html = useMemo(() => ({ __html: highlight(raw) + '\n' }), [raw]);
  const gutter = useMemo(() => Array.from({ length: nl }, (_x, i) => i + 1).join('\n'), [nl]);
  return (
    <section className="card raw-card">
      <div className="raw-bar">
        <IconTile icon={ICONS.parsingTile} tone="purple" size={34} />
        <div className="raw-title">
          <b>Raw markdown</b>
          <small className="num">{nl} lines · {v.doc.total} script lines · {v.doc.sections.length} sections</small>
        </div>
        <span style={{ flex: 1 }} />
        {dirty && <Badge tone="orange">Unsaved changes</Badge>}
        {dirty && <Button size="sm" variant="ghost" icon={ICONS.restore} onClick={app.revertRaw}>Revert</Button>}
        <Button size="sm" variant="primary" icon={ICONS.save} onClick={app.saveRaw}>Save &amp; render</Button>
      </div>
      <div className="raw-wrap" id="rawwrap">
        <div className={`raw-canvas${v.mob ? ' wrap' : ''}`}>
          {!v.mob && <div className="raw-gutter num" aria-hidden="true">{gutter}</div>}
          <div className="raw-area">
            <pre className="rawhl" aria-hidden="true" dangerouslySetInnerHTML={html} />
            <textarea value={raw} spellCheck={false} aria-label="Raw markdown editor"
              onChange={(e) => app.setState({ draft: e.currentTarget.value })}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); app.saveRaw(); }
              }} />
          </div>
        </div>
      </div>
    </section>
  );
}
