// WARNING: API密钥暴露在前端代码中存在安全风险
// 生产环境建议使用后端代理服务来保护API密钥
const REMOVE_BG_API_KEY = 'DJ1o1gxRrGXo41KHvNpEDoJH';

export async function removeBackground(imageFile: File | Blob): Promise<Blob> {
  const formData = new FormData();
  formData.append('image_file', imageFile);
  formData.append('size', 'auto');
  formData.append('crop', 'false'); // 不裁剪，保留原始尺寸
  formData.append('format', 'png'); // 使用 PNG 格式保留透明度

  try {
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.title || 'Failed to remove background');
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Remove.bg API error:', error);
    throw error;
  }
}

export async function removeBackgroundFromDataURL(dataURL: string): Promise<string> {
  // 将 data URL 转换为 Blob
  const response = await fetch(dataURL);
  const blob = await response.blob();

  // 调用 remove.bg API
  const resultBlob = await removeBackground(blob);

  // 将结果转换回 data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(resultBlob);
  });
}
