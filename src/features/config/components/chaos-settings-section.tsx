// src/features/config/components/chaos-settings-section.tsx

import { useFormContext, useController } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";

export function ChaosSettingsSection() {
  const { control } = useFormContext();

  const { field: enabledField } = useController({
    name: "site.theme.default.chaos.enabled",
    control,
    defaultValue: false,
  });

  const { field: particleCountField } = useController({
    name: "site.theme.default.chaos.particleCount",
    control,
    defaultValue: 80,
  });

  const { field: speedField } = useController({
    name: "site.theme.default.chaos.speed",
    control,
    defaultValue: 0.8,
  });

  const { field: colorField } = useController({
    name: "site.theme.default.chaos.color",
    control,
    defaultValue: "#ff6b6b",
  });

  const { field: showTrailsField } = useController({
    name: "site.theme.default.chaos.showTrails",
    control,
    defaultValue: true,
  });

  const { field: trailLengthField } = useController({
    name: "site.theme.default.chaos.trailLength",
    control,
    defaultValue: 30,
  });

  const { field: lineOpacityField } = useController({
    name: "site.theme.default.chaos.lineOpacity",
    control,
    defaultValue: 0.3,
  });

  const enabled = enabledField.value ?? false;
  const particleCount = particleCountField.value ?? 80;
  const speed = speedField.value ?? 0.8;
  const color = colorField.value ?? "#ff6b6b";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-bold fuwari-text-90">{m.settings_chaos_title()}</h3>
        <p className="text-xs text-muted-foreground">{m.settings_chaos_desc()}</p>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="chaos-enabled" className="text-sm font-medium">
          {m.settings_chaos_enabled()}
        </Label>
        <Switch
          id="chaos-enabled"
          checked={enabled}
          onCheckedChange={enabledField.onChange}
        />
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">{m.settings_chaos_particle_count()}</Label>
                <span className="text-xs font-mono text-muted-foreground">{particleCount}</span>
              </div>
              <Slider
                value={[particleCount]}
                min={10}
                max={300}
                step={5}
                onValueChange={([val]) => particleCountField.onChange(val)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">{m.settings_chaos_speed()}</Label>
                <span className="text-xs font-mono text-muted-foreground">{speed.toFixed(1)}</span>
              </div>
              <Slider
                value={[speed]}
                min={0.1}
                max={3}
                step={0.1}
                onValueChange={([val]) => speedField.onChange(val)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{m.settings_chaos_color()}</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => colorField.onChange(e.target.value)}
                  className="w-12 h-12 p-1 rounded border border-border"
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => colorField.onChange(e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">{m.settings_chaos_trail_length()}</Label>
                <span className="text-xs font-mono text-muted-foreground">{trailLength}</span>
              </div>
              <Slider
                value={[trailLength]}
                min={5}
                max={100}
                step={5}
                onValueChange={([val]) => trailLengthField.onChange(val)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{m.settings_chaos_show_trails()}</Label>
              <Switch
                checked={showTrails}
                onCheckedChange={showTrailsField.onChange}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">{m.settings_chaos_line_opacity()}</Label>
                <span className="text-xs font-mono text-muted-foreground">{lineOpacity.toFixed(2)}</span>
              </div>
              <Slider
                value={[lineOpacity]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([val]) => lineOpacityField.onChange(val)}
              />
            </div>
          </div>

          {/* ✅ 后台预览：纯 CSS 显示，不加载 Three.js */}
          <div className="mt-4 rounded-xl border border-border/30 bg-background/50 p-6 min-h-[120px] flex flex-col items-center justify-center">
            <div 
              className="w-full h-16 rounded-lg relative overflow-hidden"
              style={{
                background: `radial-gradient(circle at 30% 50%, ${color}22 0%, transparent 70%)`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-xs text-muted-foreground">
                  🎯 {particleCount} 粒子 · {speed.toFixed(1)}x 速度
                </div>
              </div>
              <div 
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse"
                style={{ background: color }}
              />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground mt-2">
              前台页面将显示完整 Three.js 粒子动画
            </p>
          </div>
        </>
      )}
    </div>
  );
}