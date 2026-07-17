/* eslint-disable react/no-unknown-property */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const defaultColorsDark = ["#38bdf8", "#22d3ee", "#ffffff"];
const defaultColorsLight = ["#0284c7", "#0369a1", "#505050"];

interface AntigravityInnerProps {
  count?: number;
  magnetRadius?: number;
  ringRadius?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  particleSize?: number;
  lerpSpeed?: number;
  autoAnimate?: boolean;
  particleVariance?: number;
  rotationSpeed?: number;
  depthFactor?: number;
  pulseSpeed?: number;
  particleShape?: "capsule" | "sphere" | "box" | "tetrahedron";
  fieldStrength?: number;
  isDarkMode?: boolean;
  colors?: string[];
  isPreview?: boolean;
  containerWidth?: number;
  containerHeight?: number;
  previewMousePos?: { x: number; y: number };
}

const AntigravityInner = ({
  count = 280,
  magnetRadius = 10,
  ringRadius = 10,
  waveSpeed = 0.4,
  waveAmplitude = 1,
  particleSize = 1.8,
  lerpSpeed = 0.1,
  autoAnimate = false,
  particleVariance = 1,
  rotationSpeed = 0,
  depthFactor = 1,
  pulseSpeed = 3,
  particleShape = "capsule",
  fieldStrength = 10,
  isDarkMode = false,
  colors,
  isPreview = false,
  containerWidth,
  containerHeight,
  previewMousePos = { x: 0.5, y: 0.5 },
}: AntigravityInnerProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => new Float32Array(count * 3), [count]);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastMouseMoveTime = useRef(0);
  const virtualMouse = useRef({ x: 0, y: 0 });

  const palette = colors || (isDarkMode ? defaultColorsDark : defaultColorsLight);

  const particles = useMemo(() => {
    const temp = [];
    const width = viewport.width || 100;
    const height = viewport.height || 100;
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * 20;
      const randomRadiusOffset = (Math.random() - 0.5) * 2;

      const colorHex = palette[Math.floor(Math.random() * palette.length)];
      tempColor.set(colorHex);
      tempColor.toArray(colorArray, i * 3);

      temp.push({
        t,
        speed,
        mx: x,
        my: y,
        mz: z,
        cx: x,
        cy: y,
        cz: z,
        randomRadiusOffset,
      });
    }
    return temp;
  }, [count, viewport.width, viewport.height, palette]);

  // 非预览模式下的窗口鼠标追踪
  useEffect(() => {
    if (isPreview) return;

    const handleMove = (x: number, y: number) => {
      const nx = (x / window.innerWidth) * 2 - 1;
      const ny = -(y / window.innerHeight) * 2 + 1;
      lastMouseMoveTime.current = Date.now();
      lastMousePos.current = { x: nx, y: ny };
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchMove);
    };
  }, [isPreview]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (mesh.geometry.attributes.color) {
      mesh.geometry.attributes.color.needsUpdate = true;
    }

    const { viewport: v } = state;

    // 使用预览容器尺寸或 viewport 尺寸
    const width = isPreview && containerWidth ? containerWidth : v.width;
    const height = isPreview && containerHeight ? containerHeight : v.height;

    let destX: number;
    let destY: number;

    if (isPreview) {
      // ✅ 预览模式：使用容器内鼠标相对坐标（0~1）
      const nx = previewMousePos.x * 2 - 1;   // -1 ~ 1
      const ny = -(previewMousePos.y * 2 - 1); // 反转 y，匹配 Three.js 坐标系
      destX = (nx * width) / 2;
      destY = (ny * height) / 2;
    } else {
      // 非预览模式：使用全局窗口坐标
      const m = lastMousePos.current;
      destX = (m.x * width) / 2;
      destY = (m.y * height) / 2;

      // 自动动画（鼠标不活动时）
      if (autoAnimate && Date.now() - lastMouseMoveTime.current > 2000) {
        const time = state.clock.getElapsedTime();
        destX = Math.sin(time * 0.5) * (width / 4);
        destY = Math.cos(time * 0.5 * 2) * (height / 4);
      }
    }

    const smoothFactor = 0.05;
    virtualMouse.current.x += (destX - virtualMouse.current.x) * smoothFactor;
    virtualMouse.current.y += (destY - virtualMouse.current.y) * smoothFactor;

    const targetX = virtualMouse.current.x;
    const targetY = virtualMouse.current.y;

    const globalRotation = state.clock.getElapsedTime() * rotationSpeed;

    particles.forEach((particle, i) => {
      let { t, speed, mx, my, mz, cz, randomRadiusOffset } = particle;

      t = particle.t += speed / 2;

      const projectionFactor = 1 - cz / 50;
      const projectedTargetX = targetX * projectionFactor;
      const projectedTargetY = targetY * projectionFactor;

      const dx = mx - projectedTargetX;
      const dy = my - projectedTargetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const targetPos = { x: mx, y: my, z: mz * depthFactor };

      if (dist < magnetRadius) {
        const angle = Math.atan2(dy, dx) + globalRotation;
        const moveDist = dist < magnetRadius * 0.6 ? magnetRadius : dist;

        if (moveDist === magnetRadius) {
          const wave = Math.sin(t * waveSpeed + angle) * (0.5 * waveAmplitude);
          const deviation = randomRadiusOffset * (5 / (fieldStrength + 0.1));
          const currentRingRadius = ringRadius + wave + deviation;

          targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
          targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
          targetPos.z =
            mz * depthFactor + Math.sin(t) * (1 * waveAmplitude * depthFactor);
        } else {
          targetPos.x =
            projectedTargetX + dist * Math.cos(angle - globalRotation);
          targetPos.y =
            projectedTargetY + dist * Math.sin(angle - globalRotation);
          targetPos.z =
            mz * depthFactor + Math.sin(t * pulseSpeed) * (0.5 * waveAmplitude);
        }
      }

      particle.cx += (targetPos.x - particle.cx) * lerpSpeed;
      particle.cy += (targetPos.y - particle.cy) * lerpSpeed;
      particle.cz += (targetPos.z - particle.cz) * lerpSpeed;

      dummy.position.set(particle.cx, particle.cy, particle.cz);

      dummy.lookAt(projectedTargetX, projectedTargetY, particle.cz);
      dummy.rotateX(Math.PI / 2);

      const currentDistToMouse = Math.sqrt(
        Math.pow(particle.cx - projectedTargetX, 2) +
          Math.pow(particle.cy - projectedTargetY, 2),
      );

      const distFromRing = Math.abs(currentDistToMouse - ringRadius);
      let scaleFactor = 1 - distFromRing / 10;
      scaleFactor = Math.max(0, Math.min(1, scaleFactor));

      const finalScale =
        scaleFactor *
        (0.8 + Math.sin(t * pulseSpeed) * 0.2 * particleVariance) *
        particleSize;
      dummy.scale.set(finalScale, finalScale, finalScale);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {particleShape === "capsule" && (
        <capsuleGeometry args={[0.1, 0.4, 4, 8]}>
          <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
        </capsuleGeometry>
      )}
      {particleShape === "sphere" && (
        <sphereGeometry args={[0.2, 16, 16]}>
          <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
        </sphereGeometry>
      )}
      {particleShape === "box" && (
        <boxGeometry args={[0.3, 0.3, 0.3]}>
          <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
        </boxGeometry>
      )}
      {particleShape === "tetrahedron" && (
        <tetrahedronGeometry args={[0.3]}>
          <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
        </tetrahedronGeometry>
      )}
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
};

const BlurFollower = () => {
  const followerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (followerRef.current) {
        const x = e.clientX - 300;
        const y = e.clientY - 300;
        followerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (followerRef.current && e.touches[0]) {
        const touch = e.touches[0];
        const x = touch.clientX - 300;
        const y = touch.clientY - 300;
        followerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchstart", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchstart", handleTouchMove);
    };
  }, []);

  return (
    <div
      ref={followerRef}
      className="blur-follower absolute top-0 left-0 w-[600px] h-[600px] rounded-full z-0 pointer-events-none"
      style={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        maskImage:
          "radial-gradient(closest-side, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 100%)",
        WebkitMaskImage:
          "radial-gradient(closest-side, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 100%)",
        willChange: "transform",
      }}
    />
  );
};

export interface AntigravityProps {
  count?: number;
  magnetRadius?: number;
  ringRadius?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  particleSize?: number;
  lerpSpeed?: number;
  autoAnimate?: boolean;
  particleVariance?: number;
  rotationSpeed?: number;
  depthFactor?: number;
  pulseSpeed?: number;
  particleShape?: "capsule" | "sphere" | "box" | "tetrahedron";
  fieldStrength?: number;
  colors?: string[];
  darkColors?: string[];
  isPreview?: boolean;
}

const Antigravity = (props: AntigravityProps) => {
  const { isPreview = false, colors, darkColors, ...rest } = props;
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [particleCount, setParticleCount] = useState(rest.count || 100);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // ✅ 预览模式下的鼠标位置（容器相对坐标 0~1）
  const [previewMousePos, setPreviewMousePos] = useState({ x: 0.5, y: 0.5 });

  // 暗色模式检测
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // 响应式粒子数量
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setParticleCount(Math.min(rest.count || 280, 100));
      } else {
        setParticleCount(rest.count || 280);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [rest.count]);

  // 预览模式下监听容器尺寸
  useEffect(() => {
    if (!isPreview || !containerRef.current) return;

    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isPreview]);

  // ✅ 预览模式下监听容器内的鼠标移动
  useEffect(() => {
    if (!isPreview || !containerRef.current) return;

    const container = containerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;   // 0 ~ 1
      const y = (e.clientY - rect.top) / rect.height;   // 0 ~ 1
      setPreviewMousePos({ x, y });
    };

    const handleMouseLeave = () => {
      // 鼠标离开预览区域时回到中心
      setPreviewMousePos({ x: 0.5, y: 0.5 });
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isPreview]);

  const activeColors = isDarkMode
    ? (darkColors || ["#38bdf8", "#22d3ee", "#ffffff"])
    : (colors || ["#0284c7", "#0369a1", "#505050"]);

  const containerClassName = isPreview
    ? "w-full h-full relative z-10"
    : "fixed inset-0 z-0 overflow-hidden pointer-events-none";

  return (
    <div ref={containerRef} className={containerClassName}>
      <div className="w-full h-full">
        <Canvas camera={{ position: [0, 0, 50], fov: 35 }}>
          <AntigravityInner
            {...rest}
            count={particleCount}
            isDarkMode={isDarkMode}
            colors={activeColors}
            isPreview={isPreview}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            previewMousePos={previewMousePos}
          />
        </Canvas>
      </div>
      {!isPreview && <BlurFollower />}
      {!isPreview && (
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-20"
          style={{
            backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')`,
          }}
        />
      )}
    </div>
  );
};

export default Antigravity;