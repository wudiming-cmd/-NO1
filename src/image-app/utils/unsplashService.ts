/**
 * Unsplash图片服务
 * 用于通过后端代理获取Unsplash图片
 */

export interface UnsplashImageResult {
  url: string;
  description: string;
  author: string;
}

/**
 * 从Unsplash搜索并获取图片
 * @param query 搜索关键词（例如："stitch"、"pikachu"、"sunset"）
 * @returns 图片URL
 */
export async function searchUnsplashImage(query: string): Promise<string> {
  try {
    // 使用Unsplash的随机图片API（支持搜索）
    // 这个URL格式支持CORS
    const encodedQuery = encodeURIComponent(query);
    
    // 方案1: 使用Unsplash Source API（已废弃但仍可用）
    const sourceUrl = `https://source.unsplash.com/512x512/?${encodedQuery}`;
    
    // 方案2: 使用Lorem Picsum作为后备（带seed确保同一关键词返回相同图片）
    const seed = query.toLowerCase().replace(/\s+/g, '-');
    const picsumUrl = `https://picsum.photos/seed/${seed}/512/512`;
    
    // 先尝试获取图片确认可访问性
    try {
      const response = await fetch(sourceUrl, { method: 'HEAD' });
      if (response.ok) {
        return sourceUrl;
      }
    } catch (e) {
      console.warn('Unsplash API不可用，使用Picsum后备方案');
    }
    
    // 如果Unsplash失败，使用Picsum
    return picsumUrl;
  } catch (error) {
    console.error('获取图片失败:', error);
    throw new Error('无法获取图片，请检查网络连接');
  }
}

/**
 * 将图片URL转换为Data URL
 * @param imageUrl 图片URL
 * @returns Data URL (base64)
 */
export async function convertToDataURL(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * 搜索图片并转换为Data URL
 * @param query 搜索关键词
 * @returns Data URL
 */
export async function getImageDataURL(query: string): Promise<string> {
  const imageUrl = await searchUnsplashImage(query);
  return await convertToDataURL(imageUrl);
}
