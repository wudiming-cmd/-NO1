import { useNavigate } from "react-router";
import { Film, Wand2, Sparkles, ArrowRight, Zap, Layers, Image, Type, Video, Scissors } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const WORKSPACES = [
  {
    id: "video",
    icon: Film,
    iconGradient: "linear-gradient(135deg, #4F6EF7 0%, #764BA2 100%)",
    accentColor: "#4F6EF7",
    accentSecond: "#764BA2",
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
    stat: { value: "6", label: "功能模块" },
  },
  {
    id: "image",
    icon: Wand2,
    iconGradient: "linear-gradient(135deg, #A855F7 0%, #EC4899 100%)",
    accentColor: "#A855F7",
    accentSecond: "#EC4899",
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
    stat: { value: "AI", label: "智能驱动" },
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);

    // Animated particle orbs on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const orbs = [
      { x: 0.15, y: 0.2, r: 220, color: "rgba(102,126,234,0.13)", vx: 0.0003, vy: 0.0002 },
      { x: 0.85, y: 0.75, r: 260, color: "rgba(168,85,247,0.10)", vx: -0.0002, vy: -0.0003 },
      { x: 0.7, y: 0.15, r: 180, color: "rgba(118,75,162,0.09)", vx: -0.0003, vy: 0.0004 },
      { x: 0.2, y: 0.8, r: 150, color: "rgba(79,110,247,0.08)", vx: 0.0004, vy: -0.0002 },
    ];

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;
      orbs.forEach((orb) => {
        const x = (orb.x + Math.sin(t * orb.vx * 100) * 0.06) * canvas.width;
        const y = (orb.y + Math.cos(t * orb.vy * 100) * 0.06) * canvas.height;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, orb.r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #ECEFFE 0%, #F3EFFE 40%, #EEF1FB 100%)", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Animated background canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />

      {/* Mesh grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(102,126,234,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(102,126,234,0.04) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        zIndex: 1,
      }} />

      {/* Content */}
      <div className="relative flex flex-col items-center w-full px-6" style={{ zIndex: 2 }}>

        {/* Logo badge */}
        <div
          className="flex items-center gap-2.5 px-4 py-2 rounded-full mb-10"
          style={{
            background: "rgba(255,255,255,0.8)",
            border: "1px solid rgba(102,126,234,0.2)",
            boxShadow: "0 2px 16px rgba(102,126,234,0.12)",
            backdropFilter: "blur(12px)",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-12px)",
            transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#667EEA,#764BA2)" }}>
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-[13px] font-bold" style={{ color: "#12152A" }}>AI Studio</span>
          <span className="text-[11px] text-muted-foreground">· 投放素材平台</span>
        </div>

        {/* Headline */}
        <div
          className="text-center mb-14"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.08s",
          }}
        >
          <h1
            className="font-black tracking-tight mb-3 leading-none"
            style={{
              fontSize: "clamp(38px, 6vw, 56px)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: "linear-gradient(135deg, #12152A 0%, #4F6EF7 50%, #764BA2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            投放素材平台
          </h1>
          <p className="text-[15px]" style={{ color: "#8C90AB" }}>
            选择工作区，开始高效创作
          </p>
        </div>

        {/* Cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full"
          style={{
            maxWidth: 760,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(24px)",
            transition: "all 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.16s",
          }}
        >
          {WORKSPACES.map((ws, i) => {
            const Icon = ws.icon;
            const isHovered = hovered === ws.id;
            return (
              <button
                key={ws.id}
                onClick={() => navigate(ws.path)}
                onMouseEnter={() => setHovered(ws.id)}
                onMouseLeave={() => setHovered(null)}
                className="group text-left flex flex-col"
                style={{
                  borderRadius: 24,
                  padding: "28px 28px 24px",
                  background: isHovered
                    ? "rgba(255,255,255,0.98)"
                    : "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(20px)",
                  border: isHovered
                    ? `1.5px solid ${ws.accentColor}35`
                    : "1.5px solid rgba(255,255,255,0.9)",
                  boxShadow: isHovered
                    ? `0 0 0 4px ${ws.accentColor}10, 0 8px 40px ${ws.accentColor}22, 0 2px 8px rgba(18,21,42,0.06)`
                    : "0 2px 16px rgba(18,21,42,0.06), 0 1px 4px rgba(18,21,42,0.04)",
                  transform: isHovered ? "translateY(-4px) scale(1.005)" : "translateY(0) scale(1)",
                  transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  opacity: mounted ? 1 : 0,
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                {/* Card top row */}
                <div className="flex items-start justify-between mb-5">
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: ws.iconGradient,
                      boxShadow: isHovered
                        ? `0 8px 24px ${ws.accentColor}45`
                        : `0 4px 12px ${ws.accentColor}30`,
                      transform: isHovered ? "scale(1.06) rotate(-3deg)" : "scale(1) rotate(0deg)",
                      transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                  >
                    <Icon size={24} className="text-white" />
                  </div>

                  {/* Stat badge */}
                  <div className="flex flex-col items-end">
                    <span className="text-[26px] font-black leading-none"
                      style={{ color: ws.accentColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {ws.stat.value}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: ws.accentColor + "88" }}>
                      {ws.stat.label}
                    </span>
                  </div>
                </div>

                {/* Title & subtitle */}
                <h2 className="text-[20px] font-bold mb-1 leading-tight"
                  style={{ color: "#12152A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {ws.title}
                </h2>
                <p className="text-[13px] mb-5" style={{ color: "#8C90AB" }}>{ws.subtitle}</p>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {ws.features.map((f) => {
                    const FIcon = f.icon;
                    return (
                      <span key={f.label}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{
                          background: ws.accentColor + "10",
                          color: ws.accentColor,
                          border: `1px solid ${ws.accentColor}20`,
                        }}>
                        <FIcon size={10} />
                        {f.label}
                      </span>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="mt-auto pt-4" style={{ borderTop: `1px solid ${ws.accentColor}12` }}>
                  {/* CTA */}
                  <div
                    className="flex items-center gap-2 text-[13px] font-bold"
                    style={{ color: ws.accentColor }}
                  >
                    <span>进入工作区</span>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: ws.iconGradient,
                        transform: isHovered ? "translateX(4px)" : "translateX(0)",
                        transition: "transform 0.25s ease",
                        boxShadow: `0 2px 8px ${ws.accentColor}40`,
                      }}
                    >
                      <ArrowRight size={12} className="text-white" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="mt-12 flex items-center gap-3"
          style={{
            opacity: mounted ? 0.45 : 0,
            transition: "opacity 1s ease 0.4s",
          }}
        >
          <div className="h-px w-12" style={{ background: "linear-gradient(90deg, transparent, #8C90AB)" }} />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#8C90AB" }}>
            Select Your Workspace
          </p>
          <div className="h-px w-12" style={{ background: "linear-gradient(90deg, #8C90AB, transparent)" }} />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
