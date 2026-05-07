import { useState } from 'react';
import { Upload, Palette, Type, Settings, ImageIcon, Sparkles, Trash2 } from 'lucide-react';
import { ModuleData } from '../types';
import { IconSelector } from './IconSelector';
import { ColorPicker } from './ColorPicker';

interface ControlPanelProps {
  modules: ModuleData[];
  selectedModule: ModuleData | undefined;
  backgroundImage: string;
  onModuleUpdate: (moduleId: string, updates: Partial<ModuleData>) => void;
  onBackgroundChange: (image: string) => void;
  onModuleSelect: (id: string | null) => void;
  onDeleteModule?: (moduleId: string) => void;
  onAIAnalyze?: (imageData: string) => Promise<void>;
  onGradientAngleChange?: (angle: number) => void;
}

export function ControlPanel({
  selectedModule,
  backgroundImage,
  onModuleUpdate,
  onBackgroundChange,
  onModuleSelect,
  onDeleteModule,
  onAIAnalyze,
  onGradientAngleChange,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<'background' | 'module'>('background');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onBackgroundChange(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModuleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedModule) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onModuleUpdate(selectedModule.id, { image: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAIAnalyze) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          setIsAnalyzing(true);
          try {
            await onAIAnalyze(event.target.result as string);
          } catch (error) {
            console.error('AI analysis failed:', error);
            alert('AI 分析失败，请重试');
          } finally {
            setIsAnalyzing(false);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <h1 className="text-2xl font-bold">控制中心定制工具</h1>
        <p className="text-sm mt-1 opacity-90">打造你的专属 iOS 控制中心</p>
      </div>

      {/* 选项卡 */}
      <div className="flex border-b bg-gray-50">
        <button
          onClick={() => setActiveTab('background')}
          className={`flex-1 py-3 px-4 font-medium transition-colors ${
            activeTab === 'background'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ImageIcon className="w-5 h-5 inline-block mr-2" />
          背景设置
        </button>
        <button
          onClick={() => setActiveTab('module')}
          className={`flex-1 py-3 px-4 font-medium transition-colors ${
            activeTab === 'module'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-5 h-5 inline-block mr-2" />
          模块设置
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {activeTab === 'background' && (
          <div className="space-y-6">
            {/* AI 智能填充 */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-5 border-2 border-purple-200">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-purple-700">
                <Sparkles className="w-5 h-5" />
                AI 智能填充
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                上传控制中心截图，AI 将自动分析并填充所有模块的图标、颜色和布局
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleAIScreenshot}
                className="hidden"
                id="ai-screenshot-upload"
                disabled={isAnalyzing}
              />
              <label
                htmlFor="ai-screenshot-upload"
                className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                  isAnalyzing
                    ? 'border-purple-300 bg-purple-100'
                    : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'
                }`}
              >
                <div className="text-center">
                  {isAnalyzing ? (
                    <>
                      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span className="text-sm text-purple-600 font-medium">AI 分析中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                      <span className="text-sm text-purple-700 font-medium">点击上传截图</span>
                      <span className="text-xs text-gray-500 block mt-1">支持 PNG、JPG 格式</span>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* 背景图片上传 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">手机壁纸</h3>
              <input
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                className="hidden"
                id="background-upload"
              />
              <label
                htmlFor="background-upload"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
              >
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">点击上传背景图片</span>
                  <span className="text-xs text-gray-400 block mt-1">建议比例 9:16</span>
                </div>
              </label>
              {backgroundImage && (
                <div className="mt-3">
                  <img
                    src={backgroundImage}
                    alt="Background preview"
                    className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    onClick={() => onBackgroundChange('')}
                    className="mt-2 text-sm text-red-500 hover:text-red-600"
                  >
                    移除背景
                  </button>
                </div>
              )}
            </div>

            {/* 预设背景 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">预设壁纸</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onBackgroundChange('/src/imports/themepack-WDXY-YYJ-1-720-0205-EN.jpg')}
                  className="h-32 rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors overflow-hidden"
                >
                  <img
                    src="/src/imports/themepack-WDXY-YYJ-1-720-0205-EN.jpg"
                    alt="Theme 1"
                    className="w-full h-full object-cover"
                  />
                </button>
                <button
                  onClick={() => onBackgroundChange('/src/imports/Kylian_Mbappé.png')}
                  className="h-32 rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors overflow-hidden"
                >
                  <img
                    src="/src/imports/Kylian_Mbappé.png"
                    alt="Theme 2"
                    className="w-full h-full object-cover"
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'module' && (
          <div className="space-y-6">
            {!selectedModule ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 font-medium">请先在左侧选择一个模块</p>
                <p className="text-sm text-gray-400 mt-2">
                  点击任意控制中心模块即可开始定制
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">模块编辑</h3>
                      <p className="text-sm text-gray-500">ID: {selectedModule.id}</p>
                    </div>
                    <div className="flex gap-2">
                      {onDeleteModule && (
                        <button
                          onClick={() => {
                            if (confirm('确定要删除这个模块吗？')) {
                              onDeleteModule(selectedModule.id);
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除模块"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => onModuleSelect(null)}
                        className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                      >
                        完成
                      </button>
                    </div>
                  </div>
                </div>

                {/* 图标选择 */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-800">
                    <Type className="w-4 h-4" />
                    选择图标
                  </h4>
                  <IconSelector
                    currentIcon={selectedModule.iconName}
                    onSelect={(iconName, IconComponent, customIconUrl) => {
                      onModuleUpdate(selectedModule.id, {
                        iconName,
                        icon: IconComponent,
                        customIcon: customIconUrl,
                      });
                    }}
                  />
                </div>

                {/* 标签文字 */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h4 className="font-medium mb-3 text-gray-800">标签文字</h4>
                  <input
                    type="text"
                    value={selectedModule.label || ''}
                    onChange={(e) =>
                      onModuleUpdate(selectedModule.id, { label: e.target.value })
                    }
                    placeholder="输入标签文字（可选）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 颜色设置 */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-800">
                    <Palette className="w-4 h-4" />
                    样式设置
                  </h4>
                  <ColorPicker
                    backgroundColor={selectedModule.backgroundColor || '#000000'}
                    iconColor={selectedModule.iconColor || '#FFFFFF'}
                    borderColor={selectedModule.borderColor}
                    borderRadius={selectedModule.position.borderRadius}
                    gradient={selectedModule.gradient}
                    onBackgroundChange={(color) =>
                      onModuleUpdate(selectedModule.id, { backgroundColor: color, gradient: undefined })
                    }
                    onIconColorChange={(color) =>
                      onModuleUpdate(selectedModule.id, { iconColor: color })
                    }
                    onBorderColorChange={(color) =>
                      onModuleUpdate(selectedModule.id, { borderColor: color })
                    }
                    onBorderRadiusChange={(radius) =>
                      onModuleUpdate(selectedModule.id, {
                        position: { ...selectedModule.position, borderRadius: radius },
                      })
                    }
                    onGradientAngleChange={onGradientAngleChange}
                  />
                </div>

                {/* 渐变设置 */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h4 className="font-medium mb-3 text-gray-800">渐变效果</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        onModuleUpdate(selectedModule.id, {
                          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          backgroundColor: undefined,
                        })
                      }
                      className="w-full h-14 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all"
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    />
                    <button
                      onClick={() =>
                        onModuleUpdate(selectedModule.id, {
                          gradient: 'linear-gradient(to bottom, #FFD93D 0%, #F5F5DC 100%)',
                          backgroundColor: undefined,
                        })
                      }
                      className="w-full h-14 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all"
                      style={{ background: 'linear-gradient(to bottom, #FFD93D 0%, #F5F5DC 100%)' }}
                    />
                    <button
                      onClick={() =>
                        onModuleUpdate(selectedModule.id, {
                          gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          backgroundColor: undefined,
                        })
                      }
                      className="w-full h-14 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all"
                      style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
                    />
                    <button
                      onClick={() =>
                        onModuleUpdate(selectedModule.id, {
                          gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          backgroundColor: undefined,
                        })
                      }
                      className="w-full h-14 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all"
                      style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
                    />
                  </div>
                  {selectedModule.gradient && (
                    <button
                      onClick={() =>
                        onModuleUpdate(selectedModule.id, {
                          gradient: undefined,
                        })
                      }
                      className="mt-3 text-sm text-red-500 hover:text-red-600"
                    >
                      清除渐变
                    </button>
                  )}
                </div>

                {/* 模块图片 */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h4 className="font-medium mb-3 text-gray-800">模块背景图片</h4>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleModuleImageUpload}
                    className="hidden"
                    id="module-image-upload"
                  />
                  <label
                    htmlFor="module-image-upload"
                    className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                      <span className="text-xs text-gray-500">上传模块图片</span>
                    </div>
                  </label>
                  {selectedModule.image && (
                    <div className="mt-2">
                      <img
                        src={selectedModule.image}
                        alt="Module preview"
                        className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={() => onModuleUpdate(selectedModule.id, { image: undefined })}
                        className="mt-2 text-sm text-red-500 hover:text-red-600"
                      >
                        移除图片
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
