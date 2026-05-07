const GEMINI_API_KEY = 'AIzaSyBVCPFfBzlkpiOB9Z4t6DWmX2zbP_-OSTk';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface ThemeModule {
  backgroundColor: string;
  gradient?: string | null;
  iconColor: string;
  label?: string;
}

export interface ThemeGenerationResult {
  themeName: string;
  description: string;
  modules: ThemeModule[];
  backgroundGradient: string;
  backgroundAccent: string;
}

export interface ColorPalette {
  name: string;
  colors: string[];
  description: string;
}

export interface DesignSuggestion {
  message: string;
  suggestions: string[];
  colorPalette?: ColorPalette;
}

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API 错误 (${response.status}): ${text.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('AI 返回内容为空');
  return content;
}

function extractJSON<T>(content: string): T {
  // Try markdown code block first
  const jsonBlock = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlock) return JSON.parse(jsonBlock[1].trim()) as T;

  const codeBlock = content.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlock) return JSON.parse(codeBlock[1].trim()) as T;

  // Try bare JSON object
  const jsonObj = content.match(/\{[\s\S]*\}/);
  if (jsonObj) return JSON.parse(jsonObj[0]) as T;

  return JSON.parse(content.trim()) as T;
}

export async function generateThemeFromText(prompt: string): Promise<ThemeGenerationResult> {
  const systemPrompt = `你是一位专业的 iOS 控制中心 UI 设计师。根据用户描述，生成一套完整且视觉统一的控制中心配色主题。

用户描述：「${prompt}」

要求：
1. 生成 8 个风格各异但整体协调的模块配色
2. 颜色需符合主题氛围，有明显的主题感
3. 图标颜色与背景形成足够对比，保证可读性
4. 渐变色要自然流畅，纯色要有质感（可带透明度，如 rgba(...)）
5. backgroundGradient 是整体背景的 CSS 渐变字符串
6. backgroundAccent 是建议背景主色（十六进制）

严格按照以下 JSON 格式返回，不要添加任何注释或其他文字：
{
  "themeName": "主题名称",
  "description": "简短描述（20字以内）",
  "modules": [
    { "backgroundColor": "#hex或rgba", "gradient": "linear-gradient(...)或null", "iconColor": "#hex", "label": "可选" },
    { "backgroundColor": "#hex或rgba", "gradient": null, "iconColor": "#hex" },
    { "backgroundColor": "#hex或rgba", "gradient": "linear-gradient(...)", "iconColor": "#hex" },
    { "backgroundColor": "#hex或rgba", "gradient": null, "iconColor": "#hex" },
    { "backgroundColor": "#hex或rgba", "gradient": "linear-gradient(...)", "iconColor": "#hex" },
    { "backgroundColor": "#hex或rgba", "gradient": null, "iconColor": "#hex" },
    { "backgroundColor": "#hex或rgba", "gradient": "linear-gradient(...)", "iconColor": "#hex" },
    { "backgroundColor": "#hex或rgba", "gradient": null, "iconColor": "#hex" }
  ],
  "backgroundGradient": "linear-gradient(...)",
  "backgroundAccent": "#hex"
}`;

  const content = await callGemini(systemPrompt);
  return extractJSON<ThemeGenerationResult>(content);
}

export async function generateColorPalette(description: string): Promise<ColorPalette> {
  const prompt = `根据以下描述生成一套 iOS 风格配色方案：「${description}」

严格按照以下 JSON 格式返回，不要添加任何注释或其他文字：
{
  "name": "配色名称",
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5", "#hex6"],
  "description": "配色方案描述（30字以内）"
}`;

  const content = await callGemini(prompt);
  return extractJSON<ColorPalette>(content);
}

export async function chatWithDesignAI(userMessage: string): Promise<DesignSuggestion> {
  const prompt = `你是一位专业的 iOS 控制中心设计顾问，请用中文回答用户的设计问题，提供专业且实用的建议。

用户问题：「${userMessage}」

请严格按照以下 JSON 格式返回，不要添加任何注释或其他文字：
{
  "message": "主要建议（100字以内）",
  "suggestions": ["具体建议1", "具体建议2", "具体建议3"],
  "colorPalette": {
    "name": "推荐配色名称",
    "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
    "description": "配色说明（20字以内）"
  }
}`;

  const content = await callGemini(prompt);
  try {
    return extractJSON<DesignSuggestion>(content);
  } catch {
    return { message: content, suggestions: [] };
  }
}

export async function batchAnalyzeModuleStyle(description: string): Promise<ThemeModule> {
  const prompt = `为一个 iOS 控制中心模块生成配色，描述：「${description}」

严格按照以下 JSON 格式返回：
{
  "backgroundColor": "#hex或rgba(r,g,b,a)",
  "gradient": "linear-gradient(...)或null",
  "iconColor": "#hex",
  "label": "标签（2-4字）"
}`;

  const content = await callGemini(prompt);
  return extractJSON<ThemeModule>(content);
}

// ── 新增：从图片提取风格描述，用于即梦批量生图 ──────────────────────────
const GEMINI_VISION_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function extractStyleFromImage(base64DataUrl: string): Promise<string> {
  // 把 data:image/xxx;base64,XXXX 拆分
  const [, mime = 'image/jpeg'] = base64DataUrl.match(/^data:([^;]+);base64,/) ?? [];
  const base64 = base64DataUrl.replace(/^data:[^;]+;base64,/, '');

  const res = await fetch(`${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inlineData: { mimeType: mime, data: base64 },
          },
          {
            text: `请分析这张图片的视觉风格，输出一段20-40字的中文风格描述，专门用于AI绘图提示词。
要求：
1. 提取主色调（具体颜色词）
2. 提取风格标签（卡通/写实/极简/插画等）
3. 提取情感氛围（可爱/酷炫/温暖/神秘等）
只输出描述文字，不要任何标点符号前缀或格式，例如：
史迪奇蓝紫色调，3D卡通渲染风格，圆润可爱活泼氛围`,
          },
        ],
      }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 128 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini 图片分析失败 (${res.status})`);
  const json = await res.json();
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text.trim().replace(/^["""'「」【】\s]+|["""'「」【】\s]+$/g, '');
}
