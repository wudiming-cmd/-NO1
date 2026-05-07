import { useNavigate } from "react-router";
import { Film, Wand2, Sparkles, ArrowRight } from "lucide-react";

const WORKSPACES = [
  {
    id: "video",
    icon: Film,
    iconBg: "linear-gradient(135deg, #4F6EF7 0%, #764BA2 100%)",
    title: "视频批量剪辑",
    subtitle: "灵活批量生产短视频素材",
    desc: "AI 比例重构 · 广告变体生成 · 虚拟口播 · 封面图工厂",
    path: "/video",
    color: "#4F6EF7",
    glowColor: "rgba(79,110,247,0.18)",
  },
  {
    id: "image",
    icon: Wand2,
    iconBg: "linear-gradient(135deg, #A855F7 0%, #EC4899 100%)",
    title: "AI 图片编辑",
    subtitle: "智能化全自动图片编辑",
    desc: "背景替换 · 模块合成 · AI 生图 · 批量导出",
    path: "/image",
    color: "#A855F7",
    glowColor: "rgba(168,85,247,0.18)",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #EEF1FB 0%, #F5F0FF 50%, #EEF1FB 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #667EEA, #764BA2)", boxShadow: "0 4px 20px rgba(102,126,234,0.4)" }}
        >
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[18px] font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            AI Studio
          </p>
          <p className="text-[11px] text-muted-foreground -mt-0.5">投放素材平台</p>
        </div>
      </div>

      {/* Headline */}
      <div className="text-center mb-12">
        <h1
          className="text-[36px] font-bold text-foreground tracking-tight mb-2"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          投放素材平台
        </h1>
        <p className="text-[15px] text-muted-foreground">选择您的工作区开始创作</p>
      </div>

      {/* Workspace cards */}
      <div className="flex flex-col sm:flex-row gap-5 px-6 w-full max-w-2xl">
        {WORKSPACES.map((ws) => {
          const Icon = ws.icon;
          return (
            <button
              key={ws.id}
              onClick={() => navigate(ws.path)}
              className="flex-1 group text-left rounded-3xl p-7 transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "#ffffff",
                border: "1.5px solid rgba(18,21,42,0.08)",
                boxShadow: "0 2px 8px rgba(18,21,42,0.06), 0 8px 32px rgba(18,21,42,0.04)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${ws.glowColor}, 0 16px 48px ${ws.glowColor}`;
                (e.currentTarget as HTMLElement).style.borderColor = ws.color + "40";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(18,21,42,0.06), 0 8px 32px rgba(18,21,42,0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(18,21,42,0.08)";
              }}
            >
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: ws.iconBg, boxShadow: `0 4px 16px ${ws.glowColor}` }}
              >
                <Icon size={24} className="text-white" />
              </div>

              {/* Text */}
              <h2
                className="text-[18px] font-bold mb-1"
                style={{ color: "#12152A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {ws.title}
              </h2>
              <p className="text-[13px] text-muted-foreground mb-4">{ws.subtitle}</p>

              {/* Feature tags */}
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-5">{ws.desc}</p>

              {/* CTA */}
              <div
                className="flex items-center gap-1.5 text-[13px] font-semibold transition-all duration-150 group-hover:gap-2.5"
                style={{ color: ws.color }}
              >
                进入工作区
                <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer tag */}
      <p className="mt-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">
        Select Your Workspace
      </p>
    </div>
  );
}
