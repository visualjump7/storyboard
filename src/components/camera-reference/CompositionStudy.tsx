'use client'

import { memo, useId, type ReactNode } from 'react'

type StudyDefinition = { description: string; phaseLabels?: [string, string]; kind: 'composition' }

const study = (description: string, start: string, end: string): StudyDefinition => ({
  description, phaseLabels: [start, end], kind: 'composition',
})

export const COMPOSITION_STUDIES: Record<string, StudyDefinition> = {
  'Rule of Thirds': study('Move the subject onto a vertical third and place the eyes near the upper horizontal third. The guides show intentional placement, not a mandatory rule.', 'Centered placement', 'Eyes at a third'),
  'Symmetry': study('Matching architecture on both sides of a central axis creates mirrored visual balance.', 'Uneven arrangement', 'Mirrored balance'),
  'Leading Lines': study('The edges of a walkway converge on the subject and guide the eye into the image.', 'Read the space', 'Follow the converging lines'),
  'Framing Within Frame': study('A foreground doorway encloses the person in the scene and creates a second frame inside the camera frame.', 'Open view', 'Doorway frames the subject'),
  'Negative Space': study('A small subject moves to one side, leaving a large, quiet area that becomes part of the composition.', 'Centered subject', 'Quiet space gives emphasis'),
  'Shallow Focus': study('The near person stays sharp while the distant person and set soften. A narrow focus range isolates one depth plane.', 'Both planes readable', 'Near plane isolated'),
  'Deep Focus': study('Foreground and background become sharp together, allowing the viewer to read action at several distances.', 'Background soft', 'Both planes sharp'),
  'Mise-en-Scène': study('Set, props, costume, light and a performer are arranged together to suggest a specific situation: someone waiting beside an untouched drink.', 'Unstaged room', 'An intentional scene'),
  'Golden Ratio': study('The frame is divided into approximately 61.8% and 38.2% areas. The subject moves to their intersection as one possible proportional arrangement.', 'Centered placement', '61.8 / 38.2 placement'),
  'Depth of Field': study('The focus point stays on the near person while the acceptable sharpness range expands to include the distant person. This is a conceptual depth-range study.', 'Narrow sharpness range', 'Broader sharpness range'),
  'Foreground Interest': study('A near-camera plant enters the frame, adding a clear foreground layer in front of the person and distant architecture.', 'Two depth layers', 'Foreground adds a third layer'),
  'Balancing Elements': study('A large, darker person on the left is balanced by a smaller, brighter lamp farther to the right.', 'Weight on one side', 'A smaller bright counterweight'),
  'Diagonal Lines': study('A sloping walkway and its moving subject create a rising diagonal that carries attention across the frame.', 'Find the diagonal', 'Attention travels upward'),
  'Triangular Composition': study('Three people form a triangle, giving the group a stable, readable hierarchy.', 'People on one level', 'Three triangular anchors'),
  'Centered Composition': study('The subject moves onto the exact central axis. Architecture reinforces that direct, frontal emphasis.', 'Off-center subject', 'Subject on the axis'),
  'Headroom': study('The portrait reframes to reduce the empty gap above the head. The bracket measures the space between the frame and hair.', 'Excess headroom', 'Small intentional gap'),
  'Lead Room': study('A person looking right moves toward the left side of the frame, making room in front of their gaze.', 'Little room ahead', 'Space in the gaze direction'),
  'Visual Weight': study('Two similarly sized people compete for attention. A brighter, warmer costume gives one person more visual weight without changing their size.', 'Equal visual weight', 'Warm bright color attracts attention'),
  'Repetition and Pattern': study('Repeated windows establish a rhythm. One illuminated window breaks that pattern and becomes the focal point.', 'Repeated rhythm', 'One variation draws the eye'),
  'Figure-Ground Relationship': study('A dark figure is difficult to distinguish against a dark wall. A brighter area behind the figure makes its silhouette legible.', 'Figure merges into the wall', 'Figure separates from the ground'),
  'Contrast': study('Value separation increases between the subject and the surrounding set. The brighter subject becomes the strongest point of attention.', 'Low value contrast', 'High value contrast'),
  'Close-Up': study('The frame tightens from a full figure to the head and shoulders, making facial expression the main information.', 'Full figure for scale', 'Head and shoulders'),
  'Extreme Close-Up': study('The image isolates one eye and its surrounding detail. Only a small part of the face fits inside the frame.', 'Full figure for scale', 'One eye fills the image'),
  'Medium Shot': study('A full figure reframes to approximately the waist up, preserving facial expression and hand gestures.', 'Full figure for scale', 'Waist-up framing'),
  'Over-the-Shoulder': study('The back of one person’s head and shoulder enters the foreground while the person they face remains clearly visible.', 'Clean view of the listener', 'Foreground shoulder anchors the view'),
  'P.O.V. Shot': study('An observer looks toward another person. The view transitions to the observer’s eyeline, with their own reaching hand visible at the lower edge.', 'Observer and eyeline', 'Through the observer’s eyes'),
  'Rack Focus': study('Focus moves from the near person to the distant person while the framing stays fixed. One becomes soft as the other becomes sharp.', 'Near person sharp', 'Far person sharp'),
  'Slow Motion': study('The same falling ball plays in two views. At one-quarter speed, the action has advanced only a quarter as far in time as the real-time view.', 'Same starting action', '1× compared with 0.25×'),
  'One-er (Oner)': study('One uninterrupted wide view follows three linked actions: enter, cross the room and meet another person. The shot never cuts.', 'Enter', 'Cross and meet · no cut'),
  'Two-Shot': study('Two complete, readable people share the composition. Their eyelines connect the scene without cutting between singles.', 'Establish both people', 'Shared two-person composition'),
  'Three-Shot': study('Three principal people remain visible together, with enough space to read each face and their relationship.', 'Establish the group', 'All three faces remain readable'),
  'Cowboy Shot': study('The frame tightens to roughly mid-thigh upward, keeping the hands and hip area visible.', 'Full figure for scale', 'Mid-thigh-up framing'),
  'Medium Close-Up': study('The frame tightens to chest-up, giving facial expression prominence while retaining the shoulders and upper torso.', 'Full figure for scale', 'Chest-up framing'),
  'Choker Shot': study('A very tight face crop compresses the forehead and chin toward the frame edges, excluding most of the shoulders.', 'Full figure for scale', 'Tight face crop'),
  'Long Shot': study('A full person remains visible from head to feet, with enough surrounding space to read their position.', 'Full figure', 'Head to feet plus surroundings'),
  'Extreme Long Shot': study('The figure becomes very small inside a broad environment. The location carries more visual information than the person.', 'Full figure for scale', 'Environment dominates'),
}

const INK = '#dce6e4'
const MINT = '#a6d6c8'
const GOLD = '#f3c48c'
const DULL = '#829598'
const ease = (n: number) => { const p = Math.max(0, Math.min(1, n)); return p * p * (3 - 2 * p) }
const mix = (a: number, b: number, t: number) => a + (b - a) * t

function Label({ x, y, children, color = INK, anchor = 'start', opacity = 1 }: { x: number; y: number; children: ReactNode; color?: string; anchor?: 'start' | 'middle' | 'end'; opacity?: number }) {
  return <text x={x} y={y} fill={color} fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="500" textAnchor={anchor} opacity={opacity} paintOrder="stroke" stroke="#111b20" strokeWidth="3" strokeLinejoin="round">{children}</text>
}

function Person({ x, y, scale = 1, shirt = '#708f96', skin = '#d4a385', profile = false, dark = false, gesture = 0 }: { x: number; y: number; scale?: number; shirt?: string; skin?: string; profile?: boolean; dark?: boolean; gesture?: number }) {
  const face = dark ? '#233136' : skin
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cx="0" cy="238" rx="44" ry="8" fill="#030b10" opacity=".55" />
    <path d="M-29 137L-29 182L-26 231L-7 231L1 169L8 231L27 231L31 177L29 137Z" fill={dark ? '#203038' : '#293e49'} />
    <path d="M-26 228L-29 238L-3 238L-7 228M8 228L7 238L34 238L27 228" fill="#17252b" />
    <path d="M-16 61L-44 71Q-49 88-42 111L-31 140Q0 149 32 140L42 105L43 75L16 61Z" fill={dark ? '#233136' : shirt} />
    <path d="M-40 77Q-48 104-43 132L-34 158L-23 155L-30 128L-27 84" fill={dark ? '#233136' : shirt} />
    <path d="M-34 153L-22 151L-19 162Q-26 176-33 162Z" fill={face} />
    <g transform={`rotate(${-gesture * 35} 36 80)`}>
      <path d="M33 75Q47 76 46 95L43 128L36 155L25 152L30 123L28 91Z" fill={dark ? '#233136' : shirt} />
      <path d="M27 149L37 153L36 164Q29 175 24 161Z" fill={face} />
    </g>
    <path d="M-10 48L-11 65Q0 76 12 64L10 48" fill={face} />
    <path d="M-11 60Q0 67 11 59L10 49L-10 49Z" fill="#946c58" opacity={dark ? 0 : .38} />
    <ellipse cx="-21" cy="32" rx="5" ry="8" fill={face} /><ellipse cx="21" cy="32" rx="5" ry="8" fill={face} />
    <path d={profile ? 'M-19 17Q-14-2 7 4Q20 8 19 25L29 34L19 38Q18 54 3 58Q-19 54-21 32Z' : 'M-22 22Q-23 3 0 2Q23 3 22 24L20 42Q15 59 0 61Q-16 56-21 42Z'} fill={face} />
    <path d="M-23 28Q-29 8-13 1Q7-8 23 8L25 27L18 22L14 13Q-3 22-17 14L-18 30Z" fill={dark ? '#1c2c31' : '#243035'} />
    {!dark && <>
      {!profile && <><path d="M-15 28L-6 27M7 27L15 28" stroke="#574e48" strokeWidth="2" strokeLinecap="round" /><ellipse cx="-10" cy="33" rx="4.4" ry="2.1" fill="#f0e5d2" /><circle cx="-10" cy="33" r="1.8" fill="#31474c" /></>}
      <ellipse cx={profile ? 14 : 10} cy="33" rx={profile ? 2.8 : 4.4} ry="2.1" fill="#f0e5d2" /><circle cx={profile ? 15 : 10} cy="33" r="1.8" fill="#31474c" />
      <path d={profile ? 'M20 42L13 44' : 'M0 33L-3 43L2 43'} fill="none" stroke="#9d715c" strokeWidth="1.3" strokeLinecap="round" />
      <path d={profile ? 'M9 49L17 48' : 'M-7 49Q0 53 7 49'} fill="none" stroke="#855e53" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M-11 65L0 78L12 65M0 78L0 141" fill="none" stroke="#dce7de" strokeWidth="1.2" opacity=".25" />
    </>}
  </g>
}

function Set({ bare = false, opacity = 1 }: { bare?: boolean; opacity?: number }) {
  return <g opacity={opacity}>
    <rect x="20" y="44" width="560" height="246" fill="#182a32" />
    <path d="M20 217H580V290H20Z" fill="#22383e" />
    <path d="M20 290L246 217M160 290L273 217M440 290L327 217M580 290L354 217M20 246H580M20 270H580" stroke="#3a5054" strokeWidth="1" />
    {!bare && <>
      {[73, 414].map(x => <g key={x}><path d={`M${x} 199V97Q${x + 38} 45 ${x + 76} 97V199Z`} fill="#2a4852" stroke="#3d5b63" strokeWidth="3" /><path d={`M${x + 38} 76V199M${x} 137H${x + 76}`} stroke="#1b3038" strokeWidth="5" /></g>)}
      <path d="M219 212V72H379V212" fill="#14232b" stroke="#2d444c" strokeWidth="4" />
      <path d="M245 212V89H353V212" fill="#1d333d" />
    </>}
  </g>
}

function Plant({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-17 0L-12 30H13L18 0Z" fill="#b17959" /><path d="M0 0V-77M0-32L-28-54M0-46L25-67M0-16L30-32" stroke="#608d77" strokeWidth="4" />
    <path d="M0-61Q-28-76-15-92Q4-85 0-61M-22-49Q-50-44-43-70Q-23-68-22-49M20-60Q40-88 46-65Q39-48 20-60M22-27Q48-45 47-25Q38-13 22-27" fill="#598b79" />
  </g>
}

const SHOT_SIZES: Record<string, { scale: number; y: number; x?: number; label: string }> = {
  'Close-Up': { scale: 3.18, y: 58, label: 'HEAD + SHOULDERS' },
  'Extreme Close-Up': { scale: 24, x: 540, y: -627, label: 'SINGLE-EYE DETAIL' },
  'Medium Shot': { scale: 1.67, y: 56, label: 'WAIST UP' },
  'Cowboy Shot': { scale: 1.47, y: 55, label: 'MID-THIGH UP' },
  'Medium Close-Up': { scale: 2.42, y: 56, label: 'CHEST UP' },
  'Choker Shot': { scale: 4.85, y: 13, label: 'TIGHT FACE CROP' },
  'Long Shot': { scale: .85, y: 66, label: 'FULL FIGURE + SPACE' },
  'Extreme Long Shot': { scale: .3, y: 163, label: 'SMALL FIGURE / LARGE SETTING' },
}

export const CompositionStudy = memo(function CompositionStudy({ name, progress, compact = false }: { name: string; progress: number; compact?: boolean }) {
  const uid = `composition-${useId().replace(/:/g, '')}`
  const p = Math.max(0, Math.min(1, progress))
  const a = ease((p - .08) / .76)
  let scene: ReactNode = null
  let caption = COMPOSITION_STUDIES[name]?.phaseLabels?.[a < .5 ? 0 : 1] ?? name
  let nearBlur = 0
  let farBlur = 0
  const guides = (children: ReactNode) => <g opacity={.25 + .75 * a} stroke={MINT} strokeWidth="1.3" fill="none">{children}</g>

  if (SHOT_SIZES[name]) {
    const shot = SHOT_SIZES[name]
    const scale = mix(.85, shot.scale, a)
    const y = mix(66, shot.y, a)
    const x = mix(300, shot.x ?? 300, a)
    caption = a < .6 ? 'Framing study · the person stays in place' : shot.label
    scene = <><Set /><Person x={x} y={y} scale={scale} gesture={name === 'Medium Shot' ? .45 * a : 0} />
      {a > .85 && <g opacity={ease((a - .85) / .15)}><path d="M27 64V51H42M558 51H573V64M27 271V284H42M558 284H573V271" fill="none" stroke={MINT} strokeWidth="2" />
        <Label x={559} y={273} anchor="end" color={GOLD}>{shot.label}</Label></g>}
    </>
  } else if (['Rack Focus', 'Shallow Focus', 'Deep Focus', 'Depth of Field'].includes(name)) {
    if (name === 'Rack Focus') { nearBlur = 7 * a; farBlur = 7 * (1 - a) }
    if (name === 'Shallow Focus') farBlur = 7 * a
    if (name === 'Deep Focus' || name === 'Depth of Field') farBlur = 7 * (1 - a)
    if (name === 'Deep Focus') nearBlur = 2.5 * (1 - a)
    scene = <>
      <g filter={`url(#${uid}-far)`}><Set /><Person x={416} y={126} scale={.54} shirt="#9e7661" /></g>
      <g filter={`url(#${uid}-near)`}><Person x={184} y={70} scale={1.08} shirt="#718f97" /></g>
      <path d="M77 274H276M349 249H490" stroke={MINT} strokeWidth="2" strokeDasharray="5 4" opacity=".7" />
      <Label x={75} y={261} color={nearBlur < 2 ? MINT : DULL}>NEAR · {nearBlur < 2 ? 'SHARP' : 'SOFT'}</Label>
      <Label x={372} y={238} color={farBlur < 2 ? MINT : DULL}>FAR · {farBlur < 2 ? 'SHARP' : 'SOFT'}</Label>
      {name === 'Rack Focus' ? <><path d="M259 105H345" stroke={GOLD} strokeWidth="1.7" markerEnd={`url(#${uid}-arrow)`} /><Label x={300} y={90} anchor="middle" color={GOLD}>FOCUS TRANSFER</Label></> :
        <><rect x="329" y="65" width="211" height="30" rx="6" fill="#101d24" opacity=".9" /><Label x={434} y={85} anchor="middle" color={GOLD}>{name === 'Shallow Focus' ? 'NARROWING FOCUS RANGE' : 'EXPANDING FOCUS RANGE'}</Label></>}
    </>
  } else {
    switch (name) {
      case 'Rule of Thirds': {
        const x = mix(300, 393.3, a)
        scene = <><Set /><Person x={x} y={96} scale={.91} />{guides(<><path d="M206.7 44V290M393.3 44V290M20 126H580M20 208H580" strokeDasharray="5 4" /><circle cx="393.3" cy="126" r="7" /></>)}<Label x={41} y={80} color={MINT} opacity={a}>EYES AT AN INTERSECTION</Label></>
        break
      }
      case 'Golden Ratio': {
        const x = mix(300, 366.1, a)
        scene = <><Set /><Person x={x} y={108} scale={.9} />{guides(<><path d="M366.1 44V290M20 138H580" strokeDasharray="5 4" /><rect x="20" y="44" width="346.1" height="246" /><circle cx="366.1" cy="138" r="7" /></>)}<Label x={193} y={68} anchor="middle" color={MINT}>61.8%</Label><Label x={473} y={68} anchor="middle" color={MINT}>38.2%</Label></>
        break
      }
      case 'Symmetry': {
        const rightX = mix(511, 470, a)
        scene = <><Set bare />{[130, rightX].map((x, i) => <g key={i}><rect x={x - 46} y={mix(i ? 108 : 73, 73, a)} width="92" height="126" rx="40" fill="#34515c" stroke="#6b8b91" strokeWidth="3" /><path d={`M${x} 75V198`} stroke="#192f38" strokeWidth="5" /><rect x={x - 60} y="204" width="120" height="9" fill="#4b6569" /></g>)}<Person x={300} y={72} scale={.84} />{guides(<path d="M300 48V285" strokeDasharray="5 4" />)}<Label x={300} y={64} anchor="middle" color={MINT}>MIRROR AXIS</Label></>
        break
      }
      case 'Centered Composition':
        scene = <><Set /><Person x={mix(170, 300, a)} y={71} scale={.84} />{guides(<><path d="M300 44V290" strokeDasharray="5 4" /><path d="M281 166H319M300 147V185" /></>)}<Label x={319} y={79} color={MINT} opacity={a}>CENTER AXIS</Label></>
        break
      case 'Leading Lines':
        scene = <><Set bare /><path d="M35 290L281 171H319L565 290Z" fill="#466266" /><path d="M42 265L272 160M558 265L328 160" stroke="#7b999d" strokeWidth="7" /><Person x={300} y={87} scale={.68} />{guides(<><path d="M51 285L276 176M549 285L324 176" strokeWidth="2.5" markerEnd={`url(#${uid}-arrow)`} /><circle cx="300" cy="159" r="16" /></>)}<Label x={43} y={77} color={MINT}>FOLLOW THE PATH TO THE PERSON</Label></>
        break
      case 'Framing Within Frame':
        scene = <><Set /><Person x={333} y={105} scale={.68} /><g opacity={a}><path d="M20 44H580V290H480V74H117V290H20Z" fill="#0b151c" /><rect x="112" y="71" width="370" height="222" fill="none" stroke="#997d63" strokeWidth="7" /><path d="M123 82H471M123 82V290" stroke="#c8a683" strokeWidth="2" opacity=".6" /></g><Label x={300} y={65} anchor="middle" color={GOLD} opacity={a}>FOREGROUND DOORWAY</Label></>
        break
      case 'Negative Space':
        scene = <><Set bare /><Person x={mix(300, 459, a)} y={113} scale={.65} /><rect x="44" y="71" width="321" height="177" rx="6" fill="#a6d6c8" opacity={.06 * a} /><Label x={205} y={145} anchor="middle" color={MINT} opacity={a}>QUIET, UNOCCUPIED SPACE</Label><path d="M65 167H345" stroke={MINT} strokeDasharray="4 5" opacity={a * .5} /></>
        break
      case 'Mise-en-Scène':
        scene = <><Set /><g opacity={a}><path d="M151 64L55 233H260Z" fill="#edbd78" opacity=".13" /><path d="M135 76L151 49L168 76Z" fill="#e1b875" /><rect x="371" y="202" width="119" height="8" rx="2" fill="#9c7e60" /><path d="M384 210V266M478 210V266" stroke="#6b5345" strokeWidth="7" /><path d="M416 183H438V200H416Z" fill="#d4dfd2" /><path d="M438 186Q451 185 445 197H438" fill="none" stroke="#d4dfd2" strokeWidth="3" /><Plant x={100} y={247} scale={.58} /></g><Person x={mix(300, 257, a)} y={81} scale={.84} shirt={a > .5 ? '#a4795e' : '#708f96'} gesture={.13 * a} /><g opacity={a}><Label x={80} y={103} color={GOLD}>LIGHT</Label><Label x={240} y={254} color={GOLD}>COSTUME + PERFORMANCE</Label><Label x={422} y={167} anchor="middle" color={GOLD}>UNTOUCHED DRINK</Label></g></>
        break
      case 'Foreground Interest':
        scene = <><Set /><Person x={345} y={99} scale={.73} /><g transform={`translate(${mix(-180, 0, a)} 0)`}><Plant x={103} y={254} scale={1.5} /></g><Label x={44} y={77} color={GOLD} opacity={a}>NEAR PLANT</Label><Label x={290} y={82} color={MINT}>MIDDLE PERSON</Label><Label x={437} y={125} color={DULL}>FAR SET</Label></>
        break
      case 'Balancing Elements':
        scene = <><Set bare /><Person x={157} y={64} scale={.91} shirt="#526974" /><g opacity={a}><path d="M468 187V254" stroke="#a28b6d" strokeWidth="4" /><path d="M445 183L454 151H483L493 183Z" fill="#f5cc90" /><ellipse cx="469" cy="254" rx="25" ry="5" fill="#8d785e" /><circle cx="469" cy="169" r="41" fill="#f1bd73" opacity=".08" /></g><Label x={82} y={82} color={DULL}>LARGE / DARK</Label><Label x={406} y={124} color={GOLD} opacity={a}>SMALL / BRIGHT</Label>{guides(<><path d="M148 274H476M308 265L299 282H317Z" /><circle cx="148" cy="274" r="4" /><circle cx="476" cy="274" r="4" /></>)}</>
        break
      case 'Diagonal Lines': {
        const walkX = mix(166, 382, a)
        const groundY = 277 - (walkX - 50) * 154 / 434
        scene = <><Set bare /><path d="M50 277L484 123V290H50Z" fill="#3b565d" /><path d="M75 230L480 83" stroke="#839c98" strokeWidth="5" /><Person x={walkX} y={groundY - 238 * .51} scale={.51} profile />{guides(<path d="M91 270L465 134" strokeWidth="2" markerEnd={`url(#${uid}-arrow)`} />)}<Label x={58} y={78} color={MINT}>RISING DIAGONAL</Label></>
        break
      }
      case 'Triangular Composition': {
        const top = mix(136, 76, a)
        scene = <><Set /><Person x={181} y={136} scale={.58} shirt="#8b7569" /><Person x={300} y={top} scale={.8} /><Person x={419} y={136} scale={.58} shirt="#a08762" />{guides(<><path d={`M181 155L300 ${top + 27}L419 155Z`} strokeDasharray="5 4" /><circle cx="181" cy="155" r="5" /><circle cx="300" cy={top + 27} r="5" /><circle cx="419" cy="155" r="5" /></>)}<Label x={300} y={276} anchor="middle" color={MINT}>THREE PEOPLE · THREE ANCHORS</Label></>
        break
      }
      case 'Headroom': {
        const top = mix(132, 62, a)
        scene = <><Set /><Person x={300} y={top} scale={1.6} /><path d={`M362 45H382M372 45V${top}M362 ${top}H382`} stroke={GOLD} strokeWidth="1.8" /><Label x={389} y={Math.max(71, 52 + (top - 45) / 2)} color={GOLD}>{a < .6 ? 'LARGE GAP' : 'SMALL GAP'}</Label><path d="M20 45H580" stroke={GOLD} strokeWidth="1.5" /><Label x={42} y={270} color={MINT}>FRAME TOP → TOP OF HAIR</Label></>
        break
      }
      case 'Lead Room': {
        const x = mix(454, 177, a)
        const start = x + 34
        scene = <><Set bare /><rect x={start} y="77" width={Math.max(0, 550 - start)} height="160" fill={MINT} opacity=".065" /><Person x={x} y={83} scale={.89} profile /><path d={`M${start} 112H545`} stroke={GOLD} strokeWidth="1.7" strokeDasharray="5 4" markerEnd={`url(#${uid}-arrow)`} /><Label x={340} y={91} color={GOLD} opacity={a}>ROOM AHEAD OF THE GAZE</Label></>
        break
      }
      case 'Visual Weight':
        scene = <><Set bare /><Person x={182} y={83} scale={.82} shirt="#506970" /><Person x={418} y={83} scale={.82} shirt={`rgb(${Math.round(mix(80, 211, a))},${Math.round(mix(105, 134, a))},${Math.round(mix(112, 84, a))})`} /><Label x={182} y={76} anchor="middle" color={DULL}>SAME SIZE</Label><Label x={418} y={76} anchor="middle" color={a > .5 ? GOLD : DULL}>SAME SIZE</Label><Label x={300} y={278} anchor="middle" color={GOLD} opacity={a}>COLOR + BRIGHTNESS SHIFT ATTENTION</Label></>
        break
      case 'Repetition and Pattern':
        scene = <><Set bare />{Array.from({ length: 10 }, (_, i) => { const x = 75 + i % 5 * 110; const y = i < 5 ? 69 : 171; const active = i === 3; return <g key={i}><rect x={x - 32} y={y} width="64" height="79" rx="23" fill={active ? `rgb(${Math.round(mix(49, 225, a))},${Math.round(mix(77, 179, a))},${Math.round(mix(86, 111, a))})` : '#314d56'} stroke="#66858c" strokeWidth="2" /><path d={`M${x} ${y}V${y + 79}M${x - 32} ${y + 42}H${x + 32}`} stroke="#192f38" strokeWidth="4" />{active && <circle cx={x} cy={y + 37} r="47" fill="none" stroke={GOLD} strokeWidth="1.5" opacity={a} />}</g> })}<Label x={300} y={279} anchor="middle" color={GOLD} opacity={a}>ONE LIT WINDOW BREAKS THE RHYTHM</Label></>
        break
      case 'Figure-Ground Relationship':
        scene = <><Set bare /><rect x="213" y="47" width="174" height="228" fill={`rgb(${Math.round(mix(25, 114, a))},${Math.round(mix(42, 141, a))},${Math.round(mix(50, 140, a))})`} /><Person x={300} y={72} scale={.85} dark /><Label x={300} y={279} anchor="middle" color={MINT}>THE SAME SILHOUETTE · A CHANGING BACKGROUND</Label></>
        break
      case 'Contrast':
        scene = <><Set bare opacity={1} /><rect x="20" y="44" width="560" height="246" fill="#030b10" opacity={.65 * a} /><Person x={300} y={72} scale={.85} shirt={`rgb(${Math.round(mix(51, 186, a))},${Math.round(mix(67, 198, a))},${Math.round(mix(73, 190, a))})`} skin={`rgb(${Math.round(mix(61, 223, a))},${Math.round(mix(72, 182, a))},${Math.round(mix(76, 148, a))})`} /><Label x={300} y={280} anchor="middle" color={MINT}>DARK SURROUNDINGS / BRIGHT SUBJECT</Label></>
        break
      case 'Over-the-Shoulder':
        scene = <><Set /><Person x={387} y={67} scale={1.05} shirt="#a4826b" /><g opacity={a} transform={`translate(${mix(-200, 0, a)} 0)`}><ellipse cx="104" cy="132" rx="54" ry="66" fill="#152229" /><path d="M47 177Q104 161 155 195L247 290H20V213Z" fill="#304b56" /><path d="M51 190Q104 175 154 205" fill="none" stroke="#526f77" strokeWidth="3" /></g><Label x={46} y={75} color={MINT} opacity={a}>NEAR SHOULDER</Label><Label x={389} y={59} anchor="middle" color={GOLD}>PERSON IN VIEW</Label></>
        break
      case 'P.O.V. Shot':
        scene = <><Set /><Person x={mix(409, 300, a)} y={mix(113, 76, a)} scale={mix(.66, .92, a)} shirt="#a4826b" /><g opacity={1 - a}><Person x={136} y={105} scale={.72} profile /><path d="M166 128L388 136" stroke={GOLD} strokeDasharray="5 4" markerEnd={`url(#${uid}-arrow)`} /><Label x={54} y={84} color={MINT}>OBSERVER</Label><Label x={237} y={117} color={GOLD}>EYELINE</Label></g><g opacity={a}><path d="M451 301L388 252L362 242L352 226Q350 218 356 219L369 232L369 208Q371 201 376 209L380 231L383 204Q387 198 390 207L391 233L398 213Q403 208 405 215L400 239L411 231Q418 228 418 235L413 253L477 290Z" fill="#c59476" /><path d="M442 290L407 264L424 246L489 290Z" fill="#688994" /><Label x={300} y={63} anchor="middle" color={MINT}>OBSERVER’S VIEW</Label></g></>
        break
      case 'Two-Shot':
        scene = <><Set /><Person x={mix(226, 182, a)} y={77} scale={.86} profile gesture={.35 * a} /><g transform="translate(836 0) scale(-1 1)"><Person x={418} y={77} scale={.86} profile shirt="#a4826b" /></g><path d="M222 107H378" stroke={GOLD} strokeWidth="1.5" strokeDasharray="5 4" opacity={.5 * a} /><Label x={300} y={277} anchor="middle" color={MINT}>TWO PEOPLE SHARE ONE FRAME</Label></>
        break
      case 'Three-Shot':
        scene = <><Set /><Person x={mix(239, 158, a)} y={89} scale={.79} profile /><Person x={300} y={79} scale={.84} shirt="#a08762" gesture={.2 * a} /><Person x={mix(361, 442, a)} y={89} scale={.79} shirt="#987465" /><Label x={300} y={278} anchor="middle" color={MINT}>THREE DISTINCT FACES IN ONE COMPOSITION</Label></>
        break
      case 'One-er (Oner)': {
        const movingX = mix(62, 349, ease(p))
        const stage = p < .23 ? 0 : p < .8 ? 1 : 2
        caption = ['01 · ENTER · continuous shot', '02 · CROSS THE ROOM · continuous shot', '03 · MEET · continuous shot'][stage]
        scene = <><Set /><rect x="24" y="78" width="65" height="166" fill="#0e1c23" stroke="#41606a" strokeWidth="3" /><Person x={450} y={101} scale={.69} shirt="#a4826b" /><Person x={movingX} y={91 + Math.sin(p * 32) * (p < .82 ? 2 : 0)} scale={.74} profile gesture={p > .82 ? .75 * ease((p - .82) / .18) : .15} /><path d="M75 275H341" stroke={MINT} strokeWidth="1.6" strokeDasharray="6 5" markerEnd={`url(#${uid}-arrow)`} />{['ENTER', 'CROSS', 'MEET'].map((s, i) => <Label key={s} x={[81, 260, 431][i]} y={65} anchor="middle" color={stage === i ? GOLD : DULL}>{`0${i + 1} ${s}`}</Label>)}<circle cx="523" cy="268" r="4" fill="#da9875" /><Label x={512} y={273} anchor="end" color={GOLD}>ONE TAKE</Label></>
        break
      }
      case 'Slow Motion': {
        const ballY = (time: number) => 103 + 144 * time * time
        const t = Math.min(p / .86, 1)
        scene = <><rect x="20" y="44" width="560" height="246" fill="#182a32" /><path d="M300 44V290" stroke="#567079" strokeWidth="1" />{[0, 1].map(i => { const x = i ? 440 : 160; const localTime = t * (i ? .25 : 1); const y = ballY(localTime); return <g key={i}><path d={`M${x - 98} 269H${x + 98}`} stroke="#67838a" strokeWidth="3" /><ellipse cx={x} cy="267" rx={23 - localTime * 8} ry="5" fill="#050e15" opacity=".65" /><path d={`M${x} 104V247`} stroke="#789394" strokeDasharray="3 6" opacity=".35" />{[.08, .16].map(offset => <circle key={offset} cx={x} cy={ballY(Math.max(0, localTime - offset))} r="17" fill={GOLD} opacity=".08" />)}<circle cx={x} cy={y} r="17" fill={GOLD} /><path d={`M${x - 9} ${y - 6}Q${x} ${y - 17} ${x + 8} ${y - 8}`} stroke="#ffe7bc" strokeWidth="2" fill="none" /><Label x={x} y={77} anchor="middle" color={i ? MINT : GOLD}>{i ? 'SLOW MOTION · 0.25×' : 'REAL TIME · 1×'}</Label><Label x={x} y={285} anchor="middle" color={DULL}>{(localTime * 1.0).toFixed(2)} s of action shown</Label></g> })}</>
        break
      }
    }
  }

  return <svg viewBox="0 0 600 330" role="img" aria-label={`${name}. ${COMPOSITION_STUDIES[name]?.description ?? ''}`} style={{ display: 'block', width: '100%', height: '100%', background: '#101a20' }}>
    <defs>
      <clipPath id={`${uid}-frame`}><rect x="20" y="44" width="560" height="246" rx="5" /></clipPath>
      <filter id={`${uid}-near`} x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation={nearBlur} /></filter>
      <filter id={`${uid}-far`} x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation={farBlur} /></filter>
      <marker id={`${uid}-arrow`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill={MINT} /></marker>
    </defs>
    <Label x={21} y={28} color={MINT}>{name.toUpperCase()}</Label>
    {!compact && <Label x={579} y={28} anchor="end" color={DULL}>ILLUSTRATED STUDY</Label>}
    <g clipPath={`url(#${uid}-frame)`}>{scene}</g>
    <rect x="20" y="44" width="560" height="246" rx="5" fill="none" stroke="#48616a" strokeWidth="1" />
    <Label x={300} y={314} anchor="middle" color={INK}>{caption}</Label>
  </svg>
})
