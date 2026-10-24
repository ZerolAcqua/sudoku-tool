// 盘面导出：SVG 文本 / PNG / 复制图片到剪贴板
// 盘面 SVG 的颜色走 CSS 变量（var(--color-*)），文件脱离页面后变量失效，
// 因此导出前把所有 var() 解析成当前页面上的实际色值。

const VAR_PATTERN = /var\((--[\w-]+)\)/g;
const COLOR_ATTRS = ['fill', 'stroke'];

function resolveVars(value: string, styles: CSSStyleDeclaration): string {
  return value.replace(VAR_PATTERN, (match, name: string) => styles.getPropertyValue(name).trim() || match);
}

// 克隆盘面并内联颜色，返回带 XML 头的 SVG 文本
export function toSvgString(svgEl: SVGElement, size = 900): string {
  // 调用方传错节点（如组件 $el 拿到的文本锚点）时给出明确报错，而不是在 setAttribute 处崩溃
  if (!(svgEl instanceof SVGSVGElement)) throw new TypeError('toSvgString 需要一个 <svg> 元素');
  const styles = getComputedStyle(document.documentElement);
  const cloned = svgEl.cloneNode(true) as SVGElement;
  // 不要手动 setAttribute('xmlns')：XMLSerializer 总会为 SVG 命名空间的根元素输出 xmlns，
  // 再手动设一次会产生重复属性，严格的 XML 解析器（部分编辑器 / 查看器）会拒绝打开该文件。
  cloned.setAttribute('width', String(size));
  cloned.setAttribute('height', String(size));

  // 页面上盘面外留白是透明的（透出纸色），导出文件需要一层完整白底
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  const [vx = '0', vy = '0', vw = '100%', vh = '100%'] = (cloned.getAttribute('viewBox') ?? '').split(/\s+/);
  bg.setAttribute('x', vx);
  bg.setAttribute('y', vy);
  bg.setAttribute('width', vw);
  bg.setAttribute('height', vh);
  bg.setAttribute('fill', 'var(--color-surface)');
  cloned.insertBefore(bg, cloned.firstChild);

  for (const el of [cloned, ...Array.from(cloned.querySelectorAll('*'))]) {
    for (const attr of COLOR_ATTRS) {
      const value = el.getAttribute(attr);
      if (value?.includes('var(')) el.setAttribute(attr, resolveVars(value, styles));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(cloned)}`;
}

export function toPngBlob(svgEl: SVGElement, size = 900): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([toSvgString(svgEl, size)], { type: 'image/svg+xml' }));

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建画布'));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG 编码失败'))), 'image/png');
    };
    img.onerror = () => reject(new Error('SVG 渲染失败'));
    img.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

export async function copyPngToClipboard(svgEl: SVGElement, size = 900): Promise<void> {
  // ClipboardItem 接受 Promise<Blob>，Safari 要求在用户手势内同步构造
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': toPngBlob(svgEl, size) })]);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
