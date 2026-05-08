import { useNavigate } from "react-router";
import { Film, Wand2, Sparkles, ArrowRight, Zap, Layers, Image, Type, Video, Scissors, Bell } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import WhatsNewModal from "./WhatsNewModal";

const WORKSPACES = [
  {
    id: "video",
    icon: Film,
    gradient: "linear-gradient(135deg, #4F6EF7, #764BA2)",
    color1: "#4F6EF7",
    color2: "#764BA2",
    title: "视频批量剪辑",
    subtitle: "灵活批量生产短视频素材",
    features: [
      { icon: Layers, label: "AI 比例重构" },
      { icon: Zap, label: "广告变体生成" },
      { icon: Video, label: "虚拟口播" },
      { icon: Image, label: "封面图工厂" },
      { icon: Scissors, label: "精华提取" },
      { icon: Type, label: "自动字幕" },
    ],
    path: "/video",
    badge: "6 功能",
  },
  {
    id: "image",
    icon: Wand2,
    gradient: "linear-gradient(135deg, #A855F7, #EC4899)",
    color1: "#A855F7",
    color2: "#EC4899",
    title: "AI 图片编辑",
    subtitle: "智能化全自动图片编辑",
    features: [
      { icon: Image, label: "背景替换" },
      { icon: Layers, label: "模块合成" },
      { icon: Sparkles, label: "AI 生图" },
      { icon: Zap, label: "批量导出" },
      { icon: Type, label: "样式编辑" },
      { icon: Video, label: "视频导出" },
    ],
    path: "/image",
    badge: "AI 驱动",
  },
];

function Card3D({ ws, onEnter }: { ws: typeof WORKSPACES[0]; onEnter: () => void }) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);
  const rafRef = useRef<number>(0);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      setTilt({ rx: (y - 0.5) * -14, ry: (x - 0.5) * 14 });
      setGlow({ x: x * 100, y: y * 100 });
    });
  }, []);

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setTilt({ rx: 0, ry: 0 });
    setGlow({ x: 50, y: 50 });
    setHovered(false);
  }, []);

  const Icon = ws.icon;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseEnter={() => { setHovered(true); onEnter(); }}
      onMouseLeave={handleLeave}
      onClick={() => navigate(ws.path)}
      style={{
        perspective: "1000px",
        cursor: "pointer",
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Animated gradient border wrapper */}
      <div
        className="card-border-anim"
        style={{
          borderRadius: 24,
          padding: 1.5,
          background: hovered
            ? `linear-gradient(135deg, ${ws.color1}80, ${ws.color2}80, ${ws.color1}60)`
            : "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
          transition: "background 0.4s ease",
          boxShadow: hovered
            ? `0 0 40px ${ws.color1}30, 0 0 80px ${ws.color2}15, 0 20px 60px rgba(0,0,0,0.5)`
            : "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            borderRadius: 22.5,
            padding: "28px 28px 26px",
            background: "linear-gradient(145deg, rgba(15,16,30,0.95), rgba(10,11,20,0.98))",
            backdropFilter: "blur(20px)",
            transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${hovered ? 8 : 0}px)`,
            transition: hovered ? "transform 0.1s ease-out" : "transform 0.4s ease",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Mouse-follow inner glow */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${ws.color1}18 0%, transparent 60%)`,
            pointerEvents: "none",
            transition: hovered ? "none" : "opacity 0.4s ease",
            opacity: hovered ? 1 : 0,
            borderRadius: 22.5,
          }} />

          {/* Noise texture */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 22.5, opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "200px",
            pointerEvents: "none",
          }} />

          {/* Top row: icon + badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            {/* Icon with holo shimmer */}
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: ws.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: hovered ? `0 8px 32px ${ws.color1}60` : `0 4px 16px ${ws.color1}30`,
              transform: hovered ? "scale(1.08) rotate(-4deg)" : "scale(1)",
              transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
              position: "relative", overflow: "hidden",
              flexShrink: 0,
            }}>
              <Icon size={22} color="white" />
              {/* shimmer sweep */}
              {hovered && <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
                animation: "shimmer 0.6s ease forwards",
              }} />}
            </div>

            {/* Badge */}
            <div style={{
              padding: "4px 10px", borderRadius: 99,
              background: `${ws.color1}15`,
              border: `1px solid ${ws.color1}30`,
              fontSize: 11, fontWeight: 700, color: ws.color1,
              letterSpacing: "0.04em",
              transform: hovered ? "scale(1.05)" : "scale(1)",
              transition: "transform 0.2s ease",
            }}>
              {ws.badge}
            </div>
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 21, fontWeight: 800,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: "#fff",
            marginBottom: 4, lineHeight: 1.2,
          }}>{ws.title}</h2>

          {/* Subtitle */}
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>{ws.subtitle}</p>

          {/* Feature pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
            {ws.features.map((f) => {
              const FIcon = f.icon;
              return (
                <span key={f.label} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "5px 10px", borderRadius: 99,
                  background: `${ws.color1}12`,
                  border: `1px solid ${ws.color1}22`,
                  fontSize: 11, fontWeight: 600,
                  color: hovered ? ws.color1 : "rgba(255,255,255,0.5)",
                  transition: "color 0.3s ease, border-color 0.3s ease",
                }}>
                  <FIcon size={9} />
                  {f.label}
                </span>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{
            marginTop: "auto",
            height: 1,
            background: hovered
              ? `linear-gradient(90deg, ${ws.color1}60, ${ws.color2}60)`
              : "rgba(255,255,255,0.06)",
            marginBottom: 18,
            transition: "background 0.4s ease",
          }} />

          {/* CTA row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              background: hovered ? ws.gradient : "none",
              WebkitBackgroundClip: hovered ? "text" : "unset",
              WebkitTextFillColor: hovered ? "transparent" : "rgba(255,255,255,0.5)",
              transition: "all 0.3s ease",
            }}>
              进入工作区
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: hovered ? ws.gradient : "rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: hovered ? "translateX(4px) scale(1.12)" : "translateX(0) scale(1)",
              transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow: hovered ? `0 4px 16px ${ws.color1}50` : "none",
            }}>
              <ArrowRight size={14} color="white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Meteor type
type Meteor = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; len: number; w: number; hue: number };

function spawnMeteor(W: number, H: number): Meteor {
  // Spawn from top or right edge
  const fromTop = Math.random() > 0.4;
  const x = fromTop ? Math.random() * W * 1.2 : W + 50;
  const y = fromTop ? -20 : Math.random() * H * 0.4;
  const angle = (215 + Math.random() * 25) * Math.PI / 180; // mostly down-left
  const speed = 12 + Math.random() * 10;
  const len = 140 + Math.random() * 160;
  const hue = Math.random() > 0.5 ? 240 : 280; // blue or purple
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 55 + Math.random() * 25, len, w: 2.5 + Math.random() * 2, hue };
}

export default function Landing() {
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: -999, y: -999 }); // px coords
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    const seen = sessionStorage.getItem("wn_seen");
    if (!seen) {
      setTimeout(() => setShowModal(true), 600);
      sessionStorage.setItem("wn_seen", "1");
    }
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    // ── Cursor glow: direct DOM for zero-lag ──────────────────────────────────
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX + "px";
        cursorRef.current.style.top  = e.clientY + "px";
        cursorRef.current.style.opacity = "1";
      }
      if (cursorDotRef.current) {
        cursorDotRef.current.style.left = e.clientX + "px";
        cursorDotRef.current.style.top  = e.clientY + "px";
      }
    };
    const onLeave = () => { if (cursorRef.current) cursorRef.current.style.opacity = "0"; };
    window.addEventListener("mousemove", onMouse);
    document.addEventListener("mouseleave", onLeave);

    // ── Stars ─────────────────────────────────────────────────────────────────
    const stars = Array.from({ length: 100 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.4 + 0.2,
      alpha: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.0004 + 0.0001,
      phase: Math.random() * Math.PI * 2,
    }));

    // ── Background orbs ───────────────────────────────────────────────────────
    const orbs = [
      { x: 0.1,  y: 0.25, r: 380, c: [79, 110, 247],  speed: 0.15 },
      { x: 0.88, y: 0.7,  r: 420, c: [168, 85, 247],  speed: 0.12 },
      { x: 0.6,  y: 0.1,  r: 280, c: [118, 75, 162],  speed: 0.18 },
      { x: 0.25, y: 0.85, r: 240, c: [236, 72, 153],  speed: 0.10 },
    ];

    // ── Meteors ───────────────────────────────────────────────────────────────
    const meteors: Meteor[] = [];
    let lastMeteor = 0;
    const METEOR_INTERVAL = 90; // frames between spawns (~1.5s at 60fps)

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      const W = canvas.width, H = canvas.height;

      // Orbs
      orbs.forEach((orb, i) => {
        const t = frame * orb.speed * 0.005;
        const mx = ((mouseRef.current.x / W) - 0.5) * 0.04;
        const my = ((mouseRef.current.y / H) - 0.5) * 0.04;
        const ox = (orb.x + Math.sin(t + i) * 0.08 + mx) * W;
        const oy = (orb.y + Math.cos(t * 0.7 + i) * 0.06 + my) * H;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.r);
        const [r, c2, b] = orb.c;
        g.addColorStop(0,   `rgba(${r},${c2},${b},0.2)`);
        g.addColorStop(0.5, `rgba(${r},${c2},${b},0.06)`);
        g.addColorStop(1,   "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Stars
      stars.forEach((s) => {
        const t2 = frame * s.speed;
        const alpha = s.alpha * (0.5 + 0.5 * Math.sin(t2 * 10 + s.phase));
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Spawn meteors
      if (frame - lastMeteor > METEOR_INTERVAL) {
        meteors.push(spawnMeteor(W, H));
        if (Math.random() > 0.6) meteors.push(spawnMeteor(W, H)); // occasional double
        lastMeteor = frame;
      }

      // Draw & update meteors
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx; m.y += m.vy; m.life++;
        const progress = m.life / m.maxLife;
        const alpha = progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85;
        if (alpha <= 0 || m.life >= m.maxLife) { meteors.splice(i, 1); continue; }

        // Trail: gradient line
        const tailX = m.x - m.vx / Math.hypot(m.vx, m.vy) * m.len;
        const tailY = m.y - m.vy / Math.hypot(m.vx, m.vy) * m.len;
        const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        grad.addColorStop(0, `hsla(${m.hue},100%,90%,0)`);
        grad.addColorStop(0.7, `hsla(${m.hue},80%,80%,${alpha * 0.3})`);
        grad.addColorStop(1,   `hsla(${m.hue},60%,100%,${alpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = m.w;
        ctx.lineCap = "round";
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${m.hue},100%,80%,0.8)`;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();

        // Bright head glow
        const headG = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 10);
        headG.addColorStop(0, `rgba(255,255,255,${alpha * 0.95})`);
        headG.addColorStop(0.4, `hsla(${m.hue},100%,90%,${alpha * 0.5})`);
        headG.addColorStop(1, "transparent");
        ctx.fillStyle = headG;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
      }

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const anim = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s cubic-bezier(0.34,1.56,0.64,1) ${delay}s`,
  });

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #07080F 0%, #0B0C18 40%, #0E0B1A 100%)",
      fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden",
      padding: "40px 24px",
      cursor: "none",
    }}>
      {/* Animated canvas bg */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }} />

      {/* ── Cursor: outer glow ── */}
      <div ref={cursorRef} style={{
        position: "fixed", pointerEvents: "none", zIndex: 9999,
        width: 360, height: 360,
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(79,110,247,0.10) 35%, transparent 70%)",
        borderRadius: "50%",
        opacity: 0,
        transition: "opacity 0.3s ease",
        mixBlendMode: "screen",
      }} />
      {/* ── Cursor: sharp dot ── */}
      <div ref={cursorDotRef} style={{
        position: "fixed", pointerEvents: "none", zIndex: 10000,
        width: 10, height: 10,
        transform: "translate(-50%,-50%)",
        background: "white",
        borderRadius: "50%",
        boxShadow: "0 0 0 2px rgba(139,92,246,0.6), 0 0 16px rgba(139,92,246,0.9), 0 0 32px rgba(79,110,247,0.5)",
      }} />

      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 800, display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Badge row */}
        <div style={{ ...anim(0), display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          {/* Logo pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px 6px 8px", borderRadius: 99,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 10,
              background: "linear-gradient(135deg,#667EEA,#764BA2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(102,126,234,0.5)",
            }}>
              <Sparkles size={13} color="white" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>AI Studio</span>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>投放素材平台</span>
          </div>

          {/* What's New button */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px 6px 8px", borderRadius: 99, border: "none",
              background: "linear-gradient(135deg, rgba(79,110,247,0.2), rgba(168,85,247,0.2))",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#C4B5FD", fontSize: 12, fontWeight: 700,
              cursor: "pointer", backdropFilter: "blur(12px)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "linear-gradient(135deg, rgba(79,110,247,0.35), rgba(168,85,247,0.35))";
              el.style.transform = "scale(1.04)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "linear-gradient(135deg, rgba(79,110,247,0.2), rgba(168,85,247,0.2))";
              el.style.transform = "scale(1)";
            }}
          >
            <Bell size={12} />
            ✦ v2.0 新功能
          </button>
        </div>

        {/* Headline */}
        <div style={{ ...anim(0.1), textAlign: "center", marginBottom: 56 }}>
          <h1 style={{
            fontSize: "clamp(42px, 7vw, 64px)", fontWeight: 900,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            lineHeight: 1.1, marginBottom: 14,
            background: "linear-gradient(135deg, #fff 0%, #C4C9FF 40%, #B57BFF 70%, #FF6EC7 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 40px rgba(168,85,247,0.3))",
          }}>
            投放素材平台
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", letterSpacing: "0.02em" }}>
            选择工作区，开始高效创作
          </p>
        </div>

        {/* Cards */}
        <div style={{
          ...anim(0.2),
          display: "flex", gap: 20, width: "100%",
          flexDirection: "row",
        }}>
          {WORKSPACES.map((ws) => (
            <Card3D key={ws.id} ws={ws} onEnter={() => {}} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ ...anim(0.35), marginTop: 48, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ height: 1, width: 40, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15))" }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
            Select Your Workspace
          </span>
          <div style={{ height: 1, width: 40, background: "linear-gradient(90deg, rgba(255,255,255,0.15), transparent)" }} />
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        * { cursor: none !important; }
      `}</style>

      {/* What's New Modal */}
      {showModal && <WhatsNewModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
