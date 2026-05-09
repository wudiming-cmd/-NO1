import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Layers, Film, Zap, Scissors, User, Upload,
  Play, Download, RefreshCw, CheckCircle, AlertCircle, X,
  Plus, Minus, ChevronDown, Clock, Video, Sparkles,
  Image, Type, Shield, BarChart2, TrendingUp, MessageSquare,
} from "lucide-react";

const API = "https://no1-22o9.onrender.com";

type FeatureId = "F01" | "F02" | "F03" | "F04" | "F05" | "F06";
type ProcessState = "idle" | "processing" | "done" | "error";

// ── 全局操作员（自动附带到所有 API 请求）──────────────────────────────────────
let _operator: string = localStorage.getItem("ai_operator") || "";
const getOperator = () => _operator;
const setOperatorGlobal = (v: string) => {
  _operator = v; localStorage.setItem("ai_operator", v);
};

// 通用 SSE 流式请求：POST FormData，解析 text/event-stream 进度
// 自动附带操作员字段用于统计
async function streamSSE(
  url: string,
  body: FormData,
  onProgress: (pct: number, stage: string) => void,
  onDone: (data: Record<string, unknown>) => void,
  onError: (msg: string) => void
) {
  body.set("operator", getOperator() || "匿名");
  try {
    const resp = await fetch(url, { method: "POST", body });
    if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const d = JSON.parse(line.slice(6));
          if (d.error) { onError(d.error); return; }
          if (d.done) { onDone(d); return; }
          onProgress(d.pct ?? 0, d.stage ?? "");
        } catch { /* ignore parse errors */ }
      }
    }
  } catch (err) {
    onError((err as Error).message);
  }
}

// 触发浏览器下载后端文件
function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = `${API}/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  a.download = filename;
  a.click();
}

// ─── 区域遮挡 ─────────────────────────────────────────────────────────────────

type BlurRegion = { id: string; x: number; y: number; w: number; h: number; type: "mosaic" | "blur" | "solid" };
const mkRegion = (x: number, y: number, w: number, h: number, type: BlurRegion["type"]): BlurRegion =>
  ({ id: Math.random().toString(36).slice(2), x, y, w, h, type });

const REGION_STYLES: Record<BlurRegion["type"], { label: string; color: string; dash: string }> = {
  mosaic: { label: "马赛克", color: "#FA709A", dash: "5,3" },
  blur:   { label: "模糊",   color: "#4FACFE", dash: "8,4" },
  solid:  { label: "遮挡",   color: "#667EEA", dash: "" },
};

// 视频内容区域计算（考虑 letterbox）
function getVideoContentArea(v: HTMLVideoElement) {
  if (!v.videoWidth) return null;
  const vAsp = v.videoWidth / v.videoHeight;
  const cW = v.clientWidth, cH = v.clientHeight;
  if (vAsp > cW / cH) return { x: 0, y: (cH - cW / vAsp) / 2, w: cW, h: cW / vAsp };
  return { x: (cW - cH * vAsp) / 2, y: 0, w: cH * vAsp, h: cH };
}

function RegionDrawer({ videoRef, regions, onAdd, onRemove, drawType, active }: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  regions: BlurRegion[];
  onAdd: (r: BlurRegion) => void;
  onRemove: (id: string) => void;
  drawType: BlurRegion["type"];
  active: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const startPt = useRef<{ px: number; py: number } | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [ca, setCa] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const update = () => { const v = videoRef.current; if (v) setCa(getVideoContentArea(v)); };
    const v = videoRef.current;
    if (!v) return;
    v.addEventListener("loadedmetadata", update);
    const ro = new ResizeObserver(update);
    ro.observe(v); update();
    return () => { v.removeEventListener("loadedmetadata", update); ro.disconnect(); };
  }, [videoRef]);

  const toPct = (clientX: number, clientY: number) => {
    const overlay = overlayRef.current; if (!overlay || !ca) return null;
    const r = overlay.getBoundingClientRect();
    return { px: (clientX - r.left - ca.x) / ca.w, py: (clientY - r.top - ca.y) / ca.h };
  };

  const onDown = (e: React.MouseEvent) => {
    if (!active) return;
    e.preventDefault();
    const pt = toPct(e.clientX, e.clientY); if (!pt) return;
    startPt.current = pt;
    setDraft({ x: pt.px, y: pt.py, w: 0, h: 0 });
  };
  const onMove = (e: React.MouseEvent) => {
    if (!startPt.current || !active) return;
    const pt = toPct(e.clientX, e.clientY); if (!pt) return;
    setDraft({
      x: Math.max(0, Math.min(startPt.current.px, pt.px)),
      y: Math.max(0, Math.min(startPt.current.py, pt.py)),
      w: Math.min(1, Math.abs(pt.px - startPt.current.px)),
      h: Math.min(1, Math.abs(pt.py - startPt.current.py)),
    });
  };
  const onUp = () => {
    if (draft && draft.w > 0.02 && draft.h > 0.02) onAdd(mkRegion(draft.x, draft.y, draft.w, draft.h, drawType));
    startPt.current = null; setDraft(null);
  };

  if (!ca) return null;

  const toScreen = (x: number, y: number, w: number, h: number) => ({
    left: ca.x + x * ca.w, top: ca.y + y * ca.h,
    width: w * ca.w, height: h * ca.h,
  });

  return (
    <div ref={overlayRef}
      className="absolute inset-0"
      style={{
        cursor: active ? "crosshair" : "default",
        // when not drawing, let clicks pass through to video controls
        pointerEvents: active ? "auto" : "none",
      }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}>
      {/* 已标记区域 */}
      {regions.map(r => {
        const s = toScreen(r.x, r.y, r.w, r.h);
        const st = REGION_STYLES[r.type];
        return (
          <div key={r.id} className="absolute" style={{ ...s, border: `2px dashed ${st.color}`, background: st.color + "22", borderRadius: 2, pointerEvents: "auto" }}>
            <div className="absolute -top-5 left-0 flex items-center gap-1">
              <span className="text-[9px] font-bold px-1 py-0.5 rounded text-white"
                style={{ background: st.color }}>{st.label}</span>
              <button onClick={(e) => { e.stopPropagation(); onRemove(r.id); }}
                className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: "#EF4444" }}>×</button>
            </div>
          </div>
        );
      })}
      {/* 正在绘制中的草稿框 */}
      {draft && draft.w > 0.01 && (() => {
        const s = toScreen(draft.x, draft.y, draft.w, draft.h);
        const st = REGION_STYLES[drawType];
        return <div className="absolute pointer-events-none" style={{ ...s, border: `2px dashed ${st.color}`, background: st.color + "18", borderRadius: 2 }} />;
      })()}
    </div>
  );
}

// ─── 输出效果实时预览（双层视频：模糊背景 + 适配前景）────────────────────────

function OutputPreview({ src, ratio, fill, color }: {
  src: string; ratio: string; fill: string; color: string;
}) {
  const asp = ratio.replace(":", " / ");
  const isPortrait = ratio === "9:16" || ratio === "4:5";
  const containerStyle: React.CSSProperties = isPortrait
    ? { maxHeight: 220, aspectRatio: asp, margin: "0 auto" }
    : { width: "100%", aspectRatio: asp, maxHeight: 180 };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-2xl overflow-hidden"
        style={{ background: "#000", border: `1.5px solid ${color}30`, boxShadow: `0 4px 20px ${color}18`, ...containerStyle }}>
        {/* 背景层 */}
        {fill === "solid"
          ? <div className="absolute inset-0" style={{ background: "#111" }} />
          : <video src={src} muted autoPlay loop playsInline
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: "cover", filter: "blur(10px)", transform: fill === "mirror" ? "scale(-1.08,1.08)" : "scale(1.08)" }} />
        }
        {/* 前景层 */}
        <video src={src} muted autoPlay loop playsInline
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "contain" }} />
        {/* 比例标签 */}
        <div className="absolute bottom-2 right-2 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>{ratio}</div>
        {/* 填充方式 */}
        <div className="absolute top-2 left-2 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-lg"
          style={{ background: `${color}90`, backdropFilter: "blur(4px)" }}>
          {fill === "blur" ? "模糊填充" : fill === "mirror" ? "镜像填充" : "纯色填充"}
        </div>
      </div>
    </div>
  );
}

// ─── 片段配置（剪辑 + 变速）────────────────────────────────────────────────────

type ClipConfig = { startTime: number; endTime: number | null; speed: number };
const mkClipConfig = (): ClipConfig => ({ startTime: 0, endTime: null, speed: 1 });

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 可视化时间轴裁剪条：拖拽手柄 + 视频帧缩略图 + 点击跳帧
function ClipEditorPanel({
  videoRef, duration, color, config, onChange,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  duration: number;
  color: string;
  config: ClipConfig;
  onChange: (c: ClipConfig) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"start" | "end" | null>(null);
  const configRef = useRef(config);
  configRef.current = config;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [currentTime, setCurrentTime] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // 监听播放进度
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const h = () => setCurrentTime(v.currentTime);
    v.addEventListener("timeupdate", h);
    return () => v.removeEventListener("timeupdate", h);
  }, [videoRef]);

  // 生成帧缩略图（单独 video 元素，逐帧 seek）
  useEffect(() => {
    if (duration <= 0) return;
    const v = videoRef.current; if (!v?.src) return;
    const NUM = 10;
    const canvas = document.createElement("canvas");
    canvas.width = 80; canvas.height = 45;
    const ctx = canvas.getContext("2d")!;
    const frames: string[] = [];
    const tmp = document.createElement("video");
    tmp.src = v.src; tmp.muted = true; tmp.preload = "auto";
    let i = 0;
    const next = () => { if (i < NUM) tmp.currentTime = (i / (NUM - 1)) * duration; };
    tmp.onseeked = () => {
      ctx.drawImage(tmp, 0, 0, 80, 45);
      frames[i] = canvas.toDataURL("image/jpeg", 0.5);
      i++;
      if (i >= NUM) { setThumbnails([...frames]); tmp.src = ""; }
      else next();
    };
    tmp.onloadeddata = next;
    return () => { tmp.src = ""; };
  }, [duration, videoRef]);

  // 全局拖拽监听
  useEffect(() => {
    const getT = (e: MouseEvent) => {
      const r = barRef.current?.getBoundingClientRect(); if (!r) return 0;
      return Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration));
    };
    const onMove = (e: MouseEvent) => {
      const d = draggingRef.current; if (!d) return;
      const t = getT(e); const c = configRef.current; const v = videoRef.current;
      if (d === "start") {
        const s = Math.max(0, Math.min(t, (c.endTime ?? duration) - 0.5));
        onChangeRef.current({ ...c, startTime: s });
        if (v) v.currentTime = s;
      } else {
        const e2 = Math.min(duration, Math.max(t, c.startTime + 0.5));
        onChangeRef.current({ ...c, endTime: e2 });
        if (v) v.currentTime = e2;
      }
    };
    const onUp = () => { draggingRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [duration, videoRef]);

  const end = config.endTime ?? duration;
  const sp = duration > 0 ? (config.startTime / duration) * 100 : 0;
  const ep = duration > 0 ? (end / duration) * 100 : 100;
  const pp = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const onBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingRef.current) return;
    const r = barRef.current?.getBoundingClientRect(); if (!r || !videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration));
  };

  const Handle = ({ pct, side }: { pct: number; side: "start" | "end" }) => (
    <div
      className="absolute inset-y-0 z-20 flex items-center justify-center cursor-ew-resize"
      style={{ left: `${pct}%`, width: 20, transform: "translateX(-50%)" }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); draggingRef.current = side; }}
    >
      <div className="h-full w-4 flex items-center justify-center"
        style={{
          background: color,
          borderRadius: side === "start" ? "6px 0 0 6px" : "0 6px 6px 0",
          boxShadow: `0 2px 8px ${color}80`,
        }}>
        <div className="flex flex-col gap-[3px]">
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 2, height: 7, borderRadius: 1, background: "rgba(255,255,255,0.8)" }} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2 select-none">
      {/* 时间轴裁剪条 */}
      <div ref={barRef} onClick={onBarClick}
        className="relative rounded-xl overflow-hidden cursor-pointer"
        style={{ height: 52, background: "#111" }}>

        {/* 视频帧缩略图背景 */}
        <div className="absolute inset-0 flex">
          {thumbnails.length > 0
            ? thumbnails.map((src, i) => (
                <div key={i} className="flex-1 h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${src})` }} />
              ))
            : <div className="absolute inset-0"
                style={{ background: `repeating-linear-gradient(90deg, ${color}18 0px, ${color}08 8px, ${color}18 16px)` }} />
          }
        </div>

        {/* 选区之外变暗 */}
        <div className="absolute inset-y-0 left-0 pointer-events-none"
          style={{ width: `${sp}%`, background: "rgba(0,0,0,0.65)" }} />
        <div className="absolute inset-y-0 right-0 pointer-events-none"
          style={{ width: `${100 - ep}%`, background: "rgba(0,0,0,0.65)" }} />

        {/* 选区上下边框 */}
        <div className="absolute pointer-events-none"
          style={{
            left: `${sp}%`, width: `${ep - sp}%`,
            top: 0, bottom: 0,
            borderTop: `2.5px solid ${color}`,
            borderBottom: `2.5px solid ${color}`,
          }} />

        {/* 拖拽手柄 */}
        <Handle pct={sp} side="start" />
        <Handle pct={ep} side="end" />

        {/* 播放进度指示线 */}
        <div className="absolute inset-y-0 pointer-events-none z-30"
          style={{ left: `${pp}%`, width: 2, background: "white", boxShadow: "0 0 6px rgba(0,0,0,0.9)", transform: "translateX(-50%)" }} />
      </div>

      {/* 时间信息 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono font-bold" style={{ color }}>{fmtTime(config.startTime)}</span>
        <span className="text-[10px] text-muted-foreground font-mono">
          已选 {(end - config.startTime).toFixed(1)}s / 共 {fmtTime(duration)}
        </span>
        <span className="text-[11px] font-mono font-bold" style={{ color }}>{fmtTime(end)}</span>
      </div>

      {/* 变速 */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground flex-shrink-0">速度</span>
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => onChange({ ...config, speed: s })}
              className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: config.speed === s ? color : "rgba(18,21,42,0.06)",
                color: config.speed === s ? "#fff" : "#5A5F7A",
              }}>{s}x</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Module config ────────────────────────────────────────────────────────────

const MODULES = [
  {
    id: "F01" as FeatureId,
    label: "AI Reframe",
    sub: "智能比例重构",
    priority: "P0",
    icon: <Layers size={16} strokeWidth={1.8} />,
    gradient: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
    color: "#667EEA",
  },
  {
    id: "F02" as FeatureId,
    label: "Ad Combos",
    sub: "广告变体批量生成",
    priority: "P0",
    icon: <Film size={16} strokeWidth={1.8} />,
    gradient: "linear-gradient(135deg, #F093FB 0%, #F5576C 100%)",
    color: "#F093FB",
  },
  {
    id: "F03" as FeatureId,
    label: "Hook Gen",
    sub: "AI 钩子视频生成",
    priority: "P1",
    icon: <Zap size={16} strokeWidth={1.8} />,
    gradient: "linear-gradient(135deg, #4FACFE 0%, #00C6FF 100%)",
    color: "#4FACFE",
  },
  {
    id: "F04" as FeatureId,
    label: "Highlights",
    sub: "长视频精华提取",
    priority: "P1",
    icon: <Scissors size={16} strokeWidth={1.8} />,
    gradient: "linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)",
    color: "#38C172",
  },
  {
    id: "F05" as FeatureId,
    label: "Text to UGC",
    sub: "AI 虚拟演员口播",
    priority: "P1",
    icon: <User size={16} strokeWidth={1.8} />,
    gradient: "linear-gradient(135deg, #FA709A 0%, #FEE140 100%)",
    color: "#FA709A",
  },
  {
    id: "F06" as FeatureId,
    label: "封面图工厂",
    sub: "帧提取 · 批量封面图",
    priority: "P0",
    icon: <Image size={16} strokeWidth={1.8} />,
    gradient: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
    color: "#F59E0B",
  },
] as const;

// ─── Primitives ───────────────────────────────────────────────────────────────

function ModuleIcon({ gradient, icon, size = 36 }: { gradient: string; icon: React.ReactNode; size?: number }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 text-white"
      style={{
        width: size, height: size,
        borderRadius: size * 0.28,
        background: gradient,
        boxShadow: `0 4px 12px rgba(0,0,0,0.15)`,
      }}
    >
      {icon}
    </div>
  );
}

function Card({ children, className = "", padding = "p-6" }: {
  children: React.ReactNode; className?: string; padding?: string;
}) {
  return (
    <div
      className={`bg-card rounded-2xl ${padding} ${className}`}
      style={{ boxShadow: "0 1px 2px rgba(18,21,42,0.04), 0 4px 20px rgba(18,21,42,0.06)" }}
    >
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-muted-foreground mb-2.5 tracking-widest uppercase">
      {children}
    </p>
  );
}

function SectionBox({ title, children, color }: {
  title?: string; children: React.ReactNode; color?: string;
}) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-4"
      style={{ background: "#F8FAFF", border: "1.5px solid rgba(18,21,42,0.07)" }}>
      {title && (
        <div className="flex items-center gap-2 -mb-1">
          {color && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: color ?? "#8C90AB" }}>{title}</p>
        </div>
      )}
      {children}
    </div>
  );
}

function StyledInput({
  value, onChange, placeholder, multiline = false, rows = 3, onFocus, onBlur,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  multiline?: boolean; rows?: number; onFocus?: () => void; onBlur?: () => void;
}) {
  const cls = "w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none transition-all duration-150";
  const style = {
    background: "#F4F6FD",
    border: "1.5px solid rgba(18,21,42,0.08)",
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.6,
  };
  const focusStyle = { borderColor: "#4F6EF7", background: "#fff" };

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cls + " resize-none"}
        style={style}
        onFocus={(e) => { Object.assign(e.target.style, focusStyle); onFocus?.(); }}
        onBlur={(e) => { Object.assign(e.target.style, style); onBlur?.(); }}
      />
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cls}
      style={style}
      onFocus={(e) => { Object.assign(e.target.style, focusStyle); onFocus?.(); }}
      onBlur={(e) => { Object.assign(e.target.style, style); onBlur?.(); }}
    />
  );
}

function StyledSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-4 py-3 rounded-xl text-sm text-foreground focus:outline-none transition-all duration-150 cursor-pointer pr-9"
        style={{
          background: "#F4F6FD",
          border: "1.5px solid rgba(18,21,42,0.08)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#fff" }}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
    </div>
  );
}

function DropZone({ label, sublabel, accept, onFile, file, color, config, onConfigChange }: {
  label: string; sublabel?: string; accept: string;
  onFile: (f: File) => void; file: File | null; color: string;
  config?: ClipConfig; onConfigChange?: (c: ClipConfig) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [over, setOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!file || !file.type.startsWith("video/")) { setPreviewUrl(null); setDuration(0); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const f = e.dataTransfer.files[0]; if (f) onFile(f);
  }, [onFile]);

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className="cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-3 py-6 text-center transition-all duration-200 select-none"
        style={{
          border: `1.5px dashed ${over ? color : file ? color + "60" : "rgba(18,21,42,0.12)"}`,
          background: over ? color + "08" : file ? color + "05" : "#F8FAFF",
        }}
      >
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: file ? color + "15" : "rgba(18,21,42,0.04)" }}>
          {file ? <Video size={20} style={{ color }} /> : <Upload size={20} className="text-muted-foreground" />}
        </div>
        {file ? (
          <div>
            <p className="text-sm font-semibold" style={{ color }}>{file.name.length > 26 ? file.name.slice(0, 24) + "…" : file.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB · 点击更换</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
          </div>
        )}
      </div>

      {previewUrl && (
        <>
          <video
            ref={videoRef}
            src={previewUrl}
            controls
            className="w-full rounded-xl"
            style={{ maxHeight: 200, background: "#000", display: "block" }}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
          />
          {config && onConfigChange && duration > 0 && (
            <ClipEditorPanel videoRef={videoRef} duration={duration} color={color}
              config={config} onChange={onConfigChange} />
          )}
        </>
      )}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer" onClick={onChange}>
      <div className="relative flex-shrink-0" style={{ width: 38, height: 22 }}>
        <div className="w-full h-full rounded-full transition-colors duration-200"
          style={{ background: on ? "#4F6EF7" : "rgba(18,21,42,0.1)" }} />
        <div className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: on ? "translateX(19px)" : "translateX(3px)" }} />
      </div>
      <span className="text-sm font-medium" style={{ color: on ? "#12152A" : "#8C90AB" }}>{label}</span>
    </label>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(18,21,42,0.06)" }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function ProcessBanner({ pct, stage, color }: { pct: number; stage: string; color: string }) {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-4"
      style={{ background: color + "0d", border: `1.5px solid ${color}25` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + "18" }}>
        <RefreshCw size={16} style={{ color }} className="animate-spin" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium" style={{ color: "#12152A" }}>{stage}</span>
          <span className="text-sm font-semibold" style={{ color }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} color={color} />
      </div>
    </div>
  );
}

function PrimaryBtn({ onClick, state, color, idle, processing = "处理中…", done = "完成" }: {
  onClick: () => void; state: ProcessState; color: string;
  idle: string; processing?: string; done?: string;
}) {
  const busy = state === "processing";
  const finished = state === "done";
  const bg = finished ? "#22C55E" : state === "error" ? "#EF4444" : color;
  const label = busy ? processing : finished ? done : state === "error" ? "重试" : idle;
  const Icon = busy ? RefreshCw : finished ? CheckCircle : state === "error" ? AlertCircle : Sparkles;
  return (
    <button
      onClick={onClick} disabled={busy}
      className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: bg,
        boxShadow: busy ? "none" : `0 1px 2px rgba(0,0,0,0.1), 0 4px 12px ${bg}40`,
      }}
    >
      <Icon size={15} className={busy ? "animate-spin" : ""} />
      {label}
    </button>
  );
}

function GhostBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
      style={{
        background: "rgba(18,21,42,0.04)",
        border: "1.5px solid rgba(18,21,42,0.08)",
        color: "#5A5F7A",
      }}>
      {children}
    </button>
  );
}

function MetricsRow({ items, color }: { items: { label: string; value: string }[]; color: string }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((m) => (
        <div key={m.label} className="rounded-xl p-4"
          style={{ background: color + "08", border: `1.5px solid ${color}18` }}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{m.label}</p>
          <p className="text-xl font-semibold" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{m.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── F01 ─────────────────────────────────────────────────────────────────────

type QueueItem = {
  id: string; file: File; previewUrl: string;
  clipConfig: ClipConfig; regions: BlurRegion[]; state: ProcessState;
  pct: number; outputUrl: string | null; outputFilename: string | null;
};
const mkQueueItem = (file: File): QueueItem => ({
  id: Math.random().toString(36).slice(2), file,
  previewUrl: URL.createObjectURL(file),
  clipConfig: mkClipConfig(), regions: [], state: "idle", pct: 0,
  outputUrl: null, outputFilename: null,
});

function F01() {
  const color = "#667EEA";
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [ratio, setRatio] = useState("9:16");
  const [fill, setFill] = useState("blur");
  const [unifiedName, setUnifiedName] = useState("");
  const [outroFile, setOutroFile] = useState<File | null>(null);
  const [outroPreviewUrl, setOutroPreviewUrl] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [selDuration, setSelDuration] = useState(0);
  const [drawMode, setDrawMode] = useState(false);
  const [regionType, setRegionType] = useState<BlurRegion["type"]>("mosaic");
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkPos, setWatermarkPos] = useState<"br" | "bl" | "tr" | "tl">("br");
  const [subOn, setSubOn] = useState(false);
  const [subLang, setSubLang] = useState("zh");
  const [subStyle, setSubStyle] = useState("default");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outroInputRef = useRef<HTMLInputElement>(null);

  const sel = queue.find(v => v.id === selId) ?? null;

  const setOutro = (f: File | null) => {
    if (outroPreviewUrl) URL.revokeObjectURL(outroPreviewUrl);
    setOutroFile(f);
    setOutroPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const addFiles = (files: File[]) => {
    const items = files.filter(f => f.type.startsWith("video/")).map(mkQueueItem);
    setQueue(p => [...p, ...items]);
    if (!selId && items.length > 0) setSelId(items[0].id);
  };

  const upd = (id: string, patch: Partial<QueueItem>) =>
    setQueue(p => p.map(v => v.id === id ? { ...v, ...patch } : v));

  const processOne = (item: QueueItem): Promise<void> => {
    upd(item.id, { state: "processing", pct: 0 });
    const fd = new FormData();
    fd.append("video", item.file);
    fd.append("ratio", ratio); fd.append("fill", fill);
    fd.append("startTime", String(item.clipConfig.startTime));
    if (item.clipConfig.endTime != null) fd.append("endTime", String(item.clipConfig.endTime));
    fd.append("speed", String(item.clipConfig.speed));
    if (item.regions.length > 0) fd.append("regions", JSON.stringify(item.regions));
    if (watermarkText.trim()) { fd.append("watermarkText", watermarkText.trim()); fd.append("watermarkPos", watermarkPos); }
    fd.append("subOn", String(subOn));
    if (subOn) { fd.append("subLang", subLang); fd.append("subStyle", subStyle); }
    if (outroFile) fd.append("outro", outroFile);
    return new Promise(resolve => streamSSE(
      `${API}/api/f01/reframe`, fd,
      (p) => upd(item.id, { pct: p }),
      (data) => {
        const base = unifiedName.trim()
          ? `${unifiedName}_${item.file.name.replace(/\.[^.]+$/, "")}`
          : item.file.name.replace(/\.[^.]+$/, "");
        upd(item.id, { state: "done", pct: 100, outputUrl: data.url as string, outputFilename: `${base}_${ratio.replace(":", "x")}.mp4` });
        resolve();
      },
      () => { upd(item.id, { state: "error" }); resolve(); }
    ));
  };

  const runBatch = async () => {
    const pending = queue.filter(v => v.state === "idle" || v.state === "error");
    if (!pending.length) return;
    setBatchRunning(true);
    for (const item of pending) await processOne(item);
    setBatchRunning(false);
  };

  const doneCount = queue.filter(v => v.state === "done").length;
  const ratioDims: Record<string, { w: number; h: number }> = {
    "9:16": { w: 24, h: 43 }, "1:1": { w: 34, h: 34 }, "4:5": { w: 30, h: 37 }, "16:9": { w: 48, h: 27 },
  };
  const dim = ratioDims[ratio] ?? ratioDims["9:16"];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

        {/* 左栏：视频列表 + 预览 + 时间轴 */}
        <div className="md:col-span-3 flex flex-col gap-4">

          {/* 主预览区 */}
          {sel ? (
            <div className="flex flex-col gap-2">
              {/* 视频 + 区域遮挡绘制叠加 */}
              <div className="relative rounded-xl overflow-hidden" style={{ background: "#000" }}>
                <video ref={videoRef} src={sel.previewUrl} controls className="w-full rounded-xl"
                  style={{ maxHeight: 220, display: "block" }}
                  onLoadedMetadata={() => setSelDuration(videoRef.current?.duration ?? 0)} />
                <RegionDrawer
                  videoRef={videoRef}
                  regions={sel.regions}
                  onAdd={(r) => upd(sel.id, { regions: [...sel.regions, r] })}
                  onRemove={(id) => upd(sel.id, { regions: sel.regions.filter(r => r.id !== id) })}
                  drawType={regionType}
                  active={drawMode}
                />
              </div>

              {/* 区域遮挡工具栏 */}
              <div className="flex items-center gap-1.5 flex-wrap px-1">
                <span className="text-[10px] font-semibold text-muted-foreground mr-0.5">遮挡竞品</span>
                {/* 遮挡类型选择 */}
                {(["mosaic", "blur", "solid"] as BlurRegion["type"][]).map(t => (
                  <button key={t} onClick={() => { setRegionType(t); if (!drawMode) setDrawMode(true); }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: regionType === t && drawMode ? REGION_STYLES[t].color : "rgba(18,21,42,0.06)",
                      color: regionType === t && drawMode ? "#fff" : REGION_STYLES[t].color,
                      border: `1px solid ${REGION_STYLES[t].color}40`,
                    }}>{REGION_STYLES[t].label}</button>
                ))}
                {/* 绘制 / 停止 */}
                <button onClick={() => setDrawMode(d => !d)}
                  className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    background: drawMode ? "#EF4444" : color,
                    color: "#fff",
                    boxShadow: drawMode ? "0 2px 8px #EF444440" : `0 2px 8px ${color}40`,
                  }}>
                  {drawMode ? "✓ 完成绘制" : "✏ 绘制区域"}
                </button>
                {/* 清除全部 */}
                {sel.regions.length > 0 && (
                  <button onClick={() => upd(sel.id, { regions: [] })}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all"
                    style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid #EF444430" }}>
                    清除({sel.regions.length})
                  </button>
                )}
                {drawMode && (
                  <span className="text-[9px] text-muted-foreground ml-1">在视频上框选竞品区域</span>
                )}
              </div>

              {selDuration > 0 && (
                <ClipEditorPanel videoRef={videoRef} duration={selDuration} color={color}
                  config={sel.clipConfig}
                  onChange={(c) => upd(sel.id, { clipConfig: c })} />
              )}
            </div>
          ) : (
            <label
              className="flex flex-col items-center justify-center gap-3 py-10 rounded-2xl cursor-pointer transition-all"
              style={{ border: "1.5px dashed rgba(18,21,42,0.12)", background: "#F8FAFF" }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}>
              <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: color + "15" }}>
                <Upload size={22} style={{ color }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">拖入或点击批量上传</p>
                <p className="text-xs text-muted-foreground mt-0.5">支持多选 · MP4 / MOV · 最大 2 GB</p>
              </div>
            </label>
          )}

          {/* 视频队列 */}
          {queue.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <FieldLabel>视频队列</FieldLabel>
                <span className="text-[11px] text-muted-foreground mb-2">
                  {doneCount}/{queue.length} 完成
                </span>
              </div>
              <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
                {queue.map(item => {
                  const isSelected = item.id === selId;
                  return (
                    <div key={item.id} onClick={() => { setSelId(item.id); setSelDuration(0); }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: isSelected ? color + "10" : "#FAFBFF",
                        border: `1.5px solid ${isSelected ? color + "40" : "rgba(18,21,42,0.07)"}`,
                      }}>
                      {/* 迷你缩略图 */}
                      <video src={item.previewUrl} muted preload="metadata"
                        className="w-11 h-7 rounded object-cover flex-shrink-0"
                        style={{ background: "#000" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate"
                          style={{ color: isSelected ? color : "#12152A" }}>{item.file.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(item.file.size / 1024 / 1024).toFixed(1)} MB
                          {item.clipConfig.speed !== 1 && ` · ${item.clipConfig.speed}x`}
                          {item.clipConfig.endTime != null && ` · ${(item.clipConfig.endTime - item.clipConfig.startTime).toFixed(1)}s`}
                          {item.regions.length > 0 && ` · ${item.regions.length}处遮挡`}
                        </p>
                      </div>
                      {/* 进度 / 状态 */}
                      {item.state === "processing" && (
                        <div className="flex items-center gap-2">
                          <div className="w-14">
                            <ProgressBar pct={item.pct} color={color} />
                          </div>
                          <span className="text-[10px] font-mono" style={{ color }}>{item.pct}%</span>
                        </div>
                      )}
                      {item.state === "done" && (
                        <button onClick={(e) => { e.stopPropagation(); triggerDownload(item.outputUrl!, item.outputFilename!); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all"
                          style={{ background: "#22C55E15", color: "#22C55E", border: "1px solid #22C55E25" }}>
                          <Download size={11} />导出
                        </button>
                      )}
                      {item.state === "error" && (
                        <AlertCircle size={14} className="flex-shrink-0" style={{ color: "#EF4444" }} />
                      )}
                      {/* 删除 */}
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setQueue(p => p.filter(v => v.id !== item.id));
                        if (selId === item.id) setSelId(null);
                      }} className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 hover:bg-red-50">
                        <X size={10} className="text-muted-foreground" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {/* 添加更多 */}
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all text-muted-foreground hover:text-foreground text-[13px] font-medium"
                style={{ border: "1.5px dashed rgba(18,21,42,0.1)" }}>
                <input type="file" accept="video/*" multiple className="hidden"
                  onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
                <Plus size={13} />添加更多视频
              </label>
            </div>
          )}
        </div>

        {/* 右栏：输出参数设定 */}
        <div className="md:col-span-2 flex flex-col gap-3">

          {/* ── 输出设置 ── */}
          <SectionBox title="输出设置" color={color}>
            <div>
              <FieldLabel>目标比例</FieldLabel>
              <StyledSelect value={ratio} onChange={setRatio} options={[
                { label: "9:16  竖版（TikTok / Reels）", value: "9:16" },
                { label: "1:1   方形（Instagram Feed）", value: "1:1" },
                { label: "4:5   纵向（Instagram 广告）", value: "4:5" },
                { label: "16:9  横版（YouTube）", value: "16:9" },
              ]} />
            </div>
            <div>
              <FieldLabel>边缘填充方式</FieldLabel>
              <StyledSelect value={fill} onChange={setFill} options={[
                { label: "模糊背景填充", value: "blur" },
                { label: "镜像填充", value: "mirror" },
                { label: "纯色（黑色）填充", value: "solid" },
              ]} />
            </div>
            <div>
              <FieldLabel>统一命名前缀（可选）</FieldLabel>
              <StyledInput value={unifiedName} onChange={setUnifiedName} placeholder="留空则使用原文件名" />
            </div>
            {/* 实时效果预览 */}
            <div>
              <FieldLabel>输出效果预览</FieldLabel>
              {sel
                ? <OutputPreview src={sel.previewUrl} ratio={ratio} fill={fill} color={color} />
                : (
                  <div className="flex flex-col items-center gap-3 py-5 rounded-2xl"
                    style={{ background: "#F4F6FD", border: `1.5px dashed ${color}30` }}>
                    <div className="rounded-2xl flex items-center justify-center transition-all"
                      style={{ width: Math.min(dim.w * 4, 100), height: Math.min(dim.h * 4, 100), background: color + "15", border: `2px solid ${color}35` }}>
                      <span className="text-[12px] font-bold" style={{ color }}>{ratio}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">上传视频后查看实时效果</p>
                  </div>
                )
              }
            </div>
          </SectionBox>

          {/* ── 画面增强 ── */}
          <SectionBox title="画面增强" color={color}>
            {/* 文字水印 */}
            <div>
              <FieldLabel>文字水印（可选）</FieldLabel>
              <div className="flex flex-col gap-2">
                <StyledInput value={watermarkText} onChange={setWatermarkText}
                  placeholder="品牌名 / 口号 / 账号名" />
                {watermarkText.trim() && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {([
                      { v: "tl", label: "↖ 左上" }, { v: "tr", label: "↗ 右上" },
                      { v: "bl", label: "↙ 左下" }, { v: "br", label: "↘ 右下" },
                    ] as const).map(p => (
                      <button key={p.v} onClick={() => setWatermarkPos(p.v)}
                        className="py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                        style={{
                          background: watermarkPos === p.v ? color + "15" : "white",
                          border: `1px solid ${watermarkPos === p.v ? color + "45" : "rgba(18,21,42,0.1)"}`,
                          color: watermarkPos === p.v ? color : "#5A5F7A",
                        }}>{p.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* 自动字幕 */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <FieldLabel>自动字幕（Whisper）</FieldLabel>
                <Toggle on={subOn} onChange={() => setSubOn(p => !p)} label="" />
              </div>
              {subOn && (
                <div className="flex flex-col gap-2">
                  <StyledSelect value={subLang} onChange={setSubLang} options={SUB_LANG_OPTIONS} />
                  <div className="grid grid-cols-4 gap-1">
                    {SUB_STYLE_OPTS.map(s => (
                      <button key={s.v} onClick={() => setSubStyle(s.v)}
                        className="py-1 rounded-lg text-[10px] font-semibold transition-all"
                        style={{
                          background: subStyle === s.v ? color + "15" : "white",
                          border: `1px solid ${subStyle === s.v ? color + "45" : "rgba(18,21,42,0.1)"}`,
                          color: subStyle === s.v ? color : "#5A5F7A",
                        }}>{s.label}</button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    需配置 <code className="px-1 rounded" style={{ background: "rgba(18,21,42,0.05)" }}>OPENAI_API_KEY</code>；未配置自动降级为 Demo 字幕
                  </p>
                </div>
              )}
            </div>
          </SectionBox>

          {/* ── 片尾设置 ── */}
          <SectionBox title="片尾视频" color={color}>
            <input ref={outroInputRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => setOutro(e.target.files?.[0] ?? null)} />
            {outroFile && outroPreviewUrl ? (
              <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${color}30` }}>
                <video src={outroPreviewUrl} controls className="w-full"
                  style={{ maxHeight: 110, background: "#000", display: "block" }} />
                <div className="flex items-center justify-between px-3 py-2"
                  style={{ background: color + "08" }}>
                  <div>
                    <p className="text-[12px] font-semibold truncate max-w-[140px]" style={{ color }}>{outroFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(outroFile.size / 1024 / 1024).toFixed(1)} MB · 将拼接在每条视频末尾</p>
                  </div>
                  <button onClick={() => setOutro(null)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-50 flex-shrink-0"
                    style={{ border: "1px solid rgba(18,21,42,0.08)" }}>
                    <X size={11} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => outroInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{ border: `1.5px dashed rgba(18,21,42,0.12)`, background: "white" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: color + "12" }}>
                  <Upload size={15} style={{ color }} />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-foreground">上传片尾视频</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">自动统一比例后拼接到每条视频末尾</p>
                </div>
              </button>
            )}
          </SectionBox>

          {/* 批量操作 */}
          {queue.length > 0 && (
            <div className="rounded-xl p-3 flex flex-col gap-1.5"
              style={{ background: color + "08", border: `1.5px solid ${color}18` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color }}>批量操作</p>
              <button onClick={() => {}}
                className="text-[12px] text-left px-3 py-2 rounded-lg font-medium"
                style={{ background: "white", border: "1px solid rgba(18,21,42,0.08)", color: "#5A5F7A" }}>
                ✓ 当前比例同步应用到所有视频
              </button>
              <button
                onClick={() => setQueue(p => p.map(v => ({ ...v, clipConfig: mkClipConfig() })))}
                className="text-[12px] text-left px-3 py-2 rounded-lg font-medium transition-all hover:bg-red-50"
                style={{ background: "white", border: "1px solid rgba(18,21,42,0.08)", color: "#5A5F7A" }}>
                ↺ 重置所有视频剪辑配置
              </button>
            </div>
          )}

          {/* 完成统计 */}
          {doneCount > 0 && (
            <MetricsRow color={color} items={[
              { label: "已完成", value: `${doneCount} 条` },
              { label: "待处理", value: `${queue.filter(v => v.state === "idle").length} 条` },
              { label: "输出比例", value: ratio },
            ]} />
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-border mt-1">
        {sel && sel.state !== "processing" && (
          <GhostBtn onClick={() => processOne(sel)}>
            <Sparkles size={13} />仅导出选中
          </GhostBtn>
        )}
        {sel?.state === "done" && sel.outputUrl && (
          <GhostBtn onClick={() => triggerDownload(sel.outputUrl!, sel.outputFilename!)}>
            <Download size={13} />下载当前
          </GhostBtn>
        )}
        <button
          onClick={runBatch} disabled={batchRunning || queue.length === 0}
          className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          style={{
            background: batchRunning ? "#8A9CC4" : `linear-gradient(135deg, ${color}, #764BA2)`,
            boxShadow: batchRunning ? "none" : `0 4px 16px ${color}50`,
          }}>
          {batchRunning
            ? <><RefreshCw size={14} className="animate-spin" />批量处理中…</>
            : <><Zap size={14} />一键批量导出全部（{queue.filter(v => v.state !== "done").length} 个待处理）</>
          }
        </button>
      </div>
    </div>
  );
}

// ─── F02 ─────────────────────────────────────────────────────────────────────

// 虚拟演员列表（F02 口播 + F05 共用）
const ACTORS = [
  { id: 1, name: "Aria",   tag: "女 · 美式英语", gradient: "linear-gradient(135deg,#F472B6,#A855F7)", color: "#A855F7" },
  { id: 2, name: "Marcus", tag: "男 · 英式英语", gradient: "linear-gradient(135deg,#60A5FA,#3B82F6)", color: "#3B82F6" },
  { id: 3, name: "Luna",   tag: "女 · 普通话",   gradient: "linear-gradient(135deg,#C084FC,#8B5CF6)", color: "#8B5CF6" },
  { id: 4, name: "Devon",  tag: "男 · 美式英语", gradient: "linear-gradient(135deg,#34D399,#10B981)", color: "#10B981" },
  { id: 5, name: "Mei",    tag: "女 · 普通话",   gradient: "linear-gradient(135deg,#FB923C,#F97316)", color: "#F97316" },
  { id: 6, name: "Kai",    tag: "中性 · 英语",   gradient: "linear-gradient(135deg,#FACC15,#EAB308)", color: "#EAB308" },
];

type InputMode = "file" | "link" | "ugc";

// SubClip: a single video tile inside a slot group
type SubClip = {
  id: string; file: File | null; link: string; config: ClipConfig;
  ugcScript: string; ugcActorId: number;
};
const mkSub = (): SubClip => ({
  id: Math.random().toString(36).slice(2), file: null, link: "",
  config: mkClipConfig(), ugcScript: "", ugcActorId: 3, // 默认 Luna（中文）
});

// SlotGroup: one "HOOK 1 / 正文 1 / CTA 1" card, containing multiple sub-clips
type SlotGroup = { id: string; mode: InputMode; subs: SubClip[] };
const mkGroup = (): SlotGroup => ({
  id: Math.random().toString(36).slice(2),
  mode: "file",
  subs: [mkSub()],
});

// ── SubClipRow: one video row inside a slot card ─────────────────────────────

function SubClipRow({ sub, mode, color, onFile, onLink, onRemove, onConfig, onUgc, showRemove }: {
  sub: SubClip; mode: InputMode; color: string; showRemove: boolean;
  onFile: (f: File | null) => void;
  onLink: (v: string) => void;
  onRemove: () => void;
  onConfig: (c: ClipConfig) => void;
  onUgc?: (patch: { ugcScript?: string; ugcActorId?: number }) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVal = mode === "file" ? !!sub.file : mode === "link" ? sub.link.trim().length > 0 : sub.ugcScript.trim().length > 0;

  // ── UGC 模式 ────────────────────────────────────────────────────────────────
  if (mode === "ugc") {
    const actor = ACTORS.find(a => a.id === sub.ugcActorId) || ACTORS[2];
    const MAX_UGC = 150;
    return (
      <div className="flex flex-col gap-2 group">
        <div className="flex items-center gap-2.5">
          {/* 脚本输入区 */}
          <div className="flex-1 rounded-xl overflow-hidden"
            style={{ border: `1.5px solid ${sub.ugcScript ? color + "45" : "rgba(18,21,42,0.1)"}`, background: sub.ugcScript ? color + "06" : "white" }}>
            <textarea
              value={sub.ugcScript}
              onChange={e => onUgc?.({ ugcScript: e.target.value.slice(0, MAX_UGC) })}
              placeholder="输入口播脚本（最多 150 字）…"
              rows={2}
              className="w-full px-3 pt-2 pb-1 text-[12px] bg-transparent focus:outline-none resize-none"
              style={{ color: "#12152A", fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}
            />
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="text-[9px] text-muted-foreground">{sub.ugcScript.length}/{MAX_UGC}</span>
              {/* 演员小选择器 */}
              <div className="flex gap-1">
                {ACTORS.map(a => (
                  <button key={a.id} onClick={() => onUgc?.({ ugcActorId: a.id })}
                    title={a.name}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white transition-all"
                    style={{
                      background: a.gradient,
                      ring: sub.ugcActorId === a.id ? `2px solid ${a.color}` : "none",
                      transform: sub.ugcActorId === a.id ? "scale(1.25)" : "scale(1)",
                      boxShadow: sub.ugcActorId === a.id ? `0 0 0 2px ${a.color}` : "none",
                    }}>{a.name[0]}</button>
                ))}
              </div>
            </div>
          </div>
          {showRemove && (
            <button onClick={onRemove}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
              style={{ border: "1px solid rgba(18,21,42,0.08)" }}>
              <X size={11} className="text-muted-foreground" />
            </button>
          )}
        </div>
        {/* 当前演员提示 */}
        <div className="flex items-center gap-1.5 pl-1">
          <div className="w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center"
            style={{ background: actor.gradient }}>{actor.name[0]}</div>
          <span className="text-[10px] text-muted-foreground">{actor.name} · {actor.tag}</span>
        </div>
      </div>
    );
  }
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!sub.file) { setPreviewUrl(null); setDuration(0); return; }
    const url = URL.createObjectURL(sub.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sub.file]);

  if (mode === "file") {
    return (
      <div className="flex flex-col gap-1.5 group">
        <div className="flex items-center gap-2.5">
          <input ref={ref} type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          {/* div 代替 button，避免内嵌 button 的 DOM 违规 */}
          <div
            onClick={() => ref.current?.click()}
            className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
            style={{
              background: hasVal ? color + "10" : "white",
              border: `1.5px solid ${hasVal ? color + "45" : "rgba(18,21,42,0.1)"}`,
            }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: hasVal ? color + "20" : "rgba(18,21,42,0.05)" }}>
              <Video size={12} style={{ color: hasVal ? color : "#8C90AB" }} />
            </div>
            <div className="flex-1 min-w-0">
              {sub.file ? (
                <p className="text-[12px] font-semibold truncate" style={{ color }}>{sub.file.name}</p>
              ) : (
                <p className="text-[12px] text-muted-foreground">点击上传视频文件</p>
              )}
              {sub.file && <p className="text-[10px] text-muted-foreground">{(sub.file.size / 1024 / 1024).toFixed(1)} MB</p>}
            </div>
            {sub.file && (
              <button onClick={(e) => { e.stopPropagation(); onFile(null); }}
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 hover:bg-red-50 transition-all">
                <X size={10} className="text-muted-foreground" />
              </button>
            )}
          </div>
          {showRemove && (
            <button onClick={onRemove}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
              style={{ border: "1px solid rgba(18,21,42,0.08)" }}>
              <X size={11} className="text-muted-foreground" />
            </button>
          )}
        </div>
        {previewUrl && (
          <>
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              className="w-full rounded-lg"
              style={{ maxHeight: 140, background: "#000", display: "block" }}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
            />
            {duration > 0 && (
              <ClipEditorPanel videoRef={videoRef} duration={duration} color={color}
                config={sub.config} onChange={onConfig} />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 group">
      <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
        style={{
          background: sub.link ? color + "08" : "white",
          border: `1.5px solid ${sub.link ? color + "40" : "rgba(18,21,42,0.1)"}`,
        }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke={sub.link ? color : "#8C90AB"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <input value={sub.link} onChange={(e) => onLink(e.target.value)}
          placeholder="粘贴视频链接（TikTok / YouTube / 云存储）"
          className="flex-1 text-[12px] bg-transparent focus:outline-none"
          style={{ color: sub.link ? "#12152A" : "#8C90AB", fontFamily: "'Inter', sans-serif" }} />
        {sub.link && <button onClick={() => onLink("")}><X size={10} className="text-muted-foreground" /></button>}
      </div>
      {showRemove && (
        <button onClick={onRemove}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
          style={{ border: "1px solid rgba(18,21,42,0.08)" }}>
          <X size={11} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ── SlotCard: one HOOK / 正文 / CTA card ──────────────────────────────────────

function SlotCard({ group, index, label, showRemove, color, allowMultiSub,
  onRemoveGroup, onMode, onAddSub, onRemoveSub, onFile, onLink, onConfig, onUgc,
}: {
  group: SlotGroup; index: number; label: string; showRemove: boolean;
  color: string; allowMultiSub: boolean;
  onRemoveGroup: () => void;
  onMode: (m: InputMode) => void;
  onAddSub: () => void;
  onRemoveSub: (subId: string) => void;
  onFile: (subId: string, f: File | null) => void;
  onLink: (subId: string, v: string) => void;
  onConfig: (subId: string, c: ClipConfig) => void;
  onUgc?: (subId: string, patch: { ugcScript?: string; ugcActorId?: number }) => void;
}) {
  const hasAny = group.subs.some(s =>
    group.mode === "file" ? !!s.file
    : group.mode === "link" ? s.link.trim().length > 0
    : s.ugcScript.trim().length > 0
  );

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: `1.5px solid ${hasAny ? color + "30" : "rgba(18,21,42,0.08)"}`,
        background: hasAny ? color + "04" : "#FAFBFF",
      }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#12152A" }}>
          {label} {index + 1}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center p-0.5 rounded-lg gap-0.5"
            style={{ background: "rgba(18,21,42,0.06)" }}>
            {(["file", "link", "ugc"] as InputMode[]).map((m) => (
              <button key={m} onClick={() => onMode(m)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
                style={{
                  background: group.mode === m ? "white" : "transparent",
                  color: group.mode === m ? "#12152A" : "#8C90AB",
                  boxShadow: group.mode === m ? "0 1px 3px rgba(18,21,42,0.1)" : "none",
                }}>
                {m === "file" ? "上传" : m === "link" ? "链接" : "🤖 口播"}
              </button>
            ))}
          </div>
          {showRemove && (
            <button onClick={onRemoveGroup}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-red-50"
              style={{ border: "1px solid rgba(18,21,42,0.08)" }}>
              <X size={11} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-clip rows */}
      <div className="px-3 pb-2 flex flex-col gap-1.5">
        {group.subs.map((sub) => (
          <SubClipRow key={sub.id}
            sub={sub} mode={group.mode} color={color}
            showRemove={group.subs.length > 1}
            onFile={(f) => onFile(sub.id, f)}
            onLink={(v) => onLink(sub.id, v)}
            onRemove={() => onRemoveSub(sub.id)}
            onConfig={(c) => onConfig(sub.id, c)}
            onUgc={(patch) => onUgc?.(sub.id, patch)}
          />
        ))}
      </div>

      {/* Add sub-clip button (only for Hook and 正文, not CTA) */}
      {allowMultiSub && (
        <div className="px-3 pb-3">
          <button onClick={onAddSub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={{ color: color, background: color + "0a", border: `1px dashed ${color}40` }}>
            <Plus size={11} />添加视频拼贴
          </button>
        </div>
      )}
    </div>
  );
}

// ── SlotColumn ────────────────────────────────────────────────────────────────

function SlotColumn({ label, groups, color, max, allowMultiSub,
  onAddGroup, onRemoveGroup, onMode, onAddSub, onRemoveSub, onFile, onLink, onConfig, onUgc,
}: {
  label: string; groups: SlotGroup[]; color: string; max: number; allowMultiSub: boolean;
  onAddGroup: () => void;
  onRemoveGroup: (gid: string) => void;
  onMode: (gid: string, m: InputMode) => void;
  onAddSub: (gid: string) => void;
  onRemoveSub: (gid: string, sid: string) => void;
  onFile: (gid: string, sid: string, f: File | null) => void;
  onLink: (gid: string, sid: string, v: string) => void;
  onConfig: (gid: string, sid: string, c: ClipConfig) => void;
  onUgc?: (gid: string, sid: string, patch: { ugcScript?: string; ugcActorId?: number }) => void;
}) {
  const shortLabel = label.split(" ")[0];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-0.5">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[11px] font-semibold text-muted-foreground mb-2.5">{groups.length}/{max}</span>
      </div>
      {groups.map((g, i) => (
        <SlotCard key={g.id}
          group={g} index={i} label={shortLabel} showRemove={groups.length > 1}
          color={color} allowMultiSub={allowMultiSub}
          onRemoveGroup={() => onRemoveGroup(g.id)}
          onMode={(m) => onMode(g.id, m)}
          onAddSub={() => onAddSub(g.id)}
          onRemoveSub={(sid) => onRemoveSub(g.id, sid)}
          onFile={(sid, f) => onFile(g.id, sid, f)}
          onLink={(sid, v) => onLink(g.id, sid, v)}
          onConfig={(sid, c) => onConfig(g.id, sid, c)}
          onUgc={(sid, patch) => onUgc?.(g.id, sid, patch)}
        />
      ))}
      {groups.length < max && (
        <button onClick={onAddGroup}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground transition-all hover:text-foreground"
          style={{ border: "1.5px dashed rgba(18,21,42,0.1)" }}>
          <Plus size={13} />添加{shortLabel}
        </button>
      )}
    </div>
  );
}

function F02() {
  const color = "#F5576C";
  const [hooks, setHooks] = useState<SlotGroup[]>([mkGroup()]);
  const [bodies, setBodies] = useState<SlotGroup[]>([mkGroup()]);
  const [ctas, setCtas] = useState<SlotGroup[]>([mkGroup()]);
  const [platform, setPlatform] = useState("9:16");
  const [state, setState] = useState<ProcessState>("idle");
  const [pct, setPct] = useState(0);

  // Audio settings
  const [audioMode, setAudioMode] = useState<"original" | "replace" | "mute">("original");
  const [fadeDuration, setFadeDuration] = useState(0.1);
  const [globalAudioFile, setGlobalAudioFile] = useState<File | null>(null);
  const globalAudioRef = useRef<HTMLInputElement>(null);

  // Subtitle settings
  const [subtitleOn, setSubtitleOn] = useState(false);
  const [subtitleLang, setSubtitleLang] = useState("zh");
  const [subtitleStyle, setSubtitleStyle] = useState("bottom-white");

  // Helpers
  const updGroups = (
    set: React.Dispatch<React.SetStateAction<SlotGroup[]>>,
    gid: string,
    fn: (g: SlotGroup) => SlotGroup,
  ) => set(p => p.map(g => g.id === gid ? fn(g) : g));

  const updSub = (
    set: React.Dispatch<React.SetStateAction<SlotGroup[]>>,
    gid: string, sid: string,
    patch: Partial<SubClip>,
  ) => updGroups(set, gid, g => ({ ...g, subs: g.subs.map(s => s.id === sid ? { ...s, ...patch } : s) }));

  const combos = hooks.length * bodies.length * ctas.length;
  const [downloadUrl, setDownloadUrl] = useState<{ url: string; filename: string } | null>(null);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);

  const run = () => {
    setState("processing"); setPct(0); setDownloadUrl(null); setPreviews([]);
    const fd = new FormData();
    const hConfigs: ClipConfig[] = [];
    const bConfigs: ClipConfig[] = [];
    const cConfigs: ClipConfig[] = [];
    // UGC 脚本数组（索引与 hooks/bodies/ctas 对应，非 ugc 模式为 null）
    const hUGC: ({ script: string; actorId: number } | null)[] = [];
    const bUGC: ({ script: string; actorId: number } | null)[] = [];
    const cUGC: ({ script: string; actorId: number } | null)[] = [];

    hooks.forEach(g => {
      if (g.mode === "ugc") {
        hUGC.push(g.subs[0]?.ugcScript ? { script: g.subs[0].ugcScript, actorId: g.subs[0].ugcActorId } : null);
      } else {
        hUGC.push(null);
        const s = g.subs.find(sub => sub.file); if (s) { fd.append("hooks", s.file!); hConfigs.push(s.config); }
      }
    });
    bodies.forEach(g => {
      if (g.mode === "ugc") {
        bUGC.push(g.subs[0]?.ugcScript ? { script: g.subs[0].ugcScript, actorId: g.subs[0].ugcActorId } : null);
      } else {
        bUGC.push(null);
        const s = g.subs.find(sub => sub.file); if (s) { fd.append("bodies", s.file!); bConfigs.push(s.config); }
      }
    });
    ctas.forEach(g => {
      if (g.mode === "ugc") {
        cUGC.push(g.subs[0]?.ugcScript ? { script: g.subs[0].ugcScript, actorId: g.subs[0].ugcActorId } : null);
      } else {
        cUGC.push(null);
        const s = g.subs.find(sub => sub.file); if (s) { fd.append("ctas", s.file!); cConfigs.push(s.config); }
      }
    });

    fd.append("hConfigs", JSON.stringify(hConfigs));
    fd.append("bConfigs", JSON.stringify(bConfigs));
    fd.append("cConfigs", JSON.stringify(cConfigs));
    fd.append("hUGC", JSON.stringify(hUGC));
    fd.append("bUGC", JSON.stringify(bUGC));
    fd.append("cUGC", JSON.stringify(cUGC));
    fd.append("platform", platform);
    fd.append("fadeDuration", String(fadeDuration));
    // 字幕设置
    fd.append("subtitleOn", String(subtitleOn));
    if (subtitleOn) { fd.append("subtitleLang", subtitleLang); fd.append("subtitleStyle", subtitleStyle); }
    streamSSE(
      `${API}/api/f02/combine`, fd,
      (p) => { setPct(p); },
      (data) => {
        setState("done");
        setDownloadUrl({ url: data.url as string, filename: data.filename as string });
        setPreviews((data.previews as { url: string; name: string }[]) ?? []);
      },
      () => setState("error"),
    );
  };

  const AUDIO_MODES = [
    { value: "original", label: "各片段原音", desc: "保留每段原始音频，拼接处淡入淡出" },
    { value: "replace", label: "上传覆盖音频", desc: "用指定音频文件替换整条视频音轨" },
    { value: "mute", label: "全部静音", desc: "输出无声视频，后期自行配音" },
  ] as const;

  const SUBTITLE_STYLES = [
    { value: "bottom-white", label: "底部白字" },
    { value: "bottom-outline", label: "底部描边" },
    { value: "center-bold", label: "居中粗体" },
    { value: "tiktok", label: "TikTok 风格" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ── 片段上传 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SlotColumn
          label="Hook 片段" groups={hooks} color={color} max={3} allowMultiSub
          onAddGroup={() => setHooks(p => [...p, mkGroup()])}
          onRemoveGroup={gid => setHooks(p => p.filter(g => g.id !== gid))}
          onMode={(gid, m) => updGroups(setHooks, gid, g => ({ ...g, mode: m, subs: [mkSub()] }))}
          onAddSub={gid => updGroups(setHooks, gid, g => ({ ...g, subs: [...g.subs, mkSub()] }))}
          onRemoveSub={(gid, sid) => updGroups(setHooks, gid, g => ({ ...g, subs: g.subs.filter(s => s.id !== sid) }))}
          onFile={(gid, sid, f) => updSub(setHooks, gid, sid, { file: f })}
          onLink={(gid, sid, v) => updSub(setHooks, gid, sid, { link: v })}
          onConfig={(gid, sid, c) => updSub(setHooks, gid, sid, { config: c })}
          onUgc={(gid, sid, p) => updSub(setHooks, gid, sid, p)}
        />
        <SlotColumn
          label="正文片段" groups={bodies} color={color} max={3} allowMultiSub
          onAddGroup={() => setBodies(p => [...p, mkGroup()])}
          onRemoveGroup={gid => setBodies(p => p.filter(g => g.id !== gid))}
          onMode={(gid, m) => updGroups(setBodies, gid, g => ({ ...g, mode: m, subs: [mkSub()] }))}
          onAddSub={gid => updGroups(setBodies, gid, g => ({ ...g, subs: [...g.subs, mkSub()] }))}
          onRemoveSub={(gid, sid) => updGroups(setBodies, gid, g => ({ ...g, subs: g.subs.filter(s => s.id !== sid) }))}
          onFile={(gid, sid, f) => updSub(setBodies, gid, sid, { file: f })}
          onLink={(gid, sid, v) => updSub(setBodies, gid, sid, { link: v })}
          onUgc={(gid, sid, p) => updSub(setBodies, gid, sid, p)}
          onConfig={(gid, sid, c) => updSub(setBodies, gid, sid, { config: c })}
        />
        <SlotColumn
          label="CTA 片段" groups={ctas} color={color} max={2} allowMultiSub={false}
          onAddGroup={() => setCtas(p => [...p, mkGroup()])}
          onRemoveGroup={gid => setCtas(p => p.filter(g => g.id !== gid))}
          onMode={(gid, m) => updGroups(setCtas, gid, g => ({ ...g, mode: m, subs: [mkSub()] }))}
          onAddSub={gid => updGroups(setCtas, gid, g => ({ ...g, subs: [...g.subs, mkSub()] }))}
          onRemoveSub={(gid, sid) => updGroups(setCtas, gid, g => ({ ...g, subs: g.subs.filter(s => s.id !== sid) }))}
          onFile={(gid, sid, f) => updSub(setCtas, gid, sid, { file: f })}
          onLink={(gid, sid, v) => updSub(setCtas, gid, sid, { link: v })}
          onUgc={(gid, sid, p) => updSub(setCtas, gid, sid, p)}
          onConfig={(gid, sid, c) => updSub(setCtas, gid, sid, { config: c })}
        />
      </div>

      {/* ── 音频设置 ── */}
      <SectionBox title="音频设置" color={color}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Left: mode selector */}
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-medium text-muted-foreground">整条视频音频模式</p>
            <div className="flex flex-col gap-1.5">
              {AUDIO_MODES.map((m) => {
                const on = audioMode === m.value;
                return (
                  <button key={m.value} onClick={() => setAudioMode(m.value)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: on ? color + "10" : "white",
                      border: `1.5px solid ${on ? color + "45" : "rgba(18,21,42,0.08)"}`,
                    }}>
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ borderColor: on ? color : "rgba(18,21,42,0.2)" }}>
                      {on && <div className="w-2 h-2 rounded-full" style={{ background: color }} />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: on ? "#12152A" : "#5A5F7A" }}>{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: fade + global audio upload */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-medium text-muted-foreground">拼接处淡入淡出</p>
                <span className="text-[12px] font-bold" style={{ color }}>{fadeDuration.toFixed(1)}s</span>
              </div>
              <input type="range" min={0} max={0.5} step={0.05} value={fadeDuration}
                onChange={(e) => setFadeDuration(Number(e.target.value))}
                className="w-full" style={{ accentColor: color }} />
              <div className="flex justify-between mt-1">
                <span className="text-[11px] text-muted-foreground">0s（无渐变）</span>
                <span className="text-[11px] text-muted-foreground">0.5s</span>
              </div>
            </div>

            {/* Global audio track — shown when mode is "replace" */}
            {audioMode === "replace" && (
              <div>
                <p className="text-[12px] font-medium text-muted-foreground mb-2">覆盖音频文件</p>
                <input ref={globalAudioRef} type="file" accept="audio/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setGlobalAudioFile(f); }} />
                <button onClick={() => globalAudioRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                  style={{
                    background: globalAudioFile ? color + "08" : "white",
                    border: `1.5px dashed ${globalAudioFile ? color + "50" : "rgba(18,21,42,0.14)"}`,
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: globalAudioFile ? color + "18" : "rgba(18,21,42,0.04)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke={globalAudioFile ? color : "#8C90AB"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    {globalAudioFile ? (
                      <>
                        <p className="text-[13px] font-semibold truncate" style={{ color }}>{globalAudioFile.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {(globalAudioFile.size / 1024 / 1024).toFixed(1)} MB · 覆盖整条合成视频
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[13px] font-medium text-foreground">上传音频文件</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">MP3 / WAV · 将覆盖整条合成视频的音轨</p>
                      </>
                    )}
                  </div>
                  {globalAudioFile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setGlobalAudioFile(null); }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-red-50 transition-all"
                      style={{ border: "1px solid rgba(18,21,42,0.08)" }}>
                      <X size={11} className="text-muted-foreground" />
                    </button>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </SectionBox>

      {/* ── 字幕设置 ── */}
      <SectionBox color={color}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>字幕设置</p>
          </div>
          <Toggle on={subtitleOn} onChange={() => setSubtitleOn(p => !p)} label="启用自动字幕" />
        </div>
        {subtitleOn && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>识别语言</FieldLabel>
              <StyledSelect value={subtitleLang} onChange={setSubtitleLang} options={[
                { label: "中文（普通话）", value: "zh" },
                { label: "英语", value: "en" },
                { label: "中英双语", value: "zh-en" },
              ]} />
            </div>
            <div>
              <FieldLabel>字幕样式</FieldLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {SUBTITLE_STYLES.map((s) => {
                  const on = subtitleStyle === s.value;
                  return (
                    <button key={s.value} onClick={() => setSubtitleStyle(s.value)}
                      className="px-3 py-2 rounded-xl text-[12px] font-semibold text-left transition-all"
                      style={{
                        background: on ? color + "12" : "white",
                        border: `1.5px solid ${on ? color + "45" : "rgba(18,21,42,0.08)"}`,
                        color: on ? color : "#5A5F7A",
                      }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {!subtitleOn && (
          <p className="text-[13px] text-muted-foreground">开启后将自动识别语音并为所有变体生成字幕轨道</p>
        )}
      </SectionBox>

      {/* ── 平台 + 变体计数 ── */}
      <div className="flex items-end gap-5 flex-wrap">
        <div className="flex-1 min-w-40">
          <FieldLabel>目标平台</FieldLabel>
          <StyledSelect value={platform} onChange={setPlatform} options={[
            { label: "9:16  TikTok / Reels", value: "9:16" },
            { label: "1:1   Instagram Feed", value: "1:1" },
            { label: "16:9  YouTube", value: "16:9" },
          ]} />
        </div>
        <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
          style={{ background: color + "0d", border: `1.5px solid ${color}22` }}>
          <Sparkles size={16} style={{ color }} />
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">预计变体</p>
            <p className="text-2xl font-bold leading-none mt-0.5" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {combos}
            </p>
          </div>
          <p className="text-xs text-muted-foreground ml-1">{hooks.length}×{bodies.length}×{ctas.length}</p>
        </div>
      </div>

      {/* Combo matrix */}
      <div className="rounded-2xl p-4" style={{ background: "#F4F6FD", border: "1.5px solid rgba(18,21,42,0.07)" }}>
        <FieldLabel>组合矩阵预览</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: combos }).map((_, i) => {
            const h = Math.floor(i / (bodies.length * ctas.length));
            const b = Math.floor((i % (bodies.length * ctas.length)) / ctas.length);
            const c = i % ctas.length;
            const hSubs = hooks[h]?.subs.length ?? 1;
            const bSubs = bodies[b]?.subs.length ?? 1;
            const subLabel = (hSubs > 1 || bSubs > 1)
              ? ` (${hSubs + bSubs}段拼接)` : "";
            return (
              <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                style={{ background: color + "12", color, border: `1px solid ${color}22` }}>
                H{h+1}·B{b+1}·C{c+1}{subLabel}
              </span>
            );
          })}
        </div>
      </div>

      {state === "processing" && <ProcessBanner pct={pct} stage={`拼接并转码 ${combos} 条变体…`} color={color} />}

      <div className="flex items-center gap-3 flex-wrap">
        <PrimaryBtn onClick={run} state={state} color={color}
          idle={`生成 ${combos} 条广告变体`} processing="拼接转码中…" done={`${combos} 条已就绪`} />
        {state === "done" && downloadUrl && (
          <GhostBtn onClick={() => triggerDownload(downloadUrl.url, downloadUrl.filename)}>
            <Download size={14} />下载 ZIP
          </GhostBtn>
        )}
      </div>

      {/* 变体预览网格 */}
      {state === "done" && previews.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">变体预览</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {previews.map((p, i) => (
              <div key={p.url} className="rounded-2xl overflow-hidden"
                style={{ border: `1.5px solid ${color}25`, background: color + "05" }}>
                <video
                  src={`${API}${p.url}`}
                  controls
                  className="w-full"
                  style={{ maxHeight: 220, background: "#000", display: "block" }}
                />
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[12px] font-semibold" style={{ color }}>变体 {i + 1}</span>
                  <button
                    onClick={() => triggerDownload(p.url, p.name)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                    style={{ background: color + "12", color, border: `1px solid ${color}25` }}>
                    <Download size={11} />下载
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state === "done" && (
        <MetricsRow color={color} items={[
          { label: "变体总数", value: `${previews.length || combos} 条` },
          { label: "拼接错误", value: "0" },
          { label: "格式", value: "H264 / AAC" },
        ]} />
      )}
    </div>
  );
}

// ─── F03 ─────────────────────────────────────────────────────────────────────

const HOOK_STYLES = ["快节奏冲击", "慢镜情绪", "悬念字幕", "产品特写", "街头访谈"];

function F03() {
  const color = "#4FACFE";
  const [prompt, setPrompt] = useState("");
  const [refFile, setRefFile] = useState<File | null>(null);
  const [variants, setVariants] = useState(3);
  const [styles, setStyles] = useState(["快节奏冲击"]);
  const [state, setState] = useState<ProcessState>("idle");
  const [pct, setPct] = useState(0);
  const [results, setResults] = useState<{ id: number; style: string; dur: string; url: string | null }[]>([]);
  const MAX = 200;
  const toggle = (s: string) => setStyles(p => p.includes(s) ? (p.length > 1 ? p.filter(x => x !== s) : p) : [...p, s]);

  const run = () => {
    if (!prompt.trim()) return;
    setState("processing"); setPct(0); setResults([]);
    const fd = new FormData();
    fd.append("prompt", prompt);
    fd.append("variants", String(variants));
    fd.append("styles", JSON.stringify(styles));
    if (refFile) fd.append("ref", refFile);
    streamSSE(
      `${API}/api/f03/generate`, fd,
      (p, s) => { setPct(p); },
      (data) => {
        setState("done");
        const r = data.results as { id: number; style: string; dur: string; url: string | null }[];
        setResults(r ?? []);
      },
      () => setState("error"),
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>钩子内容描述</FieldLabel>
              <span className="text-[11px] font-medium" style={{ color: prompt.length > MAX * 0.85 ? "#F59E0B" : "#8C90AB" }}>
                {prompt.length}/{MAX}
              </span>
            </div>
            <StyledInput
              value={prompt} onChange={(v) => setPrompt(v.slice(0, MAX))} multiline rows={5}
              placeholder={"描述你想要的开头钩子…\n\n例：手机从高处落下，慢镜头碎裂，字幕弹出「别让这件事毁掉你的手机」"}
            />
          </div>
          <div>
            <FieldLabel>视觉风格（可多选）</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {HOOK_STYLES.map((s) => {
                const on = styles.includes(s);
                return (
                  <button key={s} onClick={() => toggle(s)}
                    className="px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{
                      background: on ? color + "15" : "#F4F6FD",
                      border: `1.5px solid ${on ? color + "50" : "rgba(18,21,42,0.08)"}`,
                      color: on ? color : "#5A5F7A",
                    }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel>生成变体数量</FieldLabel>
            <div className="flex items-center gap-3 mt-1">
              <button onClick={() => setVariants(v => Math.max(2, v - 1))}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: "#F4F6FD", border: "1.5px solid rgba(18,21,42,0.08)" }}>
                <Minus size={14} className="text-muted-foreground" />
              </button>
              <span className="text-3xl font-bold w-8 text-center"
                style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{variants}</span>
              <button onClick={() => setVariants(v => Math.min(4, v + 1))}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: "#F4F6FD", border: "1.5px solid rgba(18,21,42,0.08)" }}>
                <Plus size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
          <div>
            <FieldLabel>参考素材（可选）</FieldLabel>
            <DropZone label="上传参考图 / 视频" accept="image/*,video/*"
              onFile={setRefFile} file={refFile} color={color} />
          </div>
        </div>
      </div>

      {state === "processing" && <ProcessBanner pct={pct} stage="Runway Gen-4 视频生成中，请稍候…" color={color} />}

      <PrimaryBtn onClick={run} state={state} color={color}
        idle={`生成 ${variants} 条钩子片段`} processing="AI 视频生成中…" done="生成完成" />

      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {results.map((r) => (
            <div key={r.id} className="rounded-2xl overflow-hidden border transition-all duration-200 group cursor-pointer bg-card"
              style={{ border: "1.5px solid rgba(18,21,42,0.08)" }}>
              <div className="flex items-center justify-center"
                style={{ aspectRatio: "9/16", maxHeight: 180, background: color + "10" }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                  style={{ background: color + "25", border: `1.5px solid ${color}50` }}>
                  <Play size={17} style={{ color }} className="ml-0.5" />
                </div>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">变体 {r.id}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{r.style} · {r.dur}</p>
                </div>
                <button
                  onClick={() => r.url && triggerDownload(r.url, `hook_变体${r.id}.mp4`)}
                  disabled={!r.url}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30"
                  style={{ background: color + "15", border: `1px solid ${color}30` }}>
                  <Download size={12} style={{ color }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── F04 ─────────────────────────────────────────────────────────────────────

function F04() {
  const color = "#38C172";
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(5);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [merge, setMerge] = useState(false);
  const [clipConfig, setClipConfig] = useState<ClipConfig>(mkClipConfig());
  const [state, setState] = useState<ProcessState>("idle");
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState("");
  const [clips, setClips] = useState<{ id: number; start: string; end: string; score: number; url: string; filename: string }[]>([]);
  const [mergeUrl, setMergeUrl] = useState<string | null>(null);

  const addKw = () => {
    const kw = kwInput.trim();
    if (kw && !keywords.includes(kw) && keywords.length < 6) { setKeywords(p => [...p, kw]); setKwInput(""); }
  };

  const run = () => {
    if (!file) return;
    setState("processing"); setPct(0); setClips([]); setMergeUrl(null);
    const fd = new FormData();
    fd.append("video", file);
    fd.append("count", String(count));
    fd.append("merge", String(merge));
    fd.append("keywords", JSON.stringify(keywords));
    fd.append("startTime", String(clipConfig.startTime));
    if (clipConfig.endTime != null) fd.append("endTime", String(clipConfig.endTime));
    fd.append("speed", String(clipConfig.speed));
    streamSSE(
      `${API}/api/f04/highlights`, fd,
      (p, s) => { setPct(p); setStage(s); },
      (data) => {
        setState("done");
        setClips((data.clips as typeof clips) ?? []);
        setMergeUrl((data.mergeUrl as string) ?? null);
      },
      () => setState("error"),
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-3">
          <FieldLabel>上传长视频</FieldLabel>
          <DropZone label="拖入或点击上传" sublabel="MP4 · 5分钟 – 3小时" accept="video/*"
            onFile={(f) => { setFile(f); setClipConfig(mkClipConfig()); }} file={file} color={color}
            config={clipConfig} onConfigChange={setClipConfig} />
        </div>
        <div className="md:col-span-2 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>提取片段数量</FieldLabel>
              <span className="text-xl font-bold" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{count}</span>
            </div>
            <input type="range" min={3} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))}
              className="w-full" style={{ accentColor: color }} />
            <div className="flex justify-between mt-1">
              <span className="text-[11px] text-muted-foreground">3</span>
              <span className="text-[11px] text-muted-foreground">10</span>
            </div>
          </div>
          <div>
            <FieldLabel>关键词标注（可选）</FieldLabel>
            <div className="flex gap-2">
              <StyledInput value={kwInput} onChange={setKwInput} placeholder="产品展示、用户好评…" />
              <button onClick={addKw} className="px-3.5 rounded-xl flex-shrink-0 transition-all"
                style={{ background: "#F4F6FD", border: "1.5px solid rgba(18,21,42,0.08)" }}>
                <Plus size={15} className="text-muted-foreground" />
              </button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.map(kw => (
                  <span key={kw} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium"
                    style={{ background: color + "12", border: `1px solid ${color}30`, color }}>
                    {kw}
                    <button onClick={() => setKeywords(p => p.filter(k => k !== kw))}><X size={9} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <Toggle on={merge} onChange={() => setMerge(p => !p)} label="同时输出精华合集" />
        </div>
      </div>

      {state === "processing" && <ProcessBanner pct={pct} stage={stage} color={color} />}

      <div className="flex items-center gap-3 flex-wrap">
        <PrimaryBtn onClick={run} state={state} color={color}
          idle="提取精华片段" processing="AI 分析中…" done={`${count} 条精华已就绪`} />
        {state === "done" && mergeUrl && (
          <GhostBtn onClick={() => triggerDownload(mergeUrl, "精华合集.mp4")}>
            <Download size={14} />下载精华合集
          </GhostBtn>
        )}
      </div>

      {clips.length > 0 && (
        <div className="flex flex-col gap-3">
          <FieldLabel>精华片段列表</FieldLabel>
          {clips.map((c) => (
            <div key={c.id} className="rounded-2xl overflow-hidden bg-card"
              style={{ border: "1.5px solid rgba(18,21,42,0.07)" }}>
              {/* 内嵌播放器 */}
              <video
                src={`${API}${c.url}`}
                controls
                className="w-full"
                style={{ maxHeight: 200, background: "#000", display: "block" }}
              />
              {/* 元数据行 */}
              <div className="flex items-center gap-4 px-4 py-2.5">
                <span className="text-[11px] font-bold text-muted-foreground w-4 text-center">{c.id}</span>
                <div className="flex-1 flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[12px] font-medium text-foreground">{c.start}</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(18,21,42,0.07)" }} />
                  <span className="font-mono text-[12px] font-medium text-foreground">{c.end}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(18,21,42,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: color }} />
                  </div>
                  <span className="text-[12px] font-bold w-6 text-right" style={{ color }}>{c.score}</span>
                </div>
                <button
                  onClick={() => triggerDownload(c.url, c.filename)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                  style={{ background: color + "12", border: `1px solid ${color}28` }}>
                  <Download size={12} style={{ color }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── F05 ─────────────────────────────────────────────────────────────────────

function F05() {
  const color = "#FA709A";
  const [script, setScript] = useState("");
  const [actorId, setActorId] = useState(1);
  const [lang, setLang] = useState("zh");
  const [subtitle, setSubtitle] = useState(true);
  const [state, setState] = useState<ProcessState>("idle");
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState("");
  const MAX = 500;
  const estSecs = Math.max(0, Math.round(script.length / 4.5));
  const actor = ACTORS.find(a => a.id === actorId)!;

  const [downloadUrl, setDownloadUrl] = useState<{ url: string; filename: string } | null>(null);

  // ── 口播叠加合成 ──
  const [pipOpen, setPipOpen] = useState(false);
  const [pipUgcFile, setPipUgcFile] = useState<File | null>(null);
  const [pipUgcUrl, setPipUgcUrl] = useState<string | null>(null);   // 已生成的服务器URL
  const [pipBgFile, setPipBgFile] = useState<File | null>(null);
  const [pipMode, setPipMode] = useState<"pip" | "split">("pip");
  const [pipPos, setPipPos]   = useState<"br" | "bl" | "tr" | "tl">("br");
  const [pipSize, setPipSize] = useState<"sm" | "md" | "lg">("md");
  const [pipDir, setPipDir]   = useState<"h" | "v">("h");
  const [pipState, setPipState] = useState<ProcessState>("idle");
  const [pipPct, setPipPct]   = useState(0);
  const [pipStage, setPipStage] = useState("");
  const [pipResult, setPipResult] = useState<{ url: string; filename: string } | null>(null);

  const runPip = () => {
    if ((!pipUgcFile && !pipUgcUrl) || !pipBgFile) return;
    setPipState("processing"); setPipPct(0); setPipResult(null);
    const fd = new FormData();
    if (pipUgcFile) fd.append("ugc", pipUgcFile);
    else if (pipUgcUrl) fd.append("ugcUrl", pipUgcUrl);
    fd.append("bg", pipBgFile);
    fd.append("mode", pipMode);
    fd.append("pos",  pipPos);
    fd.append("size", pipSize);
    fd.append("dir",  pipDir);
    streamSSE(
      `${API}/api/f05/composite`, fd,
      (p, s) => { setPipPct(p); setPipStage(s); },
      (data) => {
        setPipState("done");
        if (data.url) setPipResult({ url: data.url as string, filename: data.filename as string });
      },
      () => setPipState("error"),
    );
  };

  const run = () => {
    if (!script.trim()) return;
    setState("processing"); setPct(0); setDownloadUrl(null);
    const fd = new FormData();
    fd.append("script", script);
    fd.append("actorId", String(actorId));
    fd.append("lang", lang);
    fd.append("subtitle", String(subtitle));
    streamSSE(
      `${API}/api/f05/ugc`, fd,
      (p, s) => { setPct(p); setStage(s); },
      (data) => {
        setState("done");
        if (data.url) setDownloadUrl({ url: data.url as string, filename: `ugc_${actor.name}.mp4` });
      },
      () => setState("error"),
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-3 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>口播脚本</FieldLabel>
              <div className="flex items-center gap-3">
                {script.length > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock size={10} />约 {estSecs} 秒
                  </span>
                )}
                <span className="text-[11px] font-medium"
                  style={{ color: script.length > MAX * 0.9 ? "#EF4444" : "#8C90AB" }}>
                  {script.length}/{MAX}
                </span>
              </div>
            </div>
            <StyledInput value={script} onChange={(v) => setScript(v.slice(0, MAX))} multiline rows={9}
              placeholder={"输入口播脚本…\n\n例如：你知道吗？95% 的人在选购手机保护壳时，都忽略了这个关键细节。今天给大家揭秘…"} />
          </div>
          {estSecs > 60 && (
            <p className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "#F59E0B" }}>
              <AlertCircle size={13} />脚本超过 60 秒，建议精简或拆分为多段
            </p>
          )}
          <div>
            <FieldLabel>语言与口音</FieldLabel>
            <StyledSelect value={lang} onChange={setLang} options={[
              { label: "普通话（中文）", value: "zh" },
              { label: "英语（美式）", value: "en-us" },
              { label: "英语（英式）", value: "en-gb" },
            ]} />
          </div>
          <Toggle on={subtitle} onChange={() => setSubtitle(p => !p)} label="自动叠加字幕" />
        </div>

        <div className="md:col-span-2">
          <FieldLabel>选择虚拟演员</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {ACTORS.map((a) => {
              const on = a.id === actorId;
              return (
                <button key={a.id} onClick={() => setActorId(a.id)}
                  className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl transition-all duration-150"
                  style={{
                    background: on ? a.color + "10" : "#F8FAFF",
                    border: `1.5px solid ${on ? a.color + "50" : "rgba(18,21,42,0.08)"}`,
                    boxShadow: on ? `0 2px 12px ${a.color}20` : "none",
                  }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white"
                    style={{ background: a.gradient, boxShadow: `0 3px 8px ${a.color}40` }}>
                    {a.name[0]}
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold leading-tight"
                      style={{ color: on ? a.color : "#12152A" }}>{a.name}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{a.tag}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {state === "processing" && <ProcessBanner pct={pct} stage={stage} color={color} />}

      <PrimaryBtn onClick={run} state={state} color={color}
        idle={`用 ${actor.name} 生成口播视频`} processing="HeyGen 合成中…" done="口播视频已就绪" />

      {state === "done" && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: `1.5px solid ${color}22` }}>
          {/* 视频预览 */}
          {downloadUrl ? (
            <video
              src={`${API}${downloadUrl.url}`}
              controls
              className="w-full"
              style={{ maxHeight: 360, background: "#000", display: "block" }}
            />
          ) : (
            <div className="flex items-center justify-center py-10"
              style={{ background: actor.color + "10" }}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
                  style={{ background: actor.gradient }}>
                  {actor.name[0]}
                </div>
                <p className="text-xs text-muted-foreground">Demo 模式 · 配置 HEYGEN_API_KEY 启用真实合成</p>
              </div>
            </div>
          )}
          {/* 元数据 */}
          <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4"
            style={{ background: color + "06" }}>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {[
                { label: "演员", value: actor.name },
                { label: "时长", value: `${estSecs || "—"} 秒` },
                { label: "分辨率", value: "1080×1920" },
                { label: "字幕", value: subtitle ? "已叠加" : "未叠加" },
              ].map(m => (
                <div key={m.label} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{m.label}</span>
                  <span className="text-sm font-semibold text-foreground">{m.value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {downloadUrl && (
                <GhostBtn onClick={() => triggerDownload(downloadUrl.url, downloadUrl.filename)}>
                  <Download size={13} />下载 MP4
                </GhostBtn>
              )}
              <button
                onClick={() => {
                  setPipOpen(true);
                  if (downloadUrl) { setPipUgcUrl(downloadUrl.url); setPipUgcFile(null); }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
                style={{ background: color + "15", color, border: `1px solid ${color}30` }}>
                <Layers size={12} />叠加到视频
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 口播叠加合成面板 ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${color}20` }}>
        {/* 标题栏（可折叠） */}
        <button onClick={() => setPipOpen(p => !p)}
          className="w-full flex items-center gap-3 px-5 py-4 transition-all"
          style={{ background: pipOpen ? color + "08" : "#FAFBFF" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: color + "18" }}>
            <Layers size={14} style={{ color }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-semibold text-foreground">口播叠加合成</p>
            <p className="text-[11px] text-muted-foreground">将口播视频叠加到产品视频中（画中画 / 分屏）</p>
          </div>
          <ChevronDown size={14} className="text-muted-foreground flex-shrink-0 transition-transform duration-200"
            style={{ transform: pipOpen ? "rotate(180deg)" : "" }} />
        </button>

        {pipOpen && (
          <div className="px-5 pb-5 pt-1 flex flex-col gap-4 border-t border-border">

            {/* UGC 来源 */}
            <div>
              <FieldLabel>口播视频来源</FieldLabel>
              <div className="flex flex-col gap-2">
                {/* 使用已生成的口播 */}
                {downloadUrl && (
                  <button
                    onClick={() => { setPipUgcUrl(downloadUrl.url); setPipUgcFile(null); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: pipUgcUrl ? color + "10" : "white",
                      border: `1.5px solid ${pipUgcUrl ? color + "45" : "rgba(18,21,42,0.1)"}`,
                    }}>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: pipUgcUrl ? color : "rgba(18,21,42,0.2)" }}>
                      {pipUgcUrl && <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />}
                    </div>
                    <span className="text-[12px] font-medium" style={{ color: pipUgcUrl ? color : "#5A5F7A" }}>
                      使用上方 {actor.name} 口播视频
                    </span>
                    <CheckCircle size={13} className="ml-auto flex-shrink-0"
                      style={{ color: pipUgcUrl ? color : "transparent" }} />
                  </button>
                )}
                {/* 或上传 */}
                <div>
                  {downloadUrl && (
                    <p className="text-[10px] text-muted-foreground text-center my-1">或上传其他口播视频</p>
                  )}
                  <DropZone label="上传口播视频" sublabel="MP4 / MOV" accept="video/*"
                    onFile={(f) => { setPipUgcFile(f); setPipUgcUrl(null); }}
                    file={pipUgcFile} color={color} />
                </div>
              </div>
            </div>

            {/* 背景视频 */}
            <div>
              <FieldLabel>背景 / 产品视频</FieldLabel>
              <DropZone label="上传背景视频" sublabel="产品展示、场景素材" accept="video/*"
                onFile={setPipBgFile} file={pipBgFile} color={color} />
            </div>

            {/* 合成方式 */}
            <div>
              <FieldLabel>合成方式</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: "pip",   label: "🎬 画中画 PiP", desc: "口播小窗叠在产品视频上" },
                  { v: "split", label: "⬛⬜ 分屏",       desc: "左右 / 上下并排显示" },
                ] as const).map(m => (
                  <button key={m.v} onClick={() => setPipMode(m.v)}
                    className="flex flex-col gap-1 px-3 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: pipMode === m.v ? color + "10" : "white",
                      border: `1.5px solid ${pipMode === m.v ? color + "45" : "rgba(18,21,42,0.1)"}`,
                    }}>
                    <p className="text-[12px] font-bold" style={{ color: pipMode === m.v ? color : "#5A5F7A" }}>{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* PiP 选项 */}
            {pipMode === "pip" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2">口播位置</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { v: "tl", label: "↖ 左上" }, { v: "tr", label: "↗ 右上" },
                      { v: "bl", label: "↙ 左下" }, { v: "br", label: "↘ 右下" },
                    ] as const).map(p => (
                      <button key={p.v} onClick={() => setPipPos(p.v)}
                        className="py-1.5 rounded-lg text-[11px] font-medium transition-all"
                        style={{
                          background: pipPos === p.v ? color + "15" : "white",
                          border: `1px solid ${pipPos === p.v ? color + "45" : "rgba(18,21,42,0.1)"}`,
                          color: pipPos === p.v ? color : "#5A5F7A",
                        }}>{p.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2">口播大小</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      { v: "sm", label: "小（25%）" },
                      { v: "md", label: "中（35%）" },
                      { v: "lg", label: "大（50%）" },
                    ] as const).map(s => (
                      <button key={s.v} onClick={() => setPipSize(s.v)}
                        className="py-1.5 rounded-lg text-[11px] font-medium transition-all"
                        style={{
                          background: pipSize === s.v ? color + "15" : "white",
                          border: `1px solid ${pipSize === s.v ? color + "45" : "rgba(18,21,42,0.1)"}`,
                          color: pipSize === s.v ? color : "#5A5F7A",
                        }}>{s.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 分屏方向 */}
            {pipMode === "split" && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">分屏方向</p>
                <div className="flex gap-2">
                  {([
                    { v: "h", label: "⬛⬜ 左右分屏（口播在右）" },
                    { v: "v", label: "⬛\n⬜ 上下分屏（口播在下）" },
                  ] as const).map(d => (
                    <button key={d.v} onClick={() => setPipDir(d.v)}
                      className="flex-1 py-2.5 px-3 rounded-xl text-[12px] font-medium text-left transition-all"
                      style={{
                        background: pipDir === d.v ? color + "12" : "white",
                        border: `1.5px solid ${pipDir === d.v ? color + "40" : "rgba(18,21,42,0.1)"}`,
                        color: pipDir === d.v ? color : "#5A5F7A",
                      }}>{d.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 进度 */}
            {pipState === "processing" && (
              <ProcessBanner pct={pipPct} stage={pipStage || "合成中…"} color={color} />
            )}

            {/* 合成按钮 */}
            <button
              onClick={runPip}
              disabled={pipState === "processing" || (!pipUgcFile && !pipUgcUrl) || !pipBgFile}
              className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: pipState === "done" ? "#22C55E" : color,
                boxShadow: `0 4px 14px ${color}40`,
              }}>
              <Layers size={14} />
              {pipState === "processing" ? "合成中…" : pipState === "done" ? "重新合成" : "开始叠加合成"}
            </button>

            {/* 结果预览 */}
            {pipResult && (
              <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${color}25` }}>
                <video src={`${API}${pipResult.url}`} controls className="w-full"
                  style={{ maxHeight: 320, background: "#000", display: "block" }} />
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ background: color + "06" }}>
                  <div>
                    <span className="text-[12px] font-semibold" style={{ color }}>叠加合成完成</span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {pipMode === "pip" ? `画中画 · ${pipPos === "br" ? "右下" : pipPos === "bl" ? "左下" : pipPos === "tr" ? "右上" : "左上"}角` : `分屏 · ${pipDir === "h" ? "左右" : "上下"}`}
                    </span>
                  </div>
                  <GhostBtn onClick={() => triggerDownload(pipResult.url, pipResult.filename)}>
                    <Download size={13} />下载 MP4
                  </GhostBtn>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── F06: 封面图工厂 ───────────────────────────────────────────────────────────

// 平台规格快检：根据宽高 + 时长返回适用/不适用列表
function PlatformChecker({ w, h, dur }: { w: number; h: number; dur: number }) {
  const asp = w / h;
  const platforms = [
    { name: "TikTok / 抖音",    ratio: "9:16", minDur: 5,  maxDur: 60,  aspMin: 0.54, aspMax: 0.58 },
    { name: "Instagram Reels", ratio: "9:16", minDur: 3,  maxDur: 90,  aspMin: 0.54, aspMax: 0.58 },
    { name: "Instagram Feed",  ratio: "1:1",  minDur: 3,  maxDur: 60,  aspMin: 0.9,  aspMax: 1.1  },
    { name: "YouTube Shorts",  ratio: "9:16", minDur: 15, maxDur: 60,  aspMin: 0.54, aspMax: 0.58 },
    { name: "YouTube 横版",    ratio: "16:9", minDur: 30, maxDur: 600, aspMin: 1.7,  aspMax: 1.8  },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      {platforms.map(p => {
        const aspOk  = asp >= p.aspMin && asp <= p.aspMax;
        const durOk  = dur >= p.minDur && dur <= p.maxDur;
        const ok     = aspOk && durOk;
        const partial = aspOk && !durOk;
        return (
          <div key={p.name} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg"
            style={{ background: ok ? "#22C55E10" : partial ? "#F59E0B10" : "#F4F6FD" }}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: ok ? "#22C55E" : partial ? "#F59E0B" : "rgba(18,21,42,0.12)" }}>
              {ok    && <CheckCircle size={10} className="text-white" />}
              {partial && <AlertCircle size={10} className="text-white" />}
              {!ok && !partial && <X size={8} className="text-muted-foreground" />}
            </div>
            <span className="text-[11px] font-semibold flex-1"
              style={{ color: ok ? "#22C55E" : partial ? "#F59E0B" : "#8C90AB" }}>{p.name}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{p.ratio}</span>
            {partial && <span className="text-[9px] text-amber-500">时长超限</span>}
          </div>
        );
      })}
    </div>
  );
}

function F06() {
  const color = "#F59E0B";
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frameCount, setFrameCount] = useState(12);
  const [state, setState] = useState<ProcessState>("idle");
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState("");
  const [frames, setFrames] = useState<{ index: number; time: number; url: string; filename: string }[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // 投放适用性检测
  const [videoMeta, setVideoMeta] = useState<{ w: number; h: number; dur: number } | null>(null);
  const [checkerOpen, setCheckerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoFile) { setPreviewUrl(null); setVideoMeta(null); return; }
    const url = URL.createObjectURL(videoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const run = () => {
    if (!videoFile) return;
    setState("processing"); setPct(0); setStage(""); setFrames([]); setSelected(new Set());
    const fd = new FormData();
    fd.append("video", videoFile);
    fd.append("count", String(frameCount));
    streamSSE(
      `${API}/api/f06/covers`, fd,
      (p, s) => { setPct(p); setStage(s); },
      (data) => {
        setState("done");
        const fs2 = (data.frames as { index: number; time: number; url: string; filename: string }[]) || [];
        setFrames(fs2);
        setSelected(new Set(fs2.map((_, i) => i)));
      },
      () => setState("error"),
    );
  };

  const toggleSelect = (idx: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });

  const downloadSelected = () => {
    frames.forEach((frame, idx) => {
      if (!selected.has(idx)) return;
      const a = document.createElement("a");
      a.href = `${API}${frame.url}`;
      a.download = frame.filename;
      a.click();
    });
  };

  const fmtT = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

        {/* 左栏：上传 + 预览 + 平台快检 */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <div>
            <FieldLabel>上传视频</FieldLabel>
            <DropZone label="上传视频文件" sublabel="MP4 / MOV · 最大 2 GB" accept="video/*"
              onFile={setVideoFile} file={videoFile} color={color} />
          </div>
          {previewUrl && (
            <video ref={videoRef} src={previewUrl} controls className="w-full rounded-xl"
              style={{ maxHeight: 200, background: "#000", display: "block" }}
              onLoadedMetadata={() => {
                const v = videoRef.current;
                if (v) setVideoMeta({ w: v.videoWidth, h: v.videoHeight, dur: v.duration });
              }} />
          )}

          {/* 投放适用性快检 */}
          {videoMeta && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid rgba(18,21,42,0.08)" }}>
              <button onClick={() => setCheckerOpen(p => !p)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all"
                style={{ background: checkerOpen ? "#F59E0B08" : "#FAFBFF" }}>
                <Shield size={14} style={{ color }} />
                <span className="text-[12px] font-semibold text-foreground flex-1 text-left">投放适用性快检</span>
                <span className="text-[10px] text-muted-foreground mr-1">
                  {videoMeta.w}×{videoMeta.h} · {videoMeta.dur.toFixed(1)}s
                </span>
                <ChevronDown size={13} className="text-muted-foreground transition-transform"
                  style={{ transform: checkerOpen ? "rotate(180deg)" : "" }} />
              </button>
              {checkerOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-border">
                  <PlatformChecker w={videoMeta.w} h={videoMeta.h} dur={videoMeta.dur} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右栏：提取设置 + 平台参考 */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div>
            <FieldLabel>提取帧数</FieldLabel>
            <div className="flex items-center gap-3">
              <button onClick={() => setFrameCount(v => Math.max(4, v - 2))}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "#F4F6FD", border: "1.5px solid rgba(18,21,42,0.08)" }}>
                <Minus size={14} className="text-muted-foreground" />
              </button>
              <span className="text-3xl font-bold w-12 text-center"
                style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{frameCount}</span>
              <button onClick={() => setFrameCount(v => Math.min(30, v + 2))}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "#F4F6FD", border: "1.5px solid rgba(18,21,42,0.08)" }}>
                <Plus size={14} className="text-muted-foreground" />
              </button>
              <span className="text-xs text-muted-foreground">帧（均匀分布）</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              跳过片头 5% 和片尾 5%，在有效内容区间均匀提取
            </p>
          </div>

          {/* 平台封面尺寸参考 */}
          <div className="rounded-xl p-4" style={{ background: color + "08", border: `1.5px solid ${color}20` }}>
            <p className="text-[11px] font-semibold mb-2.5" style={{ color }}>平台封面尺寸参考</p>
            <div className="flex flex-col gap-1.5">
              {[
                { platform: "TikTok / 抖音",    size: "1080×1920", ratio: "9:16", dur: "15–60s" },
                { platform: "Instagram Reels", size: "1080×1920", ratio: "9:16", dur: "3–90s"  },
                { platform: "Instagram Feed",  size: "1080×1080", ratio: "1:1",  dur: "3–60s"  },
                { platform: "YouTube Shorts",  size: "1080×1920", ratio: "9:16", dur: "15–60s" },
              ].map(r => (
                <div key={r.platform} className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{r.platform}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{r.dur}</span>
                    <span className="text-[11px] font-semibold font-mono" style={{ color }}>{r.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 说明 */}
          <div className="rounded-xl p-3.5" style={{ background: "#F4F6FD", border: "1.5px solid rgba(18,21,42,0.07)" }}>
            <p className="text-[11px] font-semibold text-foreground mb-1">💡 优化师使用技巧</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              提取 12–16 帧后 A/B 测试封面，通常前 3 秒的画面 CTR 最高。
              建议测试至少 3 张封面，对比 7 天 CTR 数据后定版。
            </p>
          </div>
        </div>
      </div>

      {state === "processing" && <ProcessBanner pct={pct} stage={stage || "提取封面帧…"} color={color} />}

      {/* 操作按钮栏 */}
      <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border">
        <PrimaryBtn onClick={run} state={state} color={color}
          idle={`提取 ${frameCount} 帧`} processing="提取中…" done="重新提取" />
        {state === "done" && frames.length > 0 && (
          <>
            <GhostBtn onClick={downloadSelected}>
              <Download size={13} />下载选中（{selected.size} 张）
            </GhostBtn>
            <button onClick={() => setSelected(new Set(frames.map((_, i) => i)))}
              className="text-[12px] text-muted-foreground px-3 py-2 rounded-xl hover:bg-accent transition-all">
              全选
            </button>
            <button onClick={() => setSelected(new Set())}
              className="text-[12px] text-muted-foreground px-3 py-2 rounded-xl hover:bg-accent transition-all">
              全不选
            </button>
            <span className="text-[11px] text-muted-foreground ml-auto">
              {selected.size}/{frames.length} 已选中
            </span>
          </>
        )}
      </div>

      {/* 帧网格 */}
      {frames.length > 0 && (
        <div className="flex flex-col gap-3">
          <FieldLabel>封面帧预览（点击选中 / 取消）</FieldLabel>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {frames.map((frame, idx) => {
              const isSel = selected.has(idx);
              return (
                <div key={idx} onClick={() => toggleSelect(idx)}
                  className="relative cursor-pointer rounded-xl overflow-hidden transition-all duration-150 select-none"
                  style={{
                    border: `2px solid ${isSel ? color : "rgba(18,21,42,0.08)"}`,
                    boxShadow: isSel ? `0 4px 12px ${color}35` : "none",
                    transform: isSel ? "scale(1.03)" : "scale(1)",
                  }}>
                  <img src={`${API}${frame.url}`} alt={`Frame ${frame.index}`}
                    className="w-full aspect-video object-cover" loading="lazy" />
                  {/* 时间戳 */}
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1"
                    style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.75))" }}>
                    <p className="text-[9px] text-white font-mono">{fmtT(frame.time)}</p>
                  </div>
                  {/* 选中标记 */}
                  {isSel && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: color, boxShadow: "0 2px 6px rgba(0,0,0,0.35)" }}>
                      <CheckCircle size={11} className="text-white" />
                    </div>
                  )}
                  {/* 帧编号 */}
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                    style={{ background: "rgba(0,0,0,0.5)" }}>#{frame.index}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 字幕相关常量（F01 / F02 共用）────────────────────────────────────────────

const SUB_LANG_OPTIONS = [
  { label: "🌐 自动检测", value: "auto" },
  { label: "🇨🇳 中文", value: "zh" },
  { label: "🇺🇸 英语", value: "en" },
  { label: "🇯🇵 日语", value: "ja" },
  { label: "🇰🇷 韩语", value: "ko" },
];

const SUB_STYLE_OPTS = [
  { v: "default", label: "白字阴影" },
  { v: "large",   label: "大字版"  },
  { v: "yellow",  label: "黄色字"  },
  { v: "box",     label: "字幕条"  },
] as const;

// F07 已移除——字幕功能内嵌到 F01 / F02 中
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _F07_removed() {
  const color = "#06B6D4";
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [lang, setLang] = useState("auto");
  const [subStyle, setSubStyle] = useState<"default" | "large" | "yellow" | "box">("default");
  const [position, setPosition] = useState<"bottom" | "top">("bottom");
  const [burnVideo, setBurnVideo] = useState(true);
  const [state, setState] = useState<ProcessState>("idle");
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<SubtitleResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoFile) { setPreviewUrl(null); return; }
    const u = URL.createObjectURL(videoFile);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [videoFile]);

  const run = () => {
    if (!videoFile) return;
    setState("processing"); setPct(0); setStage(""); setResult(null);
    const fd = new FormData();
    fd.append("video", videoFile);
    fd.append("lang", lang);
    fd.append("style", subStyle);
    fd.append("position", position);
    fd.append("burn", String(burnVideo));
    streamSSE(
      `${API}/api/f07/subtitle`, fd,
      (p, s) => { setPct(p); setStage(s); },
      (data) => { setState("done"); setResult(data as unknown as SubtitleResult); },
      () => setState("error"),
    );
  };

  // 解析 SRT 预览前 10 条
  const srtEntries = result?.srtContent
    ? result.srtContent.trim().split(/\n\n+/).slice(0, 10).map(b => {
        const lines = b.trim().split("\n");
        return { time: lines[1] || "", text: lines.slice(2).join(" ") };
      })
    : [];

  return (
    <div className="flex flex-col gap-5">
      {/* API Key 提示横幅 */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "#F59E0B10", border: "1.5px solid #F59E0B25" }}>
        <AlertCircle size={14} style={{ color: "#F59E0B" }} className="flex-shrink-0" />
        <p className="text-[12px] text-muted-foreground flex-1">
          在 <code className="px-1 rounded text-[11px]" style={{ background: "rgba(18,21,42,0.06)" }}>backend/.env</code> 中填入{" "}
          <code className="px-1 rounded text-[11px]" style={{ background: "rgba(18,21,42,0.06)" }}>OPENAI_API_KEY=sk-...</code>{" "}
          启用真实 Whisper 识别；未配置时以 Demo 字幕演示流程。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

        {/* ── 左栏：上传 + 结果 ── */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <div>
            <FieldLabel>上传视频</FieldLabel>
            <DropZone label="上传视频文件" sublabel="MP4 / MOV · 自动提取音频送 Whisper 识别"
              accept="video/*" onFile={setVideoFile} file={videoFile} color={color} />
          </div>

          {/* 原视频预览（处理前参考） */}
          {previewUrl && state === "idle" && (
            <video src={previewUrl} controls className="w-full rounded-xl"
              style={{ maxHeight: 200, background: "#000", display: "block" }} />
          )}

          {/* 处理结果 */}
          {result && (
            <div className="rounded-2xl overflow-hidden"
              style={{ border: `1.5px solid ${color}25` }}>
              {/* 带字幕的视频预览 */}
              {result.videoUrl ? (
                <video src={`${API}${result.videoUrl}`} controls className="w-full"
                  style={{ maxHeight: 240, background: "#000", display: "block" }} />
              ) : (
                !burnVideo && (
                  <div className="flex items-center justify-center py-8"
                    style={{ background: color + "08" }}>
                    <p className="text-sm text-muted-foreground">仅导出 SRT 模式 · 未烧录视频</p>
                  </div>
                )
              )}

              {/* 元数据 + 下载 */}
              <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
                style={{ background: color + "06" }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={13} style={{ color: "#22C55E" }} />
                    <span className="text-[12px] font-semibold text-foreground">
                      识别 {result.entryCount} 条字幕
                    </span>
                  </div>
                  {result.demo && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#F59E0B15", color: "#F59E0B" }}>
                      Demo 模式
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <GhostBtn onClick={() => triggerDownload(result.srtUrl, `subtitle_${lang}.srt`)}>
                    <Download size={12} />SRT 文件
                  </GhostBtn>
                  {result.videoUrl && (
                    <GhostBtn onClick={() => triggerDownload(result.videoUrl!, "subtitle_burned.mp4")}>
                      <Download size={12} />烧录视频
                    </GhostBtn>
                  )}
                </div>
              </div>

              {/* 字幕预览列表 */}
              {srtEntries.length > 0 && (
                <div className="px-4 pb-4 pt-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    字幕预览（前 {srtEntries.length} 条）
                  </p>
                  <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
                    {srtEntries.map((e, i) => (
                      <div key={i} className="flex gap-3 py-1 border-b border-border last:border-0">
                        <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 w-36 leading-5">
                          {e.time.split(" --> ")[0]}
                        </span>
                        <span className="text-[12px] text-foreground leading-5">{e.text}</span>
                      </div>
                    ))}
                    {result.entryCount > 10 && (
                      <p className="text-[10px] text-muted-foreground mt-1 pl-1">
                        ··· 还有 {result.entryCount - 10} 条，下载 SRT 文件查看全部
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 右栏：识别设置 ── */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* 语言 */}
          <div>
            <FieldLabel>识别语言</FieldLabel>
            <StyledSelect value={lang} onChange={setLang} options={LANG_OPTIONS} />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              「自动检测」适合中英混合内容，准确率略低于指定语言
            </p>
          </div>

          {/* 字幕样式 */}
          <div>
            <FieldLabel>字幕样式</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {SUBTITLE_STYLE_OPTIONS.map(s => {
                const on = subStyle === s.v;
                return (
                  <button key={s.v} onClick={() => setSubStyle(s.v)}
                    className="flex flex-col gap-1 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: on ? color + "10" : "#F4F6FD",
                      border: `1.5px solid ${on ? color + "45" : "rgba(18,21,42,0.08)"}`,
                    }}>
                    <span className="text-[12px] font-bold"
                      style={{ color: on ? color : "#5A5F7A" }}>{s.label}</span>
                    <span className="text-[10px] text-muted-foreground">{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 位置 */}
          <div>
            <FieldLabel>字幕位置</FieldLabel>
            <div className="flex gap-2">
              {([
                { v: "bottom", label: "⬇ 底部（推荐）" },
                { v: "top",    label: "⬆ 顶部" },
              ] as const).map(p => (
                <button key={p.v} onClick={() => setPosition(p.v)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-medium transition-all"
                  style={{
                    background: position === p.v ? color + "10" : "#F4F6FD",
                    border: `1.5px solid ${position === p.v ? color + "45" : "rgba(18,21,42,0.08)"}`,
                    color: position === p.v ? color : "#5A5F7A",
                  }}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* 烧录开关 */}
          <Toggle on={burnVideo} onChange={() => setBurnVideo(p => !p)}
            label="烧录到视频（关闭则仅导出 SRT）" />

          {/* 能力说明 */}
          <div className="rounded-xl p-4" style={{ background: color + "08", border: `1.5px solid ${color}20` }}>
            <p className="text-[11px] font-bold mb-2" style={{ color }}>⚡ Whisper 能力说明</p>
            <div className="flex flex-col gap-1.5">
              {[
                ["模型",   "OpenAI Whisper-1"],
                ["识别率", "中文 ~95% / 英文 ~98%"],
                ["时延",   "1 分钟视频约 10–30 秒"],
                ["限制",   "单次音频 ≤ 25 MB（约 4 小时）"],
                ["费用",   "~$0.006 / 分钟"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-baseline">
                  <span className="text-[11px] text-muted-foreground">{k}</span>
                  <span className="text-[11px] font-semibold" style={{ color }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {state === "processing" && <ProcessBanner pct={pct} stage={stage || "处理中…"} color={color} />}

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <PrimaryBtn onClick={run} state={state} color={color}
          idle="开始识别字幕" processing="识别中…" done="重新识别" />
        {state === "done" && result && (
          <span className="text-[12px] text-muted-foreground">
            {result.demo ? "⚠ Demo 字幕 · 配置 API Key 后生成真实字幕" : "✅ Whisper 识别完成"}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 数据大屏 ─────────────────────────────────────────────────────────────────

type StatsData = {
  total: number; todayCount: number; weekCount: number; operatorCount: number;
  byOperator: [string, number][]; byModule: [string, number][];
  byDay: [string, number][]; recent: { id: string; ts: string; module: string; operator: string; file: string }[];
};

// 操作员名字 → 固定颜色
function opColor(name: string) {
  const palette = ["#667EEA","#FA709A","#4FACFE","#43E97B","#F59E0B","#F093FB","#00C6FF","#FEE140","#A78BFA","#34D399"];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFF;
  return palette[Math.abs(h) % palette.length];
}

// 模块名映射
const MOD_LABEL: Record<string, { label: string; color: string }> = {
  F01: { label: "AI Reframe",  color: "#667EEA" },
  F02: { label: "Ad Combos",   color: "#F093FB" },
  F03: { label: "Hook Gen",    color: "#4FACFE" },
  F04: { label: "Highlights",  color: "#43E97B" },
  F05: { label: "UGC 口播",   color: "#FA709A" },
  "F05合成": { label: "口播合成", color: "#FEE140" },
  F06: { label: "封面图工厂",  color: "#F59E0B" },
};

// 动态计数动画
function AnimCount({ to, duration = 1200 }: { to: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (to === 0) return;
    let start = 0; const step = Math.max(1, Math.ceil(to / (duration / 16)));
    const t = setInterval(() => {
      start = Math.min(to, start + step);
      setN(start);
      if (start >= to) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [to, duration]);
  return <>{n.toLocaleString()}</>;
}

// 时间格式化
function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

function StatsPage({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [visible, setVisible] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/stats`);
      if (r.ok) { setData(await r.json()); setLastRefresh(new Date()); }
    } catch {}
  };

  useEffect(() => {
    load();
    setTimeout(() => setVisible(true), 30);
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 350);
  };

  // 柱状图
  const BarChartViz = ({ entries, max: maxV }: { entries: [string, number][]; max: number }) => (
    <div className="flex items-end gap-1.5 h-28 mt-2">
      {entries.map(([day, cnt]) => {
        const pct = maxV > 0 ? (cnt / maxV) * 100 : 0;
        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full rounded-t-md transition-all duration-700 relative group"
              style={{ height: `${Math.max(pct * 0.92, cnt > 0 ? 4 : 1)}%`, minHeight: cnt > 0 ? 4 : 1,
                background: "linear-gradient(to top, #667EEA80, #667EEA)",
                boxShadow: cnt > 0 ? "0 0 10px #667EEA60" : "none" }}>
              {cnt > 0 && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white/80
                  opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{cnt}</div>
              )}
            </div>
            <span className="text-[8px] text-white/35 truncate w-full text-center">{day.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );

  const heroCards = [
    { label: "总产出视频", value: data?.total ?? 0, color: "#667EEA", sub: "累计所有模块" },
    { label: "今日新增",   value: data?.todayCount ?? 0, color: "#4FACFE", sub: "今天产出数量" },
    { label: "本周产出",   value: data?.weekCount ?? 0,  color: "#43E97B", sub: "最近 7 天" },
    { label: "活跃操作员", value: data?.operatorCount ?? 0, color: "#FA709A", sub: "参与人数" },
  ];

  const maxDayVal = Math.max(...(data?.byDay.map(([, v]) => v) ?? [1]), 1);
  const maxOpVal  = data?.byOperator[0]?.[1] ?? 1;
  const totalMod  = (data?.byModule ?? []).reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "rgba(4,6,20,0.98)",
        backdropFilter: "blur(20px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
      }}>

      {/* 背景网格 */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(102,126,234,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(102,126,234,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
      {/* 顶部光晕 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(102,126,234,0.15) 0%, transparent 70%)" }} />

      {/* ── 顶栏 ── */}
      <header className="relative flex items-center gap-4 px-8 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#667EEA,#764BA2)", boxShadow: "0 0 20px #667EEA60" }}>
            <BarChart2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              产出数据大屏
            </h1>
            <p className="text-[11px] text-white/40">AI Studio · 实时统计</p>
          </div>
        </div>
        {/* 实时指示 */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full ml-4"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-green-400 font-semibold">实时</span>
        </div>
        <span className="text-[11px] text-white/30 ml-1">
          刷新于 {lastRefresh.toLocaleTimeString("zh-CN")}
        </span>
        <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition-all ml-1">
          <RefreshCw size={13} className="text-white/40" />
        </button>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={handleClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <X size={14} />返回操作台
          </button>
        </div>
      </header>

      {/* ── 主体 ── */}
      <div className="relative flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">

        {/* Hero 数字行 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {heroCards.map((c, i) => (
            <div key={c.label} className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                animationDelay: `${i * 80}ms`,
              }}>
              {/* 背景光晕 */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
                style={{ background: c.color + "18", filter: "blur(20px)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: c.color + "bb" }}>{c.label}</p>
              <p className="text-4xl font-black leading-none mb-1"
                style={{ color: c.color, fontFamily: "'Plus Jakarta Sans',sans-serif",
                  textShadow: `0 0 30px ${c.color}80` }}>
                <AnimCount to={c.value} />
              </p>
              <p className="text-[10px] text-white/30 mt-2">{c.sub}</p>
              {/* 底部装饰线 */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl"
                style={{ background: `linear-gradient(90deg, transparent, ${c.color}60, transparent)` }} />
            </div>
          ))}
        </div>

        {/* 中间两列 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* 操作员排行榜 */}
          <div className="md:col-span-3 rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={14} style={{ color: "#FA709A" }} />
              <p className="text-[13px] font-bold text-white">操作员排行榜</p>
              <span className="text-[10px] text-white/30 ml-auto">产出总视频数</span>
            </div>
            {(data?.byOperator.length ?? 0) === 0 ? (
              <p className="text-white/20 text-sm text-center py-8">暂无数据 · 完成第一条视频后显示</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data!.byOperator.slice(0, 8).map(([op, cnt], idx) => {
                  const color = opColor(op);
                  const pct   = cnt / maxOpVal * 100;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={op} className="flex items-center gap-3">
                      {/* 排名 */}
                      <div className="w-7 text-center text-lg flex-shrink-0">
                        {idx < 3 ? medals[idx] : <span className="text-[12px] text-white/30 font-bold">#{idx+1}</span>}
                      </div>
                      {/* 头像 */}
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}80, ${color})`, boxShadow: `0 2px 8px ${color}50` }}>
                        {op.slice(0, 1)}
                      </div>
                      {/* 名字 + 进度条 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-semibold text-white/90 truncate">{op}</span>
                          <span className="text-[12px] font-bold flex-shrink-0 ml-3" style={{ color }}>{cnt.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`,
                              boxShadow: `0 0 8px ${color}60` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 模块分布 */}
          <div className="md:col-span-2 rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-5">
              <Layers size={14} style={{ color: "#4FACFE" }} />
              <p className="text-[13px] font-bold text-white">功能模块分布</p>
            </div>
            {(data?.byModule.length ?? 0) === 0 ? (
              <p className="text-white/20 text-sm text-center py-8">暂无数据</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {data!.byModule.sort((a, b) => b[1] - a[1]).map(([mod, cnt]) => {
                  const info  = MOD_LABEL[mod] || { label: mod, color: "#8C90AB" };
                  const pct   = Math.round(cnt / totalMod * 100);
                  return (
                    <div key={mod}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: info.color }} />
                          <span className="text-[11px] font-semibold" style={{ color: info.color }}>{info.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/50">{cnt}</span>
                          <span className="text-[10px] font-bold" style={{ color: info.color }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%`, background: info.color,
                            boxShadow: `0 0 6px ${info.color}70` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 14 日趋势 */}
        <div className="rounded-2xl p-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={14} style={{ color: "#667EEA" }} />
            <p className="text-[13px] font-bold text-white">近 14 日产出趋势</p>
            <span className="text-[10px] text-white/30 ml-auto">每日视频产出数</span>
          </div>
          {(data?.byDay ?? []).every(([, v]) => v === 0) ? (
            <p className="text-white/20 text-sm text-center py-6">暂无数据</p>
          ) : (
            <BarChartViz entries={data?.byDay ?? []} max={maxDayVal} />
          )}
        </div>

        {/* 最近操作记录 */}
        <div className="rounded-2xl p-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} style={{ color: "#43E97B" }} />
            <p className="text-[13px] font-bold text-white">最近操作记录</p>
            <span className="text-[10px] text-white/30 ml-auto">最新 50 条</span>
          </div>
          {(data?.recent.length ?? 0) === 0 ? (
            <p className="text-white/20 text-sm text-center py-6">暂无记录 · 完成一次视频处理后开始记录</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
              {data!.recent.map((r) => {
                const mod = MOD_LABEL[r.module] || { label: r.module, color: "#8C90AB" };
                const color = opColor(r.operator);
                return (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-white/5">
                    {/* 模块标签 */}
                    <div className="px-2 py-0.5 rounded-lg text-[9px] font-bold flex-shrink-0"
                      style={{ background: mod.color + "20", color: mod.color, border: `1px solid ${mod.color}30` }}>
                      {mod.label}
                    </div>
                    {/* 操作员 */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: color }}>
                        {r.operator.slice(0, 1)}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color }}>{r.operator}</span>
                    </div>
                    {/* 文件名 */}
                    <span className="text-[11px] text-white/40 flex-1 truncate min-w-0">{r.file || "—"}</span>
                    {/* 时间 */}
                    <span className="text-[10px] text-white/25 flex-shrink-0">{timeAgo(r.ts)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate();
  const [active, setActive] = useState<FeatureId>("F01");
  const [showStats, setShowStats] = useState(false);
  const [operatorInput, setOperatorInput] = useState(() => localStorage.getItem("ai_operator") || "");
  const mod = MODULES.find(m => m.id === active)!;

  // 同步操作员到全局
  useEffect(() => { setOperatorGlobal(operatorInput); }, [operatorInput]);

  const panels: Record<FeatureId, React.ReactNode> = {
    F01: <F01 />, F02: <F02 />, F03: <F03 />, F04: <F04 />,
    F05: <F05 />, F06: <F06 />,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Top bar */}
      <header className="flex-shrink-0 bg-card border-b border-border h-14 flex items-center px-6 gap-4 sticky top-0 z-20"
        style={{ boxShadow: "0 1px 0 rgba(18,21,42,0.06)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #667EEA, #764BA2)" }}>
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            AI Studio
          </span>
        </div>
        <div className="h-5 w-px bg-border" />
        <span className="text-[12px] font-medium text-muted-foreground">投放素材平台</span>
        <div className="ml-auto flex items-center gap-3">
          {/* 返回首页 */}
          <button onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all"
            style={{ background: "rgba(18,21,42,0.04)", border: "1.5px solid rgba(18,21,42,0.08)", color: "#5A5F7A" }}>
            ← 首页
          </button>
          {/* 操作员输入 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(18,21,42,0.04)", border: "1.5px solid rgba(18,21,42,0.08)" }}>
            <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: operatorInput ? opColor(operatorInput) : "#C4C9E0" }}>
              {operatorInput ? operatorInput.slice(0, 1) : "?"}
            </div>
            <input
              value={operatorInput}
              onChange={e => setOperatorInput(e.target.value)}
              placeholder="输入你的名字"
              className="text-[12px] font-medium bg-transparent focus:outline-none w-24"
              style={{ color: "#12152A" }}
            />
          </div>
          {/* 大屏按钮 */}
          <button onClick={() => setShowStats(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{ background: "linear-gradient(135deg,#667EEA20,#764BA220)", color: "#667EEA",
              border: "1.5px solid #667EEA30" }}>
            <BarChart2 size={13} />数据大屏
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: "#22C55E" }} />
            <span className="text-[12px] text-muted-foreground">Beta</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1" style={{ minHeight: "calc(100vh - 56px)" }}>

        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 bg-card border-r border-border flex flex-col"
          style={{ boxShadow: "1px 0 0 rgba(18,21,42,0.06)" }}>
          <div className="px-3 pt-5 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">功能模块</p>
          </div>
          <nav className="flex flex-col gap-0.5 px-3 flex-1">
            {MODULES.map((m) => {
              const on = m.id === active;
              return (
                <button key={m.id} onClick={() => setActive(m.id)}
                  className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-all duration-150 group"
                  style={{
                    background: on ? m.color + "12" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!on) (e.currentTarget as HTMLElement).style.background = "rgba(18,21,42,0.04)"; }}
                  onMouseLeave={(e) => { if (!on) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <ModuleIcon gradient={m.gradient} icon={m.icon} size={34} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-tight truncate"
                      style={{ color: on ? "#12152A" : "#5A5F7A" }}>{m.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">{m.sub}</p>
                  </div>
                  {m.priority === "P0" && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ background: "#4F6EF7" + "18", color: "#4F6EF7" }}>P0</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="px-5 py-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground leading-relaxed">参考 Poolday.ai Labs 功能体系</p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Page header */}
          <div className="bg-card border-b border-border px-6 py-4"
            style={{ boxShadow: "0 1px 0 rgba(18,21,42,0.06)" }}>
            <div className="flex items-center gap-3">
              <ModuleIcon gradient={mod.gradient} icon={mod.icon} size={40} />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {mod.label}
                  </h1>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{
                      background: mod.priority === "P0" ? "#4F6EF7" + "15" : "rgba(18,21,42,0.06)",
                      color: mod.priority === "P0" ? "#4F6EF7" : "#8C90AB",
                    }}>{mod.priority}</span>
                </div>
                <p className="text-sm text-muted-foreground">{mod.sub}</p>
              </div>
            </div>
          </div>

          {/* Panel */}
          <div className="flex-1 p-5 flex flex-col">
            <Card className="flex-1" padding="p-6">{panels[active]}</Card>
          </div>
        </main>
      </div>

      {/* 数据大屏 Overlay */}
      {showStats && <StatsPage onClose={() => setShowStats(false)} />}

      <style>{`
        *::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
        input[type=range] { -webkit-appearance: none; width: 100%; height: 5px; border-radius: 3px; background: rgba(18,21,42,0.08); outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #38C172; cursor: pointer; box-shadow: 0 1px 4px rgba(56,193,114,0.4); }
      `}</style>
    </div>
  );
}
