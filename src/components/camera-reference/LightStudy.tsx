'use client';

import { memo, useId } from 'react';

type StudyProps = { name: string; progress: number; compact?: boolean; imageUrl?: string; view?: 'effect' | 'split' | 'original' };
type StudyInfo = { description: string; phaseLabels: [string, string]; kind: 'lighting' };
const light = (description: string, from: string, to: string): StudyInfo => ({ description, phaseLabels: [from, to], kind: 'lighting' });

export const LIGHT_STUDIES: Record<string, StudyInfo> = {
  'Three-Point Lighting': light('The key shapes the face; a weaker fill lifts shadows; the rear light separates the shoulder.', 'Key only', 'Key + fill + backlight'),
  'Key Light': light('Moving the dominant source changes the nose shadow and the bright side of the face together.', 'Key farther left', 'Key nearer camera'),
  'High-Key Lighting': light('Raising the fill and the background creates a bright portrait with gentle, readable shadows.', 'Lower fill', 'Bright, low contrast'),
  'Low-Key Lighting': light('The key stays on the face as fill and background illumination fall away.', 'Room and face visible', 'Selective illumination'),
  Chiaroscuro: light('A shaped beam reveals the face and shoulder against a substantial dark mass.', 'Broad illuminated mass', 'Narrow sculpted mass'),
  'Rembrandt Lighting': light('An elevated side key joins the nose and cheek shadows, leaving a small lit triangle beneath the far eye.', 'Open cheek shadow', 'Cheek triangle'),
  Silhouette: light('Front illumination falls away while the background remains bright, leaving the subject readable by outline.', 'Front detail visible', 'Outline against bright sky'),
  'Golden Hour': light('The low warm sun produces increasingly long cast shadows; the sky still supplies cooler fill.', 'Low afternoon sun', 'Sun near horizon'),
  'Blue Hour': light('A luminous cool twilight sky stays visible as warm existing fixtures become more prominent.', 'Early twilight', 'Practicals emerge'),
  'Practical Lighting': light('The lamp visible in the frame turns on and illuminates the nearby face, tabletop, and wall.', 'Lamp off', 'Lamp illuminates the room'),
  'Hard Light': light('A small apparent source produces crisp face and cast-shadow boundaries as it moves.', 'Small source, left', 'Small source, higher'),
  'Soft Light': light('A growing source keeps its direction while broadening the transitions at the face and cast shadow.', 'Smaller source', 'Large diffused source'),
  Uplighting: light('A light below the face illuminates the chin and casts the nose shadow upward.', 'Low source dimmed', 'Upward nose shadow'),
  'Side Lighting': light('A lateral source lights one side and leaves a strong transition across the middle of the face.', 'Gentle side contrast', 'Strong side contrast'),
  'Lens Flare': light('A bright source approaches the lens axis; flare ghosts follow the line through the image center.', 'Source away from lens axis', 'Source nearer lens axis'),
  'Fill Light': light('The key stays fixed while weaker frontal fill gently lifts the shadow-side cheek.', 'Key without fill', 'Shadows lifted'),
  Backlight: light('A source behind the subject lights the hair and shoulder from the rear while front exposure stays fixed.', 'Backlight off', 'Rear separation'),
  'Bounce Light': light('Light travels to a pale reflector, then returns as a broader, softer source on the face.', 'Reflector out', 'Reflected fill'),
  'Cross Lighting': light('Opposing sources serve two subjects: each source is a key for one and a rear accent for the other.', 'First opposing source', 'Both sources'),
  'Kicker Light': light('An oblique rear-side source adds a concentrated accent to the far cheek and shoulder.', 'Kicker off', 'Rear-side cheek accent'),
  'Motivated Lighting': light('The visible window establishes the direction and color of the light on the face and floor.', 'Window partly shuttered', 'Window light revealed'),
  'Ambient Light': light('General sky and room illumination raises the baseline while the directional key remains dominant.', 'Low environmental fill', 'Higher environmental fill'),
  'Available Light': light('The subject steps into illumination from an existing window; no production fixture is added.', 'Away from the window', 'Inside existing window light'),
  'Broad Lighting': light('The face is turned: the larger cheek visible to the camera receives the key light.', 'Broad-side key dimmed', 'Larger visible cheek lit'),
  'Short Lighting': light('The same turned face is lit on the smaller visible cheek, leaving more shadow toward camera.', 'Short-side key dimmed', 'Smaller visible cheek lit'),
  'Color Temperature': light('A neutral card and the skin show the source changing from warm to cool at a fixed white balance.', 'Warm source · 2800 K', 'Cool source · 7500 K'),
  'Dappled Light': light('Leaf-shaped occluders move together, shifting irregular pools of light over the face and wall.', 'Foliage position A', 'Foliage position B'),
  'Edge Light': light('A controlled source traces only one narrow subject boundary, separating it from a similar dark background.', 'Edge off', 'Narrow boundary highlight'),
  'Eye Light': light('A small source adds restrained catchlights in both eyes while the main face lighting stays unchanged.', 'No catchlight', 'Small source reflected in eyes'),
  'Gobo Lighting': light('A window-shaped obstruction projects coherent bars onto both the wall and subject.', 'Window pattern left', 'Window pattern right'),
};

const face = 'M254 107Q250 65 295 58Q342 56 351 99L349 145Q345 180 325 195Q303 212 279 191Q257 171 254 135Z';
const hair = 'M255 125Q244 100 253 76Q264 44 302 45Q344 43 354 79L353 118L340 93Q315 101 275 79L263 112L263 139Z';
const shoulders = 'M273 191L272 216Q229 220 213 249L205 286H397L390 249Q374 222 334 216L329 193Z';
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (v: number, start = 0, end = 1) => clamp((v - start) / (end - start));

function Note({ x = 25, y = 304, children, color = '#d5e0df', anchor = 'start' }: { x?: number; y?: number; children: React.ReactNode; color?: string; anchor?: 'start' | 'middle' | 'end' }) {
  return <text x={x} y={y} fill={color} textAnchor={anchor} fontSize="13" fontFamily="system-ui, sans-serif">{children}</text>;
}

function Source({ x, y, tx = 295, ty = 132, label, strength = 1, large = false, color = '#ffd49a', showRay = true }: { x: number; y: number; tx?: number; ty?: number; label: string; strength?: number; large?: boolean; color?: string; showRay?: boolean }) {
  return <g opacity={0.25 + 0.75 * strength}>
    {showRay && <path d={`M${x} ${y}L${tx} ${ty}`} fill="none" stroke={color} strokeOpacity=".48" strokeDasharray="5 5" />}
    <rect x={x - (large ? 18 : 7)} y={y - (large ? 23 : 7)} width={large ? 36 : 14} height={large ? 46 : 14} rx="3" fill={color} stroke="#fff2d8" />
    <Note x={x} y={y + (large ? 42 : 27)} anchor="middle" color={color}>{label}</Note>
  </g>;
}

function Portrait({ id, name, p }: { id: string; name: string; p: number }) {
  const is = (value: string) => name === value;
  const turned = is('Broad Lighting') || is('Short Lighting');
  const silhouette = is('Silhouette');
  const keyAmount = is('Key Light') ? .4 + .6 * p : is('Three-Point Lighting') ? .45 + .55 * ramp(p, 0, .33) : 1;
  const fill = is('Fill Light') ? .5 * p : is('Three-Point Lighting') ? .32 * ramp(p, .32, .68) : is('High-Key Lighting') ? .35 + .55 * p : is('Low-Key Lighting') ? .38 * (1 - p) : is('Ambient Light') ? .12 + .5 * p : is('Bounce Light') ? .4 * p : .07;
  const darkness = is('Low-Key Lighting') ? .42 + .5 * p : is('Chiaroscuro') ? .8 : .65;
  const skinLight = is('Color Temperature') ? `rgb(${Math.round(245 - 64 * p)}, ${Math.round(160 + 39 * p)}, ${Math.round(103 + 131 * p)})` : is('Uplighting') ? '#b0dcd6' : '#edb899';
  const skinDark = is('High-Key Lighting') ? '#b98e7b' : '#51332f';
  const keyX = is('Key Light') ? 260 + p * 26 : is('Rembrandt Lighting') ? 295 - p * 13 : 284;
  const noseShadow = is('Uplighting') ? 'M301 145L275 107L295 136Z' : `M300 122L${328 - (is('Key Light') ? p * 14 : 0)} 158L302 153Z`;
  const softBlur = is('Soft Light') ? 2 + 9 * p : is('Hard Light') ? .3 : is('High-Key Lighting') ? 5 : 1.2;
  const dimFace = is('Practical Lighting') ? .18 + .82 * p : is('Motivated Lighting') ? .35 + .65 * p : 1;
  const rim = is('Backlight') || is('Kicker Light') || is('Edge Light') ? p : is('Three-Point Lighting') ? ramp(p, .68, 1) : 0;
  const faceOpacity = silhouette ? 1 - p : 1;
  return <g>
    <defs>
      <clipPath id={`${id}-face`}><path d={face} /></clipPath>
      <clipPath id={`${id}-person`}><path d={face} /><path d={shoulders} /><path d={hair} /></clipPath>
      <linearGradient id={`${id}-skin`} x1="245" y1="100" x2="355" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor={skinLight} /><stop offset="1" stopColor={skinDark} /></linearGradient>
      <linearGradient id={`${id}-key`} x1="250" y1="120" x2="343" y2="128" gradientUnits="userSpaceOnUse"><stop stopColor={skinLight} /><stop offset={is('Side Lighting') ? '.5' : '.32'} stopColor={skinLight} /><stop offset={is('Side Lighting') ? '.52' : '.85'} stopColor={skinDark} /></linearGradient>
      <linearGradient id={`${id}-up`} x1="0" y1="195" x2="0" y2="70" gradientUnits="userSpaceOnUse"><stop stopColor="#d2f1e6" /><stop offset="1" stopColor="#294344" /></linearGradient>
      <linearGradient id={`${id}-coat`}><stop stopColor="#56838a" /><stop offset=".55" stopColor="#274d56" /><stop offset="1" stopColor="#162f38" /></linearGradient>
      <filter id={`${id}-shadow-soft`} x="-40%" y="-40%" width="190%" height="190%"><feGaussianBlur stdDeviation={softBlur} /></filter>
      <filter id={`${id}-gobo-soft`}><feGaussianBlur stdDeviation="1.6" /></filter>
    </defs>
    {(is('Hard Light') || is('Soft Light')) && <g transform={`translate(${45 + p * 18},${18 - p * 10})`} opacity=".75" filter={`url(#${id}-shadow-soft)`}><path d={face} fill="#070c11" /><path d={hair} fill="#070c11" /><path d={shoulders} fill="#070c11" /></g>}
    <path d={shoulders} fill={silhouette ? '#10191d' : `url(#${id}-coat)`} />
    <path d="M281 188L281 220L301 239L324 218L323 189" fill={silhouette ? '#11191c' : skinDark} />
    <path d="M272 216L300 246L281 263L259 225M331 216L300 246L323 262L349 226" stroke="#91b3b7" strokeOpacity={.28 * faceOpacity} fill="none" strokeWidth="2" />
    <path d="M301 249V286M342 260H366" stroke="#102a32" strokeWidth="3" opacity={faceOpacity} />
    <path d={face} fill={silhouette ? '#10191d' : skinDark} />
    <g clipPath={`url(#${id}-face)`} opacity={dimFace * faceOpacity}>
      <path d={face} fill={`url(#${id}-skin)`} opacity={.2 + fill} />
      {is('Uplighting') ? <path d={face} fill={`url(#${id}-up)`} opacity={.35 + .65 * p} /> : turned ? <>
        <path d={is('Broad Lighting') ? 'M245 50H307L314 112L310 151L301 199L245 210Z' : 'M307 50H362V211H301L310 151L314 112Z'} fill={skinLight} opacity={.25 + .75 * p} />
        <path d="M313 119L326 146L311 150" fill="#583a32" opacity=".8" />
      </> : <>
        <path d={is('Side Lighting') ? 'M240 45H302V213H240Z' : `M235 45H${keyX + 5}L301 119L299 151L${keyX + 13} 188L268 213H235Z`} fill={skinLight} opacity={keyAmount * (is('Side Lighting') ? .4 + .6 * p : .92)} filter={is('Soft Light') || is('High-Key Lighting') ? `url(#${id}-shadow-soft)` : undefined} />
        {!is('Side Lighting') && <path d="M303 89Q321 91 335 111L332 120L309 115Z" fill={skinLight} opacity={.25 + fill * .65} />}
        <path d={noseShadow} fill="#2f201f" opacity={is('High-Key Lighting') ? .16 : darkness} filter={is('Soft Light') ? `url(#${id}-shadow-soft)` : undefined} />
        {is('Rembrandt Lighting') && <path d={`M318 ${144 - p * 2}L337 138L328 ${169 - p * 6}Z`} fill={skinLight} opacity={.15 + .85 * p} />}
      </>}
      <path d={face} fill={skinLight} opacity={fill * .55} />
      <path d="M270 149Q277 178 293 184" stroke="#d59579" strokeOpacity={.35 + fill * .3} strokeWidth="2" fill="none" />
      {is('Dappled Light') && <g transform={`translate(${p * 26 - 13},${Math.sin(p * Math.PI) * 7})`} fill="#131e19" opacity=".65" filter={`url(#${id}-gobo-soft)`}>{Array.from({ length: 14 }, (_, i) => <ellipse key={i} cx={247 + (i % 4) * 29} cy={58 + Math.floor(i / 4) * 42} rx={13 + i % 3 * 6} ry={7 + i % 2 * 5} transform={`rotate(${i * 31} ${247 + (i % 4) * 29} ${58 + Math.floor(i / 4) * 42})`} />)}</g>}
      {is('Gobo Lighting') && <g transform={`translate(${p * 30 - 15},0) rotate(-20 300 150)`} fill="#152329" opacity=".78">{[230, 265, 300, 335].map((x) => <rect key={x} x={x} y="30" width="12" height="230" />)}<rect x="180" y="137" width="240" height="12" /></g>}
    </g>
    <path d={hair} fill="#172024" />
    <path d="M263 79Q276 56 305 55M268 84Q288 66 325 65M313 62Q333 63 342 78" stroke="#424044" strokeWidth="2.5" fill="none" opacity={faceOpacity} />
    <g opacity={faceOpacity * dimFace} transform={turned ? 'translate(9,0)' : undefined}>
      <path d="M270 120Q280 115 289 120M309 119Q321 113 332 119" stroke="#3b2928" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M269 132Q280 123 291 132Q280 139 269 132M309 131Q321 122 332 131Q321 138 309 131" fill="#b7b0a1" opacity=".7" />
      <circle cx="281" cy="131" r="4.8" fill="#2f514d" /><circle cx="321" cy="130" r="4.8" fill="#2f514d" /><circle cx="281" cy="131" r="2.4" fill="#0d1719" /><circle cx="321" cy="130" r="2.4" fill="#0d1719" />
      <path d="M298 130L296 151Q301 155 307 150M288 171Q301 166 315 170M289 173Q301 180 313 173" fill="none" stroke="#613d37" strokeWidth="2" />
      {is('Eye Light') && <g fill="#fff3d9" opacity={p}><circle cx="279.4" cy="128.8" r="1.8" /><circle cx="319.4" cy="127.8" r="1.8" /></g>}
    </g>
    {rim > 0 && <g fill="none" stroke="#ffdfa6" strokeLinecap="round" opacity={rim}>
      {is('Edge Light') ? <path d="M350 108Q352 154 329 189M371 236Q388 247 391 274" strokeWidth="2.5" /> : is('Kicker Light') ? <><path d="M344 143Q341 169 326 180" strokeWidth="8" /><path d="M353 229L378 243" strokeWidth="7" /></> : <><path d="M319 48Q350 48 354 89" strokeWidth="4" /><path d="M337 217Q379 224 391 258" strokeWidth="5" /></>}
    </g>}
  </g>;
}

function Exterior({ name, p, id }: { name: string; p: number; id: string }) {
  const gold = name === 'Golden Hour';
  const flare = name === 'Lens Flare';
  const silhouette = name === 'Silhouette';
  const sunX = flare ? 515 - 175 * p : 480;
  const sunY = gold ? 80 + 80 * p : flare ? 58 + 70 * p : 122;
  return <g>
    <defs>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor={gold ? '#3a667c' : silhouette ? '#51879e' : '#274c80'} /><stop offset="1" stopColor={gold ? '#efb17b' : silhouette ? '#f4bd89' : '#86acba'} /></linearGradient>
      <radialGradient id={`${id}-sun`}><stop stopColor="#fff6cf" stopOpacity=".95" /><stop offset=".2" stopColor="#ffd499" stopOpacity=".5" /><stop offset="1" stopColor="#eab58d" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-outdoor-skin`}><stop stopColor={gold ? '#94644e' : '#716760'} /><stop offset="1" stopColor={gold ? '#efbd89' : '#baa292'} /></linearGradient>
    </defs>
    <rect width="600" height="280" fill={`url(#${id}-sky)`} />
    {(gold || flare || silhouette) && <><circle cx={sunX} cy={sunY} r="85" fill={`url(#${id}-sun)`} /><circle cx={sunX} cy={sunY} r="14" fill="#ffe6b8" /></>}
    <path d="M0 173L78 125L155 154L233 106L315 173L400 141L510 161L600 123V275H0Z" fill={gold ? '#6b7066' : '#304b65'} />
    <path d="M0 218L600 196V286H0Z" fill={gold ? '#ab9676' : '#3a555e'} />
    <path d="M362 202V119L445 95L524 118V205Z" fill={gold ? '#b88366' : '#455674'} />
    <path d="M355 120L444 82L532 119L524 128L445 101L360 131Z" fill="#354247" />
    {[378, 415, 472].map((x, i) => <g key={x}><rect x={x} y="140" width="22" height="29" fill={gold ? '#334d59' : '#192d48'} /><rect x={x + 2} y="142" width="18" height="25" fill="#ffd18e" opacity={gold ? .08 : .15 + p * .7} /><path d={`M${x + 11} 140V169M${x} 154H${x + 22}`} stroke="#637276" /></g>)}
    <path d="M370 215L514 215M365 223L520 223M0 267L600 246" stroke={gold ? '#d4b797' : '#6c8790'} strokeOpacity=".6" />
    <path d={gold ? `M227 248L${105 - 88 * p} 284L${138 - 92 * p} 284L250 248Z` : 'M227 248L210 267H252L250 248Z'} fill="#1c2828" opacity=".42" />
    <g>
      <path d="M224 195L219 247H230L238 212L243 247H254L248 195Z" fill="#172d38" />
      <path d="M228 150Q237 144 247 150L254 199H219Z" fill={silhouette ? '#14232b' : gold ? '#93664a' : '#3b606f'} />
      <path d="M224 155L204 184L212 190L234 164M248 155L268 181L262 191L241 164" fill={silhouette ? '#14232b' : `url(#${id}-outdoor-skin)`} />
      <path d="M232 138V155Q239 161 245 153V137" fill={silhouette ? '#14232b' : `url(#${id}-outdoor-skin)`} />
      <path d="M223 124Q221 107 237 107Q254 106 253 126L249 139Q238 151 227 138Z" fill={silhouette ? '#14232b' : `url(#${id}-outdoor-skin)`} />
      <path d="M223 126Q214 103 235 100Q258 99 255 125L248 116L230 115Z" fill="#172629" />
      <g opacity={silhouette ? 1 - p : 1}><path d="M230 127H233M243 127H246M235 137Q239 139 243 136" stroke="#5d4b41" fill="none" strokeWidth="1.5" /><path d="M248 159L251 192M249 203L252 240" stroke={gold ? '#e4ad72' : '#8496a0'} strokeOpacity={gold ? .6 : .25} strokeWidth="2" /></g>
      {silhouette && <path d="M227 118Q237 113 249 122L247 138Q237 147 228 136Z" fill="#b49376" opacity={(1 - p) * .6} />}
      <path d="M218 247H231M242 247H257" stroke="#16272d" strokeWidth="4" />
    </g>
    {!gold && !flare && !silhouette && <><path d="M555 242V133H541" fill="none" stroke="#192e3b" strokeWidth="5" /><circle cx="539" cy="140" r="7" fill="#ffdbab" opacity={.3 + .7 * p} /><circle cx="539" cy="140" r={13 + 15 * p} fill={`url(#${id}-sun)`} opacity={p} /></>}
    {flare && <g opacity={.12 + .68 * p}>
      <path d={`M${sunX - 180 * p} ${sunY}H${Math.min(600, sunX + 180 * p)}`} stroke="#ffe6ba" strokeWidth="2" />
      {[.6, 1.2, 1.7, 2.05].map((q, i) => <circle key={q} cx={sunX + (300 - sunX) * q} cy={sunY + (165 - sunY) * q} r={10 + i * 9} stroke={i % 2 ? '#94dcc9' : '#ffa688'} fill={i % 2 ? '#94dcc9' : '#ffa688'} fillOpacity=".08" strokeOpacity=".35" />)}
    </g>}
    <rect y="285" width="600" height="45" fill="#101a20" />
    <Note y={309}>{gold ? 'Lower sun → longer shadows, warm directional light' : flare ? 'Flare follows the real source through the optical center' : silhouette ? 'The bright background preserves the subject’s outline' : 'Cool sky illumination + warm existing lamps'}</Note>
  </g>;
}

function LightingFrame({ name, p, id, compact }: { name: string; p: number; id: string; compact?: boolean }) {
  const is = (v: string) => name === v;
  if (['Golden Hour', 'Blue Hour', 'Lens Flare', 'Silhouette'].includes(name)) return <Exterior name={name} p={p} id={id} />;
  const bright = is('High-Key Lighting');
  const pattern = is('Gobo Lighting') || is('Dappled Light');
  const window = is('Available Light') || is('Motivated Lighting') || is('Ambient Light');
  const shade = is('Low-Key Lighting') ? .25 + .58 * p : is('Chiaroscuro') ? .67 : .18;
  const faceShift = is('Available Light') ? 63 * (1 - p) : 0;
  return <g>
    <defs>
      <linearGradient id={`${id}-room`}><stop stopColor={bright ? '#bfc8c7' : '#3b4a4b'} /><stop offset="1" stopColor={bright ? '#d5d8cf' : '#1d2b33'} /></linearGradient>
      <radialGradient id={`${id}-lamp-glow`}><stop stopColor="#ffda9f" stopOpacity=".62" /><stop offset="1" stopColor="#ffcd80" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-temp`}><stop stopColor="#f8ac65" /><stop offset=".5" stopColor="#e9e6da" /><stop offset="1" stopColor="#86b3f8" /></linearGradient>
      <clipPath id={`${id}-frame`}><rect width="600" height="286" /></clipPath>
    </defs>
    <rect width="600" height="330" fill="#111c22" />
    <g clipPath={`url(#${id}-frame)`}>
      <rect width="600" height="286" fill={`url(#${id}-room)`} />
      <path d="M0 248H600M425 0V248M0 275H600" stroke={bright ? '#9fa9a6' : '#526465'} strokeOpacity=".35" />
      <rect x="448" y="67" width="93" height="111" rx="2" stroke="#a9a69a" fill="#354644" opacity=".3" />
      <path d="M453 167L481 124L502 145L537 111" stroke="#a1b8a7" strokeOpacity=".35" fill="none" />
      <rect width="600" height="286" fill="#03080c" opacity={bright ? .1 * (1 - p) : shade} />
      {bright && <rect width="600" height="286" fill="#e6e8df" opacity={.18 * p} />}
      {is('Ambient Light') && <rect width="600" height="286" fill="#97bfd1" opacity={.21 * p} />}
      {window && <>
        <rect x="30" y="33" width="107" height="161" fill="#a8c9d4" opacity={is('Motivated Lighting') ? .3 + .7 * p : .75} stroke="#718a92" strokeWidth="7" />
        <path d="M82 33V194M30 108H137" stroke="#21343f" strokeWidth="8" />
        <path d="M137 55L421 198L467 286H137Z" fill="#cbe5dd" opacity={is('Motivated Lighting') ? .05 + .1 * p : .075} />
        <path d="M126 194L216 267L415 267L137 117" fill="#b5cace" opacity=".1" />
        <Note x={34} y={216} color="#c9e3ed">Existing window</Note>
      </>}
      {is('Practical Lighting') && <>
        <ellipse cx="157" cy="177" rx="184" ry="137" fill={`url(#${id}-lamp-glow)`} opacity={p} />
        <ellipse cx="154" cy="257" rx="107" ry="15" fill="#ac7446" opacity={.2 + .4 * p} />
        <path d="M80 258H205M101 258V286M185 258V286" stroke="#755d49" strokeWidth="6" />
        <path d="M151 155V251M132 252H172" stroke="#9a815c" strokeWidth="5" />
        <path d="M125 109H179L191 157H113Z" fill={p > .1 ? '#cba96e' : '#6b695d'} />
        <path d="M119 152H185" stroke="#ffe8b2" strokeWidth="5" opacity={p} />
        <Note x={99} y={84} color="#ffd59a">Visible lamp</Note>
      </>}
      {pattern && <g opacity=".42" transform={`translate(${p * 30 - 15},0)`}>
        {is('Gobo Lighting') ? <g transform="rotate(-20 300 150)" fill="#080f13">{[15, 85, 155, 225, 295, 365, 435, 505].map((x) => <rect key={x} x={x} y="-100" width="23" height="500" />)}<rect x="-90" y="133" width="780" height="24" /></g> : <g fill="#060f12">{Array.from({ length: 35 }, (_, i) => <ellipse key={i} cx={(i * 89) % 620} cy={25 + ((i * 59) % 260)} rx={18 + i % 5 * 6} ry={10 + i % 4 * 4} transform={`rotate(${i * 27} ${(i * 89) % 620} ${25 + ((i * 59) % 260)})`} />)}</g>}
      </g>}
      {is('Chiaroscuro') && <path d={`M95 0L${380 - p * 33} 0L${390 - p * 29} 285L160 285Z`} fill="#d9b58b" opacity=".2" />}
      {is('Cross Lighting') ? <>
        <g transform="translate(-22,60) scale(.76)"><Portrait id={`${id}-a`} name="Key Light" p={.3} /></g>
        <g transform="translate(627,60) scale(-.76,.76)"><Portrait id={`${id}-b`} name="Key Light" p={p} /></g>
        <Source x={85} y={70} tx={205} ty={160} label="A key / B rear" strength={1} />
        <Source x={515} y={70} tx={410} ty={160} label="B key / A rear" strength={p} color="#afd8ee" />
        <path d="M85 70L370 116M515 70L248 115" fill="none" stroke="#b8d8df" opacity=".2" strokeDasharray="4 6" />
        <path d="M238 225L267 242" stroke="#b8d8df" strokeWidth="3" fill="none" opacity={p} /><path d="M357 228L336 242" stroke="#ffdb9e" strokeWidth="3" fill="none" />
        <Note x={199} y={273} anchor="middle">Subject A</Note><Note x={398} y={273} anchor="middle">Subject B</Note>
      </> : <g transform={`translate(${faceShift},0)`}><Portrait id={id} name={is('Available Light') ? 'Key Light' : name} p={p} /></g>}
      {is('Three-Point Lighting') && <><Source x={139} y={60} label="KEY" strength={.4 + .6 * ramp(p, 0, .33)} /><Source x={460} y={141} label="FILL · weaker" strength={ramp(p, .32, .68)} color="#b9d9e2" /><Source x={393} y={35} tx={344} ty={88} label="BACK" strength={ramp(p, .68, 1)} /></>}
      {is('Key Light') && <Source x={102 + p * 60} y={56 - p * 12} label="Dominant key" />}
      {is('Fill Light') && <><Source x={137} y={65} label="Fixed key" /><Source x={461} y={119} label="Fill increases" strength={p} large color="#bbddea" /></>}
      {is('Hard Light') && <Source x={126 + p * 25} y={86 - p * 45} label="Small source" />}
      {is('Soft Light') && <><g opacity={.35 + .65 * p}><rect x={103 - p * 20} y={59 - p * 20} width={19 + 45 * p} height={27 + 69 * p} rx="4" fill="#f0dfbb" /><path d="M156 94L257 132" stroke="#f0dfbb" strokeDasharray="4 5" /></g><Note x={72} y={187} color="#f0dfbb">Large apparent source</Note></>}
      {is('Rembrandt Lighting') && <><Source x={163} y={37} label="Elevated key" /><path d="M332 156L409 172H470" stroke="#f7d49a" fill="none" /><Note x={411} y={192} color="#f7d49a">Lit cheek triangle</Note></>}
      {is('Side Lighting') && <Source x={109} y={132} label="Lateral source" />}
      {is('Uplighting') && <><path d="M287 280L307 271L329 280" fill="#bddbd9" /><path d="M307 268V210" stroke="#b9deda" strokeDasharray="4 4" /><Note x={425} y={116} color="#b9deda">Shadow points up</Note><path d="M417 121L290 117" stroke="#b9deda" strokeOpacity=".6" /></>}
      {(is('Backlight') || is('Kicker Light') || is('Edge Light')) && <Source x={is('Backlight') ? 369 : 454} y={is('Backlight') ? 26 : 69} tx={is('Backlight') ? 342 : 345} ty={is('Backlight') ? 66 : 157} label={is('Backlight') ? 'Behind subject' : is('Kicker Light') ? 'Rear-side source' : 'Controlled edge'} strength={p} />}
      {is('Bounce Light') && <><Source x={471} y={53} tx={472} ty={185} label="Source" showRay={false} /><path d="M471 63L473 184L342 150" stroke="#edd6a9" fill="none" strokeWidth="2" strokeDasharray="5 4" opacity={.2 + .8 * p} /><rect x="459" y="154" width="29" height="87" transform="rotate(17 473 197)" fill="#e9e1c8" opacity={.25 + .75 * p} /><Note x={443} y={267} color="#e8d9b9">Pale reflector</Note></>}
      {(is('Broad Lighting') || is('Short Lighting')) && <><Source x={is('Broad Lighting') ? 141 : 455} y={77} label={is('Broad Lighting') ? 'Key: broad side' : 'Key: short side'} strength={p} /><path d="M311 103L320 116" fill="none" stroke="#d7e6e5" opacity=".55" /><Note x={400} y={230}>Face stays turned</Note></>}
      {is('Color Temperature') && <><rect x="435" y="114" width="67" height="76" rx="3" fill={`rgb(${Math.round(240 - 58 * p)},${Math.round(189 + 14 * p)},${Math.round(129 + 111 * p)})`} /><Note x={416} y={214}>Neutral gray card</Note><Note x={65} y={65} color="#e2e8e9">Fixed white balance: 5600 K</Note><rect x="89" y="243" width="139" height="8" rx="4" fill={`url(#${id}-temp)`} /><circle cx={89 + 139 * p} cy="247" r="6" fill="#fff" stroke="#23373f" /><Note x={90} y={274}>{Math.round(2800 + p * 4700)} K source</Note></>}
      {is('Eye Light') && <><Source x={307} y={27} ty={123} label="Small eye light" strength={p} showRay={false} /><path d="M332 130L425 118" stroke="#cfddd9" opacity=".5" /><Note x={430} y={120}>Catchlights</Note><rect x="47" y="96" width="144" height="100" rx="5" fill="#664b40" stroke="#8c9c93" /><path d="M61 139Q116 102 178 139Q119 176 61 139" fill="#adb7aa" /><circle cx="120" cy="139" r="20" fill="#39534b" /><circle cx="120" cy="139" r="10" fill="#122223" /><circle cx="113" cy="131" r="5.5" fill="#fff2d8" opacity={p} /><Note x={67} y={219}>Magnified eye detail</Note></>}
      {is('High-Key Lighting') && <><Source x={124} y={82} label="Soft key" large /><Source x={481} y={91} label="Soft fill" strength={.35 + .65 * p} large color="#d6e8e9" /></>}
      {is('Low-Key Lighting') && <><Source x={148} y={59} label="Key stays fixed" /><Note x={417} y={213}>Fill fades away</Note></>}
    </g>
    <rect y="286" width="600" height="44" fill="#111c22" />
    {!compact && <Note y={312}>{is('Three-Point Lighting') ? p < .33 ? '1 / KEY — establish the shape' : p < .68 ? '2 / FILL — lift the unlit side gently' : '3 / BACK — separate hair and shoulder' : is('Rembrandt Lighting') ? 'The triangle remains on the shadow-side cheek' : is('Hard Light') ? 'Small source → sharply defined shadow edges' : is('Soft Light') ? 'Larger source → a wider penumbra, at the same direction' : is('Broad Lighting') ? 'Larger visible cheek receives the key' : is('Short Lighting') ? 'Smaller visible cheek receives the key' : is('Gobo Lighting') ? 'One coherent window pattern across the subject and wall' : is('Dappled Light') ? 'Leaf occluders move together; the subject remains still' : is('Chiaroscuro') ? 'Sculpted light against a large, deliberate shadow mass' : LIGHT_STUDIES[name]?.phaseLabels[p < .5 ? 0 : 1]}</Note>}
  </g>;
}

export const LightStudy = memo(function LightStudy({ name, progress, compact, view = 'effect' }: StudyProps) {
  const id = `light-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const p = view === 'original' ? 0 : clamp(progress);
  return <svg viewBox="0 0 600 330" width="600" height="330" role="img" aria-label={`${name}. ${LIGHT_STUDIES[name]?.description ?? 'Original lighting demonstration.'}`} style={{ display: 'block', width: '100%', height: '100%', background: '#111c22' }}>
    <title>{name}</title>
    <LightingFrame name={name} p={p} id={id} compact={compact} />
  </svg>;
});
