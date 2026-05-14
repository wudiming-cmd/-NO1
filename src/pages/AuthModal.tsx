import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onClose?: () => void;
  defaultTab?: 'login' | 'register';
}

export default function AuthModal({ onClose, defaultTab = 'login' }: Props) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { usernameRef.current?.focus(); }, [tab]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setSuccess('');
    if (!username.trim() || !password.trim()) { setErr('请填写用户名和密码'); return; }
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(username.trim(), password);
        setSuccess('登录成功，欢迎回来！');
      } else {
        await register(username.trim(), password, invite.trim() || undefined);
        setSuccess('注册成功，欢迎加入！');
      }
      setTimeout(() => onClose?.(), 800);
    } catch (e: any) {
      setErr(e.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        .auth-input { width:100%; background:rgba(255,255,255,0.05); border:1.5px solid rgba(255,255,255,0.1);
          border-radius:12px; padding:12px 16px; color:#fff; font-size:14px; outline:none; transition:border-color 0.2s;
          box-sizing:border-box; }
        .auth-input:focus { border-color:#8B5CF6; background:rgba(139,92,246,0.08); }
        .auth-input::placeholder { color:rgba(255,255,255,0.25); }
        .auth-input::-webkit-outer-spin-button, .auth-input::-webkit-inner-spin-button { -webkit-appearance:none; }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 420,
        background: 'linear-gradient(160deg, #0f0f1a 0%, #13131f 60%, #0d0f1c 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1)',
        overflow: 'hidden',
        animation: 'slideUp 0.3s ease',
      }}>

        {/* Top gradient bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #667eea, #8B5CF6, #ec4899)' }} />

        {/* Header */}
        <div style={{ padding: '32px 32px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #667eea22, #8B5CF622)',
            border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>🎬</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            AI Studio
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
            {tab === 'login' ? '登录你的账号继续创作' : '创建账号，开始 AI 创作之旅'}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ margin: '0 32px', display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(''); setSuccess(''); }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9, border: 'none',
                background: tab === t ? 'rgba(139,92,246,0.25)' : 'transparent',
                color: tab === t ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: tab === t ? '0 2px 8px rgba(139,92,246,0.2)' : 'none',
              }}>
              {t === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ padding: '24px 32px 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Username */}
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>
                用户名
              </div>
              <input
                ref={usernameRef}
                className="auth-input"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                maxLength={20}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>
                密码
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="auth-input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder={tab === 'register' ? '至少 6 位' : '请输入密码'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 14, color: 'rgba(255,255,255,0.35)',
                  }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Invite code (register only) */}
            {tab === 'register' && (
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>
                  邀请码 <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>（选填）</span>
                </div>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="有邀请码请填写"
                  value={invite}
                  onChange={e => setInvite(e.target.value)}
                />
              </div>
            )}

            {/* Error / Success */}
            {err && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5', fontSize: 13,
                animation: 'shake 0.4s ease',
              }}>
                ⚠️ {err}
              </div>
            )}
            {success && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                color: '#6ee7b7', fontSize: 13,
              }}>
                ✅ {success}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading
                  ? 'rgba(139,92,246,0.3)'
                  : 'linear-gradient(135deg, #667eea 0%, #8B5CF6 50%, #a855f7 100%)',
                border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 15, fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(139,92,246,0.45)',
                marginTop: 4,
                letterSpacing: 0.5,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? (tab === 'login' ? '登录中…' : '注册中…') : (tab === 'login' ? '登录' : '立即注册')}
            </button>

            {/* Switch tab hint */}
            <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              {tab === 'login' ? '还没有账号？' : '已有账号？'}
              <button type="button" onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setErr(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#a78bfa', fontSize: 12, fontWeight: 700, marginLeft: 4,
                  textDecoration: 'underline',
                }}>
                {tab === 'login' ? '立即注册' : '去登录'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
