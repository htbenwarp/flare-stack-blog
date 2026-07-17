import "@/features/theme/themes/fuwari/styles/preview.css";
import { useFormContext, useWatch } from "react-hook-form";
import { AssetUploadField } from "@/features/config/components/asset-upload-field";
import { RangeField } from "@/features/config/components/site-settings-fields";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  FUWARI_THEME_HUE_MAX,
  FUWARI_THEME_HUE_MIN,
} from "@/features/config/site-config.schema";
import { m } from "@/paraglide/messages";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Suspense, lazy } from "react";

const AntigravityPreview = lazy(() => import("@/features/theme/themes/fuwari/components/antigravity"));

function FuwariHuePreview() {
  const { control } = useFormContext<SystemConfig>();
  const currentHue = useWatch({
    control,
    name: "site.theme.fuwari.primaryHue",
  });
  const previewHue =
    typeof currentHue === "number" && !Number.isNaN(currentHue)
      ? currentHue
      : 250;

  const previewStyle = {
    "--fuwari-hue": String(previewHue),
  } as React.CSSProperties;

  return (
    <div
      className="fuwari-preview rounded-2xl border border-border/40 bg-background/70 p-4 md:col-span-2"
      style={previewStyle}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            {m.settings_site_primary_preview_title()}
          </p>
          <p className="text-xs text-muted-foreground">
            {m.settings_site_primary_preview_desc({ hue: String(previewHue) })}
          </p>
        </div>
        <div
          className="h-10 w-10 shrink-0 rounded-xl border border-black/10 shadow-sm"
          style={{ backgroundColor: "var(--fuwari-primary)" }}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div className="fuwari-card-base rounded-xl border border-black/5 p-4 shadow-sm">
          <div
            className="h-2.5 w-16 rounded-full"
            style={{ backgroundColor: "var(--fuwari-primary)" }}
          />
          <p className="mt-4 text-xs/5 font-medium text-black/45 dark:text-white/45">
            {m.settings_site_primary_preview_card_label()}
          </p>
          <p className="mt-1 text-lg font-semibold text-black/90 dark:text-white/90">
            {m.settings_site_primary_preview_card_title()}
          </p>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            {m.settings_site_primary_preview_card_desc()}
          </p>
        </div>

        <button
          type="button"
          className="fuwari-btn-primary h-11 rounded-xl px-4 text-sm font-semibold shadow-sm active:scale-[0.98]"
        >
          {m.settings_site_primary_preview_btn_primary()}
        </button>

        <button
          type="button"
          className="fuwari-btn-regular h-11 rounded-xl px-4 text-sm font-medium shadow-sm active:scale-[0.98]"
        >
          {m.settings_site_primary_preview_btn_tinted()}
        </button>
      </div>
    </div>
  );
}

export function FuwariThemeSettings() {
  const {
    formState: { errors },
    setValue,
    getValues,
    control,
  } = useFormContext<SystemConfig>();

  const glass = useWatch({ control, name: "site.theme.default.glass" });
  const chaos = useWatch({ control, name: "site.theme.default.chaos" });
  const defaultTheme = useWatch({ control, name: "site.theme.default" });

  const glassEnabled = glass?.enabled ?? true;
  const glassOpacity = glass?.opacity ?? 0.85;

  const chaosEnabled = chaos?.enabled ?? false;
  const chaosParticleCount = chaos?.particleCount ?? 80;
  const chaosSpeed = chaos?.speed ?? 0.8;
  const chaosColor = chaos?.color ?? "#0284c7";
  const chaosDarkColor = chaos?.darkColor ?? "#38bdf8";
  const chaosParticleSize = chaos?.particleSize ?? 1.8;
  const chaosRingRadius = chaos?.ringRadius ?? 10;
  const chaosMagnetRadius = chaos?.magnetRadius ?? 10;

  const fullscreenEnabled = defaultTheme?.fullscreenEnabled ?? false;

  const handleGlassChange = (field: string, value: any) => {
    const current = getValues("site.theme.default.glass") || {};
    setValue("site.theme.default.glass", { ...current, [field]: value });
  };

  const handleChaosChange = (field: string, value: any) => {
    const current = getValues("site.theme.default.chaos") || {};
    setValue("site.theme.default.chaos", { ...current, [field]: value });
  };

  const handleDefaultChange = (field: string, value: any) => {
    const current = getValues("site.theme.default") || {};
    setValue("site.theme.default", { ...current, [field]: value });
  };

  return (
    <>
      {/* ============================================================
          Fuwari 主题原有设置
          ============================================================ */}

      <AssetUploadField
        name="site.theme.fuwari.homeBg"
        assetPath="themes/fuwari/home-bg.webp"
        accept=".png,.webp,.jpg,.jpeg"
        label={m.settings_site_field_home_image()}
        hint={m.settings_site_field_home_image_hint()}
        placeholder="/images/asset/themes/fuwari/home-bg.webp or https://picsum.photos/1600/900"
        error={errors.site?.theme?.fuwari?.homeBg?.message}
      />

      <AssetUploadField
        name="site.theme.fuwari.darkHomeBg"
        assetPath="themes/fuwari/dark-home-bg.webp"
        accept=".png,.webp,.jpg,.jpeg"
        label={m.settings_site_fuwari_dark_home_bg()}
        hint={m.settings_site_fuwari_dark_home_bg_desc()}
        placeholder="/images/asset/themes/fuwari/dark-home-bg.webp"
        error={errors.site?.theme?.fuwari?.darkHomeBg?.message}
      />

      <AssetUploadField
        name="site.theme.fuwari.avatar"
        assetPath="themes/fuwari/avatar.png"
        accept=".png,.webp,.jpg,.jpeg"
        readOnly
        label={m.settings_site_field_avatar()}
        error={errors.site?.theme?.fuwari?.avatar?.message}
      />

      <RangeField
        name="site.theme.fuwari.primaryHue"
        label={m.settings_site_field_primary_hue()}
        hint={m.settings_site_field_primary_hue_hint()}
        min={FUWARI_THEME_HUE_MIN}
        max={FUWARI_THEME_HUE_MAX}
        step={1}
        unit="deg"
        defaultValue={250}
        error={errors.site?.theme?.fuwari?.primaryHue?.message}
      />

      <RangeField
        name="site.theme.fuwari.darkPrimaryHue"
        label={m.settings_site_fuwari_dark_primary_hue()}
        hint={m.settings_site_fuwari_dark_primary_hue_desc()}
        min={FUWARI_THEME_HUE_MIN}
        max={FUWARI_THEME_HUE_MAX}
        step={1}
        unit="deg"
        defaultValue={250}
        error={errors.site?.theme?.fuwari?.darkPrimaryHue?.message}
      />

      <FuwariHuePreview />

      {/* ============================================================
          卡片透明度设置
          ============================================================ */}

      <div className="space-y-4 border-t border-border/30 pt-6 md:col-span-2">
        <div className="space-y-1">
          <h3 className="text-base font-bold fuwari-text-90">
            {m.settings_glass_title?.() ?? "卡片透明度"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {m.settings_glass_desc?.() ?? "调整卡片背景的不透明度，保留主题颜色"}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            {m.settings_glass_enabled?.() ?? "启用半透明效果"}
          </Label>
          <Switch
            checked={glassEnabled}
            onCheckedChange={(checked) => handleGlassChange("enabled", checked)}
          />
        </div>

        {glassEnabled && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">{m.settings_glass_opacity?.() ?? "不透明度"}</Label>
              <span className="text-xs font-mono text-muted-foreground">
                {Math.round(glassOpacity * 100)}%
              </span>
            </div>
            <Slider
              value={[glassOpacity]}
              min={0.3}
              max={1}
              step={0.05}
              onValueChange={([val]) => handleGlassChange("opacity", val)}
            />
          </div>
        )}
      </div>

      {/* ============================================================
          混沌背景设置
          ============================================================ */}

      <div className="space-y-4 border-t border-border/30 pt-6 md:col-span-2">
        <div className="space-y-1">
          <h3 className="text-base font-bold fuwari-text-90">
            {m.settings_chaos_title?.() ?? "混沌背景动画"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {m.settings_chaos_desc?.() ?? "洛伦兹吸引子粒子动画，跟随鼠标/手势"}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            {m.settings_chaos_enabled?.() ?? "启用混沌背景"}
          </Label>
          <Switch
            checked={chaosEnabled}
            onCheckedChange={(checked) => handleChaosChange("enabled", checked)}
          />
        </div>

        {chaosEnabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">
                    {m.settings_chaos_particle_count?.() ?? "粒子数量"}
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {chaosParticleCount}
                  </span>
                </div>
                <Slider
                  value={[chaosParticleCount]}
                  min={10}
                  max={300}
                  step={5}
                  onValueChange={([val]) => handleChaosChange("particleCount", val)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">
                    {m.settings_chaos_speed?.() ?? "动画速度"}
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {chaosSpeed.toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[chaosSpeed]}
                  min={0.1}
                  max={3}
                  step={0.1}
                  onValueChange={([val]) => handleChaosChange("speed", val)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">亮色模式粒子颜色</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={chaosColor}
                    onChange={(e) => handleChaosChange("color", e.target.value)}
                    className="w-12 h-12 p-1 rounded border border-border"
                  />
                  <Input
                    type="text"
                    value={chaosColor}
                    onChange={(e) => handleChaosChange("color", e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">暗色模式粒子颜色</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={chaosDarkColor}
                    onChange={(e) => handleChaosChange("darkColor", e.target.value)}
                    className="w-12 h-12 p-1 rounded border border-border"
                  />
                  <Input
                    type="text"
                    value={chaosDarkColor}
                    onChange={(e) => handleChaosChange("darkColor", e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">
                    {m.settings_chaos_particle_size?.() ?? "粒子大小"}
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {chaosParticleSize.toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[chaosParticleSize]}
                  min={0.5}
                  max={4}
                  step={0.1}
                  onValueChange={([val]) => handleChaosChange("particleSize", val)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">
                    {m.settings_chaos_ring_radius?.() ?? "聚集环半径"}
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {chaosRingRadius}
                  </span>
                </div>
                <Slider
                  value={[chaosRingRadius]}
                  min={3}
                  max={30}
                  step={1}
                  onValueChange={([val]) => handleChaosChange("ringRadius", val)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">
                  {m.settings_chaos_magnet_radius?.() ?? "磁力范围"}
                </Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {chaosMagnetRadius}
                </span>
              </div>
              <Slider
                value={[chaosMagnetRadius]}
                min={3}
                max={30}
                step={1}
                onValueChange={([val]) => handleChaosChange("magnetRadius", val)}
              />
            </div>

            <div className="mt-4 rounded-xl overflow-hidden border border-border/30 bg-background/50 h-48 relative">
              <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">加载预览...</div>}>
                <AntigravityPreview
                  count={chaosParticleCount}
                  waveSpeed={chaosSpeed * 0.5}
                  colors={[chaosColor]}
                  darkColors={[chaosDarkColor]}
                  particleSize={chaosParticleSize}
                  ringRadius={chaosRingRadius}
                  magnetRadius={chaosMagnetRadius}
                  particleShape="capsule"
                  isPreview={true}
                />
              </Suspense>
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-muted-foreground bg-background/80 px-3 py-1 rounded-full z-10">
                Preview：{chaosParticleCount} 粒子 · {chaosSpeed.toFixed(1)}x 速度
              </p>
            </div>
          </>
        )}
      </div>

      {/* ============================================================
          全屏背景图设置
          ============================================================ */}

      <div className="space-y-4 border-t border-border/30 pt-6 md:col-span-2">
        <div className="space-y-1">
          <h3 className="text-base font-bold fuwari-text-90">
            全屏背景图
          </h3>
          <p className="text-xs text-muted-foreground">
            开启后首页背景图将铺满全屏，图片在粒子下层
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">启用全屏背景</Label>
          <Switch
            checked={fullscreenEnabled}
            onCheckedChange={(checked) => handleDefaultChange("fullscreenEnabled", checked)}
          />
        </div>

        {fullscreenEnabled && (
          <>
            <AssetUploadField
              name="site.theme.default.fullscreenBg.light"
              assetPath="themes/fuwari/fullscreen-bg-light.webp"
              accept=".png,.webp,.jpg,.jpeg"
              label="亮色模式背景图"
              hint="建议宽高比 16:9 以上"
              placeholder="/images/asset/themes/fuwari/fullscreen-bg-light.webp"
              error={errors.site?.theme?.default?.fullscreenBg?.light?.message}
            />
            <AssetUploadField
              name="site.theme.default.fullscreenBg.dark"
              assetPath="themes/fuwari/fullscreen-bg-dark.webp"
              accept=".png,.webp,.jpg,.jpeg"
              label="暗色模式背景图"
              hint="建议宽高比 16:9 以上"
              placeholder="/images/asset/themes/fuwari/fullscreen-bg-dark.webp"
              error={errors.site?.theme?.default?.fullscreenBg?.dark?.message}
            />
          </>
        )}
      </div>
    </>
  );
}