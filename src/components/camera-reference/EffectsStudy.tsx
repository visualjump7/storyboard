'use client';

import { memo, useId } from 'react';
import { StudyScene } from './StudyScene';

type StudyProps = { name: string; progress: number; compact?: boolean; imageUrl?: string; view?: 'effect' | 'split' | 'original' };
type StudyInfo = { description: string; phaseLabels: [string, string]; kind: 'effect' };
const effect = (description: string, from: string, to: string): StudyInfo => ({ description, phaseLabels: [from, to], kind: 'effect' });

export const EFFECT_STUDIES: Record<string, StudyInfo> = {
  'Color Grading': effect('The same image moves into a warm-highlight, cool-shadow finish with stronger tonal separation. Color grading changes color and tone, not the light direction.', 'Neutral image', 'Warm highlights / cool shadows'),
  Desaturation: effect('The actual image loses color progressively while its luminance relationships remain readable.', 'Full color', 'Monochrome'),
  'Sepia Tone': effect('The actual image becomes a warm brown near-monochrome treatment, retaining light and dark detail.', 'Original color', 'Brown-toned monochrome'),
  'Film Grain': effect('A fine, changing texture is applied over the same image; source features stay fixed. The magnified inset makes the texture easier to inspect.', 'Clean image', 'Fine changing grain'),
  Bokeh: effect('The foreground subject stays sharp as background windows and their fixed lights fall out of focus. Each highlight expands around its real source position.', 'Deeper focus', 'Defocused background highlights'),
  'Forced Perspective': effect('A nearby hand and a distant person line up from one camera position. A sideways camera move exposes their different depths through parallax.', 'Camera reveals depth', 'Hand and distant person aligned'),
  'Lens Distortion': effect('A consistent barrel profile bends the building edges and reference grid together. The optical center stays fixed.', 'Straight projection', 'Barrel distortion'),
  'Morphing / Dissolve Effect': effect('A single copper form changes continuously from a sphere to a star. Its outline and reflected bands deform while the environment remains fixed.', 'Copper sphere', 'Copper star'),
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
type Point = [number, number];

function Caption({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return <g><rect y="291" width="600" height="39" fill="#101b22" fillOpacity=".96" />{!compact && <text x="20" y="316" fontFamily="system-ui, sans-serif" fontSize="13" fill="#d4e0e2">{children}</text>}</g>;
}

function Label({ x, y, children, anchor = 'start', fill = '#e4e6dc' }: { x: number; y: number; children: React.ReactNode; anchor?: 'start' | 'middle' | 'end'; fill?: string }) {
  return <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize="13" fontFamily="system-ui, sans-serif">{children}</text>;
}

function BaseScene({ id, imageUrl }: { id: string; imageUrl?: string }) {
  return imageUrl ? <image href={imageUrl} width="600" height="330" preserveAspectRatio="xMidYMid slice" /> : <StudyScene idPrefix={id} time={0} />;
}

function ColorPass({ name, p, id, imageUrl }: { name: string; p: number; id: string; imageUrl?: string }) {
  const isSepia = name === 'Sepia Tone';
  // Linear interpolation from identity preserves a true unmodified frame at 0.
  const sepia = [.393, .769, .189, 0, 0, .349, .686, .168, 0, 0, .272, .534, .131, 0, 0, 0, 0, 0, 1, 0];
  const identity = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  const sepiaValues = identity.map((v, i) => mix(v, sepia[i], p)).join(' ');
  return <g>
    <defs>
      <filter id={`${id}-look`} colorInterpolationFilters="sRGB">
        {name === 'Desaturation' ? <feColorMatrix type="saturate" values={String(1 - p)} /> : isSepia ? <feColorMatrix type="matrix" values={sepiaValues} /> : <>
          <feComponentTransfer>
            <feFuncR type="table" tableValues={`${.018 * p} ${mix(.25, .2, p)} ${mix(.5, .54, p)} ${mix(.75, .84, p)} ${mix(1, 1, p)}`} />
            <feFuncG type="table" tableValues={`${.052 * p} ${mix(.25, .24, p)} ${mix(.5, .49, p)} ${mix(.75, .75, p)} ${mix(1, .97, p)}`} />
            <feFuncB type="table" tableValues={`${.08 * p} ${mix(.25, .28, p)} ${mix(.5, .43, p)} ${mix(.75, .66, p)} ${mix(1, .88, p)}`} />
          </feComponentTransfer>
          <feColorMatrix type="saturate" values={String(1 + p * .08)} />
        </>}
      </filter>
    </defs>
    <g filter={`url(#${id}-look)`}><BaseScene id={`${id}-base`} imageUrl={imageUrl} /></g>
  </g>;
}

function GrainPass({ p, id, imageUrl, compact }: { p: number; id: string; imageUrl?: string; compact?: boolean }) {
  const seed = 7 + Math.floor(p * 151);
  return <g>
    <defs>
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".82" numOctaves="3" seed={seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <clipPath id={`${id}-inset`}><rect x="402" y="31" width="172" height="115" rx="6" /></clipPath>
    </defs>
    <BaseScene id={`${id}-grain-base`} imageUrl={imageUrl} />
    <rect width="600" height="330" filter={`url(#${id}-grain)`} opacity={p * .29} style={{ mixBlendMode: 'soft-light' }} />
    {!compact && <>
      <g clipPath={`url(#${id}-inset)`}>
        <rect x="402" y="31" width="172" height="115" fill="#607781" />
        <path d="M402 90H574" stroke="#b4c9c4" strokeWidth="15" />
        <g transform="translate(-805,-85) scale(3)"><rect x="402" y="31" width="172" height="115" filter={`url(#${id}-grain)`} opacity={p * .5} style={{ mixBlendMode: 'overlay' }} /></g>
      </g>
      <rect x="402" y="31" width="172" height="115" rx="6" fill="none" stroke="#bfd1ca" strokeOpacity=".6" />
      <rect x="415" y="117" width="147" height="23" rx="4" fill="#13232c" />
      <Label x={488} y={133} anchor="middle">Grain · 3× detail</Label>
    </>}
  </g>;
}

function BokehPass({ p, id }: { p: number; id: string }) {
  const bulbs = [[44, 99], [120, 117], [176, 135], [419, 131], [481, 106], [555, 84]];
  return <g>
    <defs>
      <linearGradient id={`${id}-bokeh-sky`} x2="0" y2="1"><stop stopColor="#234552" /><stop offset="1" stopColor="#516d71" /></linearGradient>
      <linearGradient id={`${id}-cup`}><stop stopColor="#426d72" /><stop offset=".42" stopColor="#a3c1b8" /><stop offset=".8" stopColor="#629393" /><stop offset="1" stopColor="#335d62" /></linearGradient>
      <filter id={`${id}-background-blur`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={p * 6} /></filter>
      <radialGradient id={`${id}-bokeh-disc`}><stop stopColor="#ffdc9c" stopOpacity=".32" /><stop offset=".76" stopColor="#ffdc9c" stopOpacity=".46" /><stop offset=".97" stopColor="#ffe8b1" stopOpacity=".72" /><stop offset="1" stopColor="#ffe8b1" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width="600" height="330" fill={`url(#${id}-bokeh-sky)`} />
    <g filter={`url(#${id}-background-blur)`}>
      <path d="M0 24H191V218H0ZM419 0H600V218H419Z" fill="#7b6659" />
      {[20, 81, 142, 443, 504, 565].map((x) => <g key={x}><rect x={x} y="42" width="28" height="39" fill="#274350" /><rect x={x} y="155" width="28" height="38" fill="#2a4753" /><path d={`M${x + 14} 42V81M${x} 62H${x + 28}M${x} 174H${x + 28}`} stroke="#a89678" strokeWidth="2" /></g>)}
      <path d="M0 230L300 169L600 227V291H0Z" fill="#465159" />
      <path d="M0 284L300 181L600 285M0 253L300 181L600 253" fill="none" stroke="#a5987c" strokeOpacity=".4" />
      <path d="M20 80Q294 193 578 65" fill="none" stroke="#142d36" strokeWidth="2" />
      {bulbs.map(([x, y]) => <g key={x}><path d={`M${x} ${y - 15}V${y - 4}`} stroke="#23343c" strokeWidth="2" /><circle cx={x} cy={y} r="4" fill="#ffe0a3" /></g>)}
    </g>
    {bulbs.map(([x, y], i) => <circle key={x} cx={x} cy={y} r={3 + p * (15 + i % 3 * 4)} fill={p < .04 ? '#ffe0a3' : `url(#${id}-bokeh-disc)`} opacity={.96 - .15 * p} />)}
    <path d="M0 267L600 254V330H0Z" fill="#865e48" /><path d="M0 284L600 273M74 267L109 330M466 258L510 330" stroke="#4d382f" strokeWidth="2" />
    <ellipse cx="297" cy="274" rx="91" ry="13" fill="#392f2a" opacity=".5" />
    <ellipse cx="296" cy="268" rx="88" ry="12" fill="#c8bca4" /><ellipse cx="296" cy="267" rx="66" ry="6" fill="#8eafa6" />
    <path d="M240 173L250 245Q294 274 340 246L351 173Z" fill={`url(#${id}-cup)`} />
    <path d="M351 187Q390 179 383 214Q377 238 346 228" stroke="#739f9d" strokeWidth="10" fill="none" /><path d="M351 187Q390 179 383 214" stroke="#bbd2c7" strokeWidth="3" fill="none" />
    <ellipse cx="295" cy="173" rx="56" ry="12" fill="#bdd2c8" /><ellipse cx="295" cy="174" rx="48" ry="8" fill="#5c3b2d" />
    <path d="M266 202V238" stroke="#cad9c9" strokeWidth="4" opacity=".55" />
    <rect x="22" y="20" width="180" height="27" rx="5" fill="#142630" fillOpacity=".9" /><Label x={35} y={39}>Background focus decreases</Label>
    <Label x={405} y={245}>Sharp foreground</Label><path d="M397 240L350 230" stroke="#d7e3d9" fill="none" />
  </g>;
}

function ForcedPerspectivePass({ p, id }: { p: number; id: string }) {
  // Orthographic screen projection of different depths: the near hand travels
  // 4× farther than the distant person during the same sideways camera move.
  const cameraOffset = (1 - p) * 100;
  const farX = 304 - cameraOffset * .2;
  const handX = 304 - cameraOffset * .85;
  return <g>
    <defs><linearGradient id={`${id}-perspective-sky`} x2="0" y2="1"><stop stopColor="#6599ad" /><stop offset="1" stopColor="#d4d2ae" /></linearGradient><linearGradient id={`${id}-hand`} x2="0" y2="1"><stop stopColor="#e8b392" /><stop offset="1" stopColor="#b9755a" /></linearGradient></defs>
    <rect width="600" height="330" fill={`url(#${id}-perspective-sky)`} />
    <path d="M0 186L600 182V330H0Z" fill="#77816d" /><path d="M0 282L312 182L600 276V330H0Z" fill="#b6a78b" />
    <path d="M0 317L312 182L600 308M24 248H579M107 220H513M176 204H451" fill="none" stroke="#7f7a65" strokeWidth="1.5" />
    <path d="M36 184V90H100V185M57 91V60H80V91M443 183V117H562V184" fill="#aa9b7f" /><path d="M32 91L68 46L105 91" fill="#56676a" />
    <g transform={`translate(${farX},0)`}>
      <ellipse cy="230" rx="13" ry="3" fill="#45594e" />
      <circle cy="179" r="7" fill="#ba815e" /><path d="M-9 188Q0 183 9 188L11 211H4L5 230H-1L-3 213L-5 230H-11L-8 211H-12Z" fill="#b95342" /><path d="M-8 192L-19 203M9 192L18 201" stroke="#ba815e" strokeWidth="5" strokeLinecap="round" />
      <path d="M-7 178Q-9 169 0 169Q8 169 7 178" fill="#293739" />
    </g>
    <g transform={`translate(${handX},0)`}>
      <path d="M-304 285L-119 235Q-82 224-39 229L18 229Q38 232 23 240L-27 245Q-36 267-67 274L-101 281L-304 323Z" fill={`url(#${id}-hand)`} stroke="#a56c55" strokeWidth="1.5" />
      <path d="M-128 254Q-95 244-60 251M-80 240Q-62 244-52 254M-40 240L9 236" stroke="#a06e59" strokeWidth="2" fill="none" />
      <path d="M-304 282L-158 249L-143 289L-304 327" fill="#325b66" stroke="#193e4a" strokeWidth="2" />
    </g>
    <path d={`M${farX} 155V231M${handX} 216V235`} stroke="#f4dfb1" strokeDasharray="3 4" opacity=".65" />
    <rect x="345" y="17" width="235" height="109" rx="6" fill="#101d26" fillOpacity=".9" stroke="#779295" strokeOpacity=".5" />
    <Label x={358} y={37}>Top view · actual depth</Label>
    <path d="M364 66H561M364 91H561" stroke="#4a606b" strokeDasharray="3 4" /><circle cx="456" cy="61" r="5" fill="#e48866" /><circle cx="456" cy="87" r="6" fill="#dcb68b" />
    <path d={`M${456 + cameraOffset * .45} 111L456 61M${456 + cameraOffset * .45} 111L456 87`} stroke="#d7e4de" strokeOpacity=".45" />
    <rect x={451 + cameraOffset * .45} y="106" width="10" height="8" fill="#a4d1cd" />
    <Label x={363} y={64}>Far person</Label><Label x={363} y={91}>Near hand</Label><Label x={528} y={114}>Camera</Label>
    <rect x="17" y="20" width="289" height="29" rx="5" fill="#142631" fillOpacity=".9" /><Label x={29} y={40}>{p > .88 ? 'Aligned: a person appears to stand on a hand' : 'Parallax reveals the gap between depths'}</Label>
  </g>;
}

function LensPass({ p }: { p: number }) {
  const warp = ([x, y]: Point): Point => {
    const dx = (x - 300) / 300;
    const dy = (y - 165) / 245;
    // The square-root profile stays monotonic outside the frame as well;
    // extended geometry cannot fold back across the visible image boundary.
    const scale = 1 / Math.sqrt(1 + .8 * p * (dx * dx + dy * dy));
    return [300 + (x - 300) * scale, 165 + (y - 165) * scale];
  };
  // Sampling every straight edge before radial projection bends scene geometry
  // and calibration lines with precisely the same distortion function.
  const path = (points: Point[], closed = false) => {
    const arr: Point[] = [];
    for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      for (let step = 0; step <= 12; step++) arr.push(warp([mix(a[0], b[0], step / 12), mix(a[1], b[1], step / 12)]));
    }
    return arr.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + (closed ? 'Z' : '');
  };
  const poly = (points: Point[], fill: string, stroke = '#394c53') => <path d={path(points, true)} fill={fill} stroke={stroke} strokeWidth="1.5" />;
  const circlePoints = (cx: number, cy: number, r: number): Point[] => Array.from({ length: 32 }, (_, i) => [cx + Math.cos(i / 32 * Math.PI * 2) * r, cy + Math.sin(i / 32 * Math.PI * 2) * r]);
  return <g>
    <rect width="600" height="330" fill="#6b9eaf" />
    {poly([[-600, 246], [1200, 246], [1200, 1000], [-600, 1000]], '#8b9686')}
    {poly([[62, 224], [62, 64], [254, 64], [254, 225]], '#ca9d74')}
    {poly([[47, 65], [155, 11], [269, 65]], '#6c6160')}
    {poly([[381, 228], [381, 90], [546, 90], [546, 228]], '#c3745c')}
    {poly([[369, 90], [458, 44], [559, 90]], '#43565b')}
    {[87, 155, 218, 403, 468, 523].map((x, i) => <g key={x}>{poly([[x, 110], [x + 22, 110], [x + 22, 145], [x, 145]], i % 2 ? '#46738a' : '#edd498')}{poly([[x, 174], [x + 22, 174], [x + 22, 209], [x, 209]], '#365c6b')}</g>)}
    {poly([[0, 318], [294, 216], [325, 216], [600, 318]], '#c8b797')}
    <path d={path([[34, 311], [294, 220]])} stroke="#5a6862" fill="none" /><path d={path([[570, 311], [325, 220]])} stroke="#5a6862" fill="none" />
    {poly(circlePoints(297, 178, 13), '#bd8766')}
    {poly([[283, 193], [309, 193], [319, 227], [307, 227], [310, 259], [299, 259], [294, 230], [290, 259], [279, 259], [284, 225], [276, 225]], '#b74f40')}
    <g fill="none" stroke="#d1e8e4" strokeOpacity=".28" strokeWidth="1">{[0, 75, 150, 225, 300, 375, 450, 525, 600].map((x) => <path key={`v-${x}`} d={path([[x, 0], [x, 330]])} />)}{[0, 55, 110, 165, 220, 275, 330].map((y) => <path key={`h-${y}`} d={path([[0, y], [600, y]])} />)}</g>
    <circle cx="300" cy="165" r="5" fill="none" stroke="#edf2d7" /><path d="M287 165H293M307 165H313M300 152V158M300 172V178" stroke="#edf2d7" />
    <rect x="18" y="17" width="242" height="28" rx="4" fill="#142631" fillOpacity=".9" /><Label x={30} y={37}>Edges bend; optical center stays fixed</Label>
  </g>;
}

function MorphPass({ p, id }: { p: number; id: string }) {
  const points: Point[] = Array.from({ length: 100 }, (_, i) => {
    const a = -Math.PI / 2 + i / 100 * Math.PI * 2;
    const starRadius = 61 + 32 * Math.cos(5 * (a + Math.PI / 2));
    const r = mix(76, starRadius, p);
    return [300 + Math.cos(a) * r, 157 + Math.sin(a) * r];
  });
  const form = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + 'Z';
  return <g>
    <defs>
      <linearGradient id={`${id}-copper`} x1=".15" y1=".2" x2=".9" y2=".8"><stop stopColor="#fff0c2" /><stop offset=".19" stopColor="#d89d67" /><stop offset=".4" stopColor="#9b533c" /><stop offset=".61" stopColor="#e9b578" /><stop offset=".77" stopColor="#b7734e" /><stop offset="1" stopColor="#683c36" /></linearGradient>
      <radialGradient id={`${id}-stage`}><stop stopColor="#34515a" /><stop offset="1" stopColor="#172832" /></radialGradient>
      <clipPath id={`${id}-morph-form`}><path d={form} /></clipPath>
    </defs>
    <rect width="600" height="330" fill={`url(#${id}-stage)`} />
    <path d="M0 241H600M0 272H600M300 241L92 330M300 241L508 330" stroke="#758889" opacity=".2" />
    <ellipse cx="300" cy="258" rx={69 - p * 9} ry="11" fill="#08141d" opacity=".6" />
    <path d="M233 264L300 241L367 264L300 286Z" fill="#455c60" /><path d="M233 264V274L300 297L367 274V264L300 286Z" fill="#293f47" />
    <path d={form} fill={`url(#${id}-copper)`} stroke="#e5bc88" strokeWidth="1.2" />
    <g clipPath={`url(#${id}-morph-form)`} fill="none">
      <path d={`M${231 + 26 * p} 228Q${194 + 35 * p} 101 ${310 - 14 * p} ${80 - p * 15}`} stroke="#fff5d2" strokeOpacity=".34" strokeWidth={8 - p * 3} />
      <path d={`M${246 + 9 * p} 221Q${220 + 9 * p} 137 ${317 - 14 * p} ${89 - p * 15}`} stroke="#fff1ce" strokeOpacity=".2" strokeWidth="3" />
      <path d={`M252 ${197 - p * 11}Q${318 + p * 25} ${233 - p * 26} 354 ${133 - p * 10}`} stroke="#562e29" strokeOpacity=".25" strokeWidth="9" />
    </g>
    <rect x="19" y="19" width="193" height="29" rx="5" fill="#11202a" fillOpacity=".9" /><Label x={31} y={39}>One form · changing geometry</Label>
    <Label x={56} y={143} fill="#b6cbd1">SPHERE</Label><path d="M72 164H161M152 157L161 164L152 171" stroke="#768b8f" fill="none" />
    <Label x={465} y={143} fill="#e1c29b">STAR</Label><path d="M438 164H527M518 157L527 164L518 171" stroke="#768b8f" fill="none" />
  </g>;
}

function EffectFrame({ name, p, id, imageUrl, compact }: { name: string; p: number; id: string; imageUrl?: string; compact?: boolean }) {
  switch (name) {
    case 'Color Grading': case 'Desaturation': case 'Sepia Tone': return <ColorPass name={name} p={p} id={id} imageUrl={imageUrl} />;
    case 'Film Grain': return <GrainPass p={p} id={id} imageUrl={imageUrl} compact={compact} />;
    case 'Bokeh': return <BokehPass p={p} id={id} />;
    case 'Forced Perspective': return <ForcedPerspectivePass p={p} id={id} />;
    case 'Lens Distortion': return <LensPass p={p} />;
    case 'Morphing / Dissolve Effect': return <MorphPass p={p} id={id} />;
    default: return <BaseScene id={id} imageUrl={imageUrl} />;
  }
}

export const EffectsStudy = memo(function EffectsStudy({ name, progress, compact, imageUrl, view = 'effect' }: StudyProps) {
  const id = `fx-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const p = view === 'original' ? 0 : clamp(progress);
  const info = EFFECT_STUDIES[name];
  return <svg viewBox="0 0 600 330" width="600" height="330" role="img" aria-label={`${name}. ${info?.description ?? 'Original visual effects demonstration.'}`} style={{ width: '100%', height: '100%', display: 'block', background: '#112029' }}>
    <title>{name}</title>
    <defs><clipPath id={`${id}-right`}><rect x="300" width="300" height="291" /></clipPath><clipPath id={`${id}-picture`}><rect width="600" height="291" /></clipPath></defs>
    <g clipPath={`url(#${id}-picture)`}>
      {view === 'split' && <EffectFrame name={name} p={0} id={`${id}-original`} imageUrl={imageUrl} compact={compact} />}
      <g clipPath={view === 'split' ? `url(#${id}-right)` : undefined}><EffectFrame name={name} p={p} id={`${id}-effect`} imageUrl={imageUrl} compact={compact} /></g>
      {view === 'split' && <g><path d="M300 0V291" stroke="#f5e4bf" strokeWidth="2" /><rect x="221" y="263" width="67" height="22" rx="4" fill="#13222a" /><Label x={254} y={279} anchor="middle">Original</Label><rect x="312" y="263" width="69" height="22" rx="4" fill="#13222a" /><Label x={346} y={279} anchor="middle">Effect</Label></g>}
    </g>
    <Caption compact={compact}>{name === 'Desaturation' ? `Color intensity: ${Math.round((1 - p) * 100)}% · tonal structure stays intact` : name === 'Sepia Tone' ? `Sepia treatment: ${Math.round(p * 100)}% · same scene, warm brown palette` : name === 'Color Grading' ? `Look strength: ${Math.round(p * 100)}% · warm highlights, cooler shadows` : name === 'Film Grain' ? 'Fine texture varies over time; the underlying image stays fixed' : name === 'Bokeh' ? 'Background highlights expand from their actual light positions' : name === 'Forced Perspective' ? 'Near and far objects share screen space only at the aligned viewpoint' : name === 'Lens Distortion' ? 'The scene and the grid use the same radial projection' : 'The object changes shape continuously; there is no crossfade'}</Caption>
  </svg>;
});
