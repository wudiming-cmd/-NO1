import React, { useState, useRef } from 'react';
import domtoimage from 'dom-to-image-more';

interface Props {
  elementId: string;
  onClose: () => void;
}

type Stage = 'idle' | 'recording' | 'done' | 'error';

export default function VideoExportModal({ elementId, onClose }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [duration, setDuration] = useState(4); // seconds
  const [fps, setFps] = useState(12);
  const stopRef = useRef(false);

  const startRecording = async () => {
    const el = document.getElementById(elementId);
    if (!el) { setErrorMsg('找不到画布元素'); setStage('error'); return; }

    setStage('recording');
    setProgress(0);
    stopRef.current = false;

    const rect = el.getBoundingClientRect();
    const W = Math.round(rect.width);
    const H = Math.round(rect.height);

    // Offscreen canvas for MediaRecorder
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm' : 'video/mp4';

    let recorder: MediaRecorder;
    try {
      const stream = canvas.captureStream(fps);
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    } catch (e) {
      setErrorMsg(`不支持录制: ${e}`);
      setStage('error');
      return;
    }

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStage('done');
    };

    recorder.start();

    const totalFrames = duration * fps;
    const frameDelay = 1000 / fps;

    for (let i = 0; i < totalFrames; i++) {
      if (stopRef.current) break;
      try {
        const dataUrl = await domtoimage.toPng(el, {
          width: W, height: H,
          style: { transform: 'none', transformOrigin: 'top left' },
          cacheBust: false,
        } as any);
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
        ctx.drawImage(img, 0, 0, W, H);
        recorder.requestData();
      } catch { /* skip frame */ }
      setProgress(Math.round(((i + 1) / totalFrames) * 100));
      await new Promise((r) => setTimeout(r, frameDelay));
    }

    recorder.stop();
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `iOS-CC-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: 24,
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🎬</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>导出动态视频</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>录制画布动画为 WebM 视频文件</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {stage === 'idle' && (
          <>
            {/* Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>录制时长</span>
                  <span style={{ fontSize: 12, color: '#a5b4fc' }}>{duration} 秒</span>
                </div>
                <input type="range" min={2} max={10} step={1} value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#667eea' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>帧率（越高越流畅，越慢）</span>
                  <span style={{ fontSize: 12, color: '#a5b4fc' }}>{fps} fps</span>
                </div>
                <input type="range" min={6} max={24} step={2} value={fps}
                  onChange={e => setFps(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#667eea' }} />
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'rgba(102,126,234,0.08)', borderRadius: 8, border: '1px solid rgba(102,126,234,0.15)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                💡 预计耗时约 <b style={{ color: '#a5b4fc' }}>{Math.round(duration * fps * 0.15)} 秒</b>（逐帧截图后合成）<br />
                确保画布中已开启动画效果（呼吸光晕 / 漂浮 / Ken Burns）
              </div>
            </div>

            <button
              onClick={startRecording}
              style={{ padding: '12px', background: 'linear-gradient(135deg,#667eea,#a855f7)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              🎬 开始录制
            </button>
          </>
        )}

        {stage === 'recording' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '8px 0' }}>
            <div style={{ width: 48, height: 48, border: '3px solid rgba(102,126,234,0.2)', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 700 }}>录制中… {progress}%</div>
            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#667eea,#a855f7)', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>正在逐帧截图并合成，请勿操作画布</div>
            <button onClick={() => { stopRef.current = true; }} style={{ padding: '6px 16px', background: 'rgba(220,53,69,0.15)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 12 }}>
              取消
            </button>
          </div>
        )}

        {stage === 'done' && videoUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <video src={videoUrl} controls loop autoPlay muted style={{ width: '100%', borderRadius: 10, background: '#000' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDownload} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#667eea,#a855f7)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                ⬇️ 下载 WebM
              </button>
              <button onClick={() => { setStage('idle'); setProgress(0); if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(null); } }} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>
                重录
              </button>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 13, color: '#f87171', marginBottom: 8 }}>❌ {errorMsg}</div>
            <button onClick={() => setStage('idle')} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 12 }}>重试</button>
          </div>
        )}
      </div>
    </div>
  );
}
