'use client';

import { memo, useId } from 'react';
import { StudyScene } from './StudyScene';

export const GENRE_STUDIES: Record<string, { description: string; phaseLabels: [string, string]; kind: 'style' }> = {
  'Film Noir': { description: 'An illustrative noir scene: hard window shadows, monochrome contrast, and a partly concealed observer.', phaseLabels: ['Room established', 'Shadow conceals the observer'], kind: 'style' },
  'German Expressionism': { description: 'The set and its shadows become deliberately angular and distorted to express an uneasy subjective world.', phaseLabels: ['Ordinary geometry', 'Expressive distortion'], kind: 'style' },
  'Cinéma Vérité': { description: 'A handheld observer adjusts to a person acknowledging the camera. This illustrates camera–subject interaction, not documentary authenticity.', phaseLabels: ['Observe', 'Subject notices the camera'], kind: 'style' },
  'French New Wave': { description: 'Location footage jumps forward within the same framing; discontinuity makes the edit itself visible. One formal example, not a definition of the movement.', phaseLabels: ['Street observation', 'Time skips within the shot'], kind: 'style' },
  'Surrealism': { description: 'A familiar landscape develops an impossible relationship: the sun descends as a doorway floats free of the house.', phaseLabels: ['Familiar world', 'Impossible association'], kind: 'style' },
  'Found Footage': { description: 'A recording made inside the fictional world is interrupted and recovered. The viewfinder and timecode establish its recording context.', phaseLabels: ['Recording', 'Signal interruption'], kind: 'style' },
  'Spaghetti Western': { description: 'Wide geography gives way to a tight look at watchful eyes, then returns to the space between subjects.', phaseLabels: ['Wide confrontation', 'Intense detail'], kind: 'style' },
  'Italian Neorealism': { description: 'A modest everyday task and a materially specific location carry this illustrative scene. A visual homage cannot recreate historical production conditions.', phaseLabels: ['Everyday setting', 'Ordinary work continues'], kind: 'style' },
  'Dogme 95': { description: 'A restrained handheld view uses the room’s apparent window light. This is an illustrative homage, not a claim of manifesto-compliant filmmaking.', phaseLabels: ['Available window light', 'Performance leads the camera'], kind: 'style' },
  'Mumblecore': { description: 'Two people share a small, awkward conversational pause. Timing and restrained gestures carry the interpersonal beat.', phaseLabels: ['A small question', 'A hesitant answer'], kind: 'style' },
  'Giallo': { description: 'Saturated opposing light and an isolated clue build stylized suspense in this limited visual example.', phaseLabels: ['An ordinary room', 'A clue in colored light'], kind: 'style' },
  'Mockumentary': { description: 'A sincere interview is followed by contradictory evidence, then a silent look to camera. The comic relationship comes from the edit.', phaseLabels: ['Confident interview', 'Contradictory evidence'], kind: 'style' },
  'Poetic Realism': { description: 'A simple human action remains grounded while soft atmosphere and controlled light make the ordinary location feel lyrical.', phaseLabels: ['Ordinary action', 'Atmosphere shapes the moment'], kind: 'style' },
  'Slow Cinema': { description: 'The camera stays fixed while a small cloud movement and a distant figure reward sustained observation. Playback is ordinary speed.', phaseLabels: ['Hold the composition', 'Notice the small change'], kind: 'style' },
  'Hyperlink Cinema': { description: 'Three separate lives connect through the same event. The network shows an ensemble story relationship, not a visual filter.', phaseLabels: ['Separate lives', 'A shared event connects them'], kind: 'style' },
  'Tech Noir': { description: 'A technological city adds source-driven neon and a surveillance motif to shadow-led noir framing.', phaseLabels: ['Technological setting', 'Noir concealment'], kind: 'style' },
  'Wuxia': { description: 'An illustrative choreographic phrase carries a figure and flowing cloth across a coherent landscape. This is one visual motif, not the whole martial-hero tradition.', phaseLabels: ['Prepare the movement', 'Follow the action path'], kind: 'style' },
  'Acid Western': { description: 'A recognizable frontier landscape acquires a controlled impossible sky and subjective color shifts.', phaseLabels: ['Frontier geography', 'Subjective distortion'], kind: 'style' },
  'Southern Gothic': { description: 'A weathered house and an unresolved silhouette create unease. The darker story treatment is deliberate, not inherent to a Southern location.', phaseLabels: ['The old house', 'An unresolved presence'], kind: 'style' },
  'Vaporwave Aesthetic': { description: 'A retro-commercial scene uses a pastel-neon palette, a striped sun, a perspective grid, and restrained analog-video artifacts.', phaseLabels: ['Retro scene', 'Processed nostalgic image'], kind: 'style' },
  'Cosmic Horror': { description: 'A recognizable person and house establish scale before an incompletely seen presence eclipses the sky.', phaseLabels: ['Human scale', 'Unknowable scale'], kind: 'style' },
};

function Person({ x, y, scale = 1, color = '#b96443', facing = 1 }: { x: number; y: number; scale?: number; color?: string; facing?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`}><ellipse cx="0" cy="0" rx="13" ry="17" fill="#d6a27b" /><path d="M-13-3q-4-22 17-15l9 12-18-6Z" fill="#343a35" /><path d="M-14 21Q0 12 14 21L21 71H-21Z" fill={color} /><path d="M-12 70-16 111h10L1 84l8 27h10l-9-41Z" fill="#2b424e" /><path d="M-15 26-26 59m43-34 16 32" stroke="#cc9876" strokeWidth="10" strokeLinecap="round" /><circle cx="6" cy="1" r="1.5" fill="#272c2b" /></g>;
}

export const GenreStudy = memo(function GenreStudy({ name, progress, compact = false }: { name: string; progress: number; compact?: boolean }) {
  const id = `genre-${useId().replace(/:/g, '')}`;
  const t = Math.max(0, Math.min(1, progress));
  const sway = Math.sin(t * 18);
  const noir = name === 'Film Noir';
  const tech = name === 'Tech Noir';
  const expression = name === 'German Expressionism';
  const surreal = name === 'Surrealism';
  const gothic = name === 'Southern Gothic';
  const cosmic = name === 'Cosmic Horror';
  const vapor = name === 'Vaporwave Aesthetic';
  const western = name === 'Spaghetti Western' || name === 'Acid Western';
  const interview = name === 'Mockumentary' || name === 'Mumblecore';
  const hand = ['Cinéma Vérité', 'Dogme 95', 'Found Footage'].includes(name);
  const portrait = interview || noir || name === 'Giallo' || name === 'Dogme 95';
  const jump = name === 'French New Wave';
  const metadata = GENRE_STUDIES[name];
  const phase = t < .5 ? metadata.phaseLabels[0] : metadata.phaseLabels[1];
  let filter = 'none';
  if (noir || expression) filter = 'grayscale(1) contrast(1.65) brightness(.72)';
  if (gothic) filter = 'saturate(.45) brightness(.65)';
  if (cosmic || tech) filter = 'saturate(.6) brightness(.42)';
  if (name === 'Italian Neorealism') filter = 'grayscale(1) contrast(.9)';
  if (name === 'Acid Western') filter = `sepia(.7) saturate(1.7) hue-rotate(${t * 85}deg)`;
  if (vapor) filter = 'hue-rotate(280deg) saturate(1.65)';
  if (name === 'Poetic Realism') filter = 'saturate(.65) sepia(.2)';

  return <svg viewBox="0 0 600 330" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${name}: ${phase}`} style={{ display: 'block', height: '100%', width: '100%', background: '#152022' }}>
    <defs>
      <linearGradient id={`${id}-shade`} x2="0" y2="1"><stop stopColor="#070e18" stopOpacity=".08" /><stop offset="1" stopColor="#050d14" stopOpacity=".8" /></linearGradient>
      <linearGradient id={`${id}-neon`}><stop stopColor="#e62754" stopOpacity=".6" /><stop offset="1" stopColor="#3098bf" stopOpacity=".4" /></linearGradient>
      <radialGradient id={`${id}-fog`}><stop stopColor="#fce4b3" stopOpacity=".6" /><stop offset="1" stopColor="#e4d7b9" stopOpacity="0" /></radialGradient>
      <clipPath id={`${id}-clip`}><rect width="600" height="330" /></clipPath>
    </defs>
    <g clipPath={`url(#${id}-clip)`}>
      <g transform={expression ? `translate(${-t * 35} 0) skewX(${t * 12}) scale(1.12 1)` : hand ? `translate(${sway * 2} ${Math.cos(t * 25) * 1.5}) scale(1.025)` : jump ? `translate(${-Math.floor(t * 4) * 15} 0) scale(1.1)` : undefined} style={{ filter }}>
        <StudyScene idPrefix={id} time={name === 'Slow Cinema' ? t * .15 : t} variant={portrait ? 'interior' : 'landscape'} />
      </g>
      {noir && <><g transform={`translate(${t * 30} 0) rotate(-24 300 165)`}>{Array.from({ length: 7 }, (_, i) => <rect key={i} x="-70" y={i * 53 - 20} width="790" height="24" fill="#050910" opacity=".72" />)}</g><Person x={480 - t * 30} y={163} scale={1.5} color="#111a1b" /><rect width="600" height="330" fill={`url(#${id}-shade)`} /></>}
      {expression && <><path d={`M0 330 180 200 330 ${-25 - t * 20} 256 228 410 330Z`} fill="#090d11" opacity=".82" /><path d="M407 287 451 112 481 140 467 298" fill="#0b1117" /><path d="M452 130 494 173 488 244" stroke="#c3cdba" strokeWidth="5" /></>}
      {name === 'Cinéma Vérité' && <><Person x={363} y={168} color="#c88545" facing={-1} /><path d={`M${350} 200q${-38 * t}-26 ${-62 * t}-55`} stroke="#d6a27b" strokeWidth="9" strokeLinecap="round" fill="none" />{!compact && <text x="332" y="140" fill="#f1ecd7" fontSize="14">“Are you filming?”</text>}</>}
      {surreal && <><circle cx="462" cy={65 + t * 135} r={28 + t * 8} fill="#ead493" /><g transform={`translate(0 ${-t * 102}) rotate(${t * 16} 281 208)`}><rect x="258" y="176" width="40" height="72" fill="#274454" stroke="#eed1a1" strokeWidth="4" /><circle cx="290" cy="213" r="2" fill="#ddb98a" /></g><path d={`M0 ${160 + t * 15}q150 ${-t * 55} 300 0t300 0`} stroke="#f6dcbd" strokeWidth="3" opacity=".55" fill="none" /></>}
      {name === 'Found Footage' && <><rect x="25" y="24" width="550" height="271" fill="none" stroke="#d1e0c9" opacity=".55" /><circle cx="48" cy="45" r="5" fill={t > .55 && t < .65 ? '#6b7770' : '#de735b'} /><text x="62" y="49" fill="#e4edce" fontFamily="monospace" fontSize="14">REC</text><text x="450" y="48" fill="#e4edce" fontFamily="monospace" fontSize="13">00:00:0{Math.floor(t * 8)}</text>{t > .55 && t < .66 && <g><rect width="600" height="330" fill="#161e1c" opacity=".75" />{Array.from({ length: 18 }, (_, i) => <path key={i} d={`M0 ${i * 19}h600`} stroke="#afc5a6" opacity={.1 + i % 4 * .07} strokeWidth={i % 3 + 1} />)}<text x="226" y="165" fill="#c1cdb7" fontSize="17">SIGNAL LOST</text></g>}</>}
      {western && <><rect width="600" height="330" fill="#af7338" opacity=".18" /><rect y="0" width="600" height="29" fill="#101313" /><rect y="280" width="600" height="50" fill="#101313" /><Person x={478} y={158} scale={.75} color="#8f653f" />{name === 'Spaghetti Western' && t > .35 && t < .7 && <><rect y="29" width="600" height="251" fill="#b68761" /><path d="M0 50 600 68 600 105 0 78Z" fill="#493f2d" /><path d="M39 134q109-55 205 2-100 29-205-2m317 2q100-51 205-2-100 29-205 2" fill="#cfc9a0" /><ellipse cx="163" cy="134" rx="14" ry="21" fill="#554c36" /><ellipse cx="439" cy="136" rx="14" ry="21" fill="#554c36" /><path d="M268 138 250 232 312 232" stroke="#966642" fill="none" strokeWidth="5" /></>}{name === 'Acid Western' && <g opacity={t}>{[0, 1, 2].map(i => <ellipse key={i} cx="455" cy="74" rx={35 + i * 20 + Math.sin(t * 5) * 10} ry={35 + i * 8} fill="none" stroke={i % 2 ? '#8eb276' : '#d57d9f'} strokeWidth="5" />)}</g>}</>}
      {name === 'Italian Neorealism' && <g style={{ filter: 'grayscale(1)' }}><Person x={345 + t * 55} y={190} scale={.65} color="#8c907f" /><path d={`M${334 + t * 55} 229h25v22h-25Z`} fill="#aa8d67" stroke="#484e47" /></g>}
      {interview && <>
        {name === 'Mumblecore' ? <><Person x={410} y={156} scale={1.1} facing={-1} color="#877c69" /><rect x="75" y="203" width="145" height="35" rx="6" fill="#253f3c" /><text x="88" y="226" fill="#e2dbc5" fontSize="14">{t < .5 ? '“So… how was it?”' : '“It was… fine.”'}</text><circle cx={t < .5 ? 284 : 399} cy="115" r="4" fill="#f1bd84" /></> : t > .42 && t < .78 ? <><rect width="600" height="330" fill="#6694a0" /><path d="M0 179H600V330H0Z" fill="#637655" /><path d="M87 233 238 103 369 241Z" fill="#dcbe7b" /><path d="M129 233 250 189 339 242Z" fill="#b8874f" /><path d="M265 89 374 240" stroke="#544637" strokeWidth="6" /><text x="48" y="57" fill="#faf0d4" fontSize="18">The tent, ten minutes earlier.</text></> : <><text x="35" y="258" fill="#faf0d4" fontSize="16">{t < .42 ? '“I’m excellent at putting up tents.”' : '…'}</text><rect x="26" y="276" width="193" height="27" fill="#1c302c" /><text x="37" y="295" fill="#b7c5b2" fontSize="13">CAMPSITE ORGANIZER</text></>}
      </>}
      {name === 'Giallo' && <><rect width="600" height="330" fill={`url(#${id}-neon)`} /><g transform={`translate(${410 - t * 80} 218) rotate(-22)`}><circle r="11" fill="none" stroke="#f4c873" strokeWidth="6" /><path d="M10 0h35m-7 0v9m-12-9v7" stroke="#f4c873" strokeWidth="5" /></g><rect width="600" height="330" fill={`url(#${id}-shade)`} /></>}
      {name === 'Poetic Realism' && <><ellipse cx={330 + t * 25} cy="180" rx="245" ry="140" fill={`url(#${id}-fog)`} /><path d="M455 40 301 289 447 301Z" fill="#f9d993" opacity=".15" /></>}
      {name === 'Slow Cinema' && <Person x={358 + t * 9} y={218} scale={.18} color="#d9b671" />}
      {name === 'Hyperlink Cinema' && <><rect width="600" height="330" fill="#101c20" /><g stroke="#547b79" strokeWidth="2" fill="none"><path d="M102 111 295 172 494 97M104 257 295 172 488 264" strokeDasharray="6 5" /><path d="M295 172V58" /></g>{[[102, 111, 'A · THE DRIVER'], [494, 97, 'B · THE NURSE'], [104, 257, 'C · THE CHILD']].map(([x,y,label],i)=><g key={String(label)}><circle cx={Number(x)} cy={Number(y)} r="24" fill={t > i * .18 ? '#92aca0' : '#283f41'} /><text x={Number(x)} y={Number(y) + 41} textAnchor="middle" fill="#b8c7bb" fontSize="13">{label}</text></g>)}<circle cx="295" cy="172" r={30 + t * 9} fill="#ca8359" opacity={.4 + t * .6} /><text x="295" y="168" textAnchor="middle" fill="#f3e3c7" fontSize="13">THE SAME</text><text x="295" y="185" textAnchor="middle" fill="#f3e3c7" fontSize="13">EVENT</text><circle cx={102 + t * 193} cy={111 + t * 61} r="4" fill="#f0c792" /></>}
      {tech && <><rect width="600" height="330" fill={`url(#${id}-neon)`} opacity=".5" /><g fill="none" stroke="#ca5688" strokeWidth="3"><path d="M60 220V81h33v139M487 231V48h43v193" /><path d={`M0 ${142 + t * 45}h600`} opacity=".4" /></g><rect x={150 + t * 70} y="178" width="45" height="81" fill="none" stroke="#6abec1" /><text x="388" y="52" fill="#87ccce" fontFamily="monospace" fontSize="13">CAM 07 / TRACKING</text></>}
      {name === 'Wuxia' && <><path d={`M80 276Q300 ${180 - t * 80} 506 233`} fill="none" stroke="#dad4a1" strokeWidth="2" strokeDasharray="6 8" opacity=".5" /><g transform={`translate(${100 + t * 375} ${195 - Math.sin(t * Math.PI) * 50})`}><Person x={0} y={0} scale={.7} color="#d9d9bb" /><path d={`M-10 30Q-65 ${20 + sway * 5} -90 51Q-50 20-5 22Z`} fill="#ad5745" /><path d="M12 19 47-5" stroke="#d6dfcf" strokeWidth="3" /></g></>}
      {gothic && <><path d="M0 0H600V70Q570 20 530 88L517 43 491 88 477 23 440 72 420 0Z" fill="#19382d" /><path d={`M36 0q48 83 ${18 + sway * 2} 170m492-170q-25 84-7 112`} stroke="#31573a" strokeWidth="7" fill="none" /><path d="M273 210v34h17v-34q-8-24-17 0" fill="#091b1a" opacity={.3 + t * .7} /><rect width="600" height="330" fill={`url(#${id}-shade)`} /></>}
      {vapor && <><circle cx="453" cy="73" r="53" fill="#f398c0" /><g stroke="#385381" strokeWidth="5">{Array.from({ length: 6 }, (_, i) => <path key={i} d={`M396 ${78 + i * 9}h114`} />)}</g><path d="M0 260H600V330H0Z" fill="#3b3864" /><g stroke="#8b88b6" opacity=".65"><path d="M0 277H600M0 300H600M300 260 20 330M300 260 160 330M300 260 440 330M300 260 580 330" /></g><path d={`M0 ${190 + t * 85}h600`} stroke="#dfb2e3" opacity=".25" strokeWidth="2" /></>}
      {cosmic && <><ellipse cx="375" cy={-110 + t * 78} rx={180 + t * 95} ry="218" fill="#06121b" /><ellipse cx="375" cy={-110 + t * 78} rx={183 + t * 95} ry="220" fill="none" stroke="#587c7c" strokeWidth="2" opacity=".7" /><path d="M0 167Q245 205 600 139V220Q320 171 0 214Z" fill="#96ac90" opacity=".11" /><Person x={534} y={260} scale={.2} color="#d1bf91" /></>}
    </g>
    {!compact && <><rect y="302" width="600" height="28" fill="#101b1dec" /><text x="13" y="321" fill="#c5d3c6" fontSize="12">{phase}</text><text x="587" y="321" fill="#8da299" fontSize="11" textAnchor="end">ILLUSTRATIVE EXCERPT</text></>}
  </svg>;
});
