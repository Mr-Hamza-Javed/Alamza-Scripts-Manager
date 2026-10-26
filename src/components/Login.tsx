import { ICONS } from '../ui/icons';
import { Button, Icon, Spinner } from '../ui/kit';
import type { P } from './Layout';

function BrandRow({ sub }: { sub: string }) {
  return (
    <div className="auth-brand">
      <img src="./favicon.svg" alt="" className="brand-logo xl" />
      <div>
        <div className="auth-name">Alamza Scripts</div>
        <div className="text-2">{sub}</div>
      </div>
    </div>
  );
}

export function Loading({ info }: { info: { kicker: string; title: string; detail: string } }) {
  return (
    <div className="auth-wrap" role="status" aria-live="polite" aria-busy="true">
      <div className="splash">
        <BrandRow sub="Visual guide reader for video editors" />
        <div>
          <div className="menu-label flat">{info.kicker}</div>
          <div className="auth-title">{info.title}</div>
          <div className="muted">{info.detail}</div>
        </div>
        <div className="progress" />
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const POINTS = [
  { title: 'Every tag in its place', text: 'Context, B-roll, overlays and sources each get their own row.' },
  { title: 'Click to copy', text: 'Search terms and article shots go to the clipboard in one click.' },
  { title: 'Ready tracking', text: 'Tick each line; see progress per section and for the script.' },
  { title: 'Share a link', text: 'Your team reads it and marks footage ready — nothing more.' },
];

export function Login({ app }: P) {
  const st = app.state;
  return (
    <div className="auth-wrap">
      <div className="auth-card login-card">
        <BrandRow sub="Visual guide reader for video editors" />
        <div>
          <div className="auth-title">Sign in</div>
          <div className="muted">Your scripts, folders and settings on every device — and share links for your team.</div>
        </div>
        <ul className="auth-points">
          {POINTS.map((p) => (
            <li key={p.title}>
              <span className="auth-check"><Icon icon={ICONS.check} size={10} /></span>
              <span><b>{p.title}</b><small>{p.text}</small></span>
            </li>
          ))}
        </ul>
        {st.loginError && (
          <div key={st.loginTries} className="note-bar error shake">
            <Icon icon={ICONS.errorSm} size={18} />
            <span>{st.loginError}</span>
          </div>
        )}
        <button type="button" className="btn primary block google-btn" onClick={app.signIn} disabled={st.loginBusy}>
          {st.loginBusy ? <Spinner size={16} /> : <span className="g-badge"><GoogleMark /></span>}
          <span className="btn-label">{st.loginBusy ? 'Signing in…' : 'Continue with Google'}</span>
        </button>
        <div className="auth-or"><span>or</span></div>
        <Button block onClick={app.skipLogin} icon={ICONS.person}>Continue without an account</Button>
        <span className="muted auth-foot">Without an account your scripts stay in this browser only, and sharing is off.</span>
        {st.loginOpen && <Button variant="ghost" size="sm" onClick={() => app.setState({ loginOpen: false })}>Back to the app</Button>}
      </div>
    </div>
  );
}
