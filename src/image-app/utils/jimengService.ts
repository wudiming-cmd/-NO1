/**
 * 即梦 AI (Dreamina) — Volcengine CV API
 *
 * Auth:  HMAC-SHA256 (Volcengine SigV4, Go SDK style — no VOLCENGINE prefix)
 * Flow:  CVSync2AsyncSubmitTask → task_id → poll CVSync2AsyncGetResult until done
 * Queue: Free tier = 1 concurrent; serial queue enforces this
 * CORS:  Browser → Vite proxy /api/volcengine → visual.volcengineapi.com
 */

const AK = import.meta.env.VITE_VOLCENGINE_AK ?? '';
const SK = import.meta.env.VITE_VOLCENGINE_SK ?? '';

const REAL_HOST  = 'visual.volcengineapi.com';
const PROXY_BASE = '/api/volcengine';
const SERVICE    = 'cv';
const REGION     = 'cn-north-1';
const VERSION    = '2022-08-31';
const REQ_KEY    = 'jimeng_t2i_v30'; // 即梦文生图3.0

// ---------- Public types ----------

export type AspectRatio = '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
export type ImageStyle  = 'general' | 'anime' | 'art';

export interface JimengRequest {
  prompt: string;
  negativePrompt?: string;
  ratio?: AspectRatio;
  style?: ImageStyle;
}

export interface JimengResult {
  imageUrls: string[];
  requestId: string;
}

// ---------- Serial queue (free tier: max 1 concurrent task) ----------

type Task = () => Promise<void>;
const _queue: Task[] = [];
let _running = false;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    _queue.push(async () => {
      try { resolve(await fn()); } catch (e) { reject(e); }
    });
    _drain();
  });
}

async function _drain() {
  if (_running || _queue.length === 0) return;
  _running = true;
  while (_queue.length > 0) {
    const t = _queue.shift()!;
    try { await t(); } catch {}
  }
  _running = false;
}

export function getQueueLength(): number {
  return _queue.length + (_running ? 1 : 0);
}

// ---------- Web Crypto helpers ----------

const _enc = new TextEncoder();

async function _sha256(msg: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', _enc.encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function _hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', k, _enc.encode(msg));
}

function _hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Volcengine SigV4 key derivation — Go SDK style: HMAC(SK, date) with no prefix
async function _signingKey(date: string): Promise<ArrayBuffer> {
  const kDate    = await _hmac(_enc.encode(SK), date);
  const kRegion  = await _hmac(kDate,   REGION);
  const kService = await _hmac(kRegion, SERVICE);
  return              _hmac(kService, 'request');
}

// ---------- Signed API call ----------

async function _callAPI(action: string, body: object): Promise<any> {
  const now      = new Date();
  const datetime = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const date     = datetime.slice(0, 8);
  const bodyStr  = JSON.stringify(body);
  const payHash  = await _sha256(bodyStr);
  const qs       = `Action=${action}&Version=${VERSION}`;

  const canonHeaders =
    `content-type:application/json\n` +
    `host:${REAL_HOST}\n` +
    `x-content-sha256:${payHash}\n` +
    `x-date:${datetime}\n`;
  const signedHeaders = 'content-type;host;x-content-sha256;x-date';

  const canonReq = ['POST', '/', qs, canonHeaders, signedHeaders, payHash].join('\n');
  const credScope  = `${date}/${REGION}/${SERVICE}/request`;
  const stringSign = ['HMAC-SHA256', datetime, credScope, await _sha256(canonReq)].join('\n');

  const sig  = _hex(await _hmac(await _signingKey(date), stringSign));
  const auth = `HMAC-SHA256 Credential=${AK}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;

  const res = await fetch(`${PROXY_BASE}?${qs}`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/json',
      'X-Date':           datetime,
      'X-Content-Sha256': payHash,
      'Authorization':    auth,
    },
    body: bodyStr,
  });

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch {
    throw new Error(`非 JSON 响应 (${res.status}): ${text.slice(0, 200)}`);
  }

  const apiErr = json?.ResponseMetadata?.Error;
  if (apiErr) throw new Error(`${apiErr.Code}: ${apiErr.Message}`);
  if (json?.code !== undefined && json.code !== 10000) {
    throw new Error(json.message || `业务错误 ${json.code}`);
  }
  return json;
}

// ---------- Async task polling ----------

function _sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

async function _submitAndPoll(
  submitBody: object,
  onStatus?: (msg: string) => void,
  maxWaitMs = 120_000,
  pollIntervalMs = 3_000
): Promise<string[]> {

  // 1. Submit task
  onStatus?.('正在提交任务…');
  const submitRes = await _callAPI('CVSync2AsyncSubmitTask', submitBody);
  const taskId: string = submitRes?.data?.task_id;
  if (!taskId) throw new Error('提交成功但未返回 task_id');

  // 2. Poll for result
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    await _sleep(pollIntervalMs);
    attempt++;
    onStatus?.(`等待生成结果… (${attempt * Math.round(pollIntervalMs / 1000)}s)`);

    const pollRes = await _callAPI('CVSync2AsyncGetResult', { req_key: REQ_KEY, task_id: taskId });
    const status: string = pollRes?.data?.status ?? '';

    if (status === 'succeed' || status === 'done') {
      const urls: string[] =
        pollRes?.data?.image_urls ??
        (pollRes?.data?.binary_data_base64 as string[] | undefined)
          ?.map((b: string) => `data:image/jpeg;base64,${b}`) ??
        [];
      if (urls.length === 0) throw new Error('任务完成但无图片返回');
      return urls;
    }

    if (status === 'failed') {
      const detail = pollRes?.data?.error_detail ?? pollRes?.data?.fail_reason ?? '';
      throw new Error(`生成失败: ${detail || '未知原因'}`);
    }
    // status: 'in_queue' | 'processing' — keep waiting
  }
  throw new Error('等待超时（2分钟），请稍后重试');
}

// ---------- Dimension map ----------

const RATIO_SIZE: Record<AspectRatio, [number, number]> = {
  '9:16': [720,  1280],
  '1:1':  [1024, 1024],
  '16:9': [1280, 720],
  '3:4':  [768,  1024],
  '4:3':  [1024, 768],
};

// ---------- Public API ----------

export async function generateImage(
  req: JimengRequest,
  onStatus?: (msg: string) => void
): Promise<JimengResult> {
  return enqueue(async () => {
    const [w, h] = RATIO_SIZE[req.ratio ?? '1:1'];
    const body = {
      req_key:         REQ_KEY,
      prompt:          req.prompt,
      negative_prompt: req.negativePrompt ?? '',
      width:           w,
      height:          h,
      return_url:      true,
      use_pre_llm:     true,
      seed:            -1,
    };

    const imageUrls = await _submitAndPoll(body, onStatus);
    return { imageUrls, requestId: '' };
  });
}

// Convert remote URL → data: URL for canvas embedding
export async function fetchAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const res  = await fetch(url, { mode: 'cors' });
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

