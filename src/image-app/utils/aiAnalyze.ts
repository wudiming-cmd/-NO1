// WARNING: API密钥暴露在前端代码中存在安全风险
// 生产环境建议使用后端代理服务来保护API密钥
const GEMINI_API_KEY = 'AIzaSyBVCPFfBzlkpiOB9Z4t6DWmX2zbP_-OSTk';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface AIAnalysisResult {
  backgroundColor: string;
  iconColor: string;
  label: string;
  gradient?: string;
  description: string;
}

export async function analyzeImageWithAI(imageDataURL: string): Promise<AIAnalysisResult> {
  try {
    console.log('开始AI分析（使用Gemini 1.5 Flash 8B）...');

    // 将data URL转换为base64（去掉前缀）
    const base64Data = imageDataURL.split(',')[1];
    const mimeType = imageDataURL.split(',')[0].split(':')[1].split(';')[0];

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `分析这张图片的内容和风格，并为iOS控制中心模块设计合适的配色方案。

要求：
1. 识别图片的主要内容和主题
2. 分析图片的主色调和配色风格
3. 提供适合的背景颜色（十六进制格式，例如#FF5733）
4. 提供适合的图标颜色（十六进制格式，例如#FFFFFF）
5. 提供简短的中文标签（2-4个字，例如"音乐"、"照片"）
6. 如果适合，提供CSS渐变色方案（例如linear-gradient(135deg, #667eea 0%, #764ba2 100%)），如果不需要渐变就返回null
7. 简要描述图片内容（一句话）

请严格按照以下JSON格式返回，不要添加任何其他文字：
{
  "backgroundColor": "#颜色代码",
  "iconColor": "#颜色代码",
  "label": "标签",
  "gradient": "linear-gradient(...)" 或 null,
  "description": "描述"
}`
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      }),
    });

    console.log('API响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API错误响应:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        throw new Error(`API请求失败 (${response.status}): ${errorText.substring(0, 200)}`);
      }
      throw new Error(errorData.error?.message || errorData.message || `API请求失败 (${response.status})`);
    }

    const data = await response.json();
    console.log('API响应数据:', data);

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error('完整响应数据:', JSON.stringify(data, null, 2));
      throw new Error('AI返回内容为空');
    }

    console.log('AI返回内容:', content);

    // 提取JSON内容（可能包含在markdown代码块中）
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        jsonStr = codeMatch[1];
      }
    }

    console.log('提取的JSON字符串:', jsonStr);

    let result: AIAnalysisResult;
    try {
      result = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      console.error('原始内容:', jsonStr);
      throw new Error('AI返回的JSON格式不正确');
    }

    // 验证结果
    if (!result.backgroundColor || !result.iconColor || !result.label) {
      throw new Error('AI返回的数据不完整');
    }

    console.log('解析成功:', result);
    return result;
  } catch (error) {
    console.error('AI analysis error:', error);
    if (error instanceof Error) {
      throw new Error(`AI分析失败: ${error.message}`);
    }
    throw new Error('AI分析失败: 未知错误');
  }
}
