import type { LucideIcon } from 'lucide-react';

export interface ModuleData {
  id: string;
  icon: LucideIcon | null;
  iconName: string;
  position: {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius: number;
  };
  gridX: number;
  gridY: number;
  widthUnits: number;
  heightUnits: number;
  backgroundColor?: string;
  gradient?: string;
  iconColor?: string;
  iconBackgroundColor?: string;
  borderColor?: string;
  label?: string;
  animationType?: 'none' | 'glow' | 'float' | 'kenburns';
  iconAnimationType?: 'none' | 'spin' | 'pulse' | 'shake' | 'bounce' | 'swing';
  customIcon?: string;
  customImage?: string;
  customImageX?: number;    // object-position X 0-100
  customImageY?: number;    // object-position Y 0-100
  customImageScale?: number; // zoom scale 1-3
  overlayImage?: string;
  overlayX?: number;
  overlayY?: number;
  overlayScale?: number;
  percentage?: number;
  percentageColor?: string;
}
