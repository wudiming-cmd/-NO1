import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';

interface TrendItem {
  title: string;
  traffic: string;
}

// 模拟热搜数据（实际项目中可接入 Google Trends RSS 或其他数据源）
const mockTrends: TrendItem[] = [
  { title: 'iPhone 16 Pro', traffic: '500K+' },
  { title: 'iOS 18 新功能', traffic: '200K+' },
  { title: '控制中心定制', traffic: '150K+' },
  { title: 'Apple Intelligence', traffic: '300K+' },
  { title: 'AirDrop 更新', traffic: '100K+' },
];

export default function GoogleTrendsModule() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // 模拟加载
    const timer = setTimeout(() => {
      setTrends(mockTrends);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (trends.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % trends.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [trends]);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      // 随机打乱顺序模拟刷新
      setTrends([...mockTrends].sort(() => Math.random() - 0.5));
      setLoading(false);
      setCurrentIndex(0);
    }, 600);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.08) 100%)',
        borderRadius: 12,
        padding: '10px 12px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* 标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={13} color="#10b981" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: 0.5 }}>
            热搜趋势
          </span>
        </div>
        <button
          onClick={refresh}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.6 }}
          title="刷新"
        >
          <RefreshCw
            size={11}
            color="#fff"
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
          />
        </button>
      </div>

      {/* 趋势列表 */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: 18,
              height: 18,
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: '#10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {trends.slice(0, 5).map((item, index) => (
            <div
              key={item.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '3px 6px',
                borderRadius: 6,
                background: index === currentIndex ? 'rgba(16,185,129,0.12)' : 'transparent',
                transition: 'background 0.3s ease',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: index < 3 ? '#10b981' : 'rgba(255,255,255,0.35)',
                  minWidth: 14,
                  textAlign: 'center',
                }}
              >
                {index + 1}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: index === currentIndex ? '#fff' : 'rgba(255,255,255,0.65)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.3s ease',
                  fontWeight: index === currentIndex ? 600 : 400,
                }}
              >
                {item.title}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                {item.traffic}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
