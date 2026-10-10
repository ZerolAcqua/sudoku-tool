<template>
  <Card as="aside" class="flex flex-col gap-3 p-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">链视图</h2>
      <Badge variant="secondary">{{ chains.length }} 条</Badge>
    </div>

    <!-- 绘制中的草稿链 -->
    <div v-if="draftNodes.length > 0" class="flex flex-col gap-2 rounded-lg border border-brand bg-muted/50 p-3">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-brand">绘制中</span>
        <span class="text-xs text-muted-foreground">{{ draftNodes.length }} 节点</span>
      </div>
      <ol class="flex flex-col gap-1">
        <li v-for="(node, index) in draftNodes" :key="'draft-' + index"
          class="flex items-center gap-2 text-xs text-foreground">
          <span class="w-4 text-muted-foreground">{{ index + 1 }}</span>
          <span>{{ nodeLabel(node) }}</span>
        </li>
      </ol>
      <div class="flex gap-2">
        <Button size="sm" class="bg-green-600 text-white hover:bg-green-700" :disabled="draftNodes.length < 2"
          @click="emit('finish-draft')">
          完成链
        </Button>
        <Button size="sm" variant="outline" @click="emit('cancel-draft')">取消</Button>
      </div>
      <p v-if="draftNodes.length < 2" class="text-xs text-muted-foreground">至少需要 2 个节点才能成链</p>
    </div>

    <p v-if="chains.length === 0 && draftNodes.length === 0" class="text-sm text-muted-foreground">
      暂无链。切换到「链」模式后点击候选数即可开始绘制。
    </p>

    <template v-if="chains.length > 0">
      <Collapsible v-for="(chain, index) in chains" :key="chain.id ?? index" :open="isExpanded(chain, index)"
        class="rounded-lg border transition-colors"
        :class="isSelected(chain) ? 'border-brand ring-1 ring-brand' : 'border-border'"
        @update:open="setOpen(chain, index, $event)">
      <!-- 条目头 -->
      <div class="cursor-pointer p-3" @click="onRowClick(chain, index)">
        <div class="flex items-center gap-2">
          <span class="size-4 shrink-0 rounded border border-border" :style="{ backgroundColor: chain.color }"
            :title="chain.color" />
          <span class="text-sm font-medium text-foreground">#{{ index + 1 }}</span>
          <span class="ml-auto flex shrink-0 items-center gap-1">
            <Button size="xs" variant="outline" :class="chain.visible === false ? 'opacity-60' : ''"
              :title="chain.visible === false ? '显示该链' : '隐藏该链'" @click.stop="emitToggleVisible(chain)">
              {{ chain.visible === false ? '显示' : '隐藏' }}
            </Button>
            <Button size="xs" variant="outline" class="text-muted-foreground hover:text-destructive" title="删除该链"
              @click.stop="emitRemove(chain)">
              删除
            </Button>
            <CollapsibleTrigger as-child>
              <Button size="icon-xs" variant="ghost" :aria-label="isExpanded(chain, index) ? '收起' : '展开'">
                <ChevronDown class="transition-transform" :class="isExpanded(chain, index) ? 'rotate-180' : ''" />
              </Button>
            </CollapsibleTrigger>
          </span>
        </div>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ chain.cells.length }} 节点 · {{ styleLabel(chain) }}
          <template v-if="chain.arrow"> · 箭头</template>
          <template v-if="chain.curve === 'smooth'"> · 曲线</template>
          <template v-if="chain.visible === false"> · 已隐藏</template>
        </p>
      </div>

      <!-- 展开：节点 + 样式编辑 -->
      <CollapsibleContent>
        <div class="flex flex-col gap-3 border-t border-border p-3">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground">节点</span>
            <ol class="flex flex-col gap-1">
              <li v-for="(node, nodeIndex) in chain.cells" :key="'node-' + nodeIndex"
                class="flex items-center gap-2 text-xs text-foreground">
                <span class="w-4 text-muted-foreground">{{ nodeIndex + 1 }}</span>
                <span>{{ nodeLabel(node) }}</span>
                <Button size="xs" variant="outline" class="ml-auto" title="删除该节点"
                  @click.stop="emitRemoveNode(chain, nodeIndex)">
                  删除
                </Button>
              </li>
            </ol>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground">颜色</span>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="color in DRAWING_COLORS" :key="color.value" type="button"
                class="size-6 rounded border-2 transition-transform"
                :class="chain.color === color.value ? 'border-foreground scale-110' : 'border-border'"
                :style="{ backgroundColor: color.value }" :title="color.name"
                @click.stop="emitUpdate(chain, { color: color.value })" />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground">线型</span>
            <ToggleGroup :model-value="currentStyle(chain)" type="single" variant="outline" size="sm"
              class="w-fit bg-muted/50 p-0.5" @update:model-value="onStyleChange(chain, $event)">
              <ToggleGroupItem v-for="style in CHAIN_STYLES" :key="style.id" :value="style.id"
                class="px-2 text-xs data-[state=on]:bg-brand data-[state=on]:text-brand-foreground">
                {{ style.label }}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div class="flex flex-wrap items-center gap-3 text-xs text-foreground">
            <label class="flex items-center gap-1.5">
              <Switch :model-value="chain.arrow === true" @update:model-value="onArrowChange(chain, $event)" />
              <span>箭头</span>
            </label>
            <Button size="xs" variant="outline" title="切换直线 / 曲线"
              @click.stop="emitUpdate(chain, { curve: chain.curve === 'smooth' ? 'straight' : 'smooth' })">
              {{ chain.curve === 'smooth' ? '曲线' : '直线' }}
            </Button>
            <label class="flex items-center gap-1.5">
              <span>线宽</span>
              <select class="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
                :value="chain.strokeWidth ?? 3" @change="onWidthChange(chain, $event)">
                <option v-for="width in CHAIN_WIDTHS" :key="width" :value="width">{{ width }}</option>
              </select>
            </label>
          </div>

          <p v-if="chain.segmentColors && chain.segmentColors.length > 0" class="text-xs text-muted-foreground">
            该链使用逐段异色
          </p>
        </div>
      </CollapsibleContent>
      </Collapsible>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ChevronDown } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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

// 展开态：按链 id 记录（无 id 时退回下标），支持同时展开多条
const openKeys = ref<Record<string, boolean>>({});

// 稳定 key：优先链 id，其次下标
function chainKey(chain: Chain, index: number): string {
  return chain.id ?? `idx-${index}`;
}

// 外部选中（例如点击画布上的链）时自动展开对应条目
watch(
  () => props.selectedId,
  (id) => {
    if (id) openKeys.value = { ...openKeys.value, [id]: true };
  }
);

function isSelected(chain: Chain): boolean {
  return chain.id != null && chain.id === props.selectedId;
}

function isExpanded(chain: Chain, index: number): boolean {
  return openKeys.value[chainKey(chain, index)] === true;
}

function setOpen(chain: Chain, index: number, open: boolean): void {
  openKeys.value = { ...openKeys.value, [chainKey(chain, index)]: open };
}

// 点击条目：选中该链，并切换展开态
function onRowClick(chain: Chain, index: number): void {
  if (!chain.id) return;
  emit('select', chain.id);
  setOpen(chain, index, !isExpanded(chain, index));
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

// ToggleGroup 单选：值为空串（取消选中）时忽略，保持当前线型不变
function onStyleChange(chain: Chain, value: unknown): void {
  if (typeof value !== 'string' || !value) return;
  emitUpdate(chain, { style: value as ChainStyle });
}

function onArrowChange(chain: Chain, value: unknown): void {
  emitUpdate(chain, { arrow: value === true });
}

function onWidthChange(chain: Chain, event: Event): void {
  const target = event.target as HTMLSelectElement | null;
  if (!target) return;
  emitUpdate(chain, { strokeWidth: Number(target.value) });
}
</script>
