/**
 * Which UI a project gets: a film storyboard, a social-post pipeline, or a
 * merchandise tracking board.
 */
export type ProjectKind = 'storyboard' | 'social' | 'merchandise';

/** Pipeline stages for a social post. Mirrors the DB CHECK on scenes.status. */
export const POST_STATUSES = ['idea', 'draft', 'ready', 'scheduled', 'posted'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/**
 * Stages a merchandise product moves through. `status` is one shared column
 * across project kinds, so the DB CHECK is the union of these and
 * POST_STATUSES — 'ready' is deliberately common to both.
 */
export const MERCH_STATUSES = ['concept', 'sourcing', 'quotes', 'orders', 'ready'] as const;
export type MerchStatus = (typeof MERCH_STATUSES)[number];

/** Every value `scenes.status` can hold, across all project kinds. */
export type SceneStatus = PostStatus | MerchStatus;

/**
 * Narrow a stored status to a social one. A row carrying a merchandise stage
 * (or anything unrecognised) falls back to 'draft' rather than rendering a
 * label the social UI has no meaning for.
 */
export function asPostStatus(status: SceneStatus | string): PostStatus {
  return (POST_STATUSES as readonly string[]).includes(status)
    ? (status as PostStatus)
    : 'draft';
}

/**
 * Narrow a stored status to a merchandise stage, defaulting to 'concept' so a
 * product never falls off the list.
 */
export function asMerchStatus(status: SceneStatus | string): MerchStatus {
  return (MERCH_STATUSES as readonly string[]).includes(status)
    ? (status as MerchStatus)
    : 'concept';
}

/** Human labels for the merchandise stages. */
export const MERCH_STATUS_LABELS: Record<MerchStatus, string> = {
  concept: 'Merchandise concept',
  sourcing: 'Sourcing',
  quotes: 'Quotes',
  orders: 'Orders',
  ready: 'Ready',
};

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
  /**
   * Stage. One shared column across kinds, so the type is the union: social
   * rows hold a PostStatus, merchandise rows a MerchStatus, and storyboard
   * rows sit at the 'draft' default. Narrow before use.
   */
  status: SceneStatus;
  /** Social: when the post should go out (ISO timestamptz), or null = backlog. */
  scheduled_at: string | null;
  /** Social: target platform slugs (e.g. 'instagram', 'linkedin'). */
  platforms: string[];
  /** Merchandise: intended retail price. null = not decided yet, not zero. */
  sale_price: number | null;
  /** Merchandise: overall development time, e.g. '4–6 weeks'. */
  dev_time: string;
  created_at: string;
  updated_at: string;
}

/** The product-level fields a merchandise row can write. */
export interface MerchFields {
  name: string;
  description: string;
  status: MerchStatus;
  sale_price: number | null;
  dev_time: string;
}

/**
 * A potential supplier for a product. A row with no `unit_cost` is a sourcing
 * lead; filling the cost in makes it a quote. Nullable numbers keep "not
 * quoted yet" distinct from a genuine 0.
 */
export interface MerchQuote {
  id: string;
  user_id: string;
  scene_id: string;
  supplier: string;
  /** Name / email / phone — free text. */
  contact: string;
  url: string;
  unit_cost: number | null;
  /** Minimum order quantity. */
  moq: number | null;
  lead_time: string;
  notes: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export type MerchQuoteFields = Omit<
  MerchQuote,
  'id' | 'user_id' | 'scene_id' | 'created_at' | 'updated_at'
>;

export const ORDER_STATUSES = [
  'placed',
  'in_production',
  'shipped',
  'received',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Placed',
  in_production: 'In production',
  shipped: 'Shipped',
  received: 'Received',
  cancelled: 'Cancelled',
};

/** An order placed against a product. The line total is derived, never stored. */
export interface MerchOrder {
  id: string;
  user_id: string;
  scene_id: string;
  supplier: string;
  quantity: number | null;
  unit_cost: number | null;
  /** 'YYYY-MM-DD' or null. */
  ordered_at: string | null;
  expected_at: string | null;
  status: OrderStatus;
  notes: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export type MerchOrderFields = Omit<
  MerchOrder,
  'id' | 'user_id' | 'scene_id' | 'created_at' | 'updated_at'
>;

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
