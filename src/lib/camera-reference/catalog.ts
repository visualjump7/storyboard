import { catalogSourceSha256, sourceCatalog } from './catalog-data';

export const categories = [
  'Camera Work',
  'Lighting',
  'Composition',
  'Editing',
  'Storytelling',
  'Visual Effects & Promptable FX',
  'Genres & Styles',
] as const;

export type CameraCategory = (typeof categories)[number];
export type CameraComplexity = 'Low' | 'Medium' | 'High';
export type CameraPriority = 'Core' | 'Selective' | 'Special-purpose';
export type CameraStage = (typeof sourceCatalog.techniques)[number]['stage'];
export type CameraFunction = (typeof sourceCatalog.techniques)[number]['function'];

export interface CameraReference {
  readonly id: string;
  readonly number: number;
  readonly slug: string;
  readonly name: string;
  readonly category: CameraCategory;
  readonly function: CameraFunction;
  readonly meaning: string;
  readonly application: string;
  readonly direction: string;
  readonly watch: string;
  readonly complexity: CameraComplexity;
  readonly priority: CameraPriority;
  readonly source: string;
  readonly stage: CameraStage;
  readonly text_review: string;
  readonly visual_review: string;
  readonly motion_review: string;
  readonly test_status: string;
  readonly reviewed_date: string;
  readonly sourceMetadata: {
    readonly title: string;
    readonly author: string;
    readonly url: string;
    readonly catalogFile: string;
    readonly auditDate: string;
  };
  // The supplied library contains no source images or video files.
  readonly sourceVisual: null;
}

export const catalogMetadata = {
  ...sourceCatalog.metadata,
  sourceTitle: 'Cinematique',
  sourceAuthor: 'VVS / Ivan Flugelman',
  sourceFile: 'Cinematique_Library/catalog.json',
  sourceSha256: catalogSourceSha256,
  sourceMediaIncluded: false,
} as const;

export const categoryCounts: Readonly<Record<CameraCategory, number>> =
  sourceCatalog.metadata.category_counts;

export const cameraReferences: readonly CameraReference[] = sourceCatalog.techniques.map((entry) => ({
  ...entry,
  slug: new URL(entry.source).pathname.split('/').filter(Boolean).pop()!,
  sourceMetadata: {
    title: catalogMetadata.sourceTitle,
    author: catalogMetadata.sourceAuthor,
    url: entry.source,
    catalogFile: catalogMetadata.sourceFile,
    auditDate: entry.reviewed_date,
  },
  sourceVisual: null,
}));

export interface CameraRecipe {
  readonly id: string;
  readonly name: string;
  readonly technique_ids: string;
  readonly techniqueIds: readonly string[];
  readonly purpose: string;
  readonly direction: string;
  readonly watch: string;
}

export const recipes: readonly CameraRecipe[] = sourceCatalog.recipes.map((recipe) => ({
  ...recipe,
  techniqueIds: recipe.technique_ids.split(/\s*\+\s*/),
}));

export const workflow = sourceCatalog.workflow;
export const guardrails = sourceCatalog.guardrails;

export function findCameraReference(idOrSlug: string): CameraReference | undefined {
  return cameraReferences.find((reference) => reference.id === idOrSlug || reference.slug === idOrSlug);
}
