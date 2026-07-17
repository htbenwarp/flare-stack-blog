// src/features/config/components/glass-settings-section.tsx

import { useFormContext, useController } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { m } from "@/paraglide/messages";

export function GlassSettingsSection() {
  const { control } = useFormContext();

  const { field: enabledField } = useController({
    name: "site.theme.default.glass.enabled",
    control,
    defaultValue: true,
  });

  const { field: opacityField } = useController({
    name: "site.theme.default.glass.opacity",
    control,
    defaultValue: 0.85,
  });

  const enabled = enabledField.value;
  const opacity = opacityField.value;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-bold fuwari-text-90">{m.settings_glass_title()}</h3>
        <p className="text-xs text-muted-foreground">{m.settings_glass_desc()}</p>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="glass-enabled" className="text-sm font-medium">
          {m.settings_glass_enabled()}
        </Label>
        <Switch
          id="glass-enabled"
          checked={enabled}
          onCheckedChange={enabledField.onChange}
        />
      </div>

      {enabled && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">{m.settings_glass_opacity()}</Label>
              <span className="text-xs font-mono text-muted-foreground">{Math.round(opacity * 100)}%</span>
            </div>
            <Slider
              value={[opacity]}
              min={0.3}
              max={1}
              step={0.05}
              onValueChange={([val]) => opacityField.onChange(val)}
            />
          </div>

          {/* 预览卡片 */}
          <div className="mt-4 p-4 rounded-xl border border-border/30 bg-muted/10">
            <p className="text-xs font-mono text-muted-foreground mb-3">{m.settings_glass_preview()}</p>
            <div
              className="p-6 rounded-2xl transition-all duration-300 fuwari-card-base"
              style={{
                backgroundColor: `oklch(0.95 0.01 var(--fuwari-hue) / ${opacity})`,
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-(--fuwari-primary)/20 flex items-center justify-center text-(--fuwari-primary) font-bold text-sm">A</div>
                <div>
                  <p className="font-bold fuwari-text-90">{m.settings_glass_preview_card()}</p>
                  <p className="text-xs text-muted-foreground">不透明度 {Math.round(opacity * 100)}%</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}