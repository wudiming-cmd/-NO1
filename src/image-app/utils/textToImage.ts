// WARNING: API密钥暴露在前端代码中存在安全风险
// 生产环境建议使用后端代理服务来保护API密钥
const SILICONFLOW_API_KEY = 'YOUR_SILICONFLOW_API_KEY_HERE';
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/images/generations';

export interface TextToImageOptions {
  prompt: string;
  negativePrompt?: string;
  imageSize?: '512x512' | '768x768' | '1024x1024' | '1536x1024' | '1024x1536';
  batchSize?: number;
  seed?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
}

export interface TextToImageResult {
  imageUrl: string;
  seed: number;
}

// 推荐的模型列表
export const RECOMMENDED_MODELS = {
  // 通用模型
  'stabilityai/stable-diffusion-3-5-large': {
    name: 'Stable Diffusion 3.5 Large',
    description: '高质量通用图像生成',
    category: 'general',
  },
  'black-forest-labs/FLUX.1-schnell': {
    name: 'FLUX.1 Schnell',
    description: '快速生成，适合图标',
    category: 'icon',
  },
  'stabilityai/stable-diffusion-xl-base-1.0': {
    name: 'SDXL Base',
    description: '经典SDXL模型',
    category: 'general',
  },
  // 图标专用模型
  'Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design': {
    name: 'Logo Design',
    description: 'Logo和图标设计专用',
    category: 'icon',
  },
} as const;

export type ModelName = keyof typeof RECOMMENDED_MODELS;

/**
 * 使用硅基流动API生成图片
 * @param options 生成选项
 * @param model 使用的模型
 * @returns 生成的图片URL和随机种子
 */
export async function generateImageFromText(
  options: TextToImageOptions,
  model: ModelName = 'black-forest-labs/FLUX.1-schnell'
): Promise<TextToImageResult> {
  try {
    console.log('开始文生图生成...', options);

    const requestBody = {
      model: model,
      prompt: options.prompt,
      negative_prompt: options.negativePrompt || '',
      image_size: options.imageSize || '1024x1024',
      batch_size: options.batchSize || 1,
      seed: options.seed,
      guidance_scale: options.guidanceScale || 7.5,
      num_inference_steps: options.numInferenceSteps || 20,
    };

    const response = await fetch(SILICONFLOW_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
      
      // 如果是API key错误，提供友好提示
      if (response.status === 401 || response.status === 403) {
        throw new Error('API密钥无效或未配置，请在 /src/app/utils/textToImage.ts 中配置正确的硅基流动API密钥');
      }
      
      throw new Error(errorData.error?.message || errorData.message || `API请求失败 (${response.status})`);
    }

    const data = await response.json();
    console.log('API响应数据:', data);

    // 硅基流动API返回格式
    const imageUrl = data.images?.[0]?.url;
    const seed = data.images?.[0]?.seed || 0;

    if (!imageUrl) {
      console.error('完整响应数据:', JSON.stringify(data, null, 2));
      throw new Error('API未返回图片URL');
    }

    console.log('生成成功:', { imageUrl, seed });
    
    return {
      imageUrl,
      seed,
    };
  } catch (error) {
    console.error('Text to image generation error:', error);
    if (error instanceof Error) {
      throw new Error(`图片生成失败: ${error.message}`);
    }
    throw new Error('图片生成失败: 未知错误');
  }
}

/**
 * 将远程图片URL转换为base64 data URL
 * @param imageUrl 远程图片URL
 * @returns base64 data URL
 */
export async function convertImageUrlToDataURL(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('Failed to convert image to data URL'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image URL to data URL:', error);
    throw error;
  }
}

/**
 * 为iOS控制中心图标优化提示词
 * @param userPrompt 用户输入的提示词
 * @returns 优化后的提示词
 */
export function optimizeIconPrompt(userPrompt: string): string {
  // 添加图标风格的关键词
  const iconStyle = 'minimalist icon, flat design, simple, clean, modern, professional';
  const technical = 'vector style, centered composition, solid background';
  const quality = 'high quality, sharp, clear';
  
  return `${userPrompt}, ${iconStyle}, ${technical}, ${quality}`;
}

/**
 * 生成图标的推荐负面提示词
 */
export const ICON_NEGATIVE_PROMPT = 
  'blurry, low quality, pixelated, noisy, distorted, watermark, text, words, complex, detailed background, photorealistic, 3d render, sketch, drawing';

/**
 * 预设的图标生成提示词模板
 */
export const ICON_PROMPT_TEMPLATES = {
  wifi: {
    prompt: 'WiFi signal icon',
    description: 'WiFi信号图标',
  },
  bluetooth: {
    prompt: 'Bluetooth connection icon',
    description: '蓝牙连接图标',
  },
  airplane: {
    prompt: 'Airplane mode icon',
    description: '飞行模式图标',
  },
  music: {
    prompt: 'Music note icon',
    description: '音乐图标',
  },
  camera: {
    prompt: 'Camera lens icon',
    description: '相机图标',
  },
  flashlight: {
    prompt: 'Flashlight beam icon',
    description: '手电筒图标',
  },
  battery: {
    prompt: 'Battery charging icon',
    description: '电池图标',
  },
  alarm: {
    prompt: 'Alarm clock icon',
    description: '闹钟图标',
  },
  calculator: {
    prompt: 'Calculator icon',
    description: '计算器图标',
  },
  settings: {
    prompt: 'Settings gear icon',
    description: '设置图标',
  },
};

/**
 * Mock函数：模拟API调用（用于开发测试）
 * 当没有配置真实API key时使用
 */
export async function generateImageFromTextMock(
  options: TextToImageOptions
): Promise<TextToImageResult> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const seed = Math.floor(Math.random() * 1000000);
  
  // 根据提示词生成不同颜色的SVG图标
  const promptLower = options.prompt.toLowerCase();
  let iconColor = '#667eea'; // 默认紫色
  let iconPath = ''; // SVG路径
  
  // 根据关键词选择颜色
  if (promptLower.includes('wifi') || promptLower.includes('network')) {
    iconColor = '#4facfe';
    iconPath = 'M12 20h.01M8.5 16.5a5 5 0 017 0M5 13a10 10 0 0114 0';
  } else if (promptLower.includes('bluetooth')) {
    iconColor = '#2196F3';
    iconPath = 'M6.5 6.5l11 11m-11 0l11-11m-5.5 5.5v-11l6 6l-6 6v11l-6-6z';
  } else if (promptLower.includes('music') || promptLower.includes('audio')) {
    iconColor = '#f093fb';
    iconPath = 'M9 18V5l12-2v13M9 18c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm12-3c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z';
  } else if (promptLower.includes('camera') || promptLower.includes('photo')) {
    iconColor = '#FF6B6B';
    iconPath = 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z M12 17a4 4 0 100-8 4 4 0 000 8z';
  } else if (promptLower.includes('flashlight') || promptLower.includes('light')) {
    iconColor = '#FFD93D';
    iconPath = 'M9 2h6v4H9V2zm-1 6h8l1 1v13H7V9l1-1zm4 3v7';
  } else if (promptLower.includes('airplane') || promptLower.includes('flight')) {
    iconColor = '#00D4AA';
    iconPath = 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';
  } else if (promptLower.includes('battery') || promptLower.includes('power')) {
    iconColor = '#4CAF50';
    iconPath = 'M16 7H8v10h8V7zm1-2h-2V3h-6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z';
  } else if (promptLower.includes('alarm') || promptLower.includes('clock')) {
    iconColor = '#FF9800';
    iconPath = 'M12 6v6l4 2M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10z M6 3L4 5m16-2l2 2';
  } else if (promptLower.includes('calculator')) {
    iconColor = '#9C27B0';
    iconPath = 'M4 2h16a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm3 14h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 12h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 4h10v4H7V4z';
  } else if (promptLower.includes('settings') || promptLower.includes('gear')) {
    iconColor = '#607D8B';
    iconPath = 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z';
  } else {
    // 默认星星图标
    iconColor = '#667eea';
    iconPath = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
  }
  
  // 创建SVG图标
  const svg = `
    <svg width="512" height="512" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" fill="transparent"/>
      <path d="${iconPath}" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  `;
  
  // 将SVG转换为data URL
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  
  return {
    imageUrl: svgDataUrl,
    seed,
  };
}

/**
 * 智能选择：如果API key未配置，自动使用mock函数
 */
export async function smartGenerateImage(
  options: TextToImageOptions,
  model?: ModelName
): Promise<TextToImageResult> {
  // 检查API key是否配置
  if (SILICONFLOW_API_KEY === 'YOUR_SILICONFLOW_API_KEY_HERE') {
    console.warn('⚠️ 硅基流动API密钥未配置，使用Mock模式（生成SVG图标）');
    console.warn('💡 要使用真实AI生成，请在 /src/app/utils/textToImage.ts 中配置您的硅基流动API密钥');
    console.info('ℹ️ Mock模式会根据提示词智能生成SVG图标，可用于开发测试');
    return generateImageFromTextMock(options);
  }
  
  return generateImageFromText(options, model);
}