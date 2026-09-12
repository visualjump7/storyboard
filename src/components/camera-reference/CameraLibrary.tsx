'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CameraReference, CameraCategory } from '@/lib/camera-reference/catalog';
import { lockCameraReferences } from '@/app/camera-references/access-actions';
import { MotionStudy, supportsMotion, getMotionDescription } from './MotionStudy';
import { ReferenceVisual } from './ReferenceVisual';
import styles from './CameraLibrary.module.css';

type IconName = 'camera' | 'grid' | 'list' | 'compare' | 'search' | 'star' | 'arrow' | 'play' | 'pause' | 'reset' | 'copy' | 'close' | 'sun' | 'frame' | 'cut' | 'story' | 'spark' | 'film' | 'check';
function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    camera: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /><circle cx="9.5" cy="12" r="3" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    list: <><path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1" /></>,
    compare: <><rect x="2" y="5" width="8" height="14" rx="1" /><rect x="14" y="5" width="8" height="14" rx="1" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    star: <path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.5l6.2-.9Z" />,
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    play: <path d="m8 4 12 8-12 8Z" />, pause: <path d="M8 5v14M16 5v14" />,
    reset: <><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V3H3v12h5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>,
    frame: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M9 4v16M15 4v16M3 10h18M3 14h18" /></>,
    cut: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="m8 8 12 12M8 16 20 4" /></>,
    story: <><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h4" /></>,
    spark: <><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" /></>,
    film: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" /></>,
    check: <path d="m4 12 5 5L20 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const categoryIcons: IconName[] = ['camera', 'sun', 'frame', 'cut', 'story', 'spark', 'film'];
const categoryLabels: Record<string, string> = { 'Camera Work': 'Camera work', 'Visual Effects & Promptable FX': 'Visual effects', 'Genres & Styles': 'Genres & styles' };
type Layout = 'grid' | 'list' | 'compare';
type View = 'split' | 'frame' | 'rig';

function isCamera(r: CameraReference) { return r.category === 'Camera Work'; }

export function CameraLibrary({ projectId, initialShot, cameraReferences, categories }: {
  projectId?: string; initialShot?: string;
  cameraReferences: readonly CameraReference[]; categories: readonly CameraCategory[];
}) {
  const categoryCounts = useMemo(() => Object.fromEntries(categories.map(category => [category, cameraReferences.filter(r => r.category === category).length])), [categories, cameraReferences]);
  const initial = cameraReferences.find(r => r.id === initialShot || r.slug === initialShot) ?? cameraReferences.find(r => r.name === 'Dolly Shot')!;
  const [category, setCategory] = useState<string>(initial.category);
  const [selected, setSelected] = useState(initial.id);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('All techniques');
  const [layout, setLayout] = useState<Layout>('grid');
  const [savedOnly, setSavedOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(.35);
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState<View>('split');
  const [notice, setNotice] = useState('');
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefFields, setBriefFields] = useState<Record<string, string>>({});
  const [purpose, setPurpose] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const briefRef = useRef<HTMLDialogElement>(null);
  const briefTriggerRef = useRef<HTMLButtonElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>();
  const current = cameraReferences.find(r => r.id === selected)!;

  const notify = useCallback((message: string) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4200);
  }, []);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('storyboard.camera-references.saved') || '[]');
      if (Array.isArray(saved)) setFavorites(saved.filter((id): id is string => typeof id === 'string' && cameraReferences.some(r => r.id === id)));
    } catch { /* A corrupt browser preference does not prevent browsing. */ }
    setStorageReady(true);
    const keys = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)))) {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', keys);
    return () => { window.removeEventListener('keydown', keys); clearTimeout(noticeTimer.current); };
  }, [cameraReferences]);

  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem('storyboard.camera-references.saved', JSON.stringify(favorites)); }
    catch { notify('Browser storage is unavailable. Saved references will last for this visit.'); }
  }, [favorites, storageReady, notify]);

  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let previous = performance.now();
    const tick = (time: number) => {
      const delta = Math.min(time - previous, 80) / 8000 * speed;
      previous = time;
      setProgress(p => (p + delta) % 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const pauseHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', pauseHidden);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', pauseHidden); };
  }, [playing, speed]);

  useEffect(() => {
    if (briefOpen) briefRef.current?.showModal();
    else if (briefRef.current?.open) briefRef.current.close();
  }, [briefOpen]);

  const filtered = useMemo(() => cameraReferences.filter(r =>
    (category === 'All references' || r.category === category) &&
    (!savedOnly || favorites.includes(r.id)) &&
    (kind === 'All techniques' || (kind === 'Animated studies' ? supportsMotion(r.name) && isCamera(r) : kind === 'Core palette' ? r.priority === 'Core' : r.function === kind)) &&
    (!query.trim() || `${r.name} ${r.id} ${r.meaning} ${r.application} ${r.direction} ${r.function} ${r.category}`.toLowerCase().includes(query.toLowerCase().trim()))
  ), [cameraReferences, category, savedOnly, favorites, kind, query]);
  const functions = useMemo(() => Array.from(new Set(cameraReferences.filter(r => category === 'All references' || r.category === category).map(r => r.function))), [cameraReferences, category]);
  const compared = compare.map(id => cameraReferences.find(r => r.id === id)!).filter(Boolean);
  const moving = layout === 'compare' ? compared.some(r => isCamera(r) && supportsMotion(r.name)) : isCamera(current) && supportsMotion(current.name);
  const tokens = Array.from(new Set([...current.direction.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])));
  const builtDirection = current.direction.replace(/\[([^\]]+)\]/g, (match, key: string) => briefFields[key]?.trim() || match);
  const briefText = `${current.name}${purpose.trim() ? `\nPurpose: ${purpose.trim()}` : ''}\n\n${builtDirection}\n\nContinuity check: ${current.watch}\nReference: ${current.source}`;

  function choose(r: CameraReference) {
    setSelected(r.id); setProgress(.35); setPlaying(false);
    if (layout === 'compare') setLayout('grid');
    const url = new URL(window.location.href); url.searchParams.set('shot', r.slug);
    window.history.replaceState(null, '', url);
  }
  function changeCategory(next: string, saved = false) {
    setCategory(next); setSavedOnly(saved); setKind('All techniques'); setQuery('');
  }
  function toggleFavorite(id: string) { setFavorites(previous => previous.includes(id) ? previous.filter(x => x !== id) : [...previous, id]); }
  function toggleCompare(id: string) {
    if (compare.includes(id)) setCompare(compare.filter(x => x !== id));
    else if (compare.length < 2) setCompare([...compare, id]);
    else notify('Remove a reference from comparison to choose another.');
  }
  async function copyText(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); notify(label); }
    catch { notify('Clipboard unavailable. Open the shot brief to select and copy the text.'); }
  }
  function closeBrief() { setBriefOpen(false); briefTriggerRef.current?.focus(); }
  function openCompare() {
    if (compare.length === 0) {
      const second = cameraReferences.find(r => r.name === (current.name === 'Crash Zoom' ? 'Dolly Shot' : 'Crash Zoom'))!;
      setCompare([current.id, second.id]);
    }
    setLayout('compare'); setPlaying(false);
  }

  const visual = (r: CameraReference, compact = false, forceView?: View) => isCamera(r)
    ? <MotionStudy name={r.name} compact={compact} view={forceView ?? (compact ? supportsMotion(r.name) ? 'rig' : 'frame' : view)} playing={compact ? false : playing} progress={compact ? .35 : progress} />
    : <ReferenceVisual reference={r} />;

  return <div className={styles.app}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><span className={styles.brandMark}>S</span>Storyboard</Link>
      <span className={styles.headerDivider} />
      <span className={styles.breadcrumb}>Production library <span>/</span> <strong>Camera references</strong></span>
      <Link className={styles.backLink} href={projectId ? `/p/${projectId}` : '/'}><Icon name="arrow" size={15} /><span>{projectId ? 'Back to storyboard' : 'All projects'}</span></Link>
      <form action={lockCameraReferences}><button className={styles.lockButton} type="submit">Lock section</button></form>
    </header>

    <aside className={styles.sidebar}>
      <div className={styles.libraryMark}><Icon name="camera" size={25} /><div>CINEMATIQUE<span>THE REFERENCE LIBRARY</span></div></div>
      <p className={styles.sideLabel}>EXPLORE</p>
      <nav aria-label="Reference categories" className={styles.categoryNav}>
        <button aria-label="All references" aria-pressed={category === 'All references' && !savedOnly} title="All references" className={category === 'All references' && !savedOnly ? styles.navActive : ''} onClick={() => changeCategory('All references')}><Icon name="grid" /><span>All references</span><small>150</small></button>
        {categories.map((c, i) => <button key={c} aria-label={categoryLabels[c] || c} title={categoryLabels[c] || c} aria-pressed={category === c && !savedOnly} className={category === c && !savedOnly ? styles.navActive : ''} onClick={() => changeCategory(c)}><Icon name={categoryIcons[i]} /><span>{categoryLabels[c] || c}</span><small>{categoryCounts[c as keyof typeof categoryCounts]}</small></button>)}
      </nav>
      <p className={styles.sideLabel}>YOUR COLLECTION</p>
      <button aria-label={`Saved references (${favorites.length})`} aria-pressed={savedOnly} title="Saved references" className={`${styles.savedNav} ${savedOnly ? styles.navActive : ''}`} onClick={() => changeCategory('All references', true)}><Icon name="star" /><span>Saved references</span><small>{favorites.length}</small></button>
      <div className={styles.sideNote}><span className={styles.onlineDot} /> A little more intention.<br /><span>A better frame.</span></div>
      <div className={styles.sideFooter}>Based on Cinematique by VVS.<br /><a href="https://vvsvs.pro/cinematique" target="_blank" rel="noreferrer">Explore the source ↗</a><br /><span>Saved references stay in this browser.</span></div>
    </aside>

    <main className={styles.main}>
      <div className={styles.titleRow}><div><p className={styles.kicker}>THE ART OF SEEING</p><h1>Camera references<span>.</span></h1><p className={styles.intro}>Find the frame. Understand the move. Shape the shot.</p></div><div className={styles.libraryTotal}><strong>150</strong><span>techniques<br />7 disciplines</span></div></div>

      <div className={styles.toolbar}>
        <label className={styles.search}><Icon name="search" /><input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search shots, movement, light…" aria-label="Search references" />{query ? <button onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={15} /></button> : <kbd>/</kbd>}</label>
        <select aria-label="Filter technique type" value={kind} onChange={e => setKind(e.target.value)}><option>All techniques</option><option>Animated studies</option><option>Core palette</option>{functions.map(f => <option key={f}>{f}</option>)}</select>
        <div className={styles.viewSwitch} aria-label="Library view">{(['grid', 'list', 'compare'] as Layout[]).map(v => <button key={v} aria-label={`${v[0].toUpperCase() + v.slice(1)} view`} aria-pressed={layout === v} className={layout === v ? styles.switchActive : ''} onClick={() => v === 'compare' ? openCompare() : setLayout(v)}><Icon name={v} size={17} /><span>{v === 'compare' ? 'Compare' : v === 'grid' ? 'Gallery' : 'List'}</span></button>)}</div>
      </div>

      <section className={styles.studio} aria-label={layout === 'compare' ? 'Compare references' : `${current.name} study`}>
        <div className={styles.studioTop}><div><span className={styles.studioDot} />{layout === 'compare' ? 'SIDE BY SIDE' : 'SHOT EXPLORER'}<span className={styles.studyHint}>{layout === 'compare' ? 'Same scene. Different choices.' : 'See the idea in motion'}</span></div><span className={styles.simulationLabel}>ILLUSTRATIVE STUDIES</span></div>
        {layout === 'compare' ? <div className={styles.compareGrid}>
          {[0, 1].map(i => compared[i] ? <div className={styles.compareItem} key={compared[i].id}><div className={styles.compareTitle}><select aria-label={`Comparison reference ${i + 1}`} value={compared[i].id} onChange={e => setCompare(previous => previous.map((id, index) => index === i ? e.target.value : id))}>{cameraReferences.filter(r => r.id === compared[i].id || !compare.includes(r.id)).map(r => <option value={r.id} key={r.id}>{r.name}</option>)}</select><button onClick={() => setCompare(compare.filter(id => id !== compared[i].id))} aria-label={`Remove ${compared[i].name} from comparison`}><Icon name="close" size={16} /></button></div><div className={styles.compareVisual}>{visual(compared[i], false, 'frame')}</div><p>{compared[i].meaning}</p><span>{compared[i].function}</span></div> : <div className={styles.compareEmpty} key={i}><Icon name="compare" size={30} /><h3>Choose a second perspective</h3><p>Use the compare control on a reference below.</p><select aria-label="Add comparison reference" value="" onChange={e => setCompare([...compare, e.target.value])}><option value="" disabled>Select a reference</option>{cameraReferences.filter(r => !compare.includes(r.id)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>)}
        </div> : <div className={styles.studyBody}>
          <div className={styles.stage}>
            <div className={styles.stageTools}><span>{current.id}<b> / </b>{isCamera(current) ? 'CAMERA LAB' : current.category.toUpperCase()}</span>{isCamera(current) && <div>{(['split', 'frame', 'rig'] as View[]).map(v => <button key={v} className={view === v ? styles.stageToolActive : ''} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'split' ? 'Both views' : v === 'frame' ? 'Through lens' : 'Camera path'}</button>)}</div>}</div>
            <div className={styles.stageVisual} key={current.id}>{visual(current)}</div>
            <div className={styles.stageCaption}>{isCamera(current) ? getMotionDescription(current.name) : 'Concept illustration · use the direction notes for the specific technique.'}</div>
          </div>
          <div className={styles.inspector}>
            <div className={styles.inspectorMeta}><span>{current.function}</span><button onClick={() => toggleFavorite(current.id)} aria-label={`${favorites.includes(current.id) ? 'Unsave' : 'Save'} ${current.name}`} aria-pressed={favorites.includes(current.id)} className={favorites.includes(current.id) ? styles.favorited : ''}><Icon name="star" size={20} /></button></div>
            <h2>{current.name}</h2><p className={styles.meaning}>{current.meaning}</p>
            <div className={styles.useFor}><span>WHEN TO USE IT</span><p>{current.application}</p></div>
            <div className={styles.tags}><span>{current.priority} palette</span><span>{current.complexity} complexity</span></div>
            <div className={styles.inspectorActions}><button className={styles.primaryButton} onClick={() => copyText(current.direction, 'Direction copied. Paste it into a storyboard scene.')}><Icon name="copy" size={16} />Copy direction</button><button className={styles.compareButton} onClick={() => toggleCompare(current.id)} aria-label={`${compare.includes(current.id) ? 'Remove from' : 'Add to'} comparison`} aria-pressed={compare.includes(current.id)}><Icon name={compare.includes(current.id) ? 'check' : 'compare'} size={18} /></button></div>
            <button ref={briefTriggerRef} className={styles.briefLink} onClick={() => { setBriefFields({}); setPurpose(''); setBriefOpen(true); }}>Customize shot brief <span>↗</span></button>
          </div>
        </div>}
        <div className={styles.transport}>
          <button className={styles.playButton} disabled={!moving} onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause study' : 'Play study'}><Icon name={playing ? 'pause' : 'play'} size={17} /></button>
          <button className={styles.resetButton} disabled={!moving} onClick={() => { setProgress(0); setPlaying(false); }} aria-label="Restart study"><Icon name="reset" size={16} /></button>
          <span className={styles.timecode}>{(progress * 8).toFixed(1)}<span> / 8.0s</span></span>
          <input type="range" aria-label="Study timeline" min="0" max="1" step=".001" value={progress} disabled={!moving} onChange={e => { setPlaying(false); setProgress(Number(e.target.value)); }} />
          <select aria-label="Playback speed" value={speed} disabled={!moving} onChange={e => setSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select>
          <span className={styles.transportLabel}>{moving ? 'LOOP PREVIEW' : 'STATIC STUDY'}</span>
        </div>
      </section>

      <div className={styles.resultsHeading}><div><h2>{savedOnly ? 'Saved references' : category === 'All references' ? 'All references' : categoryLabels[category] || category}</h2><span aria-live="polite">{filtered.length} {filtered.length === 1 ? 'reference' : 'references'}</span></div><p>{compare.length > 0 ? <button onClick={openCompare}><Icon name="compare" size={15} />Compare selected ({compare.length}/2)</button> : 'A visual vocabulary for every scene.'}</p></div>

      {filtered.length === 0 ? <div className={styles.empty}><Icon name={savedOnly ? 'star' : 'search'} size={30} /><h3>{savedOnly && !favorites.length ? 'Keep your go-to references here.' : 'No references match these filters.'}</h3><p>{savedOnly && !favorites.length ? 'Save a reference with its star to build your own collection.' : 'Try a different word, category, or technique type.'}</p><button onClick={() => { changeCategory('All references'); }}>Browse all references</button></div> : <div className={layout === 'list' ? styles.list : styles.gallery}>
        {filtered.map(r => <article key={r.id} className={`${styles.card} ${r.id === current.id ? styles.selectedCard : ''}`}>
          <button className={styles.cardSelect} onClick={() => choose(r)} aria-label={`Explore ${r.name}`} aria-pressed={r.id === current.id}>
            <div className={styles.cardVisual}>{visual(r, true)}<span className={styles.cardId}>{r.id.replace('VVS-', '')}</span>{isCamera(r) && supportsMotion(r.name) && <span className={styles.motionBadge}><Icon name="play" size={10} />MOTION</span>}</div>
            <div className={styles.cardText}><span>{r.function}</span><h3>{r.name}<span>↗</span></h3><p>{r.meaning}</p></div>
          </button>
          <div className={styles.cardFooter}><span>{r.priority}<i />{r.category === 'Camera Work' ? 'Camera work' : r.category === 'Visual Effects & Promptable FX' ? 'Visual effects' : r.category}</span><button onClick={() => toggleCompare(r.id)} aria-label={`${compare.includes(r.id) ? 'Remove' : 'Compare'} ${r.name}`} aria-pressed={compare.includes(r.id)} className={compare.includes(r.id) ? styles.favorited : ''}><Icon name={compare.includes(r.id) ? 'check' : 'compare'} size={15} /></button><button onClick={() => toggleFavorite(r.id)} aria-label={`${favorites.includes(r.id) ? 'Unsave' : 'Save'} ${r.name}`} aria-pressed={favorites.includes(r.id)} className={favorites.includes(r.id) ? styles.favorited : ''}><Icon name="star" size={16} /></button></div>
        </article>)}
      </div>}

      <details className={styles.notes}><summary>Direction notes & source · {current.name}</summary><div><p><strong>Working direction</strong>{current.direction}</p><p><strong>Continuity check</strong>{current.watch}</p><p><strong>Source & review</strong>Cataloged {current.reviewed_date}. {current.visual_review}. Source footage {current.motion_review.toLowerCase()}. These original procedural studies illustrate mechanisms; they are not source footage or tested generation results. <a href={current.source} target="_blank" rel="noreferrer">Open source guide ↗</a></p></div></details>
      <footer className={styles.footer}><span>CINEMATIQUE <b>×</b> STORYBOARD</span><span>Choose with intention.</span></footer>
    </main>

    {notice && <div className={styles.toast} role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><Icon name="close" size={14} /></button></div>}
    <dialog ref={briefRef} className={styles.dialog} aria-labelledby="shot-brief-title" onCancel={closeBrief} onClose={closeBrief} onClick={e => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) closeBrief(); } }}>
      <div className={styles.dialogHeading}><div><p className={styles.kicker}>MAKE IT YOUR SHOT</p><h2 id="shot-brief-title">{current.name}</h2></div><button aria-label="Close shot brief" onClick={closeBrief}><Icon name="close" /></button></div>
      <label className={styles.briefField}>Story purpose<input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="What should this shot make us understand?" /></label>
      <div className={styles.briefFields}>{tokens.map(token => <label key={token} className={styles.briefField}>{token}<input value={briefFields[token] || ''} placeholder={`Enter ${token}`} onChange={e => setBriefFields({ ...briefFields, [token]: e.target.value })} /></label>)}</div>
      <label className={styles.briefField}>Your shot brief<textarea readOnly rows={9} value={briefText} onFocus={e => e.currentTarget.select()} /></label>
      <div className={styles.dialogFooter}><span>Copy this into your scene’s prompt.</span><button className={styles.primaryButton} onClick={() => copyText(briefText, 'Shot brief copied.')}><Icon name="copy" size={16} />Copy shot brief</button></div>
      {briefOpen && notice && <p role="status" className={styles.dialogNotice}>{notice}</p>}
    </dialog>
  </div>;
}
