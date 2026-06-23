/** A project — a single storyboard. A user can own many (Postgres `projects` table). */
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

/** A storyboard scene row (Postgres `scenes` table). Belongs to one project. */
export interface Scene {
  id: string;
  user_id: string;
  /** The project (storyboard) this scene belongs to. */
  project_id: string;
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

/** The single script row per project (Postgres `script` table). */
export interface ScriptRow {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  updated_at: string;
}

/** Fields the user can edit inline in the detail panel. */
export type SceneTextFields = Pick<Scene, 'name' | 'description' | 'prompt'>;

export const SCENE_IMAGES_BUCKET = 'scene-images';
