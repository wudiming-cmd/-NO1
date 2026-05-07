import { useState } from 'react';
import { Sparkles, Wand2, Palette, MessageCircle, ChevronRight, RefreshCw, Check, Loader2 } from 'lucide-react';
import {
  generateThemeFromText,
  generateColorPalette,
  chatWithDesignAI,
  type ThemeGenerationResult,
  type ColorPalette,
  type DesignSuggestion,
} from '../utils/geminiService';
import type { ModuleData } from '../types';

interface AIAssistantProps {
  modules: ModuleData[];
  onApplyTheme: (updates: Array<{ id: string } & Partial<ModuleData>>) => void;
  onBatchModuleUpdate: (moduleIds: string[], updates: Partial<ModuleData>) => void;
}

type ActiveSection = 'theme' | 'palette' | 'chat';

const PRESET_PROMPTS = [
  '赛博朋克霓虹风格',
  '苹果极简白色风',
  '深海幽蓝渐变',
  '日落橙红暖色调',
  '森林自然绿色系',
  '梦幻紫色星空',
  '复古胶卷棕色调',
  '清新薄荷冰蓝色',
];

export function AIAssistant({ modules, onApplyTheme, onBatchModuleUpdate }: AIAssistantProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('theme');

  // Theme generation
  const [themePrompt, setThemePrompt] = useState('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const [generatedTheme, setGeneratedTheme] = useState<ThemeGenerationResult | null>(null);
  const [themeError, setThemeError] = useState('');
  const [themeApplied, setThemeApplied] = useState(false);

  // Palette generation
  const [palettePrompt, setPalettePrompt] = useState('');
  const [isGeneratingPalette, setIsGeneratingPalette] = useState(false);
  const [generatedPalette, setGeneratedPalette] = useState<ColorPalette | null>(null);
  const [paletteError, setPaletteError] = useState('');

  // Chat
  const [chatInput, setChatInput] = useState('');
  const [isChating, setIsChating] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{
    role: 'user' | 'ai';
    content: DesignSuggestion | string;
  }>>([]);

  const handleGenerateTheme = async (prompt?: string) => {
    const p = prompt || themePrompt.trim();
    if (!p) return;
    setIsGeneratingTheme(true);
    setThemeError('');
    setGeneratedTheme(null);
    setThemeApplied(false);
    if (prompt) setThemePrompt(prompt);
    try {
      const result = await generateThemeFromText(p);
      setGeneratedTheme(result);
    } catch (err) {
      setThemeError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setIsGeneratingTheme(false);
    }
  };

  const handleApplyTheme = () => {
    if (!generatedTheme || modules.length === 0) return;
    const updates = modules.map((m, idx) => {
      const themeItem = generatedTheme.modules[idx % generatedTheme.modules.length];
      return {
        id: m.id,
        backgroundColor: themeItem.gradient ? undefined : themeItem.backgroundColor,
        gradient: themeItem.gradient || undefined,
        iconColor: themeItem.iconColor,
      };
    });
    onApplyTheme(updates);
    setThemeApplied(true);
    setTimeout(() => setThemeApplied(false), 2000);
  };

  const handleGeneratePalette = async () => {
    const p = palettePrompt.trim();
    if (!p) return;
    setIsGeneratingPalette(true);
    setPaletteError('');
    setGeneratedPalette(null);
    try {
      const result = await generateColorPalette(p);
      setGeneratedPalette(result);
    } catch (err) {
      setPaletteError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setIsGeneratingPalette(false);
    }
  };

  const handleApplyPaletteToAll = () => {
    if (!generatedPalette || modules.length === 0) return;
    const updates = modules.map((m, idx) => ({
      id: m.id,
      backgroundColor: generatedPalette.colors[idx % generatedPalette.colors.length],
      gradient: undefined as string | undefined,
      iconColor: '#ffffff',
    }));
    onApplyTheme(updates);
  };

  const handleChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput('');
    setIsChating(true);
    setChatHistory((prev) => [...prev, { role: 'user', content: msg }]);
    try {
      const result = await chatWithDesignAI(msg);
      setChatHistory((prev) => [...prev, { role: 'ai', content: result }]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', content: { message: `AI 回复失败：${err instanceof Error ? err.message : '未知错误'}`, suggestions: [] } },
      ]);
    } finally {
      setIsChating(false);
    }
  };

  const sectionBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '12px 8px',
    borderRadius: 10,
    border: active ? '2px solid rgba(102,126,234,0.6)' : '1px solid rgba(255,255,255,0.06)',
    background: active ? 'rgba(102,126,234,0.15)' : 'rgba(255,255,255,0.02)',
    color: active ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    transition: 'all 0.18s',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 5,
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const primaryBtnStyle = (disabled = false): React.CSSProperties => ({
    width: '100%',
    padding: '12px',
    borderRadius: 12,
    background: disabled ? 'rgba(102,126,234,0.3)' : 'linear-gradient(135deg, #667eea, #764ba2)',
    border: 'none',
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontWeight: 700,
    boxShadow: disabled ? 'none' : '0 4px 16px rgba(102,126,234,0.35)',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  });

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Sparkles size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>AI 设计助手</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>由 Gemini 2.0 驱动</div>
        </div>
      </div>

      {/* Section switcher */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={sectionBtnStyle(activeSection === 'theme')} onClick={() => setActiveSection('theme')}>
          <Wand2 size={16} />
          <span>主题生成</span>
        </button>
        <button style={sectionBtnStyle(activeSection === 'palette')} onClick={() => setActiveSection('palette')}>
          <Palette size={16} />
          <span>配色板</span>
        </button>
        <button style={sectionBtnStyle(activeSection === 'chat')} onClick={() => setActiveSection('chat')}>
          <MessageCircle size={16} />
          <span>设计问答</span>
        </button>
      </div>

      {/* ─── THEME GENERATION ─── */}
      {activeSection === 'theme' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            描述你想要的风格，AI 将为所有模块生成统一的配色主题
          </div>

          {/* Preset prompts */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>快捷风格</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handleGenerateTheme(p)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.75)',
                    cursor: 'pointer',
                    fontSize: 12,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(102,126,234,0.2)'; e.currentTarget.style.borderColor = 'rgba(102,126,234,0.5)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="自定义风格描述，如「蒸汽波粉紫色」…"
              value={themePrompt}
              onChange={(e) => setThemePrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateTheme(); }}
            />
          </div>
          <button
            onClick={() => handleGenerateTheme()}
            disabled={isGeneratingTheme || !themePrompt.trim()}
            style={primaryBtnStyle(isGeneratingTheme || !themePrompt.trim())}
          >
            {isGeneratingTheme ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Wand2 size={16} />}
            {isGeneratingTheme ? '生成中…' : '生成主题'}
          </button>

          {themeError ? (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
              {themeError}
            </div>
          ) : null}

          {/* Generated theme preview */}
          {generatedTheme && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3 }}>{generatedTheme.themeName}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{generatedTheme.description}</div>
              </div>

              {/* Color swatches */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {generatedTheme.modules.map((m, idx) => (
                  <div
                    key={idx}
                    title={m.gradient || m.backgroundColor}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: m.gradient || m.backgroundColor,
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>

              {/* Background suggestion */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: generatedTheme.backgroundGradient, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>建议背景渐变</div>
              </div>

              {/* Apply button */}
              <button
                onClick={handleApplyTheme}
                style={{
                  ...primaryBtnStyle(false),
                  background: themeApplied ? 'linear-gradient(135deg,#10b981,#06b6d4)' : 'linear-gradient(135deg,#667eea,#764ba2)',
                  boxShadow: themeApplied ? '0 4px 16px rgba(16,185,129,0.35)' : '0 4px 16px rgba(102,126,234,0.35)',
                }}
              >
                {themeApplied ? <><Check size={16} /> 已应用到所有模块</> : <><ChevronRight size={16} /> 应用到所有模块</>}
              </button>

              <button
                onClick={() => handleGenerateTheme(themePrompt || PRESET_PROMPTS[Math.floor(Math.random() * PRESET_PROMPTS.length)])}
                style={{ padding: '8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <RefreshCw size={13} />
                重新生成
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── PALETTE ─── */}
      {activeSection === 'palette' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            描述一种感觉或场景，AI 生成和谐的配色板
          </div>

          <input
            style={inputStyle}
            placeholder="如「秋天的枫叶」「夜晚的城市」…"
            value={palettePrompt}
            onChange={(e) => setPalettePrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleGeneratePalette(); }}
          />

          <button
            onClick={handleGeneratePalette}
            disabled={isGeneratingPalette || !palettePrompt.trim()}
            style={primaryBtnStyle(isGeneratingPalette || !palettePrompt.trim())}
          >
            {isGeneratingPalette ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Palette size={16} />}
            {isGeneratingPalette ? '生成中…' : '生成配色板'}
          </button>

          {paletteError ? (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
              {paletteError}
            </div>
          ) : null}

          {generatedPalette && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3 }}>{generatedPalette.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{generatedPalette.description}</div>
              </div>

              {/* Large swatches */}
              <div style={{ display: 'flex', gap: 8, height: 56, borderRadius: 12, overflow: 'hidden' }}>
                {generatedPalette.colors.map((c, idx) => (
                  <div
                    key={idx}
                    style={{ flex: 1, background: c, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}
                    title={c}
                    onClick={() => navigator.clipboard?.writeText(c).catch(() => {})}
                  >
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.3px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {c.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Color list with copy */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {generatedPalette.colors.map((c, idx) => (
                  <div
                    key={idx}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
                    onClick={() => navigator.clipboard?.writeText(c).catch(() => {})}
                    title="点击复制"
                  >
                    <div style={{ width: 24, height: 24, borderRadius: 5, background: c, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)', flex: 1 }}>{c.toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>点击复制</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleApplyPaletteToAll}
                style={primaryBtnStyle(false)}
              >
                <ChevronRight size={16} />
                批量应用到所有模块
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── CHAT ─── */}
      {activeSection === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            向 AI 提问关于设计的任何问题
          </div>

          {/* Chat history */}
          {chatHistory.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
              {chatHistory.map((msg, idx) => (
                <div key={idx}>
                  {msg.role === 'user' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: '14px 14px 4px 14px', background: 'linear-gradient(135deg,#667eea,#764ba2)', fontSize: 13, lineHeight: 1.5 }}>
                        {msg.content as string}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'grid', placeItems: 'center', flexShrink: 0, alignSelf: 'flex-start' }}>
                        <Sparkles size={13} color="#fff" />
                      </div>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px 14px 14px 14px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {typeof msg.content === 'string' ? (
                          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)' }}>{msg.content}</p>
                        ) : (
                          <>
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)' }}>
                              {(msg.content as DesignSuggestion).message}
                            </p>
                            {(msg.content as DesignSuggestion).suggestions.length > 0 && (
                              <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {(msg.content as DesignSuggestion).suggestions.map((s, i) => (
                                  <li key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{s}</li>
                                ))}
                              </ul>
                            )}
                            {(msg.content as DesignSuggestion).colorPalette && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                {(msg.content as DesignSuggestion).colorPalette!.colors.map((c, i) => (
                                  <div key={i} style={{ flex: 1, height: 20, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.1)' }} title={c} />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isChating && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Sparkles size={13} color="#fff" />
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px 14px 14px 14px', padding: '12px 14px', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#667eea', opacity: 0.6, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggested questions */}
          {chatHistory.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>推荐问题</div>
              {[
                '怎样搭配颜色让控制中心更好看？',
                '深色模式下应该怎么选颜色？',
                '什么颜色组合适合运动风格？',
                '如何让图标和背景更有层次感？',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setChatInput(q); }}
                  style={{
                    textAlign: 'left' as const,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    color: 'rgba(255,255,255,0.65)',
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(102,126,234,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <span>{q}</span>
                  <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="向 AI 提问设计建议…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isChating) handleChat(); }}
            />
            <button
              onClick={handleChat}
              disabled={isChating || !chatInput.trim()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: isChating || !chatInput.trim() ? 'rgba(102,126,234,0.3)' : 'linear-gradient(135deg,#667eea,#764ba2)',
                border: 'none',
                cursor: isChating || !chatInput.trim() ? 'not-allowed' : 'pointer',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {isChating ? <Loader2 size={16} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} /> : <ChevronRight size={16} color="#fff" />}
            </button>
          </div>

          {chatHistory.length > 0 && (
            <button
              onClick={() => setChatHistory([])}
              style={{ padding: '7px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12 }}
            >
              清除对话记录
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        @keyframes pulse { 0%,100%{opacity:0.4;transform:scale(0.8);} 50%{opacity:1;transform:scale(1.1);} }
      `}</style>
    </div>
  );
}
