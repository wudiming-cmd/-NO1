import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, Youtube, RefreshCw, ExternalLink } from 'lucide-react';

const SERPAPI_KEY = '6623843769a6e0836519e7e6b67f5d3b1cae972ccfd1af64774a225cdd81b7d3';
const TRENDS_CACHE_KEY = 'trendingPanel_google';
const YT_CACHE_KEY = 'trendingPanel_youtube';
const CACHE_TTL = 30 * 60 * 1000;

interface TrendItem {
  title: string;
  traffic?: string;
  url?: string;
}

interface YTItem {
  title: string;
  channel?: string;
  views?: string;
  thumbnail?: string;
  link?: string;
}

function loadCache<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL && Array.isArray(data) && data.length > 0) return data;
  } catch {}
  return null;
}

function saveCache(key: string, data: unknown[]) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

const STATIC_GOOGLE = ['AI Technology', 'Climate Change', 'Space Exploration', 'Electric Vehicles', 'Cryptocurrency'];
const STATIC_YT: YTItem[] = [
  { title: 'Top Music 2024', channel: 'Music Charts' },
  { title: 'AI Tutorial', channel: 'Tech Edu' },
  { title: 'Travel Vlog', channel: 'World Explorer' },
  { title: 'Cooking Tips', channel: 'Chef\'s Kitchen' },
];

const TrendingPanel: React.FC = () => {
  const [tab, setTab] = useState<'google' | 'youtube'>('google');
  const [googleTrends, setGoogleTrends] = useState<TrendItem[]>([]);
  const [ytTrends, setYtTrends] = useState<YTItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef({ google: false, youtube: false });

  const fetchGoogle = async (force = false) => {
    if (fetchedRef.current.google && !force) return;
    fetchedRef.current.google = true;
    if (!force) {
      const cached = loadCache<TrendItem>(TRENDS_CACHE_KEY);
      if (cached) { setGoogleTrends(cached); return; }
    }
    setLoading(true);
    try {
      const url = `https://serpapi.com/search.json?engine=google_trends_trending_now&geo=US&api_key=${SERPAPI_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items: TrendItem[] = (json.trending_searches || []).slice(0, 8).map((t: any) => ({
        title: t.query || t.title || '',
        traffic: t.formattedTraffic || t.traffic || '',
        url: t.relatedQueries?.[0]?.link,
      }));
      setGoogleTrends(items.length > 0 ? items : STATIC_GOOGLE.map((t) => ({ title: t })));
      saveCache(TRENDS_CACHE_KEY, items.length > 0 ? items : STATIC_GOOGLE.map((t) => ({ title: t })));
    } catch {
      setGoogleTrends(STATIC_GOOGLE.map((t) => ({ title: t })));
    } finally {
      setLoading(false);
    }
  };

  const fetchYoutube = async (force = false) => {
    if (fetchedRef.current.youtube && !force) return;
    fetchedRef.current.youtube = true;
    if (!force) {
      const cached = loadCache<YTItem>(YT_CACHE_KEY);
      if (cached) { setYtTrends(cached); return; }
    }
    setLoading(true);
    try {
      const url = `https://serpapi.com/search.json?engine=youtube&search_query=trending+2024&api_key=${SERPAPI_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items: YTItem[] = (json.video_results || []).slice(0, 6).map((v: any) => ({
        title: v.title || '',
        channel: v.channel?.name || '',
        views: v.views ? `${(v.views / 10000).toFixed(0)}万` : '',
        thumbnail: v.thumbnail?.static,
        link: v.link,
      }));
      setYtTrends(items.length > 0 ? items : STATIC_YT);
      saveCache(YT_CACHE_KEY, items.length > 0 ? items : STATIC_YT);
    } catch {
      setYtTrends(STATIC_YT);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'google') fetchGoogle();
    else fetchYoutube();
  }, [tab]);

  const handleRefresh = () => {
    fetchedRef.current = { google: false, youtube: false };
    if (tab === 'google') fetchGoogle(true);
    else fetchYoutube(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px 0', flexShrink: 0 }}>
        {([['google', TrendingUp, 'Google'], ['youtube', Youtube, 'YouTube']] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: 8,
              border: tab === key ? '1px solid rgba(102,126,234,0.5)' : '1px solid rgba(255,255,255,0.06)',
              background: tab === key ? 'rgba(102,126,234,0.15)' : 'rgba(255,255,255,0.02)',
              color: tab === key ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)', cursor: loading ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
        >
          <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!loading && tab === 'google' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {googleTrends.map((item, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span style={{ color: i < 3 ? '#667eea' : 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: 11, minWidth: 16, textAlign: 'right' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                {item.traffic && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{item.traffic}</span>}
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'youtube' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ytTrends.map((item, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: item.link ? 'pointer' : 'default' }}
                onClick={() => item.link && window.open(item.link, '_blank')}
              >
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" style={{ width: 48, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }} />
                ) : (
                  <div style={{ width: 48, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Youtube size={14} color="rgba(255,255,255,0.3)" />
                  </div>
                )}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  {item.channel && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{item.channel}{item.views ? ` · ${item.views}` : ''}</div>}
                </div>
                {item.link && <ExternalLink size={10} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingPanel;
