import { useState } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ModuleStyle {
  backgroundColor?: string;
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    angle?: number;
  };
  texture?: string;
  borderRadius?: string;
  textColor?: string;
}

interface ControlCenterModuleProps {
  id: string;
  icon: LucideIcon;
  label?: string;
  style: ModuleStyle;
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

export function ControlCenterModule({ 
  id, 
  icon: Icon, 
  label, 
  style, 
  className = '', 
  onClick,
  isSelected 
}: ControlCenterModuleProps) {
  const getBackgroundStyle = () => {
    if (style.gradient) {
      const { type, colors, angle = 135 } = style.gradient;
      if (type === 'linear') {
        return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
      } else {
        return `radial-gradient(circle, ${colors.join(', ')})`;
      }
    }
    return style.backgroundColor || '#000';
  };

  const getTextureOverlay = () => {
    if (!style.texture) return null;
    
    const textures: Record<string, string> = {
      dots: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
      lines: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)`,
      grid: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
      noise: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E")`,
    };

    return textures[style.texture];
  };

  const textureStyle = getTextureOverlay();
  const textureSize = style.texture === 'dots' ? '20px 20px' : style.texture === 'grid' ? '20px 20px' : 'auto';

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer transition-all duration-200 ${className} ${
        isSelected ? 'ring-4 ring-blue-500 scale-105' : ''
      }`}
      style={{
        background: getBackgroundStyle(),
        borderRadius: style.borderRadius || '1.5rem',
        color: style.textColor || '#fff',
      }}
    >
      {textureStyle && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: textureStyle,
            backgroundSize: textureSize,
            opacity: 0.6,
          }}
        />
      )}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4">
        <Icon className="w-8 h-8" />
        {label && <span className="text-xs mt-2">{label}</span>}
      </div>
    </div>
  );
}
