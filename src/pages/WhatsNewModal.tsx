import { useState, useEffect, useRef } from "react";
import {
  X, Zap, Film, Wand2, Layers, Image, Type, Video,
  Scissors, Sparkles, Cpu, Download, Palette, Search,
  RotateCcw, Move, Check,
} from "lucide-react";

const VIDEO_UPDATES = [
  { icon: Layers,    color: "#4F6EF7", title: "AI 比例智能重构",   desc: "一键将任意横版视频转为 9:16 / 1:1，模糊背景填充、镜像填充、纯色三种模式，批量处理无需等待" },
  { icon: Zap,       color: "#A855F7", title: "广告变体批量生成",  desc: "Hook × 正文 × CTA 三段组合爆炸式生成，支持 UGC 口播插槽，最多 1×3×3 = 9 个变体一次输出" },
  { icon: Video,     color: "#EC4899", title: "虚拟演员口播",      desc: "6 位虚拟形象 Aria/Marcus/Luna 等，输入脚本即生成口播视频，自动叠加字幕，可合成 PiP/分屏" },
  { icon: Image,     color: "#F59E0B", title: "封面图工厂",        desc: "从视频均匀提取 4–30 帧封面，跳过片头尾 5%，A/B 测试封面 CTR，批量一键下载选中帧" },
  { icon: Scissors,  color: "#10B981", title: "长视频精华提取",    desc: "AI 关键词标注定位精彩片段，一次提取多段短视频，支持同时输出精华合集" },
  { icon: Type,      color: "#06B6D4", title: "Whisper 自动字幕",  desc: "OpenAI Whisper 语音识别，支持中英混语，默认/描边/居中/TikTok 四种字幕样式烧录" },
  { icon: Cpu,       color: "#8B5CF6", title: "竞品 Logo 智能遮挡", desc: "在视频预览上框选区域，一键应用马赛克、模糊、纯色三种遮挡类型，批量全部应用" },
  { icon: Sparkles,  color: "#F97316", title: "数据产出大屏",      desc: "统计每位优化师产出视频数，实时操作记录、14 天柱状图、模块分布热力图，炫酷暗黑风格" },
];

const IMAGE_UPDATES = [
  { icon: Palette,   color: "#667EEA", title: "模块自由编辑",      desc: "点击任意模块修改背景色、渐变、圆角、图标颜色，支持多选批量修改配色方案" },
  { icon: Image,     color: "#A855F7", title: "批量图片填充",      desc: "一次选多张图片，按画布顺序自动填入图上图叠加层，完美呈现角色卡片效果" },
  { icon: Sparkles,  color: "#E85D04", title: "即梦 AI 生图",      desc: "输入描述词 AI 生成背景填入模块，上传参考图识别风格后可一键填充全部模块" },
  { icon: Layers,    color: "#EC4899", title: "图上图叠加合成",    desc: "为模块添加人物/IP 叠加层，支持位置大小调整，AI 一键抠图去除白底保留主体" },
  { icon: Zap,       color: "#F59E0B", title: "批量 AI 图标生成",  desc: "为 12 个模块逐一填写描述，一键全部生成 AI 图标并自动填充到画布对应位置" },
  { icon: Search,    color: "#10B981", title: "CC 图片资源搜索",   desc: "搜索 Openverse 海量 CC 授权图片，点击即可添加到模块背景或叠加层直接使用" },
  { icon: RotateCcw, color: "#64748B", title: "无限撤销 / 重做",   desc: "所有操作均支持撤销重做，Ctrl+Z/Y 快捷键随时回退，历史记录完整保存" },
  { icon: Download,  color: "#34D399", title: "4× 高清导出",       desc: "四倍分辨率导出为 PNG，导出记录自动保存，随时预览历史版本，支持视频序列导出" },
];

const TABS = [
  { id: "video", label: "视频批量剪辑", icon: Film, gradient: "linear-gradient(135deg,#4F6EF7,#764BA2)", color: "#4F6EF7", items: VIDEO_UPDATES },
  { id: "image", label: "AI 图片编辑",  icon: Wand2, gradient: "linear-gradient(135deg,#A855F7,#EC4899)", color: "#A855F7", items: IMAGE_UPDATES },
];

interface Props { onClose: () => void }

export default function WhatsNewModal({ onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [visible, setVisible] = useState(false);
  const [itemsVisible, setItemsVisible] = useState(false);
  const borderRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30);
    const t2 = setTimeout(() => setItemsVisible(true), 250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Switching tabs resets item animation
  const switchTab = (i: number) => {
    setItemsVisible(false);
    setTab(i);
    setTimeout(() => setItemsVisible(true), 80);
  };

  // Spinning gradient border on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let angle = 0;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext("2d")!;
    const R = 24;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const g = ctx.createConicGradient(angle, cx, cy);
      g.addColorStop(0,    "rgba(79,110,247,0.8)");
      g.addColorStop(0.25, "rgba(168,85,247,0.9)");
      g.addColorStop(0.5,  "rgba(236,72,153,0.8)");
      g.addColorStop(0.75, "rgba(79,110,247,0.6)");
      g.addColorStop(1,    "rgba(79,110,247,0.8)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(1, 1, W - 2, H - 2, R);
      ctx.stroke();
      angle += 0.012;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const currentTab = TABS[tab];

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      {/* Modal container with canvas border */}
      <div style={{
        position: "relative",
        width: "100%", maxWidth: 760,
        transform: visible ? "scale(1) translateY(0)" : "scale(0.94) translateY(20px)",
        transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Spinning border canvas */}
        <canvas ref={canvasRef} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          pointerEvents: "none", borderRadius: 24, zIndex: 2,
        }} />

        {/* Outer glow */}
        <div style={{
          position: "absolute", inset: -20, borderRadius: 40,
          background: `radial-gradient(ellipse at 30% 40%, ${currentTab.color}20, transparent 60%), radial-gradient(ellipse at 70% 60%, #EC4899 18, transparent 60%)`,
          filter: "blur(20px)",
          transition: "background 0.5s ease",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        {/* Modal body */}
        <div style={{
          position: "relative", zIndex: 1,
          background: "linear-gradient(160deg, rgba(10,11,20,0.98) 0%, rgba(8,9,18,0.99) 100%)",
          borderRadius: 24,
          overflow: "hidden",
          maxHeight: "88vh",
          display: "flex", flexDirection: "column",
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: "26px 28px 20px",
            background: "linear-gradient(135deg, rgba(79,110,247,0.12) 0%, rgba(168,85,247,0.08) 50%, rgba(236,72,153,0.06) 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            position: "relative", overflow: "hidden",
          }}>
            {/* Background beam */}
            <div style={{
              position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
              width: 300, height: 160,
              background: "radial-gradient(ellipse, rgba(168,85,247,0.25) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
              <div style={{ flex: 1 }}>
                {/* NEW badge */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 800,
                    letterSpacing: "0.12em", color: "#fff",
                    background: "linear-gradient(135deg, #4F6EF7, #A855F7)",
                    boxShadow: "0 2px 12px rgba(168,85,247,0.5)",
                  }}>✦ NEW</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>v2.0 · 2026</span>
                  <span style={{
                    padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                    background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                    color: "#22C55E",
                  }}>● 已上线</span>
                </div>

                {/* Title */}
                <h2 style={{
                  fontSize: 26, fontWeight: 900, margin: "0 0 6px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background: "linear-gradient(135deg, #fff 0%, #C4C9FF 50%, #B57BFF 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                }}>平台重磅升级，双工作区全新上线</h2>

                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6 }}>
                  视频批量剪辑 + AI 图片编辑，两大工作区现已合并到统一平台，共 16 项核心功能
                </p>
              </div>

              {/* Close button */}
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: 10, border: "none",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, marginLeft: 16,
                transition: "all 0.2s ease",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex", gap: 6, marginTop: 18,
              background: "rgba(255,255,255,0.04)",
              padding: 4, borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              alignSelf: "flex-start",
            }}>
              {TABS.map((t, i) => {
                const TIcon = t.icon;
                const on = tab === i;
                return (
                  <button key={t.id} onClick={() => switchTab(i)} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "7px 16px", borderRadius: 9, border: "none",
                    background: on ? t.gradient : "transparent",
                    color: on ? "#fff" : "rgba(255,255,255,0.4)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    transition: "all 0.25s ease",
                    boxShadow: on ? `0 2px 12px ${t.color}50` : "none",
                  }}>
                    <TIcon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Feature grid ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {currentTab.items.map((f, i) => {
                const FIcon = f.icon;
                return (
                  <div
                    key={f.title}
                    style={{
                      padding: "14px 16px",
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 14,
                      display: "flex", gap: 12, alignItems: "flex-start",
                      transition: "all 0.2s ease",
                      opacity: itemsVisible ? 1 : 0,
                      transform: itemsVisible ? "translateY(0)" : "translateY(10px)",
                      transitionDelay: `${i * 0.04}s`,
                      cursor: "default",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = `${f.color}0f`;
                      el.style.borderColor = `${f.color}35`;
                      el.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(255,255,255,0.025)";
                      el.style.borderColor = "rgba(255,255,255,0.06)";
                      el.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                      background: `${f.color}15`,
                      border: `1px solid ${f.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 2px 8px ${f.color}20`,
                    }}>
                      <FIcon size={16} color={f.color} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{f.title}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                          background: `${f.color}20`, color: f.color, letterSpacing: "0.05em",
                        }}>NEW</span>
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: "14px 24px 20px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            background: "rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", align: "center", gap: 8 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                background: "linear-gradient(135deg,#22C55E,#16A34A)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Check size={11} color="white" />
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0, lineHeight: 1.6 }}>
                所有功能已上线 · 后端由 Render 托管 · 前端由 Vercel 全球加速
              </p>
            </div>

            <button
              onClick={onClose}
              style={{
                padding: "10px 28px",
                background: "linear-gradient(135deg, #4F6EF7, #A855F7)",
                border: "none", borderRadius: 12,
                color: "#fff", fontSize: 13, fontWeight: 800,
                cursor: "pointer", flexShrink: 0, letterSpacing: "0.02em",
                boxShadow: "0 4px 20px rgba(79,110,247,0.45), 0 0 0 0 rgba(79,110,247,0)",
                transition: "all 0.2s ease",
                position: "relative", overflow: "hidden",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(-1px) scale(1.02)";
                el.style.boxShadow = "0 8px 32px rgba(79,110,247,0.55)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(0) scale(1)";
                el.style.boxShadow = "0 4px 20px rgba(79,110,247,0.45)";
              }}
            >
              开始体验 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
