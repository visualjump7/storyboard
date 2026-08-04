/** Which UI a project gets: a film storyboard or a social-post pipeline. */
export type ProjectKind = 'storyboard' | 'social';

/** Pipeline stages for a social post. Mirrors the DB CHECK on scenes.status. */
export const POST_STATUSES = ['idea', 'draft', 'ready', 'scheduled', 'posted'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export type MediaKind = 'image' | 'video';

/** A project — one storyboard or one social pipeline (Postgres `projects` table). */
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  kind: ProjectKind;
  /** Unguessable token backing the public read-only /share/{token} page. */
  share_token: string;
  created_at: string;
  updated_at: string;
}

/**
 * A row in the `scenes` table. In a storyboard project this is a scene; in a
 * social project it is a POST (copy/status/scheduled_at/platforms are
 * meaningful and media lives in `scene_media` instead of image_path).
 */
export interface Scene {
  id: string;
  user_id: string;
  /** The project (storyboard) this scene belongs to. */
  project_id: string;
  order_index: number;
  name: string;
  description: string;
  /** The generation prompt the user will render this scene/media with elsewhere. */
  prompt: string;
  /** Path to the object in the `scene-images` bucket, or null when empty. */
  image_path: string | null;
  /** Social: the post's caption/body text ('' on storyboard rows). */
  copy: string;
  /** Social: pipeline stage (storyboard rows sit at the 'draft' default). */
  status: PostStatus;
  /** Social: when the post should go out (ISO timestamptz), or null = backlog. */
  scheduled_at: string | null;
  /** Social: target platform slugs (e.g. 'instagram', 'linkedin'). */
  platforms: string[];
  created_at: string;
  updated_at: string;
}

/** An ordered media item (image or video) attached to a social post. */
export interface SceneMedia {
  id: string;
  user_id: string;
  scene_id: string;
  kind: MediaKind;
  /** Object path in the `scene-images` bucket. */
  path: string;
  position: number;
  created_at: string;
}

/** The single script row per project (Postgres `script` table). */
export interface ScriptRow {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  updated_at: string;
}

/** Fields the user can edit inline in the storyboard detail panel. */
export type SceneTextFields = Pick<Scene, 'name' | 'description' | 'prompt'>;

/** Fields the post editor can save (the social analog of SceneTextFields). */
export type PostFields = Pick<
  Scene,
  'name' | 'description' | 'prompt' | 'copy' | 'status' | 'scheduled_at' | 'platforms'
>;

export const SCENE_IMAGES_BUCKET = 'scene-images';
