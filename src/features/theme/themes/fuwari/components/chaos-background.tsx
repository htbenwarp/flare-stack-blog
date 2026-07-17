import { useRouteContext } from "@tanstack/react-router";
import Antigravity from "./antigravity";

export function ChaosBackground({ children }: { children: React.ReactNode }) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const chaos = siteConfig?.theme?.default?.chaos;

  const enabled = chaos?.enabled ?? false;
  const particleCount = chaos?.particleCount ?? 80;
  const speed = chaos?.speed ?? 0.8;
  const color = chaos?.color ?? "#0284c7";
  const darkColor = chaos?.darkColor ?? "#38bdf8";
  const particleSize = chaos?.particleSize ?? 1.8;
  const ringRadius = chaos?.ringRadius ?? 10;
  const magnetRadius = chaos?.magnetRadius ?? 10;

  if (!enabled) return <>{children}</>;

  return (
    <>
      <Antigravity
        count={particleCount}
        waveSpeed={speed * 0.5}
        colors={[color, "#0369a1", "#505050"]}
        darkColors={[darkColor, "#22d3ee", "#ffffff"]}
        particleSize={particleSize}
        ringRadius={ringRadius}
        magnetRadius={magnetRadius}
        particleShape="capsule"
      />
      {children}
    </>
  );
}