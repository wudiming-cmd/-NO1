import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Upload, X, Download, RefreshCw, Sparkles, Zap,
  Plus, CheckCircle2, Pencil, Trash2, ZoomIn, ZoomOut,
  CheckSquare, Square, ImageIcon, Type, Image as ImageIco,
  Wand2, RotateCcw, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StylePreset { id: string; name: string; emoji: string; desc: string; color: string; bg: string; prompt: string; iconUrl?: string; }
interface UploadedFile { id: string; file: File; url: string; resultUrl?: string; status: 'idle' | 'processing' | 'done' | 'error'; error?: string; }

// ─── Edit Preset Modal ────────────────────────────────────────────────────────
function EditPresetModal({
  preset, onSave, onClose,
}: {
  preset: StylePreset | null;   // null = create new
  onSave: (p: StylePreset) => void;
  onClose: () => void;
}) {
  const isNew = !preset;
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [name, setName]       = useState(preset?.name ?? '');
  const [prompt, setPrompt]   = useState(preset?.prompt ?? '');
  const [iconUrl, setIconUrl] = useState(preset?.iconUrl ?? preset?.emoji ?? '');
  const [iconPreview, setIconPreview] = useState<string>(preset?.iconUrl ?? '');

  const handleIconFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setIconPreview(url);
    setIconUrl(url);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!name.trim() || !prompt.trim()) return;
    onSave({
      id: preset?.id ?? uid(),
      name: name.trim(),
      emoji: preset?.emoji ?? '🎨',
      desc: preset?.desc ?? name.trim(),
      color: preset?.color ?? '#8B5CF6',
      bg: preset?.bg ?? 'linear-gradient(135deg,#F5F3FF,#EDE9FE)',
      prompt: prompt.trim(),
      iconUrl: iconPreview || undefined,
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 480, background: '#fff', borderRadius: 16,
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden', animation: 'fadeUp 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>编辑风格预设</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 风格名称 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>风格名称</span>
              <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 700 }}>*</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input value={name} onChange={e => setName(e.target.value.slice(0, 20))}
                placeholder="输入风格名称"
                style={{
                  width: '100%', padding: '10px 52px 10px 14px',
                  borderRadius: 10, border: '1.5px solid #E5E7EB',
                  fontSize: 14, color: '#111', outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.15s', boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = '#8B5CF6')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF' }}>
                {name.length} / 20
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>最多20个字符</div>
          </div>

          {/* 风格图标 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>风格图标</span>
              <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 700 }}>*</span>
            </div>
            <div
              onClick={() => iconInputRef.current?.click()}
              style={{
                width: '100%', minHeight: 160, border: '1.5px dashed #E5E7EB',
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: '#FAFAFA', transition: 'all 0.15s', overflow: 'hidden',
                position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.background = '#F5F3FF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#FAFAFA'; }}
            >
              {iconPreview ? (
                <>
                  <img src={iconPreview} alt="icon" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }} />
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                  >
                    <div style={{ opacity: 0, transition: 'opacity 0.2s', fontSize: 12, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '6px 14px', borderRadius: 8 }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                    >点击更换图片</div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#9CA3AF', padding: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F3F4F6', border: '1.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={18} color="#9CA3AF" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>点击上传图标</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>支持 PNG、JPG、WebP · 建议正方形</div>
                  </div>
                </div>
              )}
            </div>
            <input ref={iconInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIconFile} />
          </div>

          {/* 风格 Prompt */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>风格 Prompt</span>
              <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 700 }}>*</span>
            </div>
            <div style={{ position: 'relative' }}>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value.slice(0, 500))}
                rows={4} placeholder="描述风格特征，例如：Convert the image content elements to LEGO shapes. Do not add any extra elements or phone frames."
                style={{
                  width: '100%', padding: '10px 14px 28px', borderRadius: 10,
                  border: '1.5px solid #E5E7EB', fontSize: 13, color: '#111',
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                  lineHeight: 1.6, boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = '#8B5CF6')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
              <span style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 11, color: '#9CA3AF' }}>
                {prompt.length} / 500
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#8B5CF6', marginTop: 5, fontWeight: 600 }}>
              💡 详细的 Prompt 能获得更好的风格化效果
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{
            padding: '9px 24px', borderRadius: 9, border: '1.5px solid #E5E7EB',
            background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >取消</button>
          <button onClick={handleSave} disabled={!name.trim() || !prompt.trim()} style={{
            padding: '9px 28px', borderRadius: 9, border: 'none',
            background: name.trim() && prompt.trim() ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)' : '#E5E7EB',
            color: name.trim() && prompt.trim() ? '#fff' : '#9CA3AF',
            fontSize: 13, fontWeight: 700, cursor: name.trim() && prompt.trim() ? 'pointer' : 'not-allowed',
            boxShadow: name.trim() && prompt.trim() ? '0 4px 12px rgba(139,92,246,0.4)' : 'none',
            transition: 'all 0.15s',
          }}>确定保存</button>
        </div>
      </div>
    </div>
  );
}

// ─── Presets ──────────────────────────────────────────────────────────────────
const DEFAULT_PRESETS: StylePreset[] = [
  { id: 'lego',   name: '乐高',     emoji: '🧱', desc: '积木颗粒质感',  color: '#EF4444', bg: 'linear-gradient(135deg,#FEF2F2,#FEE2E2)', prompt: 'LEGO brick style, plastic toy aesthetic, colorful building blocks, sharp edges, mosaic texture, vibrant solid colors, playful and fun, studio lighting, product photography' },
  { id: 'glass',  name: '玻璃风',   emoji: '🪟', desc: '通透磨砂质感',  color: '#06B6D4', bg: 'linear-gradient(135deg,#ECFEFF,#CFFAFE)', prompt: 'frosted glass morphism, translucent material, soft blur, light refraction, subtle gradient overlay, clean minimal background, white glow edges, modern UI aesthetic, premium feel' },
  { id: 'matte',  name: '磨砂风',   emoji: '🎨', desc: '柔和哑光色调',  color: '#8B5CF6', bg: 'linear-gradient(135deg,#F5F3FF,#EDE9FE)', prompt: 'matte painting style, soft desaturated tones, velvety texture, no shine or gloss, pastel color palette, smooth gradients, editorial art style, quiet and elegant atmosphere' },
  { id: 'anime',  name: '动漫',     emoji: '🎌', desc: '日系插画风格',  color: '#EC4899', bg: 'linear-gradient(135deg,#FDF2F8,#FCE7F3)', prompt: 'Japanese anime illustration, cel shading, bold outlines, vibrant colors, expressive characters, clean linework, soft pastel highlights, Studio Ghibli inspired, manga aesthetic' },
  { id: 'pixel',  name: '像素风',   emoji: '👾', desc: '8bit 复古游戏', color: '#10B981', bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', prompt: '8-bit pixel art, retro video game sprite, low resolution grid, limited color palette, sharp blocky shapes, nostalgic arcade style, no anti-aliasing, classic game aesthetic' },
  { id: 'oil',    name: '油画',     emoji: '🖼️', desc: '经典笔触质感',  color: '#F59E0B', bg: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', prompt: 'classical oil painting, visible brushstrokes, rich impasto texture, deep saturated colors, chiaroscuro lighting, old master technique, canvas grain, gallery fine art style' },
  { id: 'sketch', name: '素描',     emoji: '✏️', desc: '铅笔手绘线稿',  color: '#6B7280', bg: 'linear-gradient(135deg,#F9FAFB,#F3F4F6)', prompt: 'pencil sketch illustration, hand drawn linework, graphite shading, cross hatching, white paper background, rough texture, architectural drawing style, monochrome, detailed strokes' },
  { id: 'cyber',  name: '赛博朋克', emoji: '🌃', desc: '霓虹未来都市',  color: '#7C3AED', bg: 'linear-gradient(135deg,#F5F3FF,#EDE9FE)', prompt: 'cyberpunk aesthetic, neon glowing lights, dark rainy cityscape, purple and cyan color scheme, holographic elements, futuristic technology, blade runner atmosphere, high contrast, dystopian' },
  { id: 'clay',   name: '黏土风',   emoji: '🫶', desc: '立体柔软质感',  color: '#F97316', bg: 'linear-gradient(135deg,#FFF7ED,#FFEDD5)', prompt: 'clay render style, 3D sculpted look, soft rounded shapes, plasticine texture, warm studio lighting, pastel colors, toy-like aesthetic, smooth subsurface scattering, whimsical and cute' },
  { id: 'flat',   name: '扁平插画', emoji: '🎭', desc: '简洁几何风格',  color: '#3B82F6', bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', prompt: 'flat design illustration, geometric shapes, bold solid colors, no shadows or gradients, minimal clean composition, modern icon style, Dribbble aesthetic, vector art, simple and clear' },
];
const FORMATS = ['PNG', 'JPG', 'WEBP'];
const RATIOS  = ['9:16 竖屏', '1:1 方形', '16:9 横屏', '4:5 广告', '3:4 肖像'];
const MODELS  = ['jimeng/jimeng_seedream3...', '通用模型 v2', '写实增强版', '艺术创意版'];

function uid() { return Math.random().toString(36).slice(2, 10); }

function Sel({ value, onChange, opts }: { value: string; onChange(v: string): void; opts: string[] }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: '8px 30px 8px 10px', borderRadius: 8,
        border: '1px solid #E5E7EB', background: '#FAFAFA', fontSize: 12,
        color: '#374151', appearance: 'none', cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
      }}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
        style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <path d="M1.5 3.5l3.5 3 3.5-3" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Text/Image to Image Panel ────────────────────────────────────────────────
const RATIO_OPTS_T2I = [
  { label:'9:16', sub:'竖屏', w:1080, h:1920 },
  { label:'1:1',  sub:'方形', w:1080, h:1080 },
  { label:'16:9', sub:'横屏', w:1920, h:1080 },
  { label:'4:5',  sub:'广告', w:1080, h:1350 },
  { label:'3:4',  sub:'肖像', w:1080, h:1440 },
];
const STYLE_OPTS_T2I = [
  {label:'写实',value:'realistic'},{label:'动漫',value:'anime'},
  {label:'油画',value:'oil'},{label:'水彩',value:'watercolor'},
  {label:'像素风',value:'pixel'},{label:'3D渲染',value:'3d'},
];
const QUALITY_OPTS = ['标准','高清','超清 4K'];
const COUNT_OPTS   = [1,2,4];
interface T2IResult { id:string; url:string; prompt:string; ratio:string; }

const QUICK_PROMPTS = [
  '赛博朋克城市夜景，霓虹灯雨后街道',
  '古风山水画，云雾缭绕',
  '宇宙星云，深紫蓝色调',
  '极简几何渐变背景',
  '波普艺术风格人物',
  '日式枯山水庭院',
];
const PLACEHOLDER_COLORS = ['#667eea','#f59e0b','#10b981','#ec4899','#8b5cf6','#ef4444'];

function TextToImagePanel() {
  const refImgInput = useRef<HTMLInputElement>(null);
  const [mode,setMode]           = useState<'text'|'img'>('text');
  const [prompt,setPrompt]       = useState('');
  const [negPrompt,setNegPrompt] = useState('');
  const [showNeg,setShowNeg]     = useState(false);
  const [refImg,setRefImg]       = useState<string|null>(null);
  const [ratio,setRatio]         = useState(RATIO_OPTS_T2I[0]);
  const [styleV,setStyleV]       = useState(STYLE_OPTS_T2I[0].value);
  const [quality,setQuality]     = useState('高清');
  const [count,setCount]         = useState(4);
  const [strength,setStrength]   = useState(0.7);
  const [running,setRunning]     = useState(false);
  const [results,setResults]     = useState<T2IResult[]>([]);
  const [selected,setSelected]   = useState<Set<string>>(new Set());
  const [dragOver,setDragOver]   = useState(false);

  const handleRefImg = (f:File) => {
    if (!f.type.startsWith('image/')) return;
    const url = URL.createObjectURL(f);
    setRefImg(url); setMode('img');
  };

  const canGenerate = mode==='text' ? prompt.trim().length>0 : !!refImg;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setRunning(true);
    await new Promise(r=>setTimeout(r,1600+Math.random()*800));
    const filled:T2IResult[] = Array.from({length:count},(_,i)=>({
      id: uid()+i,
      prompt,
      ratio: ratio.label,
      url: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${ratio.w}" height="${ratio.h}">
          <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${PLACEHOLDER_COLORS[i%PLACEHOLDER_COLORS.length]}"/>
            <stop offset="100%" stop-color="${PLACEHOLDER_COLORS[(i+2)%PLACEHOLDER_COLORS.length]}"/>
          </linearGradient></defs>
          <rect width="100%" height="100%" fill="url(#g)" opacity=".18"/>
          <text x="50%" y="46%" text-anchor="middle" dominant-baseline="middle" font-size="80" font-family="sans-serif">✨</text>
          <text x="50%" y="58%" text-anchor="middle" font-size="36" fill="${PLACEHOLDER_COLORS[i%PLACEHOLDER_COLORS.length]}" font-family="sans-serif" opacity=".8">${ratio.label}</text>
        </svg>`
      )}`,
    }));
    setResults(p=>[...filled,...p]);
    setRunning(false);
  };

  const toggleSel = (id:string)=>setSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleAll = ()=>setSelected(selected.size===results.length?new Set():new Set(results.map(r=>r.id)));

  return (
    <div style={{flex:1,display:'flex',overflow:'hidden'}}>

      {/* Config panel */}
      <div style={{width:272,background:'#fff',borderRight:'1px solid #EAECF0',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
        <div style={{padding:'12px 14px 10px',borderBottom:'1px solid #F3F4F6',flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:800,color:'#111'}}>生图配置</div>
          <div style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>输入描述或参考图生成新图</div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'12px 12px',display:'flex',flexDirection:'column',gap:14}}>

          {/* Mode toggle */}
          <div style={{display:'flex',background:'#F3F4F6',borderRadius:9,padding:3}}>
            {(['text','img'] as const).map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{
                flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                padding:'7px',borderRadius:7,border:'none',
                background:mode===m?'#fff':'transparent',
                color:mode===m?'#111':'#9CA3AF',
                fontSize:12,fontWeight:700,cursor:'pointer',
                boxShadow:mode===m?'0 1px 4px rgba(0,0,0,0.1)':'none',
                transition:'all 0.15s',
              }}>
                {m==='text'?<><Type size={12}/>文生图</>:<><ImageIco size={12}/>图生图</>}
              </button>
            ))}
          </div>

          {/* Prompt */}
          <div>
            <div style={{fontSize:10,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>
              {mode==='text'?'描述词 Prompt':'图片描述（选填）'}
            </div>
            <div style={{position:'relative'}}>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value.slice(0,500))} rows={4}
                placeholder={mode==='text'
                  ?'描述你想生成的画面，例如：赛博朋克城市夜景，霓虹灯倒映在雨后街道…'
                  :'描述参考图的风格变化方向（选填）…'}
                style={{width:'100%',padding:'9px 10px 22px',borderRadius:9,border:'1.5px solid #E5E7EB',
                  fontSize:12,color:'#111',outline:'none',resize:'none',fontFamily:'inherit',
                  lineHeight:1.6,boxSizing:'border-box',background:'#FAFAFA',transition:'border-color 0.15s'}}
                onFocus={e=>(e.target.style.borderColor='#8B5CF6')}
                onBlur={e=>(e.target.style.borderColor='#E5E7EB')}
              />
              <span style={{position:'absolute',bottom:7,right:9,fontSize:10,color:'#C4CAD4'}}>{prompt.length}/500</span>
            </div>
          </div>

          {/* Neg prompt */}
          <div>
            <button onClick={()=>setShowNeg(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',fontSize:11,fontWeight:600,color:'#9CA3AF',padding:0}}>
              {showNeg?<ChevronUp size={11}/>:<ChevronDown size={11}/>}负向词（排除内容）
            </button>
            {showNeg&&(
              <textarea value={negPrompt} onChange={e=>setNegPrompt(e.target.value)} rows={2}
                placeholder="不想出现的内容，例如：模糊、低质、文字、水印…"
                style={{width:'100%',marginTop:6,padding:'7px 10px',borderRadius:8,border:'1.5px solid #E5E7EB',
                  fontSize:12,color:'#111',outline:'none',resize:'none',fontFamily:'inherit',lineHeight:1.6,boxSizing:'border-box',background:'#FAFAFA'}}
                onFocus={e=>(e.target.style.borderColor='#EF4444')}
                onBlur={e=>(e.target.style.borderColor='#E5E7EB')}
              />
            )}
          </div>

          {/* Reference image */}
          {mode==='img'&&(
            <div>
              <div style={{fontSize:10,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:7}}>参考图</div>
              <div
                onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleRefImg(f);}}
                onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onClick={()=>!refImg&&refImgInput.current?.click()}
                style={{borderRadius:10,border:`2px dashed ${dragOver?'#8B5CF6':refImg?'transparent':'#E5E7EB'}`,
                  background:dragOver?'#F5F3FF':'#FAFAFA',overflow:'hidden',position:'relative',
                  minHeight:refImg?'auto':88,display:'flex',alignItems:'center',justifyContent:'center',
                  cursor:refImg?'default':'pointer',transition:'all 0.2s'}}>
                {refImg?(
                  <>
                    <img src={refImg} alt="ref" style={{width:'100%',display:'block',borderRadius:8}}/>
                    <div style={{position:'absolute',top:5,right:5,display:'flex',gap:3}}>
                      <button onClick={e=>{e.stopPropagation();refImgInput.current?.click();}} style={{width:24,height:24,borderRadius:6,border:'none',background:'rgba(0,0,0,0.5)',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}><RotateCcw size={10}/></button>
                      <button onClick={e=>{e.stopPropagation();setRefImg(null);}} style={{width:24,height:24,borderRadius:6,border:'none',background:'rgba(239,68,68,0.85)',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={10}/></button>
                    </div>
                  </>
                ):(
                  <div style={{padding:16,textAlign:'center',color:'#9CA3AF'}}>
                    <Upload size={18} style={{margin:'0 auto 5px'}}/>
                    <div style={{fontSize:11,fontWeight:600}}>点击或拖拽上传参考图</div>
                  </div>
                )}
              </div>
              <input ref={refImgInput} type="file" accept="image/*" style={{display:'none'}}
                onChange={e=>{const f=e.target.files?.[0];if(f)handleRefImg(f);e.target.value='';}}/>
              {refImg&&(
                <div style={{marginTop:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:10,fontWeight:700,color:'#374151'}}>参考强度</span>
                    <span style={{fontSize:11,fontWeight:800,color:'#8B5CF6'}}>{Math.round(strength*100)}%</span>
                  </div>
                  <input type="range" min={0.1} max={1} step={0.05} value={strength} onChange={e=>setStrength(Number(e.target.value))} style={{width:'100%',accentColor:'#8B5CF6',cursor:'pointer'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#9CA3AF',marginTop:1}}><span>创意发挥</span><span>忠于原图</span></div>
                </div>
              )}
            </div>
          )}

          <div style={{height:1,background:'#F3F4F6'}}/>

          {/* Ratio */}
          <div>
            <div style={{fontSize:10,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:7}}>图片比例</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {RATIO_OPTS_T2I.map(r=>(
                <button key={r.label} onClick={()=>setRatio(r)} style={{
                  padding:'5px 9px',borderRadius:7,border:'none',textAlign:'center',
                  background:ratio.label===r.label?'#8B5CF620':'#F3F4F6',
                  color:ratio.label===r.label?'#8B5CF6':'#6B7280',
                  fontSize:10,fontWeight:700,cursor:'pointer',lineHeight:1.4,
                  outline:ratio.label===r.label?'1.5px solid #8B5CF640':'1.5px solid transparent',
                  transition:'all 0.15s',
                }}>
                  <div>{r.label}</div><div style={{fontSize:8,opacity:.7,fontWeight:400}}>{r.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <div style={{fontSize:10,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:7}}>风格</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {STYLE_OPTS_T2I.map(s=>(
                <button key={s.value} onClick={()=>setStyleV(s.value)} style={{
                  padding:'4px 9px',borderRadius:6,border:'none',
                  background:styleV===s.value?'#8B5CF620':'#F3F4F6',
                  color:styleV===s.value?'#8B5CF6':'#6B7280',
                  fontSize:11,fontWeight:styleV===s.value?700:500,cursor:'pointer',
                  outline:styleV===s.value?'1.5px solid #8B5CF650':'1.5px solid transparent',
                  transition:'all 0.15s',
                }}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Quality & Count */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[{label:'质量',opts:QUALITY_OPTS,val:quality,set:setQuality},{label:'数量',opts:COUNT_OPTS.map(c=>`${c} 张`),val:`${count} 张`,set:(v:string)=>setCount(parseInt(v))}].map(({label,opts,val,set})=>(
              <div key={label}>
                <div style={{fontSize:10,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{label}</div>
                <div style={{display:'flex',flexDirection:'column',gap:3}}>
                  {opts.map(o=>(
                    <button key={o} onClick={()=>set(o)} style={{
                      padding:'5px 8px',borderRadius:6,border:'none',textAlign:'left',
                      background:val===o?'#8B5CF615':'#F9FAFB',
                      color:val===o?'#8B5CF6':'#6B7280',
                      fontSize:11,fontWeight:val===o?700:400,cursor:'pointer',
                      outline:val===o?'1.5px solid #8B5CF640':'1.5px solid transparent',
                    }}>{o}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Generate */}
          <button onClick={handleGenerate} disabled={running||!canGenerate} style={{
            width:'100%',padding:'11px',borderRadius:10,border:'none',
            background:running||!canGenerate?'#E5E7EB':'linear-gradient(135deg,#8B5CF6,#7C3AED)',
            color:running||!canGenerate?'#9CA3AF':'#fff',
            fontSize:14,fontWeight:800,cursor:running||!canGenerate?'not-allowed':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:7,
            boxShadow:canGenerate&&!running?'0 4px 14px rgba(139,92,246,0.4)':'none',
            transition:'all 0.2s',letterSpacing:0.5,
          }}>
            {running?<><RefreshCw size={14} style={{animation:'spin 0.8s linear infinite'}}/>生成中…</>:<><Wand2 size={14}/>立即生成</>}
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 20px',background:'#fff',borderBottom:'1px solid #EAECF0',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#111'}}>生成结果</div>
            <div style={{fontSize:11,color:'#9CA3AF'}}>共 {results.length} 张{selected.size>0&&<span style={{color:'#8B5CF6',marginLeft:6,fontWeight:700}}>已选 {selected.size} 张</span>}</div>
          </div>
          <div style={{flex:1}}/>
          {results.length>0&&<button onClick={toggleAll} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,border:'1px solid #E5E7EB',background:'#fff',color:'#374151',fontSize:12,fontWeight:600,cursor:'pointer'}}>
            {selected.size===results.length?<CheckSquare size={13} color="#8B5CF6"/>:<Square size={13} color="#9CA3AF"/>}全选
          </button>}
          {selected.size>0&&<button style={{display:'flex',alignItems:'center',gap:5,padding:'6px 14px',borderRadius:8,border:'none',background:'#10B981',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',boxShadow:'0 3px 8px rgba(16,185,129,0.35)'}}><Download size={13}/>下载已选 ({selected.size})</button>}
          {results.length>0&&<button onClick={()=>{setResults([]);setSelected(new Set());}} style={{padding:'5px 12px',borderRadius:7,border:'1px solid #E5E7EB',background:'#fff',color:'#6B7280',fontSize:12,fontWeight:600,cursor:'pointer'}}>清空</button>}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:20}}>
          {results.length===0?(
            <div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
              <div style={{width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#F5F3FF,#EDE9FE)',border:'1.5px solid #DDD6FE',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Wand2 size={30} color="#8B5CF6"/>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:15,fontWeight:700,color:'#374151',marginBottom:6}}>{mode==='text'?'输入描述词，开始文生图':'上传参考图，开始图生图'}</div>
                <div style={{fontSize:12,color:'#9CA3AF'}}>{mode==='text'?'支持中英文，AI 理解语义生成画面':'基于参考图风格，AI 生成全新变体'}</div>
              </div>
              {mode==='text'&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',maxWidth:420}}>
                  {QUICK_PROMPTS.map(q=>(
                    <button key={q} onClick={()=>setPrompt(q)} style={{padding:'5px 12px',borderRadius:20,border:'1px solid #E5E7EB',background:'#fff',color:'#6B7280',fontSize:11,fontWeight:500,cursor:'pointer',transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='#8B5CF6';e.currentTarget.style.color='#8B5CF6';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E7EB';e.currentTarget.style.color='#6B7280';}}
                    >{q}</button>
                  ))}
                </div>
              )}
            </div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:12,animation:'fadeUp 0.3s ease'}}>
              {results.map(item=>{
                const isSel=selected.has(item.id);
                const ar=item.ratio==='16:9'?'16/9':item.ratio==='1:1'?'1/1':'9/16';
                return(
                  <div key={item.id} onClick={()=>toggleSel(item.id)} style={{borderRadius:12,overflow:'hidden',cursor:'pointer',border:`2px solid ${isSel?'#8B5CF6':'transparent'}`,boxShadow:isSel?'0 0 0 3px #8B5CF625,0 4px 12px rgba(0,0,0,0.1)':'0 2px 8px rgba(0,0,0,0.08)',background:'#fff',transition:'all 0.2s'}}>
                    <div style={{position:'relative',aspectRatio:ar,background:'#F3F4F6'}}>
                      <img src={item.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                      <div style={{position:'absolute',top:7,left:7,width:20,height:20,borderRadius:6,background:isSel?'#8B5CF6':'rgba(0,0,0,0.3)',border:`2px solid ${isSel?'#8B5CF6':'rgba(255,255,255,0.6)'}`,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}>
                        {isSel&&<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <a href={item.url} download={`gen_${item.id}.png`} onClick={e=>e.stopPropagation()} style={{position:'absolute',top:7,right:7,width:26,height:26,borderRadius:7,background:'rgba(0,0,0,0.45)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',backdropFilter:'blur(4px)'}}>
                        <Download size={12}/>
                      </a>
                    </div>
                    <div style={{padding:'7px 9px',borderTop:'1px solid #F3F4F6'}}>
                      <div style={{fontSize:10,color:'#6B7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.prompt||'图生图'}</div>
                      <div style={{fontSize:9,color:'#C4CAD4',marginTop:2}}>{item.ratio} · 刚刚生成</div>
                    </div>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ImageStyleApp() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [appMode, setAppMode]         = useState<'style' | 'gen'>('style');

  const [presets, setPresets]         = useState<StylePreset[]>(DEFAULT_PRESETS);
  const [preset, setPreset]           = useState<StylePreset>(DEFAULT_PRESETS[0]);
  const [promptText, setPromptText]   = useState(DEFAULT_PRESETS[0].prompt);
  const [editModal, setEditModal]     = useState<{ open: boolean; target: StylePreset | null }>({ open: false, target: null });

  const [files, setFiles]             = useState<UploadedFile[]>([]);
  const [results, setResults]         = useState<UploadedFile[]>([]);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [zoom, setZoom]               = useState(100);

  const [similarity, setSim]          = useState(0.8);
  const [mode, setMode]               = useState<'ref' | 'ai'>('ref');
  const [format, setFormat]           = useState('PNG');
  const [ratio, setRatio]             = useState('9:16 竖屏');
  const [model, setModel]             = useState(MODELS[0]);
  const [running, setRunning]         = useState(false);
  const [progress, setProgress]       = useState({ cur: 0, total: 0 });
  const [dragOver, setDragOver]       = useState(false);

  const addFiles = useCallback((fs: File[]) => {
    const imgs = fs.filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...imgs.map(f => ({ id: uid(), file: f, url: URL.createObjectURL(f), status: 'idle' as const }))]);
  }, []);

  const removeFile = (id: string) => setFiles(p => { const f = p.find(x => x.id === id); if (f) URL.revokeObjectURL(f.url); return p.filter(x => x.id !== id); });

  const clearAll = () => { files.forEach(f => URL.revokeObjectURL(f.url)); setFiles([]); setResults([]); setSelected(new Set()); setProgress({ cur: 0, total: 0 }); };

  const toggleSelect = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(selected.size === results.length ? new Set() : new Set(results.map(r => r.id)));

  const handleStart = async () => {
    const pending = files.filter(f => f.status === 'idle');
    if (!pending.length) return;
    setRunning(true);
    setProgress({ cur: 0, total: pending.length });
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setProgress({ cur: i + 1, total: pending.length });
      setFiles(p => p.map(f => f.id === item.id ? { ...f, status: 'processing' } : f));
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
      const done = { ...item, status: 'done' as const, resultUrl: item.url };
      setFiles(p => p.map(f => f.id === item.id ? done : f));
      setResults(p => [...p, done]);
    }
    setRunning(false);
    setProgress({ cur: 0, total: 0 });
  };

  const deletePreset = (id: string) => {
    const next = presets.filter(p => p.id !== id);
    setPresets(next);
    if (preset.id === id && next.length) { setPreset(next[0]); setPromptText(next[0].prompt); }
  };

  const handleSavePreset = (updated: StylePreset) => {
    setPresets(prev => {
      const exists = prev.find(p => p.id === updated.id);
      return exists ? prev.map(p => p.id === updated.id ? updated : p) : [...prev, updated];
    });
    if (preset.id === updated.id) { setPreset(updated); setPromptText(updated.prompt); }
    setEditModal({ open: false, target: null });
  };

  const canStart = files.some(f => f.status === 'idle') && !running;
  const doneCount = results.length;
  const cardW = Math.round(150 * zoom / 100);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F6FA', fontFamily: "'Inter','PingFang SC',sans-serif", overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:none } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .preset-row:hover .preset-actions { opacity: 1 !important; }
      `}</style>

      {/* ══ Header ══ */}
      <header style={{
        height: 52, background: '#fff', borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
        flexShrink: 0, zIndex: 20,
      }}>
        <button onClick={() => navigate('/')} style={{
          display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
          cursor: 'pointer', color: '#6B7280', fontSize: 13, fontWeight: 600,
          padding: '5px 10px', borderRadius: 7,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#111'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6B7280'; }}
        >
          <ArrowLeft size={14} /> 返回首页
        </button>

        <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'linear-gradient(135deg,#F59E0B,#EF4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 8px rgba(245,158,11,0.4)',
          }}><Sparkles size={14} color="#fff" /></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#111', lineHeight: 1.2 }}>投放素材平台</div>
            <div style={{ fontSize: 10, color: '#9CA3AF' }}>Ai图像风格化工具</div>
          </div>
        </div>

        {/* ── Mode tabs ── */}
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 10, padding: 3, marginLeft: 16 }}>
          {([
            { key: 'style', label: '🎨 风格转换' },
            { key: 'gen',   label: '✨ 文生图' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setAppMode(key)} style={{
              padding: '6px 16px', borderRadius: 8, border: 'none',
              background: appMode === key ? '#fff' : 'transparent',
              color: appMode === key ? '#111' : '#9CA3AF',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: appMode === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Progress pill */}
        {running && appMode === 'style' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 14px', borderRadius: 99,
            background: '#F5F3FF', border: '1px solid #DDD6FE',
          }}>
            <RefreshCw size={12} color="#8B5CF6" style={{ animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>
              正在生成… ({progress.cur}/{progress.total})
            </span>
          </div>
        )}

        {/* Clear */}
        {appMode === 'style' && files.length > 0 && (
          <button onClick={clearAll} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: '#fff', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; }}
          >清空全部</button>
        )}

        {/* Start — only in style mode */}
        {appMode === 'style' && <button onClick={handleStart} disabled={!canStart} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 20px', borderRadius: 9, border: 'none',
          background: running ? '#EDE9FE' : canStart ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)' : '#E5E7EB',
          color: running ? '#7C3AED' : canStart ? '#fff' : '#9CA3AF',
          fontSize: 13, fontWeight: 700, cursor: canStart ? 'pointer' : 'not-allowed',
          boxShadow: canStart && !running ? '0 4px 12px rgba(139,92,246,0.4)' : 'none',
          transition: 'all 0.2s',
        }}>
          {running
            ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />处理中</>
            : <><Zap size={13} />开始处理</>}
        </button>}

        <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
          onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      </header>

      {/* ══ Body ══ */}
      {appMode === 'gen' ? <TextToImagePanel /> : (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left Sidebar ── */}
        <aside style={{
          width: 200, background: '#fff', borderRight: '1px solid #E5E7EB',
          display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>参数配置</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>调整风格和输出参数</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 风格预设 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>风格预设 *</span>
                <button onClick={() => setEditModal({ open: true, target: null })} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 5,
                  border: '1px dashed #C4B5FD', background: 'none', color: '#8B5CF6', cursor: 'pointer', fontWeight: 700,
                }}>+ 创作风格</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {presets.map(p => {
                  const active = preset.id === p.id;
                  return (
                    <div key={p.id} className="preset-row" style={{ position: 'relative' }}>
                      <button onClick={() => { setPreset(p); setPromptText(p.prompt); }} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 8px', borderRadius: 9, border: 'none',
                        background: active ? p.bg : 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                        outline: active ? `2px solid ${p.color}35` : '2px solid transparent',
                        transition: 'all 0.15s',
                      }}>
                        {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: p.color, flexShrink: 0 }} />}
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                          background: active ? `${p.color}20` : '#F3F4F6',
                          border: `1.5px solid ${active ? p.color + '40' : '#E5E7EB'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                        }}>
                          {p.iconUrl
                            ? <img src={p.iconUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : p.emoji}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? p.color : '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </span>
                      </button>
                      {/* Edit / Delete on hover */}
                      <div className="preset-actions" style={{
                        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                        display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s',
                      }}>
                        <button onClick={e => { e.stopPropagation(); setEditModal({ open: true, target: p }); }} style={{
                          width: 22, height: 22, borderRadius: 5, border: 'none',
                          background: '#F3F4F6', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><Pencil size={11} /></button>
                        <button onClick={e => { e.stopPropagation(); deletePreset(p.id); }} style={{
                          width: 22, height: 22, borderRadius: 5, border: 'none',
                          background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><Trash2 size={11} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ height: 1, background: '#F3F4F6' }} />

            {/* 相似度 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>相似度</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: preset.color }}>{similarity.toFixed(1)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.1} value={similarity} onChange={e => setSim(Number(e.target.value))}
                style={{ width: '100%', accentColor: preset.color, cursor: 'pointer' }} />
              <div style={{ display: 'flex', marginTop: 8, background: '#F3F4F6', borderRadius: 7, padding: 3 }}>
                {(['ref', 'ai'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex: 1, padding: '5px', borderRadius: 5, border: 'none',
                    background: mode === m ? '#fff' : 'transparent',
                    color: mode === m ? '#111' : '#9CA3AF',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}>{m === 'ref' ? '参照原图' : 'AI发挥'}</button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: '#F3F4F6' }} />

            {/* 输出参数 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: '输出格式', opts: FORMATS, val: format, set: setFormat },
                { label: '尺寸比例', opts: RATIOS,   val: ratio,  set: setRatio  },
                { label: '模型选择', opts: MODELS,   val: model,  set: setModel  },
              ].map(({ label, opts, val, set }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
                  <Sel value={val} onChange={set} opts={opts} />
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: '#F3F4F6' }} />

            {/* 预计消耗 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>预计消耗积分</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: preset.color }}>{files.filter(f => f.status === 'idle').length} / 张</span>
            </div>
          </div>
        </aside>

        {/* ── Right Main ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ─ 资源管理区 ─ */}
          <section style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            {/* Section header */}
            <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>资源管理</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>已上传 {files.length} 个素材</div>
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => fileInputRef.current?.click()} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 8,
                border: '1.5px solid #8B5CF6', background: '#fff',
                color: '#8B5CF6', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                <Upload size={13} /> 本地上传
              </button>
            </div>

            {/* Upload drop zone */}
            <div style={{ padding: '0 20px 12px' }}>
              <div
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => files.length === 0 && fileInputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${dragOver ? preset.color : '#C4B5FD'}`,
                  borderRadius: 12, padding: files.length > 0 ? '8px 12px' : '32px',
                  background: dragOver ? preset.bg : '#FDFCFF',
                  transition: 'all 0.2s', cursor: files.length === 0 ? 'pointer' : 'default',
                }}>
                {files.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F3FF', border: '1.5px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Upload size={20} color="#8B5CF6" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 3 }}>点击上传或拖拽文件</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>支持 JPG、PNG、WEBP 格式</div>
                    </div>
                  </div>
                ) : (
                  /* Queue grid */
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {files.map(item => (
                      <div key={item.id} style={{ position: 'relative', width: 80, height: 80 }}>
                        <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, display: 'block' }} />

                        {/* Processing spinner */}
                        {item.status === 'processing' && (
                          <div style={{
                            position: 'absolute', inset: 0, borderRadius: 10,
                            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                          </div>
                        )}

                        {/* Done check */}
                        {item.status === 'done' && (
                          <div style={{ position: 'absolute', bottom: 4, right: 4 }}>
                            <CheckCircle2 size={16} color="#10B981" fill="#fff" />
                          </div>
                        )}

                        {/* Remove */}
                        <button onClick={() => removeFile(item.id)} style={{
                          position: 'absolute', top: -6, right: -6,
                          width: 20, height: 20, borderRadius: '50%', border: 'none',
                          background: '#EF4444', color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        }}><X size={11} /></button>

                        {/* Filename */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, borderRadius: '0 0 10px 10px',
                          background: 'linear-gradient(transparent,rgba(0,0,0,0.65))', padding: '12px 4px 4px',
                        }}>
                          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.file.name}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add more */}
                    <button onClick={() => fileInputRef.current?.click()} style={{
                      width: 80, height: 80, borderRadius: 10,
                      border: '2px dashed #E5E7EB', background: '#F9FAFB',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 4, cursor: 'pointer', color: '#9CA3AF',
                      transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = preset.color; e.currentTarget.style.color = preset.color; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#9CA3AF'; }}
                    >
                      <Plus size={18} />
                      <span style={{ fontSize: 10, fontWeight: 600 }}>添加</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ─ 处理结果区 ─ */}
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F5F6FA' }}>
            {/* Results header */}
            <div style={{
              padding: '10px 20px', background: '#fff', borderBottom: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>处理结果</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                  共 {doneCount} 张图片
                  {selected.size > 0 && <span style={{ color: preset.color, marginLeft: 6, fontWeight: 700 }}>已选择 {selected.size} 张</span>}
                </div>
              </div>
              <div style={{ flex: 1 }} />

              {/* Select all */}
              {doneCount > 0 && (
                <button onClick={toggleAll} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff',
                  color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  {selected.size === doneCount ? <CheckSquare size={13} color={preset.color} /> : <Square size={13} color="#9CA3AF" />}
                  全选
                </button>
              )}

              {/* Download selected */}
              {selected.size > 0 && (
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 14px', borderRadius: 7, border: 'none',
                  background: '#10B981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 3px 8px rgba(16,185,129,0.35)',
                }}>
                  <Download size={13} /> 下载已选 ({selected.size})
                </button>
              )}

              {/* Zoom controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff' }}>
                <button onClick={() => setZoom(z => Math.max(50, z - 25))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', padding: 0, display: 'flex', alignItems: 'center' }}><ZoomOut size={13} /></button>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(200, z + 25))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', padding: 0, display: 'flex', alignItems: 'center' }}><ZoomIn size={13} /></button>
              </div>
            </div>

            {/* Results grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {doneCount === 0 ? (
                <div style={{
                  height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12, color: '#9CA3AF',
                }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={26} color="#D1D5DB" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF' }}>暂无处理结果</div>
                    <div style={{ fontSize: 12, color: '#C4CAD4', marginTop: 4 }}>上传图片后点击「开始处理」</div>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 12,
                  animation: 'fadeUp 0.3s ease',
                }}>
                  {results.map(item => {
                    const isSel = selected.has(item.id);
                    return (
                      <div key={item.id} onClick={() => toggleSelect(item.id)} style={{
                        width: cardW, borderRadius: 12, overflow: 'hidden',
                        border: `2px solid ${isSel ? preset.color : 'transparent'}`,
                        boxShadow: isSel ? `0 0 0 3px ${preset.color}25, 0 4px 12px rgba(0,0,0,0.1)` : '0 2px 8px rgba(0,0,0,0.08)',
                        cursor: 'pointer', transition: 'all 0.2s', background: '#fff', flexShrink: 0,
                      }}>
                        {/* Image */}
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '9/16', background: '#F3F4F6' }}>
                          <img src={item.resultUrl || item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          {/* Checkbox overlay */}
                          <div style={{
                            position: 'absolute', top: 8, left: 8,
                            width: 20, height: 20, borderRadius: 6,
                            border: `2px solid ${isSel ? preset.color : 'rgba(255,255,255,0.7)'}`,
                            background: isSel ? preset.color : 'rgba(0,0,0,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}>
                            {isSel && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>
                          {/* Download */}
                          <a href={item.resultUrl} download={`styled_${item.file.name}`} onClick={e => e.stopPropagation()}
                            style={{
                              position: 'absolute', top: 8, right: 8,
                              width: 26, height: 26, borderRadius: 7,
                              background: 'rgba(0,0,0,0.45)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              textDecoration: 'none', backdropFilter: 'blur(4px)',
                            }}>
                            <Download size={12} />
                          </a>
                        </div>
                        {/* Footer */}
                        <div style={{ padding: '7px 10px', borderTop: '1px solid #F3F4F6' }}>
                          <div style={{ fontSize: 10, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: preset.color }}>{preset.emoji}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: preset.color }}>{preset.name}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      )}

      {/* ══ Edit Preset Modal ══ */}
      {editModal.open && (
        <EditPresetModal
          preset={editModal.target}
          onSave={handleSavePreset}
          onClose={() => setEditModal({ open: false, target: null })}
        />
      )}
    </div>
  );
}
