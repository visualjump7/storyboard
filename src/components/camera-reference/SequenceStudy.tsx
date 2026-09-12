'use client';

import { memo, useId } from 'react';
import type { ReactNode } from 'react';

type SequenceDefinition = { description: string; phaseLabels?: [string, string]; kind: 'sequence' };
const study = (description: string, start: string, end: string): SequenceDefinition => ({ description, phaseLabels: [start, end], kind: 'sequence' });

/** Original, schematic examples. Narrative concepts illustrate structure, not a specific film. */
export const SEQUENCE_STUDIES: Record<string, SequenceDefinition> = {
  'Cross-Cutting': study('The edit alternates between a courier approaching the station and a waiting passenger. Their matching countdown connects the two actions.', 'Courier approaches', 'Passenger waits'),
  'Jump Cut': study('The locked station view skips forward in discrete cuts. The courier abruptly changes position while the background stays identical.', 'Continuous space', 'Skipped time'),
  'Dissolve': study('The station loses opacity as the interior gains it. Both shots remain visible together during the transition.', 'Station', 'Interior'),
  'Fade In/Out': study('The station fades completely to black. A new interior then emerges from black, with no overlap between the images.', 'Fade to black', 'Fade from black'),
  'Montage': study('Packing a letter, checking a route, travelling, and arriving are condensed into four selected shots. Together they imply a much longer journey.', 'Prepare', 'Arrive'),
  'Smash Cut': study('One abrupt edit replaces a quiet, spacious interior with a tightly framed rushing train. The change in scale, brightness, and movement creates contrast.', 'Quiet room', 'Rushing train'),
  'Long Take': study('A courier crosses the station in one uninterrupted view. The continuous shot bar and running counter never reset.', 'Shot begins', 'Same shot continues'),
  'Freeze Frame': study('The courier moves until the selected frame, then the entire scene holds while playback time continues.', 'Action plays', 'Image holds'),
  'Split Screen': study('Two independent views remain visible at once: a courier travelling and a passenger waiting. Both actions advance together.', 'Two views', 'Same moment'),
  'Reaction Shot': study('First see the approaching train, then cut to the waiting passenger. Widening eyes and a smile communicate their response.', 'See the event', 'See its effect'),
  'Cutaway': study('The courier remains the main action. A separate clock shot supplies deadline context before the edit returns to the courier.', 'Main action', 'Return to action'),
  'Cut-In': study('The wide shot establishes a letter in the courier’s hand. A direct cut then isolates that same letter in closer framing.', 'Established in wide', 'Detail of same action'),
  'Wipe': study('A sharp vertical boundary travels from left to right, replacing the station with the interior. The shots never become transparent.', 'Station', 'Interior replaces it'),
  'Iris': study('A circular opening expands from the letter to reveal the station. Everything outside the growing circle stays black.', 'Small circular opening', 'Full scene revealed'),
  'Time-Lapse': study('Sun position, clouds, shadows, and a growing plant change over several days while the camera remains fixed. This compresses a slow process.', 'Day 1', 'Day 6'),
  'Fast Motion': study('The top courier completes four walks while the real-time comparison below completes one. Both follow the same path at a constant speed.', 'Same action', '4× versus 1×'),
  'Reverse Motion': study('Compare a letter falling forward in time with the same recorded action played backward. In reverse, the letter rises back into the hand.', 'Reverse starts on ground', 'Letter returns to hand'),
  'Flashback': study('A present-day letter prompts a visit to an earlier childhood scene, then the edit returns to the present. The labels make the time shift explicit.', 'Present', 'Past → present'),
  'Foreshadowing': study('A close view establishes a loose train-door latch. Later, that same latch opens and a letter blows out: the early clue prepares the payoff.', 'Plant a clue', 'Pay off the clue'),
  'Breaking the Fourth Wall': study('A character turns their gaze from the scene toward the viewer, then directly addresses us in a speech bubble.', 'Inside the scene', 'Addresses the viewer'),
  'In Medias Res': study('The opening begins halfway through a chase. Only afterward does an earlier scene reveal the letter that caused the rush.', 'Open during action', 'Supply earlier context'),
  'Cliffhanger': study('The courier reaches for a departing train, but the scene stops before the letter reaches the passenger. The outcome stays unresolved.', 'Approach the outcome', 'Stop before resolution'),
  'Flashforward': study('The courier’s present-day journey briefly gives way to a future reunion, then returns to the unfinished journey.', 'Present', 'Future → present'),
  'Non-Linear Narrative': study('Three events are shown as delivery, preparation, then departure, rather than their chronological order. The numbered cards track story time.', 'Event 3', 'Event 1 → event 2'),
  'Parallel Storylines': study('Two separate character arcs develop in parallel: a courier makes a delivery while a gardener nurtures a plant. The shared layout does not imply a meeting.', 'Two separate arcs', 'Each arc progresses'),
  'Frame Narrative': study('An outer scene shows a storyteller with an open book. The view moves into the story inside the book, then returns to the storyteller.', 'Outer story', 'Inner story → outer'),
  'Voiceover Narration': study('The courier stays on screen while a narrator’s written line adds private memory. The text illustrates an offscreen voice; this study has no audio.', 'Visible journey', 'Offscreen perspective'),
  'Motif': study('A red letter recurs at preparation, departure, and reunion. Repetition links these different scenes and builds its emotional significance.', 'First appearance', 'Return with meaning'),
  'Symbolism': study('A bird in a closed cage accompanies a confined figure. The opened cage, departing bird, and figure stepping outside suggest freedom through context.', 'Confinement', 'Freedom'),
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const part = (t: number, count: number) => Math.min(count - 1, Math.floor(t * count));
const local = (t: number, count: number) => t === 1 ? 1 : (t * count) % 1;
const ease = (t: number) => t * t * (3 - 2 * t);
const ink = '#f0eee4';
const muted = '#9ba8ad';
const mint = '#b9e4c9';

function Person({ x = 300, y = 171, scale = 1, stride = 0, facing = 1, child = false, reaching = false, letter = true, color = '#e68a57' }: { x?: number; y?: number; scale?: number; stride?: number; facing?: number; child?: boolean; reaching?: boolean; letter?: boolean; color?: string }) {
  const leg = Math.sin(stride * Math.PI * 2) * 12;
  return <g transform={`translate(${x} ${y}) scale(${scale * (child ? .65 : 1)})`}>
    <ellipse cy="68" rx="27" ry="5" fill="#0a242d" opacity=".35" />
    <path d={`M-9 26L${-10 + leg} 65M9 26L${10 - leg} 65`} stroke="#283445" strokeWidth="10" strokeLinecap="round" />
    <path d={`M${-11 + leg} 66h-10M${11 - leg} 66h10`} stroke="#11232c" strokeWidth="6" strokeLinecap="round" />
    <path d="M-15-13Q0-24 15-13L20 30H-20Z" fill={color} />
    <path d={reaching ? `M${12 * facing}-7L${43 * facing}-21` : `M${12 * facing}-7L${28 * facing} 15`} stroke={color} strokeWidth="10" strokeLinecap="round" />
    <circle cx={reaching ? 45 * facing : 30 * facing} cy={reaching ? -22 : 16} r="5" fill="#e6b69a" />
    {letter && <g transform={`translate(${reaching ? 50 * facing : 32 * facing} ${reaching ? -26 : 12}) rotate(-10)`}><rect x="-10" y="-7" width="24" height="16" rx="1" fill="#c94945" /><path d="M-9-6L2 2L13-6" fill="none" stroke="#f4c3a9" strokeWidth="1.4" /></g>}
    <path d="M-11-23L-11-39Q0-52 12-39V-23Z" fill="#e6b69a" />
    <path d="M-12-35V-42Q0-53 13-42L15-33L3-39Z" fill="#28323a" />
    <circle cx={6 * facing} cy="-32" r="1.7" fill="#223340" />
    <path d="M-13-17L7-8L-4 5" fill="none" stroke="#efc379" strokeWidth="7" />
  </g>;
}

function Station({ t = 0, x = 160, child = false, night = false, train = true, reaching = false, chase = false, letter = true, departure = 0, doorOpen = 0 }: { t?: number; x?: number; child?: boolean; night?: boolean; train?: boolean; reaching?: boolean; chase?: boolean; letter?: boolean; departure?: number; doorOpen?: number }) {
  return <g>
    <rect width="600" height="260" fill={night ? '#203647' : '#91b8c2'} />
    <circle cx="99" cy="63" r="29" fill={night ? '#e1ddd0' : '#f7d390'} />
    <path d="M0 153L82 95L155 150L236 115L320 151L408 90L508 146L600 103V205H0Z" fill={night ? '#354e60' : '#6e9d9e'} />
    <path d="M0 124H53V92H103V124H174V101H216V171H0Z" fill={night ? '#263d4a' : '#a17c68'} />
    {[16, 65, 112, 183].map((v) => <path key={v} d={`M${v} 161V138q10-21 20 0v23Z`} fill="#314e58" />)}
    <rect y="187" width="600" height="73" fill={night ? '#263c47' : '#607c7e'} />
    <path d="M0 238H600M0 248H600" stroke="#d8c09c" strokeWidth="3" />
    <path d="M0 259H600M0 221H600" stroke="#3f6268" strokeWidth="2" />
    <path d="M6 192H590" stroke="#dbb567" strokeWidth="3" strokeDasharray="18 7" />
    <g transform={`translate(${departure * 220} 0)`}>
      {train && <>
        <path d="M322 84H599V189H310V97Q310 84 322 84" fill={night ? '#496975' : '#3b7984'} />
        <rect x="322" y="94" width="278" height="6" fill="#d6ba79" />
        {[326, 386, 513, 572].map((v) => <g key={v}><rect x={v} y="108" width="43" height="40" rx="3" fill="#a4c6c7" /><path d={`M${v + 4} 142L${v + 37} 112`} stroke="#d5e3d9" strokeWidth="5" opacity=".45" /></g>)}
        <path d="M452 97h43v92h-43Z" fill="#182f3b" /><g transform={`translate(452 0) scale(${1 - clamp(doorOpen) * .82} 1)`}><rect y="98" width="41" height="90" fill="#305c66" /><rect x="5" y="104" width="31" height="46" fill="#d2ae7c" /><rect x="27" y="143" width="9" height="4" rx="2" fill="#f5d298" /></g>
        <path d="M311 174H600" stroke="#ddb971" strokeWidth="5" />
        <circle cx="348" cy="190" r="11" fill="#26333b" /><circle cx="551" cy="190" r="11" fill="#26333b" />
      </>}
    </g>
    <path d="M257 185V67M250 70H280" stroke="#233f49" strokeWidth="5" />
    <rect x="253" y="58" width="88" height="22" rx="2" fill="#243f49" />
    <text x="297" y="73" textAnchor="middle" fill="#d8dcd1" fontSize="11" letterSpacing="2">PLATFORM 2</text>
    {chase && <Person x={x - 95} y={176} stride={t * 6 + .3} color="#537084" letter={false} />}
    <Person x={x} y={176} stride={t * 4} child={child} reaching={reaching} letter={letter} />
    <path d="M0 212L600 212" stroke="#284d55" opacity=".4" />
  </g>;
}

function Room({ child = false, reunion = false, red = true, t = 0, empty = false }: { child?: boolean; reunion?: boolean; red?: boolean; t?: number; empty?: boolean }) {
  return <g>
    <rect width="600" height="260" fill="#9c8771" /><rect x="0" y="180" width="600" height="80" fill="#5d615b" />
    <path d="M0 177H600M0 194L600 194M150 194L70 260M330 194L390 260M500 194L590 260" stroke="#c7ac86" strokeWidth="3" opacity=".5" />
    <rect x="40" y="30" width="149" height="135" fill="#4d625e" /><rect x="48" y="38" width="133" height="119" fill="#a6c4be" />
    <circle cx="143" cy="69" r="19" fill="#edce8a" /><path d="M48 139L94 88L147 138L181 114V157H48Z" fill="#689291" />
    <path d="M113 38V157M48 98H181" stroke="#506663" strokeWidth="5" />
    <path d="M190 158L414 260H180L48 158" fill="#eed5a2" opacity=".12" />
    <rect x="448" y="37" width="83" height="66" fill="#445e61" /><path d="M462 85L477 58L493 78L518 51" fill="none" stroke="#c0c7a9" strokeWidth="3" />
    <path d="M433 196V120M415 121H451L443 88H424Z" fill="#e0ba7b" stroke="#434e49" strokeWidth="3" />
    {!empty && <Person x={reunion ? 285 : 318} y={167} child={child} stride={0} letter={false} color={reunion ? '#9fa66d' : '#dd9260'} />}
    {reunion && <Person x={368 - t * 12} y={167} facing={-1} letter={true} color="#b96857" />}
    <path d="M192 208H407V218H192Z" fill="#b79064" /><path d="M211 218V260M389 218V260" stroke="#3c4e4a" strokeWidth="8" />
    <g transform="translate(262 193) rotate(-8)"><rect width="50" height="27" rx="1" fill={red ? '#c94945' : '#ece1c4'} /><path d="M2 1L25 17L48 1" fill="none" stroke="#eeba99" strokeWidth="2" /></g>
    <rect x="338" y="187" width="25" height="21" rx="2" fill="#d5cbab" /><path d="M363 192q14 0 0 12" stroke="#d5cbab" strokeWidth="4" fill="none" />
  </g>;
}

function Portrait({ t = 0, direct = false, phone = false, reaction = false }: { t?: number; direct?: boolean; phone?: boolean; reaction?: boolean }) {
  const gaze = direct ? (1 - ease(clamp((t - .18) / .4))) * 8 : reaction ? -5 : phone ? Math.sin(t * Math.PI * 3) * 5 : 4;
  const surprise = reaction ? ease(clamp(t * 2)) : 0;
  return <g>
    <rect width="600" height="260" fill="#60757b" /><path d="M0 189L600 153V260H0Z" fill="#314e5a" />
    <rect x="32" y="39" width="169" height="143" fill="#77989a" /><path d="M57 39V182M180 39V182M32 119H201" stroke="#365b68" strokeWidth="9" />
    <circle cx="483" cy="96" r="36" fill="#a0aaa0" opacity=".3" />
    <path d="M184 260L199 220Q232 186 300 187Q368 186 401 220L416 260" fill="#d19559" />
    <path d="M274 176V201L300 215L326 201V176" fill="#c78f72" />
    <path d="M236 84Q237 34 300 34Q364 34 367 84L358 153Q343 185 300 190Q257 185 242 153Z" fill="#e4b699" />
    <path d="M237 111Q211 47 268 29Q342 10 371 60L368 112L349 80L310 64L275 83L249 84Z" fill="#293641" />
    {[272, 328].map((v) => <g key={v}><ellipse cx={v} cy="116" rx="14" ry={6 + surprise * 5} fill="#f3e7d4" /><circle cx={v + gaze} cy="116" r={4.5} fill="#334249" /><path d={`M${v - 15} ${101 - surprise * 6}Q${v} ${96 - surprise * 6} ${v + 13} ${100 - surprise * 6}`} fill="none" stroke="#493d3a" strokeWidth="4" strokeLinecap="round" /></g>)}
    <path d="M300 119L294 139H306" stroke="#ba806b" strokeWidth="2" fill="none" />
    <path d={`M280 156Q300 ${162 + surprise * 17} 322 154`} stroke="#915b52" strokeWidth="4" fill={reaction ? '#bd7867' : 'none'} strokeLinecap="round" />
    {phone && <><path d="M370 221L373 155" stroke="#e1ac8b" strokeWidth="19" strokeLinecap="round" /><rect x="355" y="109" width="30" height="65" rx="6" transform="rotate(-8 370 142)" fill="#233643" /><rect x="360" y="119" width="20" height="37" fill="#547480" /></>}
  </g>;
}

function Envelope({ t = 0, latch = false }: { t?: number; latch?: boolean }) {
  return <g>
    <rect width="600" height="260" fill={latch ? '#3c747e' : '#616f71'} />
    {latch ? <>
      <rect x="349" width="24" height="260" fill="#193a46" /><path d="M346 0V260M386 0V260" stroke="#a6beb0" strokeWidth="3" />
      <rect x="222" y="91" width="170" height="78" rx="6" fill="#294951" /><circle cx="260" cy="130" r="21" fill="#b19764" />
      <g transform={`rotate(${t * 48} 260 130)`}><rect x="250" y="119" width="112" height="22" rx="8" fill="#dcc18b" /><circle cx="261" cy="130" r="5" fill="#7b785b" /></g>
      <path d="M221 73L209 62M244 64L241 47M271 63L278 49" stroke="#e6ab74" strokeWidth="3" />
      <text x="300" y="213" textAnchor="middle" fill="#f0e0bc" fontSize="15">The latch does not catch.</text>
    </> : <>
      <path d="M0 214L194 142L305 217L289 260H0Z" fill="#dd925e" />
      <path d="M195 147Q224 138 254 162L313 194L287 229L236 196L207 196Z" fill="#deb096" />
      <g transform={`translate(${305 + Math.sin(t * Math.PI) * 3} 125) rotate(-9)`}><rect x="-110" y="-65" width="220" height="140" rx="5" fill="#c94945" /><path d="M-106-60L0 21L106-60M-108 70L-40 5M108 70L40 5" stroke="#efb099" strokeWidth="3" fill="none" /><circle cy="24" r="13" fill="#923638" /><path d="M-4 20L3 28L7 16" stroke="#e8ac8b" fill="none" strokeWidth="2" /></g>
      <path d="M178 153Q193 133 228 166L257 188Q266 200 252 204L224 189" fill="#e7b89d" />
    </>}
  </g>;
}

function ClockFace({ t = 0 }: { t?: number }) {
  const angle = 265 + t * 90;
  return <g><rect width="600" height="260" fill="#48616a" /><path d="M0 71H600M0 195H600M80 0V260M520 0V260" stroke="#344e57" strokeWidth="9" />
    <circle cx="300" cy="125" r="107" fill="#283f47" /><circle cx="300" cy="125" r="94" fill="#e2d2ad" />
    {Array.from({ length: 12 }, (_, i) => <path key={i} d="M300 43V52" transform={`rotate(${i * 30} 300 125)`} stroke="#52615f" strokeWidth="4" />)}
    <path d="M300 125L296 77" stroke="#40585b" strokeWidth="6" strokeLinecap="round" /><path d="M300 125V55" transform={`rotate(${angle} 300 125)`} stroke="#a75343" strokeWidth="4" strokeLinecap="round" /><circle cx="300" cy="125" r="6" fill="#a75343" /><text x="300" y="175" textAnchor="middle" fill="#536563" fontSize="13" letterSpacing="3">DEPARTURE</text>
  </g>;
}

function MapScene({ t = 0 }: { t?: number }) {
  return <g><rect width="600" height="260" fill="#806e5b" /><path d="M104 19L279 34L465 16L508 236L321 222L130 243Z" fill="#d9cca7" /><path d="M279 34L321 222M104 89L478 78M116 165L492 158" stroke="#b7bb94" strokeWidth="4" /><path d="M152 212Q261 190 240 133T425 54" stroke="#8da9a0" strokeWidth="20" fill="none" /><path d="M167 182L231 157L295 167L327 98L407 80" stroke="#b45b49" strokeWidth="5" strokeDasharray="8 6" fill="none" />
    <circle cx={167 + t * 240} cy={182 - t * 102} r="10" fill="#b74740" /><text x="356" y="209" fill="#737460" fontSize="12" letterSpacing="3">NORTH LINE</text>
  </g>;
}

function Garden({ t = 0, person = false }: { t?: number; person?: boolean }) {
  const dayPhase = t === 1 ? .95 : (t * 6) % 1;
  const daylight = .55 + Math.sin(dayPhase * Math.PI * 2) * .3;
  const growth = 14 + t * 91;
  return <g><rect width="600" height="260" fill="#82aab5" /><rect width="600" height="260" fill="#183444" opacity={1 - daylight} />
    <circle cx={70 + dayPhase * 440} cy={128 - Math.sin(dayPhase * Math.PI) * 89} r="24" fill="#efd29a" />
    <g transform={`translate(${((t * 400) % 760) - 100} 0)`} opacity=".45"><path d="M55 82q0-18 19-17q6-28 30-13q23-4 24 30Z" fill="#e3e7d7" /><path d="M273 53q0-17 22-18q16-23 32-3q22-1 24 21Z" fill="#e3e7d7" /></g>
    <path d="M0 173L118 123L229 163L409 119L600 170V260H0Z" fill="#537f7f" /><rect y="194" width="600" height="66" fill="#647b67" />
    <path d={`M300 240L${420 - t * 235} 251L303 253Z`} fill="#203d40" opacity=".35" /><path d="M269 210H331L324 255H276Z" fill="#b67a55" /><ellipse cx="300" cy="210" rx="31" ry="8" fill="#584a3d" />
    <path d={`M300 210Q${296 + t * 10} ${210 - growth / 2} 300 ${210 - growth}`} stroke="#9cb880" strokeWidth="6" fill="none" />
    {[.25, .55, .85].map((v, i) => <g key={v} transform={`translate(300 ${210 - growth * v}) scale(${Math.min(1, t * 3)})`}><path d={i % 2 ? 'M0 0Q-40-30-39-4Q-28 8 0 0' : 'M0 0Q40-30 39-4Q28 8 0 0'} fill={i % 2 ? '#8ea671' : '#b4bc7c'} /></g>)}
    {t > .6 && <g transform={`translate(300 ${210 - growth}) scale(${(t - .6) * 2.5})`}>{[0, 60, 120].map((v) => <ellipse key={v} ry="19" rx="8" transform={`rotate(${v})`} fill="#dfb277" />)}<circle r="7" fill="#89654c" /></g>}
    {person && <Person x={417} y={175} stride={0} color="#86a29b" letter={false} />}
  </g>;
}

function FallingLetter({ t = 0 }: { t?: number }) {
  const fall = ease(t);
  return <g><rect width="600" height="260" fill="#8babb1" /><path d="M0 211H600V260H0Z" fill="#496a72" /><path d="M20 228H580" stroke="#ddc88e" strokeWidth="3" />
    <path d="M0 48L209 68L210 110L0 100Z" fill="#d18556" /><path d="M208 68Q239 63 266 91L271 105Q264 116 249 102L231 94L217 112L207 108Z" fill="#e4b598" />
    <path d="M289 115Q321 152 333 203" fill="none" stroke="#d8e3d9" strokeDasharray="5 6" opacity=".45" />
    <g transform={`translate(${278 + fall * 71} ${104 + fall * 109}) rotate(${fall * 74})`}><rect x="-28" y="-17" width="56" height="34" rx="2" fill="#c94945" /><path d="M-26-15L0 4L26-15" stroke="#f0bfa1" strokeWidth="2" fill="none" /></g>
    <ellipse cx="352" cy="237" rx={10 + fall * 22} ry="4" fill="#234b58" opacity=".5" />
  </g>;
}

function TrainRush({ t = 0 }: { t?: number }) {
  const offset = -((t * 780) % 160);
  return <g><rect width="600" height="260" fill="#b4c4b5" /><path d="M0 35H600V224H0Z" fill="#386c79" />
    <g transform={`translate(${offset} 0)`}>{Array.from({ length: 6 }, (_, i) => <g key={i}><rect x={i * 160 + 22} y="57" width="119" height="104" rx="7" fill="#a9c5bd" /><path d={`M${i * 160 + 29} 150L${i * 160 + 127} 67`} stroke="#dce0bf" strokeWidth="15" opacity=".5" /><path d={`M${i * 160 + 150} 39V220`} stroke="#264e5d" strokeWidth="4" /></g>)}</g>
    <path d="M0 178H600" stroke="#e6bf78" strokeWidth="13" /><path d="M0 236H600M0 247H600" stroke="#465c5d" strokeWidth="6" />
    {[39, 72, 205, 218].map((y, i) => <path key={y} d={`M${20 + ((t * 1300 + i * 109) % 300)} ${y}h${110 + i * 17}`} stroke="#e7e6c6" strokeWidth="3" opacity=".65" />)}
  </g>;
}

function SpeedTrack({ t }: { t: number }) {
  return <g><rect width="600" height="109" fill="#87aab4" /><path d="M0 73L141 36L237 64L362 39L600 70V109H0Z" fill="#628d90" /><rect y="89" width="600" height="20" fill="#526d74" />
    <path d="M0 100H600" stroke="#e0bd79" strokeWidth="2" />
    {[173, 340, 507].map((x) => <g key={x}><path d={`M${x} 85V39`} stroke="#3b5d68" strokeWidth="3" /><rect x={x - 10} y="35" width="20" height="6" fill="#dcc295" /></g>)}
    <Person x={65 + t * 480} y={65} scale={.53} stride={t * 7} />
  </g>;
}

function Storyteller({ t = 0 }: { t?: number }) {
  return <g><Room empty red={false} /><Person x={300} y={164} letter={false} color="#79878a" />
    <path d="M232 174Q269 157 300 175Q331 157 368 174V220Q331 203 300 221Q269 203 232 220Z" fill="#dbc79d" stroke="#7c6850" strokeWidth="2" />
    <path d="M300 175V220" stroke="#9e9275" strokeWidth="2" />
    <g transform="translate(306 178) scale(.09 .135)"><Station t={t} x={170 + t * 100} /></g>
    <path d="M247 182L282 178M247 192L282 188M247 203L282 199" stroke="#9d957d" strokeWidth="2" />
  </g>;
}

function Cage({ t = 0 }: { t?: number }) {
  const open = ease(clamp((t - .35) / .5));
  return <g><rect width="600" height="260" fill="#607c83" /><rect x="414" y="23" width="155" height="211" fill="#aec3b5" /><path d="M414 234V23H569V234" stroke="#3b5a64" strokeWidth="9" /><circle cx="514" cy="67" r="27" fill="#e9ca90" /><path d="M421 161L488 110L563 160V231H421Z" fill="#7c9f92" /><rect y="234" width="600" height="26" fill="#415f67" />
    <Person x={326 + open * 151} y={169} scale={.94} facing={1} stride={open * 2} letter={false} color="#cca877" />
    <path d="M98 199V108Q98 38 165 38Q232 38 232 108V199Z" fill="#263f49" fillOpacity=".22" stroke="#c3b18d" strokeWidth="4" />
    <path d="M98 108H232M98 177H232M122 70V199M147 43V199M182 43V199M208 70V199" stroke="#c3b18d" strokeWidth="3" />
    <g transform={`translate(180 117) scale(${1 - open * .8} 1)`}><rect width="51" height="70" fill="#46616a" stroke="#ddc194" strokeWidth="3" /><path d="M15 0V70M33 0V70" stroke="#ddc194" strokeWidth="3" /></g>
    <path d="M96 202H236V213H96Z" fill="#c3b18d" /><path d="M130 216V260M203 216V260" stroke="#a39579" strokeWidth="5" />
    <g transform={`translate(${172 + open * 323} ${140 - open * 66})`}><ellipse rx="15" ry="9" fill="#e4c27d" /><circle cx="14" cy="-6" r="7" fill="#e4c27d" /><path d="M20-7L28-4L20-2" fill="#c48354" /><path d={`M-7 0Q${-20 + open * 5} ${-9 - Math.sin(t * 32) * open * 17} 8-3`} fill="#aa8b59" /><circle cx="16" cy="-8" r="1.3" fill="#374747" /></g>
  </g>;
}

function Frame({ children, x = 0, y = 0, width = 600, height = 260, fit = 'xMidYMid slice' }: { children: ReactNode; x?: number; y?: number; width?: number; height?: number; fit?: string }) {
  return <svg x={x} y={y} width={width} height={height} viewBox="0 0 600 260" preserveAspectRatio={fit} overflow="hidden">{children}</svg>;
}

function Caption({ text, kicker }: { text: string; kicker?: string }) {
  return <g><rect y="220" width="600" height="40" fill="#08161d" fillOpacity=".86" />
    {kicker && <text x="17" y="20" fill={ink} fontSize="11" fontWeight="600" letterSpacing="1.2" stroke="#152c34" strokeWidth="3" paintOrder="stroke">{kicker}</text>}
    <text x="300" y="245" textAnchor="middle" fill={ink} fontSize="13" fontWeight="500">{text}</text>
  </g>;
}

function Timeline({ t, labels, active }: { t: number; labels: string[]; active?: number }) {
  const selected = active ?? part(t, labels.length);
  const width = 552 / labels.length;
  return <g><rect y="260" width="600" height="70" fill="#101b22" />
    {labels.map((label, i) => <g key={`${i}-${label}`}><rect x={24 + width * i} y="277" width={width - 5} height="4" rx="2" fill={i === selected ? mint : '#33434b'} />
      <text x={24 + width * (i + .5) - 2.5} y="303" textAnchor="middle" fontSize="11" fontWeight={i === selected ? '600' : '400'} fill={i === selected ? ink : muted}>{label}</text>
    </g>)}
    <circle cx={24 + t * 547} cy="279" r="4" fill="#efc88f" />
  </g>;
}

function SequenceStudyComponent({ name, progress, compact = false }: { name: string; progress: number; compact?: boolean }) {
  const id = `sequence-${useId().replace(/:/g, '')}`;
  const t = clamp(Number.isFinite(progress) ? progress : 0);
  const definition = SEQUENCE_STUDIES[name];
  let scene: ReactNode;
  let caption = '';
  let kicker = '';
  let labels: string[] = ['Beginning', 'End'];
  let active: number | undefined;

  switch (name) {
    case 'Cross-Cutting': {
      const beat = part(t, 4);
      scene = beat % 2 === 0 ? <Station t={t} x={95 + t * 300} /> : <Portrait t={t} phone />;
      kicker = `DEPARTURE IN ${Math.ceil(45 - t * 36)} SECONDS`;
      caption = beat % 2 === 0 ? 'A · The courier races toward the platform.' : 'B · The passenger waits for the courier.';
      labels = ['A · courier', 'B · passenger', 'A · nearer', 'B · waiting'];
      break;
    }
    case 'Jump Cut': {
      const beat = part(t, 4);
      scene = <Station t={beat * .3} x={100 + beat * 100} />;
      kicker = `LOCKED CAMERA · SOURCE TIME 00:${String(beat * 6 + 2).padStart(2, '0')}`;
      caption = 'Each cut skips action; the background stays fixed.';
      labels = ['00:02', 'CUT → 00:08', 'CUT → 00:14', 'CUT → 00:20'];
      break;
    }
    case 'Dissolve':
      scene = <><Station x={180} /><g opacity={t}><Room /></g></>;
      caption = `Station ${Math.round((1 - t) * 100)}% / interior ${Math.round(t * 100)}% · overlapping images`;
      labels = ['Shot A', 'Both visible', 'Shot B'];
      break;
    case 'Fade In/Out': {
      const a = clamp(1 - t / .4);
      const b = clamp((t - .6) / .4);
      scene = <><rect width="600" height="260" fill="#000" /><g opacity={a}><Station x={180} /></g><g opacity={b}><Room /></g></>;
      caption = t < .4 ? 'The first image fades to black.' : t < .6 ? 'A completely black frame separates the scenes.' : 'The next image fades up from black.';
      labels = ['Fade out', 'Black', 'Fade in']; active = t < .4 ? 0 : t < .6 ? 1 : 2;
      break;
    }
    case 'Montage': {
      const beat = part(t, 4);
      scene = [<Room key="room" />, <MapScene key="map" t={local(t, 4)} />, <TrainRush key="train" t={local(t, 4)} />, <Station key="station" x={410} reaching />][beat];
      caption = ['A letter is prepared.', 'A route is planned.', 'Hours of travel become one short shot.', 'The courier arrives.'][beat];
      labels = ['1 · prepare', '2 · plan', '3 · travel', '4 · arrive'];
      kicker = 'SELECTED MOMENTS · A JOURNEY COMPRESSED';
      break;
    }
    case 'Smash Cut':
      scene = t < .5 ? <Room empty /> : <TrainRush t={(t - .5) * 2} />;
      caption = t < .5 ? 'A quiet, still room…' : 'CUT — a train rushes through a tight frame.';
      labels = ['Still · spacious · warm', 'Sudden · tight · moving'];
      break;
    case 'Long Take':
      scene = <Station t={t} x={70 + t * 385} />;
      kicker = `ONE UNINTERRUPTED SHOT · 00:${String(Math.floor(t * 30)).padStart(2, '0')}`;
      caption = 'The entire action unfolds without a cut. Illustrative duration.';
      labels = ['One continuous shot'];
      break;
    case 'Freeze Frame': {
      const action = Math.min(t, .43);
      scene = <Station t={action} x={80 + action * 490} />;
      kicker = t < .43 ? 'ACTION PLAYING' : 'SELECTED FRAME HELD · PLAYBACK CONTINUES';
      caption = t < .43 ? 'The courier moves through the station.' : 'Position, pose, and background remain frozen.';
      labels = ['Movement', 'Freeze', 'Keep holding']; active = t < .43 ? 0 : t < .7 ? 1 : 2;
      break;
    }
    case 'Split Screen':
      scene = <><Frame width={297}><Station t={t} x={180 + t * 130} /></Frame><Frame x={303} width={297}><Portrait t={t} phone /></Frame><rect x="297" width="6" height="260" fill="#0b1920" /></>;
      caption = 'Travelling and waiting remain visible at the same time.';
      kicker = 'A · COURIER                                        B · PASSENGER';
      labels = ['Simultaneous views'];
      break;
    case 'Reaction Shot':
      scene = t < .45 ? <Station train departure={(1 - t / .45) * 2} x={85} /> : <Portrait t={(t - .45) / .55} reaction />;
      caption = t < .45 ? 'The train arrives: this is the event.' : 'The passenger smiles: this is the response.';
      labels = ['Event', 'Cut to reaction']; active = t < .45 ? 0 : 1;
      break;
    case 'Cutaway': {
      const beat = part(t, 3);
      scene = beat === 1 ? <ClockFace t={local(t, 3)} /> : <Station t={t} x={90 + t * 290} />;
      caption = beat === 1 ? 'A separate clock shot adds deadline context.' : beat === 0 ? 'Establish the main action: the courier.' : 'Return to the courier’s continuing action.';
      labels = ['A · main action', 'B · clock cutaway', 'A · return'];
      break;
    }
    case 'Cut-In':
      scene = t < .5 ? <><Station t={0} x={230} /><circle cx="262" cy="188" r="21" fill="none" stroke="#f3d19d" strokeWidth="2" /></> : <Envelope />;
      caption = t < .5 ? 'The wide view establishes a red letter in the hand.' : 'CUT — a closer view of that same letter and hand.';
      labels = ['Wide · establish detail', 'Close · same detail'];
      break;
    case 'Wipe':
      scene = <><defs><clipPath id={`${id}-wipe`}><rect width={600 * t} height="260" /></clipPath></defs><Station x={180} /><g clipPath={`url(#${id}-wipe)`}><Room /></g><path d={`M${t * 600} 0V260`} stroke="#f0d8a7" strokeWidth="2" /></>;
      caption = 'The moving edge replaces one image with the next.';
      labels = ['Shot A', 'Moving boundary', 'Shot B'];
      break;
    case 'Iris':
      scene = <><defs><clipPath id={`${id}-iris`}><circle cx="262" cy="188" r={12 + ease(t) * 395} /></clipPath></defs><rect width="600" height="260" fill="#000" /><g clipPath={`url(#${id}-iris)`}><Station x={230} /></g></>;
      caption = 'A circular mask opens around the letter.';
      labels = ['Iris opens', 'Wider circle', 'Full scene'];
      break;
    case 'Time-Lapse':
      scene = <Garden t={t} />;
      kicker = `LOCKED CAMERA · DAY ${Math.min(6, Math.floor(t * 6) + 1)}`;
      caption = 'A slow growth process unfolds in seconds.';
      labels = ['Days 1–2', 'Days 3–4', 'Days 5–6'];
      break;
    case 'Fast Motion': {
      const fast = t === 1 ? 1 : (t * 4) % 1;
      scene = <><SpeedTrack t={fast} /><g transform="translate(0 111)"><SpeedTrack t={t} /></g><rect x="10" y="10" width="130" height="25" rx="3" fill="#122935" /><text x="21" y="27" fill={ink} fontSize="12">4× · fast playback</text><rect x="10" y="121" width="130" height="25" rx="3" fill="#122935" /><text x="21" y="138" fill={ink} fontSize="12">1× · comparison</text></>;
      caption = 'Four passes above for each single pass below.';
      labels = ['Same path', 'Higher playback speed'];
      break;
    }
    case 'Reverse Motion':
      scene = <><Frame width={297}><FallingLetter t={1 - t} /></Frame><Frame x={303} width={297}><FallingLetter t={t} /></Frame><rect x="297" width="6" height="260" fill="#0b1920" /></>;
      kicker = 'REVERSE · BACK TO HAND                    FORWARD · FALL TO GROUND';
      caption = 'The same recorded action runs in opposite directions.';
      labels = ['Backward ←', '→ Forward']; active = 0;
      break;
    case 'Flashback': {
      const beat = t < .25 ? 0 : t < .75 ? 1 : 2;
      scene = beat === 1 ? <><Room child /><rect width="600" height="260" fill="#ac794d" opacity=".2" /></> : <Station t={t} x={170 + t * 130} />;
      kicker = beat === 1 ? '12 YEARS EARLIER' : 'PRESENT DAY';
      caption = beat === 1 ? 'The letter recalls an earlier childhood moment.' : beat === 0 ? 'A letter begins the memory.' : 'Return to the present-day journey.';
      labels = ['Present', 'Past', 'Present']; active = beat;
      break;
    }
    case 'Foreshadowing': {
      const beat = t < .3 ? 0 : t < .65 ? 1 : 2;
      scene = beat === 0 ? <Envelope latch t={local(t / .3, 1) * .14} /> : beat === 1 ? <Station t={t} x={410} reaching /> : <><Station x={411} letter={false} doorOpen={clamp((t - .65) * 7)} /><g transform={`translate(${474 + (t - .65) * 180} ${151 + (t - .65) * 185}) rotate(${(t - .65) * 170})`}><rect x="-12" y="-8" width="24" height="16" fill="#c94945" /><path d="M-11-7L0 2L11-7" stroke="#efbaa0" fill="none" /></g><path d="M477 159L516 168M491 174L535 183" stroke="#cfe0d6" strokeDasharray="9 5" /></>;
      caption = ['The loose latch is a small, deliberate clue.', 'The story moves on; the clue stays in our memory.', 'The door opens; the letter blows out. The clue pays off.'][beat];
      labels = ['Clue · loose latch', 'Later · delivery', 'Payoff · letter lost']; active = beat;
      break;
    }
    case 'Breaking the Fourth Wall':
      scene = <><Portrait t={t} direct />{t > .62 && <g opacity={clamp((t - .62) / .1)}><path d="M397 36H581V99H430L404 117L413 99H397Z" fill="#efe1be" /><text x="489" y="63" textAnchor="middle" fill="#263d47" fontSize="13">You saw that,</text><text x="489" y="83" textAnchor="middle" fill="#263d47" fontSize="13">right?</text></g>}</>;
      caption = t < .4 ? 'The character’s attention is inside the scene.' : 'Their gaze and words intentionally address the audience.';
      labels = ['Looks within scene', 'Looks at you', 'Direct address'];
      break;
    case 'In Medias Res': {
      const opening = t < .65;
      scene = opening ? <Station t={t * 2} x={245 + t * 195} chase departure={t * .15} /> : <Room />;
      kicker = opening ? 'OPENING SCENE · THE CHASE IS ALREADY UNDERWAY' : 'EARLIER · THE REASON FOR THE CHASE';
      caption = opening ? 'We enter halfway through urgent action.' : 'The letter provides context after the active opening.';
      labels = ['2 · start during chase', '1 · reveal earlier cause']; active = opening ? 0 : 1;
      break;
    }
    case 'Cliffhanger': {
      const action = Math.min(t, .7);
      scene = <><Station t={action} x={165 + action * 337} reaching={t > .4} departure={action * .08} />{t >= .7 && <><rect y="75" width="600" height="66" fill="#12242d" fillOpacity=".86" /><text x="300" y="114" textAnchor="middle" fill="#f1d39e" fontSize="23" letterSpacing="3">TO BE CONTINUED</text></>}</>;
      caption = t < .7 ? 'The courier reaches the departing train…' : 'Will the letter reach the passenger? The outcome is withheld.';
      labels = ['Build urgency', 'Reach for outcome', 'Stop before resolution']; active = t < .35 ? 0 : t < .7 ? 1 : 2;
      break;
    }
    case 'Flashforward': {
      const beat = t < .25 ? 0 : t < .75 ? 1 : 2;
      scene = beat === 1 ? <Room reunion t={local(t, 2)} /> : <Station t={t} x={170 + t * 130} />;
      kicker = beat === 1 ? 'TOMORROW · A FUTURE REUNION' : 'TODAY · JOURNEY STILL IN PROGRESS';
      caption = beat === 1 ? 'A glimpse of a later moment interrupts the present.' : beat === 0 ? 'The courier begins the journey.' : 'Return to the journey before the reunion occurs.';
      labels = ['Present', 'Future', 'Present']; active = beat;
      break;
    }
    case 'Non-Linear Narrative': {
      const beat = part(t, 3);
      scene = beat === 0 ? <Room reunion /> : beat === 1 ? <Envelope /> : <Station t={local(t, 3)} x={90 + local(t, 3) * 130} />;
      kicker = ['EVENT 3 · DELIVERY', 'EVENT 1 · PREPARATION', 'EVENT 2 · DEPARTURE'][beat];
      caption = 'Chronology: prepare → depart → deliver. Viewing order: 3 → 1 → 2.';
      labels = ['3 · delivery', '1 · preparation', '2 · departure'];
      break;
    }
    case 'Parallel Storylines':
      scene = <><Frame width={297}><Station t={t} x={140 + t * 200} /></Frame><Frame x={303} width={297}><Garden t={t} person /></Frame><rect x="297" width="6" height="260" fill="#0b1920" /></>;
      kicker = 'A · DELIVER A LETTER                          B · NURTURE A GARDEN';
      caption = 'Two independent arcs develop alongside one another.';
      labels = ['Each arc begins', 'Each develops', 'Each progresses'];
      break;
    case 'Frame Narrative': {
      const inner = t >= .25 && t < .75;
      scene = inner ? <><Station t={(t - .25) * 2} x={90 + (t - .25) * 470} /><rect x="7" y="7" width="586" height="205" rx="2" stroke="#d6bb87" strokeWidth="6" fill="none" /></> : <Storyteller t={t} />;
      kicker = inner ? 'INNER STORY · THE COURIER’S JOURNEY' : 'OUTER STORY · A STORYTELLER READS';
      caption = inner ? 'We enter the tale contained in the book.' : t < .25 ? 'The outer scene establishes who is telling the story.' : 'Return to the storyteller who contains the inner tale.';
      labels = ['Outer story', 'Story inside', 'Outer story']; active = t < .25 ? 0 : t < .75 ? 1 : 2;
      break;
    }
    case 'Voiceover Narration': {
      const beat = part(t, 3);
      scene = <Station t={t} x={90 + t * 320} />;
      kicker = 'NARRATOR (V.O.) · TEXT DEMONSTRATION · NO AUDIO';
      caption = ['“I had carried that letter for twelve years.”', '“I remembered the promise, even if he had forgotten.”', '“Today, I was finally ready to deliver it.”'][beat];
      labels = ['Visible action', 'Private memory', 'Added perspective'];
      break;
    }
    case 'Motif': {
      const beat = part(t, 3);
      scene = beat === 0 ? <Envelope /> : beat === 1 ? <Station x={245} /> : <Room reunion />;
      caption = ['The red letter appears as a promise.', 'The same red letter returns through the journey.', 'At reunion, the repeated letter carries emotional meaning.'][beat];
      kicker = 'RECURRING IMAGE · THE RED LETTER';
      labels = ['Promise', 'Journey', 'Reunion'];
      break;
    }
    case 'Symbolism':
      scene = <Cage t={t} />;
      caption = t < .45 ? 'Closed cage + confined figure suggest restriction.' : 'The open cage and departing bird suggest freedom.';
      labels = ['Cage closed', 'Door opens', 'Bird departs'];
      break;
    default:
      scene = <Station />;
      caption = 'Select a sequence technique to see its visual study.';
  }

  return <svg viewBox="0 0 600 330" role="img" aria-label={`${name}: ${definition?.description ?? 'Original sequence study'}`} data-sequence-study={name} data-compact={compact || undefined} style={{ display: 'block', width: '100%', height: '100%', background: '#101b22', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
    <title>{`${name} — original illustrative sequence`}</title>
    <Frame>{scene}</Frame>
    <Caption text={caption} kicker={kicker} />
    <Timeline t={t} labels={labels} active={active} />
  </svg>;
}

export const SequenceStudy = memo(SequenceStudyComponent);
