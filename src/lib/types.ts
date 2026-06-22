/** A storyboard scene row (Postgres `scenes` table). */
export interface Scene {
  id: string;
  user_id: string;
  order_index: number;
  name: string;
  description: string;
  /** The generation prompt the user will render this scene with elsewhere. */
  prompt: string;
  /** Path to the object in the `scene-images` bucket, or null when empty. */
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

/** The single script row per user (Postgres `script` table). */
export interface ScriptRow {
  id: string;
  user_id: string;
  content: string;
  updated_at: string;
}

/** Fields the user can edit inline in the detail panel. */
export type SceneTextFields = Pick<Scene, 'name' | 'description' | 'prompt'>;

export const SCENE_IMAGES_BUCKET = 'scene-images';
