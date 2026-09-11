import { z } from 'zod';
import { t } from '../i18n';

export const SLOT_IDS = ['outer', 'landscape', 'portrait', 'seated', 'standing'] as const;
export type Slot = (typeof SLOT_IDS)[number];
export const SCENE_IDS = ['fold', 'closed', 'landscape', 'portrait', 'seated', 'standing'] as const;
export type SceneId = (typeof SCENE_IDS)[number];
// Labels resolve through i18n getters so saved projects stay language-neutral.
export const SPECS: Record<Slot, { label: string; width: number; height: number; hint: string }> = {
  outer: {
    get label() {
      return t('slot.outer.label');
    },
    width: 1398,
    height: 2034,
    get hint() {
      return t('slot.outer.hint');
    },
  },
  landscape: {
    get label() {
      return t('slot.landscape.label');
    },
    width: 2853,
    height: 2007,
    get hint() {
      return t('slot.landscape.hint');
    },
  },
  portrait: {
    get label() {
      return t('slot.portrait.label');
    },
    width: 2007,
    height: 2853,
    get hint() {
      return t('slot.portrait.hint');
    },
  },
  seated: {
    get label() {
      return t('slot.seated.label');
    },
    width: 2007,
    height: 2853,
    get hint() {
      return t('slot.seated.hint');
    },
  },
  standing: {
    get label() {
      return t('slot.standing.label');
    },
    width: 2034,
    height: 1398,
    get hint() {
      return t('slot.standing.hint');
    },
  },
};
export const SCENES: {
  id: SceneId;
  name: string;
  en: string;
  alt: string;
  detail: string;
  open: number;
}[] = [
  {
    id: 'fold',
    get name() {
      return t('scene.fold.name');
    },
    en: 'Unfold',
    get alt() {
      return t('scene.fold.alt');
    },
    get detail() {
      return t('scene.fold.detail');
    },
    open: 0.3333,
  },
  {
    id: 'closed',
    get name() {
      return t('scene.closed.name');
    },
    en: 'Closed',
    get alt() {
      return t('scene.closed.alt');
    },
    get detail() {
      return t('scene.closed.detail');
    },
    open: 0,
  },
  {
    id: 'landscape',
    get name() {
      return t('scene.landscape.name');
    },
    en: 'Landscape',
    get alt() {
      return t('scene.landscape.alt');
    },
    get detail() {
      return t('scene.landscape.detail');
    },
    open: 1,
  },
  {
    id: 'portrait',
    get name() {
      return t('scene.portrait.name');
    },
    en: 'Portrait',
    get alt() {
      return t('scene.portrait.alt');
    },
    get detail() {
      return t('scene.portrait.detail');
    },
    open: 1,
  },
  {
    id: 'seated',
    get name() {
      return t('scene.seated.name');
    },
    en: 'Seated',
    get alt() {
      return t('scene.seated.alt');
    },
    get detail() {
      return t('scene.seated.detail');
    },
    open: 0.5111,
  },
  {
    id: 'standing',
    get name() {
      return t('scene.standing.name');
    },
    en: 'Standing',
    get alt() {
      return t('scene.standing.alt');
    },
    get detail() {
      return t('scene.standing.detail');
    },
    open: 0.25,
  },
];
export const BACKGROUNDS: {
  id: 'paper' | 'mist' | 'blue' | 'sand' | 'night' | 'black';
  name: string;
  color: string;
  ink: string;
}[] = [
  {
    id: 'paper',
    get name() {
      return t('bg.paper');
    },
    color: '#f4f3ef',
    ink: '#242834',
  },
  {
    id: 'mist',
    get name() {
      return t('bg.mist');
    },
    color: '#e4e7ec',
    ink: '#242834',
  },
  {
    id: 'blue',
    get name() {
      return t('bg.blue');
    },
    color: '#e0e9f6',
    ink: '#243654',
  },
  {
    id: 'sand',
    get name() {
      return t('bg.sand');
    },
    color: '#eadfd2',
    ink: '#44382e',
  },
  {
    id: 'night',
    get name() {
      return t('bg.night');
    },
    color: '#202733',
    ink: '#f4f6fa',
  },
  {
    id: 'black',
    get name() {
      return t('bg.black');
    },
    color: '#000000',
    ink: '#f4f6fa',
  },
];
export const OUTPUT_SIZES: Record<string, { label: string; width: number; height: number }> = {
  wide: {
    get label() {
      return t('output.wide');
    },
    width: 1600,
    height: 1000,
  },
  tall: {
    get label() {
      return t('output.tall');
    },
    width: 1080,
    height: 1350,
  },
  square: {
    get label() {
      return t('output.square');
    },
    width: 1200,
    height: 1200,
  },
};
const bounded = (a: number, b: number) => z.number().finite().min(a).max(b);
const assetSchema = z.object({
  name: z.string().max(200),
  data: z
    .string()
    .max(28_000_000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
  source: z.enum(['design', 'simulator', 'device']),
});
export const slotSchema = z.object({
  asset: assetSchema.nullable(),
  fit: z.enum(['contain', 'cover']),
  x: bounded(0, 1),
  y: bounded(0, 1),
  zoom: bounded(1, 2),
});
export type Asset = z.infer<typeof assetSchema>;
export type SlotData = z.infer<typeof slotSchema>;
// Custom canvas background image; same encoding rules as slot assets, minus the source tag.
const backgroundImageSchema = z.object({
  name: z.string().max(200),
  data: z
    .string()
    .max(28_000_000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
});
export type BackgroundImage = z.infer<typeof backgroundImageSchema>;
const pageSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(40),
  title: z.string().max(40),
  subtitle: z.string().max(80),
  slots: z.object({
    outer: slotSchema,
    landscape: slotSchema,
    portrait: slotSchema,
    seated: slotSchema,
    standing: slotSchema,
  }),
});
export const projectSchema = z
  .object({
    schemaVersion: z.literal(1),
    workspace: z.enum(['screenshots', 'browser']).default('screenshots'),
    browser: z
      .object({
        url: z
          .string()
          .max(4096)
          .refine((value) => {
            if (!value) return true;
            try {
              const u = new URL(value);
              return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password;
            } catch {
              return false;
            }
          }, t('browser.invalidUrl')),
        pixelRatio: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        interactive: z.boolean(),
      })
      .default({ url: '', pixelRatio: 3, interactive: true }),
    name: z.string().min(1).max(60),
    pages: z.array(pageSchema).min(1).max(20),
    activePageId: z.string(),
    scene: z.enum(SCENE_IDS),
    mode: z
      .enum(['image', 'animation', 'store'])
      .transform((mode) => (mode === 'store' ? ('image' as const) : mode)),
    demo: z.boolean(),
    view: z.object({
      open: bounded(0, 1),
      yaw: bounded(-0.9, 0.9),
      pitch: bounded(-0.6, 0.6),
      scale: bounded(0.65, 1.25),
      body: z.enum(['silver', 'dark']),
      background: z.enum(['paper', 'mist', 'blue', 'sand', 'night', 'black', 'custom']),
      backgroundColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .default('#232a36'),
      backgroundImage: backgroundImageSchema.nullable().default(null),
      transparent: z.boolean(),
    }),
    animation: z.object({
      kind: z.enum(['open', 'close', 'loop']),
      duration: bounded(2, 10),
      startHold: bounded(0, 2),
      endHold: bounded(0, 2),
      easing: z.enum(['smooth', 'linear']),
    }),
    output: z.object({
      size: z.enum(['wide', 'tall', 'square']),
      storeSize: z.enum(['innerPortrait', 'innerLandscape', 'outerPortrait', 'outerLandscape']),
      layout: z.enum(['top', 'split']),
    }),
  })
  .superRefine((p, ctx) => {
    if (!p.pages.some((x) => x.id === p.activePageId))
      ctx.addIssue({ code: 'custom', message: t('errors.activePageMissing') });
    if (projectAssetBytes(p) > 75 * 1024 * 1024)
      ctx.addIssue({ code: 'custom', message: t('errors.projectAssets') });
    if (new Set(p.pages.map((x) => x.id)).size !== p.pages.length)
      ctx.addIssue({ code: 'custom', message: t('errors.duplicatePageId') });
  })
  .transform((p) => {
    for (const page of p.pages) {
      // Legacy projects shipped a travel demo; migrate them to the bundled demo naming in place.
      if (
        page.name === '山野 · 旅行计划' &&
        page.title === '把下一程，展开。' &&
        page.subtitle === '从灵感到出发，让每一段旅程都有迹可循。' &&
        SLOT_IDS.every((slot) => !page.slots[slot].asset)
      ) {
        page.name = t('project.demoPageName');
        page.title = t('project.demoTitle');
        page.subtitle = t('project.demoSubtitle');
      }
    }
    return p;
  });
export type Project = z.infer<typeof projectSchema>;
export type Page = z.infer<typeof pageSchema>;
export function blankPage(name = t('page.newPage')): Page {
  return {
    id: crypto.randomUUID(),
    name,
    title: t('page.defaultTitle'),
    subtitle: t('page.defaultSubtitle'),
    slots: Object.fromEntries(
      SLOT_IDS.map((id) => [id, { asset: null, fit: 'cover', x: 0.5, y: 0.5, zoom: 1 }]),
    ) as Page['slots'],
  };
}
export function initialProject(): Project {
  const page = blankPage(t('project.demoPageName'));
  page.title = t('project.demoTitle');
  page.subtitle = t('project.demoSubtitle');
  return {
    schemaVersion: 1,
    workspace: 'screenshots',
    browser: { url: '', pixelRatio: 3, interactive: true },
    name: t('project.defaultName'),
    pages: [page],
    activePageId: page.id,
    scene: 'fold',
    mode: 'image',
    demo: true,
    view: {
      open: 0.3333,
      yaw: 0,
      pitch: 0,
      scale: 1,
      body: 'silver',
      background: 'paper',
      backgroundColor: '#232a36',
      backgroundImage: null,
      transparent: false,
    },
    animation: { kind: 'loop', duration: 5, startHold: 0.6, endHold: 0.6, easing: 'smooth' },
    output: { size: 'wide', storeSize: 'innerPortrait', layout: 'top' },
  };
}
export const currentPage = (p: Project) => p.pages.find((x) => x.id === p.activePageId)!;
export const sceneSlot = (scene: SceneId): Slot =>
  scene === 'closed' ? 'outer' : scene === 'fold' ? 'landscape' : scene;
export const requiredSlots = (scene: SceneId): Slot[] =>
  scene === 'fold' ? ['outer', 'landscape'] : [sceneSlot(scene)];
export function screenSlots(scene: SceneId): { inner: Slot; outer: Slot } {
  return {
    inner: scene === 'portrait' || scene === 'seated' ? scene : 'landscape',
    outer: scene === 'standing' ? 'standing' : 'outer',
  };
}
/** Resolve display content without copying derived assets into saved projects. */
export function resolveSlot(
  page: Page,
  slot: Slot,
): { data: SlotData; source: Slot; leftHalf: boolean } {
  const data = page.slots[slot];
  if (slot === 'outer' && !data.asset) {
    const source = (['landscape', 'portrait', 'seated'] as const).find((s) => page.slots[s].asset);
    if (source)
      return { data: { ...data, asset: page.slots[source].asset }, source, leftHalf: true };
  }
  return { data, source: slot, leftHalf: false };
}
export function missingSlots(p: Project, page = currentPage(p)): Slot[] {
  const slots =
    p.mode === 'animation' ? Object.values(screenSlots(p.scene)) : requiredSlots(p.scene);
  return slots.filter((s) => !resolveSlot(page, s).data.asset);
}
export function dimensions(p: Project) {
  return OUTPUT_SIZES[p.output.size];
}
export function safeName(value: string) {
  return (
    value
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .replace(/\.+/g, '-')
      .trim()
      .slice(0, 70) || 'duo'
  );
}

export function projectAssetBytes(p: {
  pages: { slots: Record<Slot, SlotData> }[];
  view?: { backgroundImage?: { data: string } | null };
}) {
  return (
    p.pages.reduce(
      (total, page) =>
        total + SLOT_IDS.reduce((n, slot) => n + (page.slots[slot].asset?.data.length ?? 0), 0),
      0,
    ) + (p.view?.backgroundImage?.data.length ?? 0)
  );
}
