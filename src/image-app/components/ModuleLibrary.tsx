import { Plus } from 'lucide-react';
import {
  Plane,
  Wifi,
  Bluetooth,
  Radio,
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
  Lock,
  Star,
  Search,
  Home,
  Settings,
  Heart,
  Zap,
  LucideIcon,
} from 'lucide-react';

interface ModuleTemplate {
  name: string;
  icon: LucideIcon;
  iconName: string;
  size: 'single' | 'horizontal' | 'vertical' | 'large';
  backgroundColor: string;
  iconColor: string;
}

const moduleTemplates: ModuleTemplate[] = [
  // 单格模块（圆形）
  { name: '飞行模式', icon: Plane, iconName: 'Plane', size: 'single', backgroundColor: 'rgba(255, 255, 255, 0.3)', iconColor: '#4A5FBE' },
  { name: 'WiFi', icon: Wifi, iconName: 'Wifi', size: 'single', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#4A5FBE' },
  { name: '蓝牙', icon: Bluetooth, iconName: 'Bluetooth', size: 'single', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#4A5FBE' },
  { name: '蜂窝网络', icon: Radio, iconName: 'Radio', size: 'single', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#4A5FBE' },
  { name: '手电筒', icon: Flashlight, iconName: 'Flashlight', size: 'single', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#FFFFFF' },
  { name: '闹钟', icon: AlarmClock, iconName: 'AlarmClock', size: 'single', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#FFFFFF' },
  { name: '计算器', icon: Calculator, iconName: 'Calculator', size: 'single', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#FFFFFF' },
  { name: '相机', icon: Camera, iconName: 'Camera', size: 'single', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#FFFFFF' },
  { name: '旋转锁定', icon: RotateCw, iconName: 'RotateCw', size: 'single', backgroundColor: 'rgba(245, 245, 220, 0.5)', iconColor: '#4A5FBE' },
  { name: '铃声', icon: Bell, iconName: 'Bell', size: 'single', backgroundColor: 'rgba(245, 245, 220, 0.5)', iconColor: '#4A5FBE' },
  { name: '电池', icon: Battery, iconName: 'Battery', size: 'single', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#4A5FBE' },
  { name: '锁定', icon: Lock, iconName: 'Lock', size: 'single', backgroundColor: 'rgba(245, 245, 220, 0.5)', iconColor: '#4A5FBE' },
  { name: '收藏', icon: Star, iconName: 'Star', size: 'single', backgroundColor: 'rgba(245, 245, 220, 0.5)', iconColor: '#4A5FBE' },
  { name: '搜索', icon: Search, iconName: 'Search', size: 'single', backgroundColor: 'rgba(245, 245, 220, 0.5)', iconColor: '#4A5FBE' },
  { name: '主页', icon: Home, iconName: 'Home', size: 'single', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#FFFFFF' },
  { name: '喜欢', icon: Heart, iconName: 'Heart', size: 'single', backgroundColor: 'rgba(255, 107, 107, 0.5)', iconColor: '#FFFFFF' },
  { name: '快捷指令', icon: Zap, iconName: 'Zap', size: 'single', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#FFFFFF' },

  // 横向两格模块
  { name: '勿扰模式', icon: Moon, iconName: 'Moon', size: 'horizontal', backgroundColor: 'rgba(245, 245, 220, 0.5)', iconColor: '#4A5FBE' },
  { name: '设置', icon: Settings, iconName: 'Settings', size: 'horizontal', backgroundColor: 'rgba(211, 211, 211, 0.5)', iconColor: '#FFFFFF' },

  // 竖向两格模块
  { name: '亮度', icon: Sun, iconName: 'Sun', size: 'vertical', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#4A5FBE' },
  { name: '音量', icon: Volume2, iconName: 'Volume2', size: 'vertical', backgroundColor: 'rgba(211, 211, 211, 0.5)', iconColor: '#FFFFFF' },

  // 大方块模块（2x2）
  { name: '音乐', icon: Music, iconName: 'Music', size: 'large', backgroundColor: 'rgba(255, 217, 61, 0.5)', iconColor: '#4A5FBE' },
];

interface ModuleLibraryProps {
  onAddModule: (template: ModuleTemplate) => void;
}

export function ModuleLibrary({ onAddModule }: ModuleLibraryProps) {
  const getSizeLabel = (size: string) => {
    switch (size) {
      case 'single':
        return '1x1';
      case 'horizontal':
        return '2x1';
      case 'vertical':
        return '1x2';
      case 'large':
        return '2x2';
      default:
        return size;
    }
  };

  const getSizeIcon = (size: string) => {
    switch (size) {
      case 'single':
        return '●';
      case 'horizontal':
        return '▬';
      case 'vertical':
        return '▮';
      case 'large':
        return '■';
      default:
        return '';
    }
  };

  // 按尺寸分组
  const groupedModules = {
    single: moduleTemplates.filter((m) => m.size === 'single'),
    horizontal: moduleTemplates.filter((m) => m.size === 'horizontal'),
    vertical: moduleTemplates.filter((m) => m.size === 'vertical'),
    large: moduleTemplates.filter((m) => m.size === 'large'),
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 标题 */}
      <div className="p-6 border-b bg-gradient-to-r from-green-500 to-teal-600 text-white">
        <h2 className="text-2xl font-bold">模块库</h2>
        <p className="text-sm mt-1 opacity-90">点击添加模块</p>
      </div>

      {/* 模块列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 单格模块 */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <span className="text-lg">{getSizeIcon('single')}</span>
            单格模块 (1x1)
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {groupedModules.single.map((template, index) => {
              const Icon = template.icon;
              return (
                <button
                  key={index}
                  onClick={() => onAddModule(template)}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-md transition-all group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: template.backgroundColor,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: template.iconColor }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-800 text-sm">{template.name}</div>
                  </div>
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 横向模块 */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <span className="text-lg">{getSizeIcon('horizontal')}</span>
            横向模块 (2x1)
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {groupedModules.horizontal.map((template, index) => {
              const Icon = template.icon;
              return (
                <button
                  key={index}
                  onClick={() => onAddModule(template)}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-md transition-all group"
                >
                  <div
                    className="w-16 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: template.backgroundColor,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: template.iconColor }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-800 text-sm">{template.name}</div>
                  </div>
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 竖向模块 */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <span className="text-lg">{getSizeIcon('vertical')}</span>
            竖向模块 (1x2)
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {groupedModules.vertical.map((template, index) => {
              const Icon = template.icon;
              return (
                <button
                  key={index}
                  onClick={() => onAddModule(template)}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-md transition-all group"
                >
                  <div
                    className="w-10 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: template.backgroundColor,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: template.iconColor }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-800 text-sm">{template.name}</div>
                  </div>
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 大方块模块 */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <span className="text-lg">{getSizeIcon('large')}</span>
            大方块 (2x2)
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {groupedModules.large.map((template, index) => {
              const Icon = template.icon;
              return (
                <button
                  key={index}
                  onClick={() => onAddModule(template)}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-md transition-all group"
                >
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: template.backgroundColor,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: template.iconColor }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-800 text-sm">{template.name}</div>
                  </div>
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ModuleTemplate };
