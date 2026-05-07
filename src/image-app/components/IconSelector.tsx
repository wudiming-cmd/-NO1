import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Plane, Wifi, Bluetooth, Radio, Music, Flashlight, AlarmClock, Moon, Sun, Volume2,
  Calculator, Camera, RotateCw, Bell, Battery, Lock, Star, Search, Home, Settings,
  Heart, Zap, Clock, MapPin, Phone, Mail, MessageCircle, Video, Image, Folder, File,
  Download, Upload, Share2, Edit, Trash2, Check, X, Plus, Minus, ChevronLeft, ChevronRight,
  LucideIcon,
} from 'lucide-react';

interface IconSelectorProps {
  currentIcon: string;
  onSelect: (iconName: string, IconComponent: LucideIcon | null, customIconUrl?: string) => void;
}

type IconItem =
  | { name: string; type: 'lucide'; Icon: LucideIcon }
  | { name: string; type: 'local'; url: string; source: 'assets' | 'upload' };

const iconList: IconItem[] = [
  { name: 'Plane', type: 'lucide', Icon: Plane },
  { name: 'Wifi', type: 'lucide', Icon: Wifi },
  { name: 'Bluetooth', type: 'lucide', Icon: Bluetooth },
  { name: 'Radio', type: 'lucide', Icon: Radio },
  { name: 'Music', type: 'lucide', Icon: Music },
  { name: 'Flashlight', type: 'lucide', Icon: Flashlight },
  { name: 'AlarmClock', type: 'lucide', Icon: AlarmClock },
  { name: 'Moon', type: 'lucide', Icon: Moon },
  { name: 'Sun', type: 'lucide', Icon: Sun },
  { name: 'Volume2', type: 'lucide', Icon: Volume2 },
  { name: 'Calculator', type: 'lucide', Icon: Calculator },
  { name: 'Camera', type: 'lucide', Icon: Camera },
  { name: 'RotateCw', type: 'lucide', Icon: RotateCw },
  { name: 'Bell', type: 'lucide', Icon: Bell },
  { name: 'Battery', type: 'lucide', Icon: Battery },
  { name: 'Lock', type: 'lucide', Icon: Lock },
  { name: 'Star', type: 'lucide', Icon: Star },
  { name: 'Search', type: 'lucide', Icon: Search },
  { name: 'Home', type: 'lucide', Icon: Home },
  { name: 'Settings', type: 'lucide', Icon: Settings },
  { name: 'Heart', type: 'lucide', Icon: Heart },
  { name: 'Zap', type: 'lucide', Icon: Zap },
  { name: 'Clock', type: 'lucide', Icon: Clock },
  { name: 'MapPin', type: 'lucide', Icon: MapPin },
  { name: 'Phone', type: 'lucide', Icon: Phone },
  { name: 'Mail', type: 'lucide', Icon: Mail },
  { name: 'MessageCircle', type: 'lucide', Icon: MessageCircle },
  { name: 'Video', type: 'lucide', Icon: Video },
  { name: 'Image', type: 'lucide', Icon: Image },
  { name: 'Folder', type: 'lucide', Icon: Folder },
  { name: 'File', type: 'lucide', Icon: File },
  { name: 'Download', type: 'lucide', Icon: Download },
  { name: 'Upload', type: 'lucide', Icon: Upload },
  { name: 'Share2', type: 'lucide', Icon: Share2 },
  { name: 'Edit', type: 'lucide', Icon: Edit },
  { name: 'Trash2', type: 'lucide', Icon: Trash2 },
  { name: 'Check', type: 'lucide', Icon: Check },
  { name: 'X', type: 'lucide', Icon: X },
  { name: 'Plus', type: 'lucide', Icon: Plus },
  { name: 'Minus', type: 'lucide', Icon: Minus },
  { name: 'ChevronLeft', type: 'lucide', Icon: ChevronLeft },
  { name: 'ChevronRight', type: 'lucide', Icon: ChevronRight },
];

const localIconFiles = (import.meta as any).glob('../../assets/icons/*.{svg,png}', { eager: true, query: '?url' }) as Record<string, string | { default: string }>;
const normalizeIconUrl = (url: string | { default: string }): string => {
  if (typeof url === 'string') return url;
  return typeof url?.default === 'string' ? url.default : '';
};
const localIconList: IconItem[] = Object.entries(localIconFiles)
  .map(([path, url]) => {
    const fileName = path.split('/').pop() || path;
    const name = fileName.replace(/\.(svg|png)$/i, '');
    return { name, type: 'local' as const, url: normalizeIconUrl(url), source: 'assets' as const };
  })
  .filter((item) => item.url) as IconItem[];

export function IconSelector({ currentIcon, onSelect }: IconSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customIcons, setCustomIcons] = useState<IconItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const groupedIcons = [
    { label: '系统图标', key: 'system', icons: iconList },
    { label: '本地图标', key: 'local', icons: localIconList },
    ...(customIcons.length > 0 ? [{ label: '上传图标', key: 'upload', icons: customIcons }] : []),
  ];

  const allIcons = [...iconList, ...localIconList, ...customIcons];
  const currentIconData = allIcons.find(({ name }) => name === currentIcon);

  // Filter by search
  const filteredGroups = searchQuery
    ? [{ label: '搜索结果', key: 'search', icons: allIcons.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())) }]
    : groupedIcons;

  const handleUploadLocalIcon = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const name = file.name.replace(/\.(svg|png)$/i, '');
        setCustomIcons((prev) => [...prev, { name, type: 'local', url: result, source: 'upload' }]);
        onSelect(name, null, result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const jumpToSection = (key: string) => {
    const el = sectionRefs.current[key];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
      {/* 折叠头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {currentIconData ? (
            <>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center' }}>
                {currentIconData.type === 'lucide' ? (
                  <currentIconData.Icon size={18} color="#fff" />
                ) : (
                  <img src={currentIconData.url} alt={currentIconData.name} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                )}
              </div>
              <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{currentIconData.name}</span>
            </>
          ) : (
            <>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center' }}>
                <X size={16} color="rgba(255,255,255,0.3)" />
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>未选择图标</span>
            </>
          )}
        </div>
        {isExpanded
          ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
          : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />}
      </button>

      {isExpanded && (
        <div style={{ background: '#0f0f1a' }}>
          {/* 搜索 + 分组快跳 */}
          <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {/* 搜索框 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 7, padding: '5px 9px', marginBottom: 8 }}>
              <Search size={12} color="rgba(255,255,255,0.3)" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索图标..."
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: '#fff' }}
              />
              {searchQuery ? (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.3)', display: 'grid', placeItems: 'center' }}>
                  <X size={11} />
                </button>
              ) : null}
            </div>

            {/* 分组快跳标签 */}
            {!searchQuery && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {groupedIcons.map(g => (
                  <button
                    key={g.key}
                    onClick={() => jumpToSection(g.key)}
                    style={{ padding: '3px 9px', borderRadius: 12, fontSize: 10, fontWeight: 600, border: '1px solid rgba(102,126,234,0.25)', background: 'rgba(102,126,234,0.08)', color: '#a5b4fc', cursor: 'pointer' }}
                  >
                    {g.label} {g.icons.length}
                  </button>
                ))}
                <label style={{ padding: '3px 9px', borderRadius: 12, fontSize: 10, fontWeight: 600, border: '1px solid rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.06)', color: '#34d399', cursor: 'pointer' }}>
                  + 上传
                  <input type="file" accept="image/svg+xml,image/png" style={{ display: 'none' }} onChange={handleUploadLocalIcon} />
                </label>
              </div>
            )}
          </div>

          {/* 图标列表 */}
          <div ref={scrollRef} style={{ maxHeight: 280, overflowY: 'auto', padding: '8px 12px 12px' }}>
            {/* 清除图标选项 */}
            {!searchQuery && (
              <button
                onClick={() => onSelect('', null)}
                style={{
                  marginBottom: 10, width: '100%', padding: '8px', borderRadius: 8, fontSize: 11,
                  border: !currentIcon ? '1.5px solid rgba(102,126,234,0.6)' : '1px solid rgba(255,255,255,0.08)',
                  background: !currentIcon ? 'rgba(102,126,234,0.1)' : 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                }}
              >
                ✕ 无图标
              </button>
            )}

            {filteredGroups.map((group) => (
              <div key={group.key} ref={el => { sectionRefs.current[group.key] = el; }} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>{group.label}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{group.icons.length} 个</span>
                </div>

                {group.icons.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '8px 0' }}>暂无图标</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                    {group.icons.map((item) => (
                      <div key={`${item.type}-${item.name}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <button
                          onClick={() => {
                            if (item.type === 'lucide') onSelect(item.name, item.Icon);
                            else onSelect(item.name, null, item.url);
                          }}
                          title={item.name}
                          style={{
                            width: '100%', aspectRatio: '1', display: 'grid', placeItems: 'center',
                            borderRadius: 8, cursor: 'pointer',
                            border: currentIcon === item.name ? '1.5px solid rgba(102,126,234,0.7)' : '1px solid rgba(255,255,255,0.08)',
                            background: currentIcon === item.name ? 'rgba(102,126,234,0.15)' : '#1c1c1e',
                            transition: 'transform 0.1s, border-color 0.15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                        >
                          {item.type === 'lucide' ? (
                            <item.Icon size={18} color={currentIcon === item.name ? '#a5b4fc' : '#fff'} />
                          ) : (
                            <img src={item.url} alt={item.name} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                          )}
                        </button>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
