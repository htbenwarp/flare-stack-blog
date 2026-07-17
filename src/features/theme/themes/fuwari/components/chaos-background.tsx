import { useRouteContext } from "@tanstack/react-router";
import Antigravity from "./antigravity";

// 根据主色生成渐变色数组
function generateColorPalette(hex: string, count: number = 3): string[] {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  
  const hsl = { h: h * 360, s: s * 100, l: l * 100 };
  
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const variation = i / (count - 1);
    const lightness = Math.min(90, hsl.l + 20 - variation * 30);
    const saturation = Math.min(100, hsl.s + 10 - variation * 15);
    colors.push(`hsl(${hsl.h}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
}

export function ChaosBackground({ children }: { children: React.ReactNode }) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const chaos = siteConfig?.theme?.default?.chaos;

  const enabled = chaos?.enabled ?? false;
  const particleCount = chaos?.particleCount ?? 80;
  const speed = chaos?.speed ?? 0.8;
  const color = chaos?.color ?? "#ff6b6b";
  const darkColor = chaos?.darkColor ?? "#38bdf8";
  const particleSize = chaos?.particleSize ?? 1.8;
  const ringRadius = chaos?.ringRadius ?? 10;
  const magnetRadius = chaos?.magnetRadius ?? 10;

  if (!enabled) return <>{children}</>;

  const lightColors = generateColorPalette(color, 3);
  const darkColors = generateColorPalette(darkColor, 3);

  const mappedLerpSpeed = speed * 0.04;

  return (
    <>
      <Antigravity
        count={particleCount}
        waveSpeed={speed * 0.5}
        lerpSpeed={mappedLerpSpeed}
        colors={lightColors}
        darkColors={darkColors}
        particleSize={particleSize}
        ringRadius={ringRadius}
        magnetRadius={magnetRadius}
        particleShape="capsule"
      />
      {children}
    </>
  );
}