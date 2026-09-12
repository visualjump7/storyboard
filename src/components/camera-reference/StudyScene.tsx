'use client';

/** Original reference artwork for repeatable demonstrations. No external image requests. */
export function StudyScene({ idPrefix, time = 0, variant = 'landscape' }: {
  idPrefix: string; time?: number; variant?: 'landscape' | 'interior' | 'portrait';
}) {
  const id = idPrefix.replace(/[^a-zA-Z0-9_-]/g, '');
  const drift = Math.sin(time * Math.PI * 2) * 9;
  return <g>
    <defs>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#74bfd6" /><stop offset=".65" stopColor="#d0e4cf" /><stop offset="1" stopColor="#f7d693" /></linearGradient>
      <linearGradient id={`${id}-water`} x2=".1" y2="1"><stop stopColor="#80b7ab" /><stop offset="1" stopColor="#365f68" /></linearGradient>
      <linearGradient id={`${id}-earth`} x2=".2" y2="1"><stop stopColor="#daaf74" /><stop offset="1" stopColor="#906048" /></linearGradient>
      <linearGradient id={`${id}-wall`} x2="1" y2=".7"><stop stopColor="#f9dd9b" /><stop offset="1" stopColor="#dfaa6b" /></linearGradient>
      <linearGradient id={`${id}-skin`}><stop stopColor="#eab78c" /><stop offset="1" stopColor="#b36b52" /></linearGradient>
    </defs>
    {variant === 'landscape' ? <>
      <path d="M0 0H600V330H0Z" fill={`url(#${id}-sky)`} />
      <circle cx="462" cy="65" r="28" fill="#ffedb0" />
      <g transform={`translate(${drift} 0)`} fill="#eef0d9" opacity=".72"><path d="M39 52q16-17 32-6q15-23 33-3q24-8 42 12H39Z" /><path d="M271 38q12-13 27-3q13-21 32-2q20-4 33 11H269Z" /></g>
      <path d="M0 149 55 92 106 126 170 75 239 140 320 94 390 143 451 112 520 148 600 103V234H0Z" fill="#82a6a2" />
      <path d="M0 164 79 119 156 163 211 125 283 180 358 136 439 168 526 121 600 151V245H0Z" fill="#527f77" />
      <path d="M0 207Q178 172 307 189T600 190V330H0Z" fill={`url(#${id}-water)`} />
      <g stroke="#afd0b3" strokeWidth="1.5" opacity=".48"><path d="M35 223h96m-30 14h98m226-28h58m-105 39h105m-173 27h115m74 21h35m-328 7h74" /><path d={`M${385 + drift} 230h87m-55 7h35`} /></g>
      <path d="M0 246 64 218 191 226 270 263 414 281 484 330H0Z" fill="#426d55" />
      <path d="M0 330 149 233 207 245 121 330Z" fill={`url(#${id}-earth)`} />
      <path d="M159 238 230 207 358 222 389 267 279 288 175 265Z" fill="#cfad72" />
      <path d="M228 243V116H331V247Z" fill={`url(#${id}-wall)`} />
      <path d="M331 247V116L379 145V257Z" fill="#b8744c" />
      <path d="M211 124 278 75 346 125Z" fill="#ad4e3d" />
      <path d="M278 75 346 125 393 155 326 102Z" fill="#7e3835" />
      <path d="M228 129H331M239 136H324" stroke="#fff1c3" strokeWidth="3" opacity=".6" />
      <path d="M260 244V185Q278 174 295 185V246Z" fill="#315659" />
      <path d="M268 244V188H279V246" fill="#4c7673" />
      <circle cx="286" cy="216" r="2" fill="#edc781" />
      {[244, 298].map(x => <g key={x}><rect x={x} y="144" width="21" height="27" fill="#2d5962" /><path d={`M${x + 10} 144v27m-10-13h21`} stroke="#e7c587" strokeWidth="2" /><rect x={x - 2} y="172" width="25" height="5" fill="#a7774a" /></g>)}
      <path d="M345 172 364 182V206L345 197Z" fill="#385457" />
      <path d="M251 248H306V253H246V258H311V264H239V271H318" fill="none" stroke="#987248" strokeWidth="5" />
      <path d="M122 277 148 277M130 281 153 281M113 291 135 291" stroke="#e9c48d" strokeWidth="2" opacity=".55" />
      <g transform="translate(415 205)"><path d="M0 94 5-35 13-37 10 92Z" fill="#70513e" /><path d="M8-58q-40-22-57 14q-24 31 13 46q-6 30 42 26q42 15 56-19q33-34-11-52q-5-34-43-15Z" fill="#416c49" /><path d="M5-50q-31-18-39 8q-20 21 9 29q29-6 35-28Z" fill="#689251" /><path d="M8-26q30-29 42-3q21 18-4 28L13 7Z" fill="#789849" /></g>
      <g transform="translate(78 207)"><path d="M0 85 5-68 11-67 9 85Z" fill="#684d39" /><path d="M8-111-35-46h24L-48 6h32L-45 42H49L29 9h26L26-43h20Z" fill="#285846" /><path d="M8-111-23-50H5L-21 1H8Z" fill="#518065" /></g>
      <g transform="translate(180 233)"><ellipse cx="7" cy="69" rx="27" ry="6" fill="#1d493c" opacity=".45" /><path d="M-5 27-7 66H1L9 40 15 66H23L16 26Z" fill="#324e5f" /><path d="M-6 2Q5-5 15 1L23 30-8 31Z" fill="#ce5e41" /><path d="M-6 4-17 28l6 3L0 12m15-8 12 21-5 4-15-18" fill="#d7a175" /><ellipse cx="6" cy="-7" rx="9" ry="12" fill={`url(#${id}-skin)`} /><path d="M-3-9q-2-18 16-7l2 6-8-2-11 5Z" fill="#403930" /><path d="M0-3h3m6 0h3" stroke="#705044" strokeWidth="1" /></g>
      <g fill="#cf6149"><circle cx="46" cy="307" r="5" /><circle cx="27" cy="287" r="4" /><circle cx="118" cy="322" r="5" /><circle cx="375" cy="304" r="4" /></g>
      <g fill="#e7c867"><circle cx="47" cy="306" r="1.5" /><circle cx="375" cy="303" r="1.5" /><circle cx="334" cy="312" r="4" /></g>
    </> : <>
      <path d="M0 0H600V330H0Z" fill="#a5b5a3" /><path d="M0 242H600V330H0Z" fill="#877762" />
      <rect x="39" y="29" width="144" height="176" fill="#49676b" /><rect x="46" y="36" width="130" height="161" fill={`url(#${id}-sky)`} />
      <path d="M110 36V197M46 112H176" stroke="#e9d6ad" strokeWidth="8" />
      <path d="M180 201 490 330H176L42 206Z" fill="#f7d8a1" opacity=".23" />
      <rect x="417" y="74" width="90" height="119" rx="2" fill="#dbb483" /><rect x="426" y="83" width="72" height="101" fill="#46726b" />
      <path d="M426 169 447 120 465 154 486 108 498 167Z" fill="#7fa68b" />
      <path d="M51 277H552V292H51Z" fill="#815238" /><path d="M76 290V330M524 290V330" stroke="#583d30" strokeWidth="11" />
      <g transform={variant === 'portrait' ? 'translate(-80 -42) scale(1.28)' : 'translate(0 0)'}>
        <path d="M235 272q8-105 62-105t67 105Z" fill="#547780" />
        <path d="M280 178V145H313V178Q296 192 280 178" fill="#cb8967" />
        <ellipse cx="298" cy="122" rx="40" ry="51" fill={`url(#${id}-skin)`} />
        <path d="M259 117q-13-74 49-57q52 12 27 67l-7-33q-37 11-61-7Z" fill="#493c31" />
        <path d="M271 116q7-5 13-1m21 0q9-5 17 1M295 120l-4 20 9 1M283 152q13 8 25-1" stroke="#814e40" strokeWidth="2" fill="none" />
        <circle cx="279" cy="122" r="2.5" fill="#383c36" /><circle cx="313" cy="122" r="2.5" fill="#383c36" />
        <path d="M244 218 214 267 240 270 269 231M347 219 379 267 350 270 324 232" fill="#d29d78" />
      </g>
      <path d="M420 266V234H448V266Z" fill="#c07049" /><path d="M448 239q22 1 4 21" stroke="#c07049" strokeWidth="6" fill="none" />
      <path d="M429 226q-5-9 0-17" stroke="#f5ead3" opacity=".5" fill="none" />
    </>}
  </g>;
}
