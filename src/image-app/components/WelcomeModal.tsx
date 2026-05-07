import React, { useState } from 'react';

interface Props {
  onClose: () => void;
}

const FEATURES = [
  {
    icon: '🎨',
    title: '模块自由编辑',
    desc: '点击任意模块修改背景色、渐变、圆角、图标颜色，支持多选批量修改',
    color: '#667eea',
  },
  {
    icon: '🖼',
    title: '批量上传图片',
    desc: '一次选多张图片，按画布顺序自动填入「图上图」叠加层，完美呈现角色卡片',
    color: '#a855f7',
  },
  {
    icon: '✨',
    title: '即梦 AI 生图',
    desc: '输入描述词，AI 生成背景图填入当前模块；上传参考图识别风格后可填充全部模块',
    color: '#e85d04',
  },
  {
    icon: '🎭',
    title: '图上图叠加',
    desc: '为模块添加人物 / IP 叠加层，支持位置、大小调整，AI 一键抠图去除白底',
    color: '#ec4899',
  },
  {
    icon: '⚡',
    title: '批量 AI 图标',
    desc: '为 12 个模块逐一填写描述，一键全部生成并自动填充到画布对应位置',
    color: '#f59e0b',
  },
  {
    icon: '🔍',
    title: '图片资源搜索',
    desc: '搜索 Openverse 海量 CC 授权图片，点击即可添加到模块背景或叠加层',
    color: '#10b981',
  },
  {
    icon: '🌅',
    title: '全局背景定制',
    desc: '上传壁纸或使用渐变作为控制中心背景，支持模糊度调节',
    color: '#3b82f6',
  },
  {
    icon: '🤖',
    title: 'AI 主题生成',
    desc: '描述一个主题，AI 一次性为所有模块生成统一配色方案并应用到画布',
    color: '#8b5cf6',
  },
  {
    icon: '✂️',
    title: 'AI 抠图',
    desc: '模块背景图或叠加层均支持 AI 一键去除背景，保留主体人物 / 角色',
    color: '#06b6d4',
  },
  {
    icon: '📐',
    title: '位置与缩放调整',
    desc: '背景图、叠加层均可通过滑块精准调整水平/垂直位置与缩放比例',
    color: '#f97316',
  },
  {
    icon: '↩️',
    title: '撤销 / 重做',
    desc: '所有操作均可撤销重做，Ctrl+Z / Ctrl+Y 快捷键随时回退到任意历史状态',
    color: '#64748b',
  },
  {
    icon: '📤',
    title: '高清导出',
    desc: '4× 高分辨率导出为 PNG，导出记录自动保存，随时预览历史版本',
    color: '#34d399',
  },
];

export default function WelcomeModal({ onClose }: Props) {
  const [page, setPage] = useState(0);
  const perPage = 6;
  const totalPages = Math.ceil(FEATURES.length / perPage);
  const visible = FEATURES.slice(page * perPage, page * perPage + perPage);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 680,
        background: 'linear-gradient(160deg, #0f0f1a 0%, #13131f 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 28px 20px',
          background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(168,85,247,0.1) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            iOS 控制中心定制器
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6, lineHeight: 1.5 }}>
            自由设计你的 iOS 控制中心风格 · 支持 AI 生图 · 图上图叠加 · 高清导出
          </div>

          {/* Tag row */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            {['即梦AI', '批量填充', '图上图', 'AI抠图', '高清导出'].map(tag => (
              <span key={tag} style={{
                padding: '3px 10px', borderRadius: 20,
                background: 'rgba(102,126,234,0.15)',
                border: '1px solid rgba(102,126,234,0.25)',
                color: '#a5b4fc', fontSize: 11, fontWeight: 600,
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Feature grid */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 14, textAlign: 'center', letterSpacing: 1 }}>
            — 全部功能 —
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {visible.map((f) => (
              <div key={f.title} style={{
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                display: 'flex', gap: 10, alignItems: 'flex-start',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${f.color}44`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${f.color}18`,
                  border: `1px solid ${f.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>{f.title}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination dots */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i)} style={{
                  width: i === page ? 20 : 7, height: 7, borderRadius: 4,
                  background: i === page ? '#667eea' : 'rgba(255,255,255,0.15)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0,
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flex: 1, lineHeight: 1.5 }}>
            💡 点击画布中的模块开始编辑 · 右侧面板查看全部选项
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '10px 28px',
              background: 'linear-gradient(135deg, #667eea, #a855f7)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0,
              boxShadow: '0 4px 20px rgba(102,126,234,0.4)',
            }}
          >
            开始使用 →
          </button>
        </div>
      </div>
    </div>
  );
}
