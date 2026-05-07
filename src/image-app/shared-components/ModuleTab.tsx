import { useState } from 'react';
import {
  Trash2,
  Move,
  Palette,
  AlignLeft,
  Sliders,
  Plane,
  Music,
  Flashlight,
  AlarmClock,
  Moon,
  Sun,
  Volume2,
  Calculator,
  Camera,
  RotateCw,
  Bell,
  Battery,
  Settings,
  Wifi,
  Bluetooth,
  Radio,
  Home,
  Heart,
  Star,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Search,
  Lock,
  Unlock,
  Zap,
  Thermometer,
  Cloud,
  Compass,
  Clock,
  BookOpen,
  ShoppingCart,
  Coffee,
  Mic,
  Video,
  Headphones,
  Monitor,
  Smartphone,
  Tablet,
  Watch,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleData } from '../types';

interface ModuleTabProps {
  selectedModule: ModuleData | undefined;
  selectedModules: ModuleData[];
  onModuleUpdate: (moduleId: string, updates: Partial<ModuleData>) => void;
  onBatchModuleUpdate: (moduleIds: string[], updates: Partial<ModuleData>) => void;
  onDeselect: () => void;
  onDeleteModule: (moduleId: string) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Plane, Music, Flashlight, AlarmClock, Moon, Sun, Volume2,
  Calculator, Camera, RotateCw, Bell, Battery, Settings, Wifi,
  Bluetooth, Radio, Home, Heart, Star, MapPin, Phone, Mail,
  MessageSquare, Search, Lock, Unlock, Zap, Thermometer, Cloud,
  Compass, Clock, BookOpen, ShoppingCart, Coffee, Mic, Video,
  Headphones, Monitor, Smartphone, Tablet, Watch,
};

const PRESET_COLORS = [
  'rgba(102, 126, 234, 0.85)',
  'rgba(255, 69, 180, 0.85)',
  'rgba(255, 107, 107, 0.85)',
  'rgba(255, 217, 61, 0.85)',
  'rgba(74, 144, 226, 0.85)',
  'rgba(76, 217, 100, 0.85)',
  'rgba(211, 211, 211, 0.85)',
  'rgba(245, 245, 220, 0.85)',
  'rgba(142, 68, 173, 0.85)',
  'rgba(243, 156, 18, 0.85)',
  'rgba(26, 188, 156, 0.85)',
  'rgba(231, 76, 60, 0.85)',
];

const SECTION_STYLE: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  marginBottom: 12,
};

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <Icon size={14} color="rgba(255,255,255,0.4)" />
      <span style={LABEL_STYLE}>{title}</span>
    </div>
  );
}

export function ModuleTab({
  selectedModule,
  selectedModules,
  onModuleUpdate,
  onBatchModuleUpdate,
  onDeselect,
  onDeleteModule,
}: ModuleTabProps) {
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  // 批量选中模式
  const isBatchMode = selectedModules.length > 1;
  const batchIds = selectedModules.map((m) => m.id);

  if (!selectedModule && selectedModules.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>☝️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
          点击选中一个模块
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
          在预览画布上点击任意模块<br />可以在这里编辑它的样式
        </div>
      </div>
    );
  }

  if (isBatchMode) {
    return (
      <div>
        {/* 批量选中头部 */}
        <div style={{ ...SECTION_STYLE, background: 'rgba(102,126,234,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                已选中 {selectedModules.length} 个模块
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>批量修改下方属性</div>
            </div>
            <button
              onClick={onDeselect}
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              取消选中
            </button>
          </div>
        </div>

        {/* 批量颜色 */}
        <div style={SECTION_STYLE}>
          <SectionHeader icon={Palette} title="批量背景色" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onBatchModuleUpdate(batchIds, { backgroundColor: color, gradient: undefined })}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: '2px solid rgba(255,255,255,0.1)',
                  background: color,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            ))}
          </div>
        </div>

        {/* 批量删除 */}
        <div style={SECTION_STYLE}>
          <button
            onClick={() => {
              batchIds.forEach((id) => onDeleteModule(id));
              onDeselect();
            }}
            style={{
              width: '100%',
              padding: '14px',
              background: 'rgba(255,59,48,0.1)',
              border: '1px solid rgba(255,59,48,0.2)',
              borderRadius: 14,
              color: 'rgba(255,59,48,0.9)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Trash2 size={16} />
            删除所有选中模块 ({selectedModules.length})
          </button>
        </div>
      </div>
    );
  }

  // 单个模块编辑
  const mod = selectedModule!;

  const filteredIcons = Object.entries(ICON_MAP).filter(([name]) =>
    name.toLowerCase().includes(iconSearchQuery.toLowerCase())
  );

  return (
    <div>
      {/* 头部 */}
      <div style={{ ...SECTION_STYLE, background: 'rgba(102,126,234,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
            {mod.label || mod.iconName || '未命名模块'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {mod.widthUnits}×{mod.heightUnits} 网格 · 位置 ({mod.gridX}, {mod.gridY})
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onDeselect}
            style={{
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            取消
          </button>
          <button
            onClick={() => onDeleteModule(mod.id)}
            style={{
              padding: '8px 12px',
              background: 'rgba(255,59,48,0.1)',
              border: '1px solid rgba(255,59,48,0.2)',
              borderRadius: 10,
              color: 'rgba(255,59,48,0.9)',
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Trash2 size={13} />
            删除
          </button>
        </div>
      </div>

      {/* 标签 */}
      <div style={SECTION_STYLE}>
        <SectionHeader icon={AlignLeft} title="标签文字" />
        <input
          type="text"
          value={mod.label || ''}
          onChange={(e) => onModuleUpdate(mod.id, { label: e.target.value })}
          placeholder="模块标签（可选）"
          style={{
            width: '100%',
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            color: '#fff',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 位置和大小 */}
      <div style={SECTION_STYLE}>
        <SectionHeader icon={Move} title="位置与大小" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: '列 (X)', key: 'gridX', min: 1, max: 4 },
            { label: '行 (Y)', key: 'gridY', min: 1, max: 6 },
            { label: '宽度（列）', key: 'widthUnits', min: 1, max: 4 },
            { label: '高度（行）', key: 'heightUnits', min: 1, max: 6 },
          ].map(({ label, key, min, max }) => (
            <div key={key}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>
                {label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => {
                    const current = (mod as any)[key] as number;
                    if (current > min) onModuleUpdate(mod.id, { [key]: current - 1 } as any);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 16,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  −
                </button>
                <span style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {(mod as any)[key]}
                </span>
                <button
                  onClick={() => {
                    const current = (mod as any)[key] as number;
                    if (current < max) onModuleUpdate(mod.id, { [key]: current + 1 } as any);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 16,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 圆角 */}
      <div style={SECTION_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <SectionHeader icon={Sliders} title="圆角" />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            {mod.position.borderRadius}px
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={200}
          value={mod.position.borderRadius}
          onChange={(e) =>
            onModuleUpdate(mod.id, {
              position: { ...mod.position, borderRadius: Number(e.target.value) },
            })
          }
          style={{ width: '100%', accentColor: '#667eea', cursor: 'pointer' }}
        />
      </div>

      {/* 背景色 */}
      <div style={SECTION_STYLE}>
        <SectionHeader icon={Palette} title="背景颜色" />

        {/* 预设颜色 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onModuleUpdate(mod.id, { backgroundColor: color, gradient: undefined })}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: mod.backgroundColor === color && !mod.gradient
                  ? '3px solid #fff'
                  : '2px solid rgba(255,255,255,0.1)',
                background: color,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          ))}
        </div>

        {/* 渐变预设 */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>
          渐变预设
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {[
            'linear-gradient(135deg, rgba(102,126,234,0.85) 0%, rgba(118,75,162,0.85) 100%)',
            'linear-gradient(135deg, rgba(255,107,107,0.85) 0%, rgba(255,69,180,0.85) 100%)',
            'linear-gradient(135deg, rgba(79,209,197,0.85) 0%, rgba(102,126,234,0.85) 100%)',
            'linear-gradient(to bottom, rgba(255,217,61,0.85) 0%, rgba(245,245,220,0.85) 100%)',
            'linear-gradient(135deg, rgba(76,217,100,0.85) 0%, rgba(79,209,197,0.85) 100%)',
            'linear-gradient(135deg, rgba(255,149,0,0.85) 0%, rgba(255,69,180,0.85) 100%)',
          ].map((gradient, i) => (
            <button
              key={i}
              onClick={() => onModuleUpdate(mod.id, { gradient, backgroundColor: undefined })}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: mod.gradient === gradient ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)',
                background: gradient,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          ))}
        </div>

        {/* 自定义颜色选择器 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>自定义：</span>
          <input
            type="color"
            defaultValue="#667eea"
            onChange={(e) => {
              const hex = e.target.value;
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              onModuleUpdate(mod.id, {
                backgroundColor: `rgba(${r}, ${g}, ${b}, 0.85)`,
                gradient: undefined,
              });
            }}
            style={{
              width: 44,
              height: 36,
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              cursor: 'pointer',
              background: 'none',
              padding: 2,
            }}
          />
        </div>
      </div>

      {/* 图标颜色 */}
      <div style={SECTION_STYLE}>
        <SectionHeader icon={Palette} title="图标颜色" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {['#FFFFFF', '#000000', '#4A5FBE', '#FF6B6B', '#FFD93D', '#4CD964', '#FF45B4', '#4A90E2'].map((color) => (
            <button
              key={color}
              onClick={() => onModuleUpdate(mod.id, { iconColor: color })}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: mod.iconColor === color ? '3px solid rgba(102,126,234,0.8)' : '2px solid rgba(255,255,255,0.1)',
                background: color,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          ))}
          <input
            type="color"
            value={mod.iconColor || '#FFFFFF'}
            onChange={(e) => onModuleUpdate(mod.id, { iconColor: e.target.value })}
            style={{
              width: 44,
              height: 36,
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              cursor: 'pointer',
              background: 'none',
              padding: 2,
            }}
          />
        </div>
      </div>

      {/* 百分比（仅对有 percentage 属性的模块显示） */}
      {mod.percentage !== undefined && (
        <div style={SECTION_STYLE}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionHeader icon={Sliders} title="填充百分比" />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
              {mod.percentage}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={mod.percentage}
            onChange={(e) => onModuleUpdate(mod.id, { percentage: Number(e.target.value) })}
            style={{ width: '100%', accentColor: '#667eea', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* 图标选择 */}
      <div style={SECTION_STYLE}>
        <SectionHeader icon={Settings} title="图标选择" />
        <input
          type="text"
          value={iconSearchQuery}
          onChange={(e) => setIconSearchQuery(e.target.value)}
          placeholder="搜索图标..."
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            color: '#fff',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 12,
          }}
        />
        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {filteredIcons.map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => onModuleUpdate(mod.id, { icon: Icon, iconName: name })}
              title={name}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: mod.iconName === name
                  ? '2px solid rgba(102,126,234,0.8)'
                  : '1px solid rgba(255,255,255,0.06)',
                background: mod.iconName === name
                  ? 'rgba(102,126,234,0.15)'
                  : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = mod.iconName === name
                  ? 'rgba(102,126,234,0.15)'
                  : 'rgba(255,255,255,0.03)';
              }}
            >
              <Icon size={20} color={mod.iconColor || '#fff'} />
            </button>
          ))}
        </div>
      </div>

      {/* 边框颜色 */}
      <div style={SECTION_STYLE}>
        <SectionHeader icon={Palette} title="边框颜色" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => onModuleUpdate(mod.id, { borderColor: undefined })}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: !mod.borderColor ? '2px solid rgba(102,126,234,0.8)' : '1px solid rgba(255,255,255,0.08)',
              background: !mod.borderColor ? 'rgba(102,126,234,0.1)' : 'rgba(255,255,255,0.03)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            无边框
          </button>
          <input
            type="color"
            value={mod.borderColor || '#8b8b7a'}
            onChange={(e) => onModuleUpdate(mod.id, { borderColor: `${e.target.value}4d` })}
            style={{
              width: 44,
              height: 36,
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              cursor: 'pointer',
              background: 'none',
              padding: 2,
            }}
          />
          {mod.borderColor && (
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: mod.borderColor,
              border: '1px solid rgba(255,255,255,0.15)',
            }} />
          )}
        </div>
      </div>

      {/* 底部删除按钮 */}
      <div style={{ padding: '16px 24px' }}>
        <button
          onClick={() => onDeleteModule(mod.id)}
          style={{
            width: '100%',
            padding: '14px',
            background: 'rgba(255,59,48,0.08)',
            border: '1px solid rgba(255,59,48,0.18)',
            borderRadius: 14,
            color: 'rgba(255,59,48,0.85)',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,59,48,0.14)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,59,48,0.08)';
          }}
        >
          <Trash2 size={16} />
          删除此模块
        </button>
      </div>
    </div>
  );
}
