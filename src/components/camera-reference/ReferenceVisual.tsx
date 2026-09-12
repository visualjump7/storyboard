'use client';

import { useId } from 'react';
import type { CameraReference } from '@/lib/camera-reference/catalog';

/** Original schematic illustrations: these are diagrams, not source film frames. */
export function ReferenceVisual({ reference }: { reference: CameraReference }) {
  const id = useId().replace(/:/g, '');
  const { category, name, number } = reference;
  const isLight = category === 'Lighting';
  const isComposition = category === 'Composition';
  const isEdit = category === 'Editing' || category === 'Storytelling';
  const n = name.toLowerCase();
  const hue = (number * 29) % 360;
  const accent = isLight ? '#ffd297' : isComposition ? '#b6c9c4' : isEdit ? '#9dacdb' : `hsl(${hue} 42% 65%)`;
  return <svg viewBox="0 0 600 330" role="img" aria-label={`${name} — illustrative ${isLight ? 'lighting' : isComposition ? 'composition' : isEdit ? 'sequence' : 'mood'} diagram`} style={{ width: '100%', height: '100%', display: 'block', background: '#111719' }}>
    <defs>
      <radialGradient id={`${id}glow`}><stop stopColor={accent} stopOpacity=".5" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}body`}><stop stopColor={accent} /><stop offset="1" stopColor="#334044" /></linearGradient>
    </defs>
    <path d="M0 267L600 267M0 301L600 301M300 200L30 330M300 200L155 330M300 200L445 330M300 200L570 330" stroke="#283133" fill="none" />
    {isEdit ? <g>
      {[0, 1, 2].map((v) => <g key={v} transform={`translate(${55 + v * 173},84)`}>
        <rect width="145" height="130" rx="4" fill="#1e272e" stroke={accent} strokeOpacity=".55" />
        <circle cx={n.includes('close') ? 73 : 46 + v * 23} cy="52" r={19 + v * 5} fill={accent} opacity={.4 + v * .2} />
        <path d="M20 115L73 77L125 115" stroke={accent} fill="none" opacity=".4" />
        <text x="10" y="20" fill={accent} fontSize="12" fontFamily="monospace">0{v + 1}</text>
      </g>)}
      <path d="M65 245H535M221 236L231 245L221 254M394 236L404 245L394 254" stroke={accent} fill="none" />
    </g> : <g>
      {isLight && <>
        <ellipse cx={n.includes('back') || n.includes('rim') ? 315 : 190} cy="104" rx="220" ry="165" fill={`url(#${id}glow)`} />
        <path d={n.includes('back') ? 'M385 58L249 263L480 263Z' : 'M105 50L242 270L510 270Z'} fill={accent} opacity=".075" />
        <rect x={n.includes('back') ? 375 : 90} y="42" width="30" height="15" rx="3" fill={accent} />
        <path d={n.includes('back') ? 'M390 67L332 151' : 'M116 63L263 171'} stroke={accent} strokeDasharray="4 6" opacity=".55" />
      </>}
      {!isLight && !isComposition && <>
        <circle cx="415" cy="108" r="64" fill={`url(#${id}glow)`} />
        <path d="M20 270V115H82V270M125 270V72H172V270M420 270V58H466V270M503 270V140H570V270" fill={accent} opacity=".1" />
      </>}
      <ellipse cx={isComposition && !n.includes('symmetr') ? 390 : 300} cy="267" rx="64" ry="12" fill="#070b0d" />
      <g transform={`translate(${isComposition && !n.includes('symmetr') ? 90 : 0},0)`}>
        <circle cx="300" cy="138" r="28" fill={`url(#${id}body)`} />
        <path d="M275 171Q300 159 325 171L338 232H315L312 264H288L285 232H262Z" fill={`url(#${id}body)`} />
      </g>
      {isComposition && <>
        <path d={n.includes('diagonal') || n.includes('leading') ? 'M0 330L390 138L600 330M0 0L390 138L600 0' : 'M200 0V330M400 0V330M0 110H600M0 220H600'} stroke={accent} strokeOpacity=".45" strokeDasharray="5 6" />
        <circle cx="400" cy="110" r="5" fill="#ff7948" />
      </>}
    </g>}
    <text x="22" y="29" fontFamily="monospace" fontSize="11" fill="#98a4a6" letterSpacing="2">{isLight ? 'LIGHT STUDY' : isComposition ? 'COMPOSITION STUDY' : isEdit ? 'SEQUENCE CONCEPT' : 'MOOD STUDY'}</text>
    <path d="M18 60V45H33M567 45H582V60M18 280V295H33M567 295H582V280" stroke="#667275" fill="none" />
    <text x="580" y="320" textAnchor="end" fontFamily="monospace" fontSize="10" fill="#78878b">ILLUSTRATIVE</text>
  </svg>;
}
