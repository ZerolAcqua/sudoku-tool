<template>
  <aside class="card space-y-3">
    <header class="flex items-center justify-between">
      <h2 class="section-title mb-0">链视图</h2>
      <span class="text-xs text-gray-500">{{ chains.length }} 条</span>
    </header>

    <!-- 绘制中的草稿链 -->
    <div v-if="draftNodes.length > 0" class="rounded-lg border border-accent bg-gray-50 p-3 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-accent">绘制中</span>
        <span class="text-xs text-gray-600">{{ draftNodes.length }} 节点</span>
      </div>
      <ol class="space-y-1">
        <li v-for="(node, index) in draftNodes" :key="'draft-' + index" class="flex items-center gap-2 text-xs text-gray-700">
          <span class="w-4 text-gray-400">{{ index + 1 }}</span>
          <span>{{ nodeLabel(node) }}</span>
        </li>
      </ol>
      <div class="flex gap-2">
        <button class="btn-success" :disabled="draftNodes.length < 2" @click="emit('finish-draft')">
          完成链
        </button>
        <button class="btn" @click="emit('cancel-draft')">取消</button>
      </div>
      <p v-if="draftNodes.length < 2" class="text-xs text-gray-500">至少需要 2 个节点才能成链</p>
    </div>

    <p v-if="chains.length === 0 && draftNodes.length === 0" class="text-sm text-gray-500">
      暂无链。切换到「链」模式后点击候选数即可开始绘制。
    </p>

    <ul v-else-if="chains.length > 0" class="space-y-2">
      <li
        v-for="(chain, index) in chains"
        :key="chain.id ?? index"
        class="rounded-lg border transition-colors"
        :class="isSelected(chain) ? 'border-accent ring-1 ring-accent' : 'border-gray-200 hover:border-gray-300'"
      >
        <!-- 条目头 -->
        <div class="p-3 space-y-1 cursor-pointer" @click="onRowClick(chain)">
          <div class="flex items-center gap-2">
            <span
              class="w-4 h-4 rounded border border-gray-300 shrink-0"
              :style="{ backgroundColor: chain.color }"
              :title="chain.color"
            ></span>
            <span class="text-sm font-medium text-gray-800">#{{ index + 1 }}</span>
            <span class="ml-auto flex items-center gap-1 shrink-0">
              <button
                class="px-1.5 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                :class="chain.visible === false ? 'opacity-60' : ''"
                :title="chain.visible === false ? '显示该链' : '隐藏该链'"
                @click.stop="emitToggleVisible(chain)"
              >
                {{ chain.visible === false ? '显示' : '隐藏' }}
              </button>
              <button
                class="px-1.5 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-600"
                title="删除该链"
                @click.stop="emitRemove(chain)"
              >
                删除
              </button>
              <span class="w-3 text-center text-gray-400">{{ isExpanded(chain) ? '▾' : '▸' }}</span>
            </span>
          </div>
          <p class="text-xs text-gray-500">
            {{ chain.cells.length }} 节点 · {{ styleLabel(chain) }}
            <template v-if="chain.arrow"> · 箭头</template>
            <template v-if="chain.curve === 'smooth'"> · 曲线</template>
            <template v-if="chain.visible === false"> · 已隐藏</template>
          </p>
        </div>

        <!-- 展开：节点 + 样式编辑 -->
        <div v-if="isExpanded(chain)" class="border-t border-gray-100 p-3 space-y-3">
          <div class="space-y-1">
            <span class="text-xs font-medium text-gray-500">节点</span>
            <ol class="space-y-1">
              <li
                v-for="(node, nodeIndex) in chain.cells"
                :key="'node-' + nodeIndex"
                class="flex items-center gap-2 text-xs text-gray-700"
              >
                <span class="w-4 text-gray-400">{{ nodeIndex + 1 }}</span>
                <span>{{ nodeLabel(node) }}</span>
                <button
                  class="ml-auto px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                  title="删除该节点"
                  @click.stop="emitRemoveNode(chain, nodeIndex)"
                >
                  删除
                </button>
              </li>
            </ol>
          </div>

          <div class="space-y-1">
            <span class="text-xs font-medium text-gray-500">颜色</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="color in DRAWING_COLORS"
                :key="color.value"
                class="w-6 h-6 rounded border-2 transition-transform"
                :class="chain.color === color.value ? 'border-gray-900 scale-110' : 'border-gray-200'"
                :style="{ backgroundColor: color.value }"
                :title="color.name"
                @click.stop="emitUpdate(chain, { color: color.value })"
              ></button>
            </div>
          </div>

          <div class="space-y-1">
            <span class="text-xs font-medium text-gray-500">线型</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="style in CHAIN_STYLES"
                :key="style.id"
                class="px-2 py-1 text-xs rounded border transition-colors"
                :class="
                  currentStyle(chain) === style.id
                    ? 'border-accent bg-accent text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                "
                @click.stop="emitUpdate(chain, { style: style.id })"
              >
                {{ style.label }}
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 text-xs text-gray-700">
            <label class="flex items-center gap-1">
              <input type="checkbox" class="rounded" :checked="chain.arrow === true" @change="onArrowChange(chain, $event)" />
              <span>箭头</span>
            </label>
            <button
              class="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="切换直线 / 曲线"
              @click.stop="emitUpdate(chain, { curve: chain.curve === 'smooth' ? 'straight' : 'smooth' })"
            >
              {{ chain.curve === 'smooth' ? '曲线' : '直线' }}
            </button>
            <label class="flex items-center gap-1">
              <span>线宽</span>
              <select class="form-select py-1 text-xs" :value="chain.strokeWidth ?? 3" @change="onWidthChange(chain, $event)">
                <option v-for="width in CHAIN_WIDTHS" :key="width" :value="width">{{ width }}</option>
              </select>
            </label>
          </div>

          <p v-if="chain.segmentColors && chain.segmentColors.length > 0" class="text-xs text-gray-500">
            该链使用逐段异色
          </p>
        </div>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Chain, ChainNode, ChainStyle } from '@/types/sudoku';
import { CHAIN_STYLES, CHAIN_STYLE_LABELS, CHAIN_WIDTHS, DRAWING_COLORS } from '@/composables/useDrawingState';

const props = withDefaults(
  defineProps<{
    chains: Chain[];
    selectedId?: string | null;
    draftNodes?: ChainNode[];
  }>(),
  {
    selectedId: null,
    draftNodes: () => [],
  }
);

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'remove', id: string): void;
  (e: 'toggle-visible', id: string): void;
  (e: 'update', payload: { id: string; patch: Partial<Omit<Chain, 'id'>> }): void;
  (e: 'remove-node', payload: { id: string; index: number }): void;
  (e: 'finish-draft'): void;
  (e: 'cancel-draft'): void;
}>();

// 展开态由面板自持；外部选中（例如点击画布上的链）时自动展开对应条目
const expandedId = ref<string | null>(null);

watch(
  () => props.selectedId,
  (id) => {
    if (id) expandedId.value = id;
  }
);

function isSelected(chain: Chain): boolean {
  return chain.id != null && chain.id === props.selectedId;
}

function isExpanded(chain: Chain): boolean {
  return chain.id != null && chain.id === expandedId.value;
}

function onRowClick(chain: Chain): void {
  if (!chain.id) return;
  emit('select', chain.id);
  expandedId.value = expandedId.value === chain.id ? null : chain.id;
}

function nodeLabel(node: ChainNode): string {
  const base = `R${node.row + 1}C${node.col + 1}`;
  return node.candidate == null ? base : `${base} · 候选${node.candidate}`;
}

function currentStyle(chain: Chain): ChainStyle {
  return chain.style ?? 'solid';
}

function styleLabel(chain: Chain): string {
  return CHAIN_STYLE_LABELS[currentStyle(chain)];
}

function emitUpdate(chain: Chain, patch: Partial<Omit<Chain, 'id'>>): void {
  if (!chain.id) return;
  emit('update', { id: chain.id, patch });
}

function emitRemove(chain: Chain): void {
  if (!chain.id) return;
  emit('remove', chain.id);
}

function emitToggleVisible(chain: Chain): void {
  if (!chain.id) return;
  emit('toggle-visible', chain.id);
}

function emitRemoveNode(chain: Chain, index: number): void {
  if (!chain.id) return;
  emit('remove-node', { id: chain.id, index });
}

function onArrowChange(chain: Chain, event: Event): void {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  emitUpdate(chain, { arrow: target.checked });
}

function onWidthChange(chain: Chain, event: Event): void {
  const target = event.target as HTMLSelectElement | null;
  if (!target) return;
  emitUpdate(chain, { strokeWidth: Number(target.value) });
}
</script>
