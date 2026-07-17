import { z } from "zod";
import type { Messages } from "@/lib/i18n";
import { SOCIAL_PLATFORM_KEYS } from "./utils/social-platforms";

export const SocialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORM_KEYS),
  url: z.string(),
  icon: z.string().optional(),
  label: z.string().optional(),
});

export const DEFAULT_THEME_OPACITY_MIN = 0;
export const DEFAULT_THEME_OPACITY_MAX = 0.4;
export const DEFAULT_THEME_BLUR_MIN = 0;
export const DEFAULT_THEME_BLUR_MAX = 32;
export const DEFAULT_THEME_TRANSITION_MIN = 0;
export const DEFAULT_THEME_TRANSITION_MAX = 1500;
export const FUWARI_THEME_HUE_MIN = 0;
export const FUWARI_THEME_HUE_MAX = 360;

// ============================================================
// 卡片透明度 (Card Opacity) 常量
// ============================================================
export const GLASS_OPACITY_MIN = 0;
export const GLASS_OPACITY_MAX = 1;

// ============================================================
// 混沌背景 (Antigravity) 常量
// ============================================================
export const CHAOS_PARTICLE_MIN = 10;
export const CHAOS_PARTICLE_MAX = 300;
export const CHAOS_SPEED_MIN = 0.1;
export const CHAOS_SPEED_MAX = 3;
export const CHAOS_PARTICLE_SIZE_MIN = 0.5;
export const CHAOS_PARTICLE_SIZE_MAX = 4;
export const CHAOS_RADIUS_MIN = 3;
export const CHAOS_RADIUS_MAX = 30;

// ============================================================
// 全屏背景图常量
// ============================================================
export const FULLSCREEN_ENABLED_DEFAULT = false;

// ============================================================
// 基础工具函数
// ============================================================

function createSiteTextSchema(max: number) {
  return z.string().trim().max(max);
}

function createSiteTextFormSchema(max: number, messages: Messages) {
  return z
    .string()
    .trim()
    .max(max, messages.settings_site_validation_too_long({ max }));
}

function createFontFamilySchema() {
  return z.string().trim().max(200).optional();
}

function createAssetRefSchema() {
  return z.string().refine((value) => value === "" || value.startsWith("/"), {
    message: "Please enter a root-relative path",
  });
}

function createAssetRefFormSchema(messages: Messages) {
  return z.string().refine((value) => value === "" || value.startsWith("/"), {
    message: messages.settings_site_validation_invalid_asset_ref(),
  });
}

function isExternalImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createBackgroundImageRefSchema() {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || isExternalImageUrl(value),
      {
        message: "Please enter a root-relative path or http(s) URL",
      },
    );
}

function createBackgroundImageRefFormSchema(messages: Messages) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || isExternalImageUrl(value),
      {
        message:
          messages.settings_site_validation_invalid_background_image_ref(),
      },
    );
}

function createAssetPathSchema() {
  return z.string().refine((value) => value.startsWith("/"), {
    message: "Please enter a root-relative path",
  });
}

function createAssetPathFormSchema(messages: Messages) {
  return z.string().refine((value) => value.startsWith("/"), {
    message: messages.settings_site_validation_invalid_asset_path(),
  });
}

function createOptionalAssetPathSchema() {
  return z.union([createAssetPathSchema(), z.literal("")]);
}

function createOptionalAssetPathFormSchema(messages: Messages) {
  return z.union([createAssetPathFormSchema(messages), z.literal("")]);
}

function createOpacitySchema() {
  return z
    .number()
    .min(DEFAULT_THEME_OPACITY_MIN)
    .max(DEFAULT_THEME_OPACITY_MAX, {
      message: `Value must be between ${DEFAULT_THEME_OPACITY_MIN} and ${DEFAULT_THEME_OPACITY_MAX}`,
    });
}

function createOpacityFormSchema(messages: Messages) {
  return z
    .number()
    .min(DEFAULT_THEME_OPACITY_MIN)
    .max(DEFAULT_THEME_OPACITY_MAX, {
      message: messages.settings_site_validation_opacity_range(),
    });
}

function createBlurSchema() {
  return z
    .number()
    .int()
    .min(DEFAULT_THEME_BLUR_MIN)
    .max(DEFAULT_THEME_BLUR_MAX, {
      message: `Value must be between ${DEFAULT_THEME_BLUR_MIN} and ${DEFAULT_THEME_BLUR_MAX}`,
    });
}

function createBlurFormSchema(messages: Messages) {
  return z
    .number()
    .int()
    .min(DEFAULT_THEME_BLUR_MIN)
    .max(DEFAULT_THEME_BLUR_MAX, {
      message: messages.settings_site_validation_blur_range(),
    });
}

function createTransitionDurationSchema() {
  return z
    .number()
    .int()
    .min(DEFAULT_THEME_TRANSITION_MIN)
    .max(DEFAULT_THEME_TRANSITION_MAX, {
      message: `Value must be between ${DEFAULT_THEME_TRANSITION_MIN} and ${DEFAULT_THEME_TRANSITION_MAX}`,
    });
}

function createTransitionDurationFormSchema(messages: Messages) {
  return z
    .number()
    .int()
    .min(DEFAULT_THEME_TRANSITION_MIN)
    .max(DEFAULT_THEME_TRANSITION_MAX, {
      message: messages.settings_site_validation_transition_range(),
    });
}

function createHueSchema() {
  return z
    .number()
    .int()
    .min(FUWARI_THEME_HUE_MIN)
    .max(FUWARI_THEME_HUE_MAX, {
      message: `Value must be between ${FUWARI_THEME_HUE_MIN} and ${FUWARI_THEME_HUE_MAX}`,
    });
}

function createHueFormSchema(messages: Messages) {
  return z.number().int().min(FUWARI_THEME_HUE_MIN).max(FUWARI_THEME_HUE_MAX, {
    message: messages.settings_site_validation_hue_range(),
  });
}

// ============================================================
// 背景相关 Schema
// ============================================================

function createDefaultThemeBackgroundSchema() {
  return z.object({
    homeImage: createBackgroundImageRefSchema(),
    globalImage: createBackgroundImageRefSchema(),
    light: z.object({
      opacity: createOpacitySchema(),
    }),
    dark: z.object({
      opacity: createOpacitySchema(),
    }),
    backdropBlur: createBlurSchema(),
    transitionDuration: createTransitionDurationSchema(),
  });
}

function createDefaultThemeBackgroundInputSchema() {
  return z.object({
    homeImage: createBackgroundImageRefSchema().optional(),
    globalImage: createBackgroundImageRefSchema().optional(),
    light: z
      .object({
        opacity: createOpacitySchema().optional(),
      })
      .optional(),
    dark: z
      .object({
        opacity: createOpacitySchema().optional(),
      })
      .optional(),
    backdropBlur: createBlurSchema().optional(),
    transitionDuration: createTransitionDurationSchema().optional(),
  });
}

function createDefaultThemeBackgroundInputFormSchema(messages: Messages) {
  return z.object({
    homeImage: createBackgroundImageRefFormSchema(messages).optional(),
    globalImage: createBackgroundImageRefFormSchema(messages).optional(),
    light: z
      .object({
        opacity: createOpacityFormSchema(messages).optional(),
      })
      .optional(),
    dark: z
      .object({
        opacity: createOpacityFormSchema(messages).optional(),
      })
      .optional(),
    backdropBlur: createBlurFormSchema(messages).optional(),
    transitionDuration: createTransitionDurationFormSchema(messages).optional(),
  });
}

// ============================================================
// 卡片透明度 (Card Opacity) 定义
// ============================================================

function createGlassSchema() {
  return z.object({
    enabled: z.boolean().default(true),
    opacity: z.number().min(GLASS_OPACITY_MIN).max(GLASS_OPACITY_MAX).default(0.85),
  });
}

function createGlassInputSchema() {
  return z.object({
    enabled: z.boolean().optional(),
    opacity: z.number().min(GLASS_OPACITY_MIN).max(GLASS_OPACITY_MAX).optional(),
  });
}

function createGlassInputFormSchema(messages: Messages) {
  return z.object({
    enabled: z.boolean().optional(),
    opacity: z.number().min(GLASS_OPACITY_MIN).max(GLASS_OPACITY_MAX).optional(),
  });
}

// ============================================================
// 混沌背景 (Antigravity) 定义
// ============================================================

function createChaosSchema() {
  return z.object({
    enabled: z.boolean().default(false),
    particleCount: z
      .number()
      .int()
      .min(CHAOS_PARTICLE_MIN)
      .max(CHAOS_PARTICLE_MAX)
      .default(80),
    speed: z.number().min(CHAOS_SPEED_MIN).max(CHAOS_SPEED_MAX).default(0.8),
    color: z.string().default("#ff6b6b"),
    darkColor: z.string().default("#38bdf8"),
    particleSize: z
      .number()
      .min(CHAOS_PARTICLE_SIZE_MIN)
      .max(CHAOS_PARTICLE_SIZE_MAX)
      .default(1.8),
    ringRadius: z.number().min(CHAOS_RADIUS_MIN).max(CHAOS_RADIUS_MAX).default(10),
    magnetRadius: z
      .number()
      .min(CHAOS_RADIUS_MIN)
      .max(CHAOS_RADIUS_MAX)
      .default(10),
  });
}

function createChaosInputSchema() {
  return z.object({
    enabled: z.boolean().optional(),
    particleCount: z
      .number()
      .int()
      .min(CHAOS_PARTICLE_MIN)
      .max(CHAOS_PARTICLE_MAX)
      .optional(),
    speed: z.number().min(CHAOS_SPEED_MIN).max(CHAOS_SPEED_MAX).optional(),
    color: z.string().optional(),
    darkColor: z.string().optional(),
    particleSize: z
      .number()
      .min(CHAOS_PARTICLE_SIZE_MIN)
      .max(CHAOS_PARTICLE_SIZE_MAX)
      .optional(),
    ringRadius: z.number().min(CHAOS_RADIUS_MIN).max(CHAOS_RADIUS_MAX).optional(),
    magnetRadius: z
      .number()
      .min(CHAOS_RADIUS_MIN)
      .max(CHAOS_RADIUS_MAX)
      .optional(),
  });
}

function createChaosInputFormSchema(messages: Messages) {
  return z.object({
    enabled: z.boolean().optional(),
    particleCount: z
      .number()
      .int()
      .min(CHAOS_PARTICLE_MIN)
      .max(CHAOS_PARTICLE_MAX)
      .optional(),
    speed: z.number().min(CHAOS_SPEED_MIN).max(CHAOS_SPEED_MAX).optional(),
    color: z.string().optional(),
    darkColor: z.string().optional(),
    particleSize: z
      .number()
      .min(CHAOS_PARTICLE_SIZE_MIN)
      .max(CHAOS_PARTICLE_SIZE_MAX)
      .optional(),
    ringRadius: z.number().min(CHAOS_RADIUS_MIN).max(CHAOS_RADIUS_MAX).optional(),
    magnetRadius: z
      .number()
      .min(CHAOS_RADIUS_MIN)
      .max(CHAOS_RADIUS_MAX)
      .optional(),
  });
}

// ============================================================
// 全屏背景图 Schema
// ============================================================

const FullscreenBgSchema = z.object({
  light: createBackgroundImageRefSchema().optional(),
  dark: createBackgroundImageRefSchema().optional(),
});

const FullscreenBgInputSchema = z.object({
  light: createBackgroundImageRefSchema().optional(),
  dark: createBackgroundImageRefSchema().optional(),
});

const FullscreenBgInputFormSchema = (messages: Messages) =>
  z.object({
    light: createBackgroundImageRefFormSchema(messages).optional(),
    dark: createBackgroundImageRefFormSchema(messages).optional(),
  });

// ============================================================
// Default Theme 相关 Schema
// ============================================================

export const defaultThemeBackgroundSchema = createDefaultThemeBackgroundSchema();
export const defaultThemeBackgroundInputSchema = createDefaultThemeBackgroundInputSchema();

export const defaultThemeSiteConfigSchema = z.object({
  navBarName: createSiteTextSchema(60),
  background: defaultThemeBackgroundSchema.optional(),
  glass: createGlassSchema().optional(),
  chaos: createChaosSchema().optional(),
  fullscreenBg: FullscreenBgSchema.optional(),
  fullscreenEnabled: z.boolean().default(FULLSCREEN_ENABLED_DEFAULT),
});

export const defaultThemeSiteConfigInputSchema = z.object({
  navBarName: createSiteTextSchema(60).optional(),
  background: defaultThemeBackgroundInputSchema.optional(),
  glass: createGlassInputSchema().optional(),
  chaos: createChaosInputSchema().optional(),
  fullscreenBg: FullscreenBgInputSchema.optional(),
  fullscreenEnabled: z.boolean().optional(),
});

export function createDefaultThemeSiteConfigInputFormSchema(messages: Messages) {
  return z.object({
    navBarName: createSiteTextFormSchema(60, messages).optional(),
    background: createDefaultThemeBackgroundInputFormSchema(messages).optional(),
    glass: createGlassInputFormSchema(messages).optional(),
    chaos: createChaosInputFormSchema(messages).optional(),
    fullscreenBg: FullscreenBgInputFormSchema(messages).optional(),
    fullscreenEnabled: z.boolean().optional(),
  });
}

// ============================================================
// Fuwari Theme 相关 Schema
// ============================================================

function createFuwariThemeSiteConfigSchema() {
  return z.object({
    homeBg: createBackgroundImageRefSchema(),
    avatar: createAssetRefSchema(),
    primaryHue: createHueSchema(),
    darkHomeBg: createBackgroundImageRefSchema().optional(),
    darkPrimaryHue: createHueSchema().optional(),
  });
}

function createFuwariThemeSiteConfigInputSchema() {
  return z.object({
    homeBg: createBackgroundImageRefSchema().optional(),
    avatar: createAssetRefSchema().optional(),
    primaryHue: createHueSchema().optional(),
    darkHomeBg: createBackgroundImageRefSchema().optional(),
    darkPrimaryHue: createHueSchema().optional(),
  });
}

function createFuwariThemeSiteConfigInputFormSchema(messages: Messages) {
  return z.object({
    homeBg: createBackgroundImageRefFormSchema(messages).optional(),
    avatar: createAssetRefFormSchema(messages).optional(),
    primaryHue: createHueFormSchema(messages).optional(),
    darkHomeBg: createBackgroundImageRefFormSchema(messages).optional(),
    darkPrimaryHue: createHueFormSchema(messages).optional(),
  });
}

export const fuwariThemeSiteConfigSchema = createFuwariThemeSiteConfigSchema();
export const fuwariThemeSiteConfigInputSchema = createFuwariThemeSiteConfigInputSchema();

// ============================================================
// 完整的站点配置 Schema
// ============================================================

export const FullSiteConfigSchema = z.object({
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), {
    message: "Must be a valid date string (YYYY-MM-DD)",
  }),
  title: createSiteTextSchema(120),
  author: createSiteTextSchema(80),
  description: createSiteTextSchema(300),
  fontFamily: createFontFamilySchema(),
  musicPlaylistId: z.string().optional(),
  social: z.array(SocialLinkSchema),
  icons: z.object({
    faviconSvg: createAssetPathSchema(),
    faviconIco: createAssetPathSchema(),
    favicon96: createAssetPathSchema(),
    appleTouchIcon: createAssetPathSchema(),
    webApp192: createAssetPathSchema(),
    webApp512: createAssetPathSchema(),
  }),
  theme: z.object({
    default: defaultThemeSiteConfigSchema,
    fuwari: fuwariThemeSiteConfigSchema,
  }),
});

// ============================================================
// 输入 Schema（用于表单和 API）
// ============================================================

export function createSiteConfigInputFormSchema(messages: Messages) {
  return z.object({
    startDate: z.string().optional(),
    title: createSiteTextFormSchema(120, messages).optional(),
    author: createSiteTextFormSchema(80, messages).optional(),
    description: createSiteTextFormSchema(300, messages).optional(),
    fontFamily: createSiteTextFormSchema(200, messages).optional(),
    musicPlaylistId: z.string().optional(),
    social: z.array(SocialLinkSchema).optional(),
    icons: z
      .object({
        faviconSvg: createOptionalAssetPathFormSchema(messages).optional(),
        faviconIco: createOptionalAssetPathFormSchema(messages).optional(),
        favicon96: createOptionalAssetPathFormSchema(messages).optional(),
        appleTouchIcon: createOptionalAssetPathFormSchema(messages).optional(),
        webApp192: createOptionalAssetPathFormSchema(messages).optional(),
        webApp512: createOptionalAssetPathFormSchema(messages).optional(),
      })
      .optional(),
    theme: z
      .object({
        default: createDefaultThemeSiteConfigInputFormSchema(messages).optional(),
        fuwari: createFuwariThemeSiteConfigInputFormSchema(messages).optional(),
      })
      .optional(),
  });
}

export const SiteConfigInputSchema = z.object({
  startDate: z.string().optional(),
  title: createSiteTextSchema(120).optional(),
  author: createSiteTextSchema(80).optional(),
  description: createSiteTextSchema(300).optional(),
  fontFamily: createFontFamilySchema(),
  musicPlaylistId: z.string().optional(),
  social: z.array(SocialLinkSchema).optional(),
  icons: z
    .object({
      faviconSvg: createOptionalAssetPathSchema().optional(),
      faviconIco: createOptionalAssetPathSchema().optional(),
      favicon96: createOptionalAssetPathSchema().optional(),
      appleTouchIcon: createOptionalAssetPathSchema().optional(),
      webApp192: createOptionalAssetPathSchema().optional(),
      webApp512: createOptionalAssetPathSchema().optional(),
    })
    .optional(),
  theme: z
    .object({
      default: defaultThemeSiteConfigInputSchema.optional(),
      fuwari: fuwariThemeSiteConfigInputSchema.optional(),
    })
    .optional(),
});

export const SiteConfigSchema = SiteConfigInputSchema;

// ============================================================
// 类型导出
// ============================================================

export type DefaultThemeSiteConfig = z.infer<
  typeof defaultThemeSiteConfigSchema
>;
export type DefaultThemeBackground = z.infer<
  typeof defaultThemeBackgroundSchema
>;
export type DefaultThemeSiteConfigInput = z.infer<
  typeof defaultThemeSiteConfigInputSchema
>;
export type FuwariThemeSiteConfig = z.infer<typeof fuwariThemeSiteConfigSchema>;
export type FuwariThemeSiteConfigInput = z.infer<
  typeof fuwariThemeSiteConfigInputSchema
>;
export type SiteConfig = z.infer<typeof FullSiteConfigSchema>;
export type SiteConfigInput = z.infer<typeof SiteConfigInputSchema>;

export type GlassConfig = z.infer<ReturnType<typeof createGlassSchema>>;
export type GlassInput = z.infer<ReturnType<typeof createGlassInputSchema>>;
export type ChaosConfig = z.infer<ReturnType<typeof createChaosSchema>>;
export type ChaosInput = z.infer<ReturnType<typeof createChaosInputSchema>>;