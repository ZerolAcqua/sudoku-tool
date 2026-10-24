import { describe, expect, it } from 'vitest';
import { NodeTypes } from '@vue/compiler-core';
import { parse } from 'vue/compiler-sfc';

// 规则：模板根部不能有注释（说明性注释写在 <template> 外，SFC 顶层注释不参与渲染）。
// 原因：开发模式会保留注释，根部「注释 + 元素」会让组件变成片段——
//   - 组件实例的 $el 变成文本锚点（曾导致绘图页导出图片报 setAttribute is not a function）
//   - 测试工具拿到的根元素也不对（wrapper.element 不是真正的根元素）
// 生产构建会删掉注释，所以这类问题只在 npm run dev 下出现，很难靠肉眼发现。
const sources = import.meta.glob<string>('/src/**/*.vue', { query: '?raw', import: 'default', eager: true });

describe('SFC 模板根节点', () => {
  it('能扫描到组件文件', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20);
  });

  it.each(Object.entries(sources))('%s 的模板根部没有注释', (_, source) => {
    const ast = parse(source).descriptor.template?.ast;
    const rootComments = (ast?.children ?? []).filter((node) => node.type === NodeTypes.COMMENT);
    expect(rootComments.map((c) => (c as { content: string }).content.trim().slice(0, 40))).toEqual([]);
  });
});
