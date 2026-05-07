import React from 'react';
import type { ModuleData } from '../types';

interface Props {
  modules: ModuleData[];
  selectedModuleId: string | null;
  selectedModuleIds: string[];
  onSelect: (id: string) => void;
}

export default function ModuleQuickNav({ modules, selectedModuleId, selectedModuleIds, onSelect }: Props) {
  const sorted = [...modules].sort((a, b) => a.gridY !== b.gridY ? a.gridY - b.gridY : a.gridX - b.gridX);

  return (
    <div style={{
      height: 44,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '0 14px',
      background: 'rgba(0,0,0,0.25)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginRight: 4 }}>快速跳转</span>
      {sorted.map((m) => {
        const isActive = selectedModuleId === m.id || selectedModuleIds.includes(m.id);
        const bg = m.customImage ? `url(${m.customImage})` : m.gradient || m.backgroundColor || '#1c1c1e';
        const isGradOrUrl = m.customImage || m.gradient;
        return (
          <button
            key={m.id}
            title={m.label || m.iconName}
            onClick={() => onSelect(m.id)}
            style={{
              flexShrink: 0,
              width: `${m.widthUnits * 20 + (m.widthUnits - 1) * 3}px`,
              height: `${Math.min(m.heightUnits * 20, 32)}px`,
              borderRadius: `${Math.min(m.position.borderRadius / 4, 10)}px`,
              background: isGradOrUrl ? undefined : bg,
              backgroundColor: isGradOrUrl ? undefined : (bg as string),
              backgroundImage: isGradOrUrl && !m.customImage ? (bg as string) : m.customImage ? `url(${m.customImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: isActive ? '2px solid #a5b4fc' : '1.5px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
              transition: 'transform 0.12s, border-color 0.12s',
              boxShadow: isActive ? '0 0 8px rgba(165,180,252,0.5)' : 'none',
              padding: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            {m.overlayImage && (
              <img src={m.overlayImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
