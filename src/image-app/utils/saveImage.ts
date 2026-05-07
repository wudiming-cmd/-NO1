import html2canvas from 'html2canvas';

function copyComputedStyles(source: Element, target: HTMLElement) {
  const computed = window.getComputedStyle(source as Element);
  try {
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      const val = computed.getPropertyValue(prop);
      const priority = computed.getPropertyPriority(prop);
      try {
        target.style.setProperty(prop, val, priority);
      } catch (e) {
        // ignore unsupported properties
      }
    }
  } catch (e) {
    // fallback: copy some common properties
    const fallback = [
      'width', 'height', 'boxSizing', 'padding', 'margin', 'border', 'borderRadius',
      'background', 'backgroundImage', 'backgroundColor', 'backgroundSize', 'backgroundPosition',
      'color', 'font', 'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'display', 'opacity'
    ];
    const cs = window.getComputedStyle(source as Element);
    fallback.forEach((p) => {
      try { target.style.setProperty(p, (cs as any).getPropertyValue?.(p) || (cs as any)[p]); } catch (_) {}
    });
  }
}

function cloneAndStaticize(root: HTMLElement): HTMLElement {
  const clone = root.cloneNode(true) as HTMLElement;

  // Walk originals and clones in parallel
  const originals = Array.from(root.querySelectorAll('*')) as Element[];
  const clones = Array.from(clone.querySelectorAll('*')) as HTMLElement[];

  // include root at index 0
  originals.unshift(root);
  clones.unshift(clone);

  for (let i = 0; i < originals.length && i < clones.length; i++) {
    const orig = originals[i];
    const cl = clones[i];

    // copy computed styles
    copyComputedStyles(orig, cl);

    // Disable problematic compositing / filters that html2canvas handles poorly
    cl.style.setProperty('mix-blend-mode', 'normal', '');
    cl.style.setProperty('isolation', 'isolate', '');
    cl.style.setProperty('backdrop-filter', 'none', '');
    cl.style.setProperty('-webkit-backdrop-filter', 'none', '');
    cl.style.setProperty('filter', 'none', '');
    cl.style.setProperty('mask', 'none', '');
    cl.style.setProperty('-webkit-mask-image', 'none', '');

    // Replace real-time blur with a translucent background if backdrop-filter was used
    const cs = window.getComputedStyle(orig as Element);
    const bf = (cs as any).backdropFilter || (cs as any).getPropertyValue?.('backdrop-filter');
    if (bf && bf !== 'none') {
      cl.style.setProperty('backdrop-filter', 'none');
      // prefer original backgroundColor if available
      const bg = cs.backgroundColor || 'rgba(255,255,255,0.18)';
      try { cl.style.setProperty('background-color', bg); } catch (_) {}
    }

    // Ensure images attempt CORS loading
    if (orig instanceof HTMLImageElement && cl instanceof HTMLImageElement) {
      try {
        cl.setAttribute('crossorigin', 'anonymous');
        // keep src as-is; html2canvas will try to load with CORS
      } catch (e) {}
    }

    // Inline SVG elements: serialize and replace with <img> to avoid styling differences
    if (orig instanceof SVGElement) {
      try {
        const svgString = new XMLSerializer().serializeToString(orig);
        const svg64 = btoa(unescape(encodeURIComponent(svgString)));
        const image64 = 'data:image/svg+xml;base64,' + svg64;
        const img = document.createElement('img');
        img.src = image64;
        // copy sizing
        img.style.width = cl.style.width || (cl as any).getAttribute('width') || 'auto';
        img.style.height = cl.style.height || (cl as any).getAttribute('height') || 'auto';
        cl.replaceWith(img);
      } catch (e) {
        // fallback: leave as-is
      }
    }

    // Pseudo-elements: try to capture ::before/::after by creating siblings
    try {
      ['::before', '::after'].forEach((pseudo) => {
        const content = window.getComputedStyle(orig as Element, pseudo).getPropertyValue('content');
        if (content && content !== 'none' && content !== 'normal') {
          const pseudoEl = document.createElement('span');
          const pcs = window.getComputedStyle(orig as Element, pseudo);
          // basic properties
          pseudoEl.textContent = content.replace(/^\"|\"$/g, '');
          pseudoEl.style.position = 'absolute';
          try {
            for (let j = 0; j < pcs.length; j++) {
              const prop = pcs[j];
              pseudoEl.style.setProperty(prop, pcs.getPropertyValue(prop), pcs.getPropertyPriority(prop));
            }
          } catch (_) {}
          // attach
          cl.style.position = cl.style.position || 'relative';
          cl.insertBefore(pseudoEl, cl.firstChild);
        }
      });
    } catch (e) {}
  }

  return clone;
}

export async function handleSaveImage(elementId: string, options?: { scale?: number; filename?: string }) {
  const el = document.getElementById(elementId);
  if (!el) return;

  // 获取当前背景色，用于必要时恢复或填充
  const currentBg = window.getComputedStyle(el).backgroundColor || null;

  const scale = options?.scale ?? 3; // 按用户要求使用 scale=3
  const filename = options?.filename ?? `HD-Preview-${new Date().toISOString()}.png`;

  // create offscreen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${el.clientWidth}px`;
  container.style.height = `${el.clientHeight}px`;
  container.style.overflow = 'hidden';
  container.setAttribute('aria-hidden', 'true');

  const clone = cloneAndStaticize(el as HTMLElement);
  // ensure exact layout size
  clone.style.width = `${el.clientWidth}px`;
  clone.style.height = `${el.clientHeight}px`;

  // 在克隆上静态化处理：查找所有使用 backdrop-filter 或 blur 的元素并替换为半透明背景
  try {
    const modules = Array.from(clone.querySelectorAll<HTMLElement>('[style*="backdrop-filter"], [style*="blur"]'));
    modules.forEach((node) => {
      try {
        node.style.backdropFilter = 'none';
        node.style.filter = 'none';

        const bg = node.style.backgroundColor || window.getComputedStyle(node).backgroundColor || '';
        if (bg && bg.includes('rgba')) {
          // 将末尾的透明度替换为 0.85（更实）
          node.style.backgroundColor = bg.replace(/([\d\.]+)\)\s*$/, '0.85)');
        } else {
          node.style.backgroundColor = 'rgba(40, 40, 40, 0.9)';
        }

        // 简化阴影以避免色块产生
        node.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
      } catch (e) {
        // ignore per-node errors
      }
    });
  } catch (e) {
    // ignore
  }

  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(clone, {
      useCORS: true,
      allowTaint: false,
      // 强制黑色背景，按用户建议避免透明区域变黑的问题
      backgroundColor: '#000000',
      scale,
      logging: false,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
      onclone: (doc) => {
        // 作为保险，再次确保 cloned doc 中的模糊样式被禁用
        try {
          const mods = Array.from(doc.querySelectorAll<HTMLElement>('[style*="backdrop-filter"], [style*="blur"]'));
          mods.forEach((el) => {
            try {
              el.style.backdropFilter = 'none';
              el.style.filter = 'none';
              const bg = el.style.backgroundColor || window.getComputedStyle(el).backgroundColor || '';
              if (bg && bg.includes('rgba')) el.style.backgroundColor = bg.replace(/([\d\.]+)\)\s*$/, '0.85)');
              else el.style.backgroundColor = 'rgba(40, 40, 40, 0.9)';
              el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
            } catch (_) {}
          });
        } catch (_) {}
      }
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();

  } catch (err) {
    console.error('高清导出失败:', err);
  } finally {
    container.remove();
    // （可选）如需恢复页面背景，可在此使用 currentBg
  }
}

export default handleSaveImage;
