import { memo, type CSSProperties } from 'react';
import type App from '../App';
import { ICONS } from '../ui/icons';
import { Button, Icon } from '../ui/kit';
import type { Disp, ItemView, LineView, SectionView } from '../view';
import type { P } from './Layout';

export function Reader({ app, v }: P) {
  const S = v.S;
  const st = app.state;
  const cls = [
    'reader',
    S.viewStyle === 'doc' && 'doc',
    S.viewStyle === 'doc' && S.docZebra && 'zebra',
    (S.viewStyle === 'doc' || S.cardBorders) ? 'bordered' : 'borderless',
    S.cardShadow && S.viewStyle !== 'doc' && 'shadowed',
    S.focusMode && st.activeLine && 'focusing',
    'as-' + (S.activeStyle || 'ring'),
    'label-' + (S.labelStyle || 'pill'),
    S.stickyHeaders && 'sticky',
  ].filter(Boolean).join(' ');
  return (
    <div className="reader-scroll" id="scrollmain">
      <div className={cls} style={v.vars as CSSProperties}>
        {v.empty && !v.sharedMode && <EmptyLibrary app={app} />}
        {v.noResults && (
          <div className="empty">
            <Icon icon={ICONS.search} size={24} color="muted" />
            <span>No line matches. Try another filter or search.</span>
            <Button size="sm" onClick={() => app.setState({ query: '', filter: 'all' })}>Clear search and filter</Button>
          </div>
        )}
        {v.sections.map((s) => <SectionBlock key={s.si} s={s} app={app} disp={v.disp} hlq={v.hlq} />)}
      </div>
    </div>
  );
}

function EmptyLibrary({ app }: { app: App }) {
  return (
    <div className="card empty-card">
      <img src="./favicon.svg" alt="" className="brand-logo lg" />
      <div className="card-title">No script open</div>
      <div className="card-sub">Create a new script, or import a .md / .txt file from the library.</div>
      <Button variant="primary" icon={ICONS.newScript} onClick={() => app.create('script', 'root')}>New script</Button>
    </div>
  );
}

function SectionBlock({ s, app, disp, hlq }: { s: SectionView; app: App; disp: Disp; hlq: string }) {
  return (
    <div id={'sec-' + s.si} className="section">
      <div className={`sec-head${s.achieved ? ' achieved' : ''}${s.open ? '' : ' closed'}`} onClick={() => app.toggleSection(s.si)} role="button" aria-expanded={s.open}>
        <span className="sec-chev"><Icon icon={ICONS.chevronDown} size={12} /></span>
        <span className="sec-kicker num">SEC {s.si + 1}</span>
        <span className="sec-title" title={s.title}>{s.title}</span>
        {s.badge && <span className="badge blue sec-badge">{s.badge}</span>}
        {s.hasLines ? (
          <>
            <button type="button" className="sec-btn" title="Copy this section's script as Markdown, without the visual guide" aria-label="Copy this section"
              onClick={(e) => { e.stopPropagation(); app.copySection(s.si); }}>
              <Icon icon={ICONS.copySm} size={14} />
            </button>
            <button type="button" className={`sec-btn mark${s.allReady ? ' on' : ''}`} title={s.allReady ? 'Section ready — click to unmark' : 'Mark the whole section as ready'}
              aria-label={s.allReady ? 'Unmark section' : 'Mark section as ready'} onClick={(e) => { e.stopPropagation(); app.markSection(s.si); }}>
              <Icon icon={s.allReady ? ICONS.checkCircleOn : ICONS.checkCircle} size={16} />
            </button>
            <span className="sec-count num">{s.count}<span className="w-long"> lines</span></span>
            <span className="sec-bar"><span style={{ width: s.pct + '%' }} /></span>
          </>
        ) : (
          <span className="sec-count">Notes</span>
        )}
      </div>
      {s.open && (
        <>
          {s.notes.length > 0 && (
            <div className="sec-notes">
              <div className="sec-notes-label">Notes outside the table</div>
              {s.notes.map((n, i) => <p key={i}>{n}</p>)}
            </div>
          )}
          <div className="sec-lines">
            {s.lines.map((lv) => <LineCard key={lv.l.id} l={lv.l} items={lv.items} active={lv.active} done={lv.done} motion={lv.motion} achieved={lv.achieved} disp={disp} hlq={hlq} app={app} />)}
          </div>
        </>
      )}
    </div>
  );
}

type LineProps = { l: LineView['l']; items: ItemView[]; active: boolean; done: boolean; motion: string; achieved: boolean; disp: Disp; hlq: string; app: App };

/* One script line. Memoised: a click elsewhere never re-renders the other 200 cards. */
const LineCard = memo(function LineCard({ l, items, active, done, motion, achieved, disp, hlq, app }: LineProps) {
  return (
    <div id={'line-' + l.id} data-line={l.id} aria-current={active || undefined} onClick={() => app.setActiveLine(l.id)}
      className={`line-card${active ? ' active' : ''}${done ? ' done' : ''}${l.n % 2 === 0 ? ' even' : ''}${motion}`}>
      <div className="line-head">
        {disp.nums && <span className="line-num num">{l.n}</span>}
        <div className="line-main">
          {l.video && (
            <span className="video-badge"><Icon icon={ICONS.play} size={10} />INSERT VIDEO{l.range ? ' · ' + l.range : ''}</span>
          )}
          <p className="line-text" dangerouslySetInnerHTML={hit(l.text, hlq)} />
          {disp.transcript && l.transcript && <p className="line-transcript">{l.transcript}</p>}
        </div>
        <div className="line-tools">
          {disp.copyBtn && (l.text || l.transcript) && (
            <button type="button" className="line-btn" aria-label="Copy this line" title="Copy this script line"
              onClick={(e) => { e.stopPropagation(); app.copyLine(l.id); }}>
              <Icon icon={ICONS.copySm} size={14} />
            </button>
          )}
          {disp.checks && (
            <button type="button" className={`ready-check${done ? ' on' : ''}${achieved ? ' ready-achieved' : ''}`} aria-pressed={done}
              aria-label={done ? 'Ready — click to unmark' : 'Mark footage ready'} title={done ? 'Ready — click to unmark' : 'Mark footage ready'}
              onClick={(e) => { e.stopPropagation(); app.toggleDone(l.id); }}>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 5.2l2.4 2.4L8.6 2.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
        </div>
      </div>
      {items.length > 0 && (
        <div className="guide">
          {items.map((it, i) => <GuideItemView key={i} it={it} lineId={l.id} disp={disp} app={app} />)}
        </div>
      )}
    </div>
  );
});

function hit(text: string, q: string) {
  const s = String(text || '');
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!q) return { __html: esc(s) };
  const hay = s.toLowerCase();
  let out = '', i = 0;
  for (;;) {
    const at = hay.indexOf(q, i);
    if (at < 0) { out += esc(s.slice(i)); break; }
    out += esc(s.slice(i, at)) + '<mark class="q-hit">' + esc(s.slice(at, at + q.length)) + '</mark>';
    i = at + q.length;
  }
  return { __html: out };
}

function GuideItemView({ it, lineId, disp, app }: { it: ItemView; lineId: string; disp: Disp; app: App }) {
  const style = { '--tag': it.color, '--tag-soft': it.soft } as CSSProperties;
  const label = <span className="gi-label">{it.label}</span>;
  if (it.render === 'chips') {
    return (
      <div className="gi gi-row" style={style}>
        {label}
        {it.chips.map((c, i) => (
          <span key={i} className="chip" title={disp.chipHint} role="button" tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); app.chipClick(c.v, it.label, lineId); }} dangerouslySetInnerHTML={c.html} />
        ))}
      </div>
    );
  }
  if (it.render === 'overlay') {
    return (
      <div className="gi gi-row" style={style}>
        {label}
        {it.chips.map((c, i) => (
          <span key={i} className="overlay-chip" title="Click to copy" role="button" tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); app.setActiveLine(lineId); app.copy(c.v, it.label); }} dangerouslySetInnerHTML={c.html} />
        ))}
      </div>
    );
  }
  if (it.render === 'links') {
    return (
      <div className="gi gi-row" style={style}>
        {label}
        {it.links.map((s, i) => (s.u ? (
          <a key={i} className="src-chip" href={s.u} target={disp.target} rel="noopener noreferrer" title={s.t} onClick={(e) => e.stopPropagation()}>
            {s.fav && <img src={s.fav} alt="" width={14} height={14} loading="lazy" decoding="async" />}
            <span className="src-t" dangerouslySetInnerHTML={s.tHtml} />
            {disp.domain && s.d && <span className="src-d">{s.d}</span>}
          </a>
        ) : (
          <span key={i} className="src-chip missing" title="No link in the script — click to copy the title" role="button" tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); app.setActiveLine(lineId); app.copy(s.t, it.label); }}>
            <span className="src-t" dangerouslySetInnerHTML={s.tHtml} />
          </span>
        )))}
      </div>
    );
  }
  return (
    <p className="gi gi-prose" style={style}>
      {label}
      <span dangerouslySetInnerHTML={it.bodyHtml} />
    </p>
  );
}
