'use client';

import { memo } from 'react';
import type { CameraReference } from '@/lib/camera-reference/catalog';
import { LightStudy, LIGHT_STUDIES } from './LightStudy';
import { EffectsStudy, EFFECT_STUDIES } from './EffectsStudy';
import { CompositionStudy, COMPOSITION_STUDIES } from './CompositionStudy';
import { SequenceStudy, SEQUENCE_STUDIES } from './SequenceStudy';
import { GenreStudy, GENRE_STUDIES } from './GenreStudy';

const STUDIES = { ...LIGHT_STUDIES, ...EFFECT_STUDIES, ...COMPOSITION_STUDIES, ...SEQUENCE_STUDIES, ...GENRE_STUDIES };
export function getReferenceStudy(name: string) { return STUDIES[name]; }
export function supportsReferenceImage(name: string) { return ['Color Grading', 'Desaturation', 'Sepia Tone', 'Film Grain'].includes(name); }

export const ReferenceVisual = memo(function ReferenceVisual({ reference, progress = .75, compact = false, imageUrl, view = 'effect' }: {
  reference: CameraReference; progress?: number; compact?: boolean; imageUrl?: string; view?: 'effect' | 'split' | 'original';
}) {
  const props = { name: reference.name, progress, compact, imageUrl, view };
  if (LIGHT_STUDIES[reference.name]) return <LightStudy {...props} />;
  if (EFFECT_STUDIES[reference.name]) return <EffectsStudy {...props} />;
  if (COMPOSITION_STUDIES[reference.name]) return <CompositionStudy {...props} />;
  if (SEQUENCE_STUDIES[reference.name]) return <SequenceStudy {...props} />;
  if (GENRE_STUDIES[reference.name]) return <GenreStudy {...props} />;
  return null;
});
