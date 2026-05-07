import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp } from 'lucide-react';

const CACHE_KEY = 'googleTrendsCache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const GoogleTrendsModule: React.FC = () => {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const load = async () => {
      try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL && Array.isArray(data) && data.length > 0) {
            setTrends(data);
            setLoading(false);
            return;
          }
        }

        const API_KEY = (import.meta.env as any).VITE_SERPAPI_KEY || '6623843769a6e0836519e7e6b67f5d3b1cae972ccfd1af64774a225cdd81b7d3';
        const url = `https://serpapi.com/search.json?engine=google_trends&geo=US&api_key=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const list = (json.trending_searches || []).slice(0, 4);
        setTrends(list);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: list, ts: Date.now() })); } catch {}
      } catch (error) {
        // Silently fail — show nothing rather than spam console with 429s
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7, marginBottom: 4 }}>
          <TrendingUp size={14} color="#fff" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Google Trends</span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.08)', width: '100%' }} />
        ))}
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', padding: '12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7 }}>
          <TrendingUp size={14} color="#fff" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>设计灵感</span>
        </div>
        {['极简主义', '赛博朋克', '日落橙调', '深海蓝调'].map((tip, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 4 }}>
            <span style={{ color: '#667eea', fontWeight: 700, fontSize: 12, minWidth: 14 }}>{i + 1}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{tip}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', padding: '12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7, marginBottom: 4 }}>
        <TrendingUp size={14} color="#fff" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Google Trends</span>
      </div>
      {trends.map((item: any, index: number) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 4 }}>
          <span style={{ color: '#667eea', fontWeight: 700, fontSize: 12, minWidth: 14 }}>{index + 1}</span>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.query || item.title}
          </p>
        </div>
      ))}
    </div>
  );
};

export default GoogleTrendsModule;
