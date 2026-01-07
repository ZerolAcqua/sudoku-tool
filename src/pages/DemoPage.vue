<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">功能测试 Demo</h1>
    
    <!-- Tab Navigation -->
    <div class="bg-white shadow rounded-lg mb-8">
      <div class="border-b border-gray-200">
        <nav class="flex -mb-px">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </div>

    <!-- Tab Content: 基础展示 -->
    <div v-show="activeTab === 'basic'">
    <!-- 不同尺寸展示 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">不同尺寸的数独盘面（纯展示模式）</h2>
      <div class="flex flex-wrap items-end justify-center gap-8">
        <div class="flex flex-col items-center">
          <p class="text-sm text-gray-600 mb-2">小尺寸 (300px)</p>
          <SudokuBoard :board="board" :given="given" :size="300" mode="display" />
        </div>
        <div class="flex flex-col items-center">
          <p class="text-sm text-gray-600 mb-2">默认尺寸 (450px)</p>
          <SudokuBoard :board="board" :given="given" :size="450" mode="display" />
        </div>
        <div class="flex flex-col items-center">
          <p class="text-sm text-gray-600 mb-2">大尺寸 (600px)</p>
          <SudokuBoard :board="board" :given="given" :size="600" mode="display" />
        </div>
      </div>
    </div>
    
    <!-- 明数与填入数展示 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">明数与填入数的区别</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">黑色数字为题目给定的明数，蓝色数字为玩家填入的数字。</p>
        <SudokuBoard 
          :board="boardWithUserInput" 
          :given="given" 
          mode="display"
        />
        <div class="text-xs text-gray-500 space-y-1">
          <p>• <span class="font-bold text-black">黑色数字</span>：题目提供的明数（given）</p>
          <p>• <span class="font-bold" style="color: var(--user-num-color)">蓝色数字</span>：玩家填入的数字</p>
        </div>
      </div>
    </div>
    
    <!-- 候选数展示 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">候选数示例（显示候选数）</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">展示在空格中的候选数（铅笔记），数字在格内按 3×3 小网格排布。</p>
        <div class="flex flex-wrap gap-2 justify-center">
          <button @click="loadSampleCandidates" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">加载示例候选</button>
          <button @click="clearCandidates" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">清空候选</button>
        </div>
        <SudokuBoard 
          :board="board" 
          :given="given" 
          :showCandidates="true" 
          :candidates="candidates" 
          mode="display"
        />
      </div>
    </div>
    </div>

    <!-- Tab Content: 交互模式 -->
    <div v-show="activeTab === 'interactive'">
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">唯余练习模式（程序预设目标格）</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">测试不同的高亮类型：行唯余、列唯余、宫唯余、复杂唯余</p>
        <div class="flex flex-wrap gap-2 justify-center mb-2">
          <button @click="highlightType = 'row'" :class="['px-3 py-1 text-sm rounded transition-colors', highlightType === 'row' ? 'bg-blue-600 text-white' : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">行唯一数</button>
          <button @click="highlightType = 'col'" :class="['px-3 py-1 text-sm rounded transition-colors', highlightType === 'col' ? 'bg-blue-600 text-white' : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">列唯一数</button>
          <button @click="highlightType = 'box'" :class="['px-3 py-1 text-sm rounded transition-colors', highlightType === 'box' ? 'bg-blue-600 text-white' : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">宫唯一数</button>
          <button @click="highlightType = 'all'" :class="['px-3 py-1 text-sm rounded transition-colors', highlightType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">唯一余数</button>
        </div>
        <SudokuBoard 
          :board="board" 
          :given="given" 
          :focusCell="practiceCell"
          :focusHighlight="highlightType"
          @cell-click="onPracticeCellClick"
          mode="practice"
        />
        <div class="flex gap-2">
          <button 
            @click="nextPracticeCell" 
            class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            下一题
          </button>
          <button 
            @click="practiceCell = null" 
            class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            清除高亮
          </button>
        </div>
      </div>
    </div>
    
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">交互模式（用户点击选中）</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">点击单元格选中，选中状态会持续显示（蓝色）</p>
        <SudokuBoard 
          :board="board" 
          :given="given" 
          :selected="selectedCell"
          @cell-click="onCellSelect"
          mode="interactive"
        />
        <p v-if="selectedCell" class="text-sm text-gray-700">
          当前选中: 行 {{ selectedCell.row + 1 }}, 列 {{ selectedCell.col + 1 }}
        </p>
      </div>
    </div>
    </div>

    <!-- Tab Content: 绘图功能 -->
    <div v-show="activeTab === 'drawing'">
      <!-- 自定义高亮示例 -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">自定义单元格高亮</h2>
        <div class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-600">为特定单元格添加自定义颜色高亮</p>
          <SudokuBoard 
            :board="board" 
            :given="given" 
            :customHighlights="[
              { cells: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}], color: '#ffeb3b', opacity: 0.4 },
              { cells: [{row: 1, col: 3}, {row: 2, col: 3}], color: '#4caf50', opacity: 0.3 },
              { cells: [{row: 4, col: 4}], color: '#f44336', opacity: 0.5 }
            ]"
            mode="display"
          />
          <div class="text-xs text-gray-500 space-y-1">
            <p>• 黄色：第一行前三格</p>
            <p>• 绿色：第 4 列的第 2、3 行</p>
            <p>• 红色：中心格</p>
          </div>
        </div>
      </div>

      <!-- 标记示例 -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">单元格标记（圆圈、叉号、点、星号）</h2>
        <div class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-600">为单元格添加不同类型的标记符号</p>
          <SudokuBoard 
            :board="board" 
            :given="given" 
            :markers="[
              { cell: {row: 0, col: 4}, type: 'circle', color: '#f44336', strokeWidth: 3 },
              { cell: {row: 0, col: 6}, type: 'cross', color: '#2196f3', strokeWidth: 3 },
              { cell: {row: 2, col: 0}, type: 'dot', color: '#4caf50', size: 10 },
              { cell: {row: 2, col: 2}, type: 'star', color: '#ff9800', size: 45 }
            ]"
            mode="display"
          />
          <div class="text-xs text-gray-500 space-y-1">
            <p>• 红色圆圈：第 1 行第 5 格</p>
            <p>• 蓝色叉号：第 1 行第 7 格</p>
            <p>• 绿色圆点：第 3 行第 1 格</p>
            <p>• 橙色星号：第 3 行第 3 格</p>
          </div>
        </div>
      </div>

      <!-- 摒除线示例 -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">摒除线绘制</h2>
        <div class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-600">在两个单元格之间绘制摒除线，从起点圆圈边缘指向目标格</p>
          <SudokuBoard 
            :board="board" 
            :given="given" 
            :markers="[
              { cell: {row: 0, col: 0}, type: 'circle', color: '#9c27b0', strokeWidth: 3, size: 35 },
              { cells: [{row: 0, col: 0}, {row: 0, col: 8}], type: 'line', color: '#9c27b0', strokeWidth: 3 },
              { cell: {row: 3, col: 1}, type: 'circle', color: '#ff5722', strokeWidth: 3, size: 35 },
              { cells: [{row: 3, col: 1}, {row: 5, col: 1}], type: 'line', color: '#ff5722', strokeWidth: 3 },
              { cell: {row: 6, col: 6}, type: 'circle', color: '#00bcd4', strokeWidth: 3, size: 35 },
              { cells: [{row: 6, col: 6}, {row: 8, col: 8}], type: 'line', color: '#00bcd4', strokeWidth: 3 }
            ]"
            mode="display"
          />
          <div class="text-xs text-gray-500 space-y-1">
            <p>• 紫色圆圈 + 线：第 1 行横跨，线从圆圈边缘开始</p>
            <p>• 橙色圆圈 + 线：第 2 列部分竖线</p>
            <p>• 青色圆圈 + 线：右下角斜线</p>
          </div>
        </div>
      </div>

      <!-- 链绘制示例 -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">链条绘制</h2>
        <div class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-600">绘制连接多个单元格的链条，支持实线、虚线和箭头</p>
          <SudokuBoard 
            :board="board" 
            :given="given" 
            :chains="[
              { 
                cells: [{row: 0, col: 0}, {row: 0, col: 3}, {row: 0, col: 6}],
                style: 'solid',
                color: '#4caf50',
                strokeWidth: 3,
                arrow: true
              },
              { 
                cells: [{row: 3, col: 0}, {row: 3, col: 4}, {row: 3, col: 8}],
                style: 'dashed',
                color: '#2196f3',
                strokeWidth: 2
              },
              { 
                cells: [{row: 6, col: 0}, {row: 7, col: 1}, {row: 8, col: 2}],
                style: 'dotted',
                color: '#f44336',
                strokeWidth: 2,
                arrow: true
              }
            ]"
            mode="display"
          />
          <div class="text-xs text-gray-500 space-y-1">
            <p>• 绿色实线箭头：第 1 行三格连接</p>
            <p>• 蓝色虚线：第 4 行三格连接</p>
            <p>• 红色点线箭头：左下角斜向连接</p>
          </div>
        </div>
      </div>

      <!-- 候选到候选的链条示例 -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">候选数级链条（直线/曲线）</h2>
        <div class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-600">链条节点可以定位到单元格中的具体候选数（1-9），支持多节点路径。每相邻两个节点间生成一条箭头线，末端显示箭头。</p>
          <SudokuBoard 
            :board="board" 
            :given="given" 
            :showCandidates="true"
            :candidates="candidates"
            :chains="[
              {
                // 同一格内候选 3 → 7 的直线
                cells: [
                  { row: 0, col: 2, candidate: 3 },
                  { row: 0, col: 2, candidate: 7 }
                ],
                style: 'solid',
                color: '#8e44ad',
                strokeWidth: 2,
                arrow: true,
                curve: 'straight'
              },
              {
                // 多节点平滑曲线路径：跨格候选 1 → 9 → 5（弧度大）
                cells: [
                  { row: 2, col: 0, candidate: 1 },
                  { row: 2, col: 3, candidate: 9 },
                  { row: 2, col: 6, candidate: 5 }
                ],
                style: 'dashed',
                color: '#16a085',
                strokeWidth: 3,
                arrow: true,
                curve: 'smooth'
              },
              {
                // 竖向多节点弧线：上中下三格（明显的S形曲线）
                cells: [
                  { row: 3, col: 5, candidate: 3 },
                  { row: 5, col: 4, candidate: 7 },
                  { row: 7, col: 5, candidate: 2 }
                ],
                style: 'solid',
                color: '#f39c12',
                strokeWidth: 2.5,
                arrow: true,
                curve: 'smooth'
              }
            ]"
            mode="display"
          />
          <div class="text-xs text-gray-500 space-y-1">
            <p>• 紫色直线：同格候选 3 → 7</p>
            <p>• 绿色平滑虚线（多段）：跨格候选 1 → 9 → 5（每段都有V形箭头）</p>
            <p>• 橙色平滑线（多段）：竖向S形曲线 3 → 7 → 2（明显的弧度）</p>
          </div>
        </div>
      </div>

      <!-- 候选数强调 + 链条综合示例 -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">候选数强调 + 链条组合示例</h2>
        <div class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-600">演示候选数显示 + 候选数强调标记 + 链条箭头的组合使用</p>
          <SudokuBoard 
            :board="board" 
            :given="given" 
            :showCandidates="true"
            :candidates="candidates"
            :candidateMarkers="[
              { row: 0, col: 2, candidate: 2, color: '#FF6B6B', opacity: 0.7 },
              { row: 0, col: 2, candidate: 4, color: '#4ECDC4', opacity: 0.7 },
              { row: 2, col: 0, candidate: 1, color: '#95E1D3', opacity: 0.7 },
              { row: 2, col: 3, candidate: 3, color: '#FFE66D', opacity: 0.7 },
              { row: 2, col: 6, candidate: 4, color: '#C7CEEA', opacity: 0.7 }
            ]"
            :chains="[
              {
                cells: [
                  { row: 0, col: 2, candidate: 2 },
                  { row: 2, col: 0, candidate: 1 },
                  { row: 2, col: 3, candidate: 3 }
                ],
                style: 'solid',
                color: '#FF6B6B',
                strokeWidth: 2.5,
                arrow: true,
                curve: 'smooth'
              },
              {
                cells: [
                  { row: 0, col: 2, candidate: 4 },
                  { row: 2, col: 6, candidate: 4 }
                ],
                style: 'dashed',
                color: '#4ECDC4',
                strokeWidth: 2,
                arrow: true,
                curve: 'straight'
              }
            ]"
            mode="display"
          />
          <div class="text-xs text-gray-500 space-y-1">
            <p>• 彩色实心圆：候选数强调标记（背景圆圈突出候选数）</p>
            <p>• 红色平滑线：连接候选 2 → 1 → 3（每段有V形箭头）</p>
            <p>• 青色虚线：连接候选 4 → 4（直线箭头）</p>
          </div>
        </div>
      </div>

      <!-- 综合示例 -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">综合绘图示例（教学演示）</h2>
        <div class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-600">结合高亮、标记和链条，模拟教学场景</p>
          <SudokuBoard 
            :board="board" 
            :given="given" 
            :customHighlights="[
              { cells: [{row: 0, col: 2}, {row: 1, col: 2}, {row: 2, col: 2}], color: '#E8F4F8', opacity: 0.6 },
              { cells: [{row: 2, col: 0}, {row: 2, col: 1}, {row: 2, col: 2}], color: '#FFF9C4', opacity: 0.5 }
            ]"
            :markers="[
              { cell: {row: 2, col: 2}, type: 'circle', color: '#f44336', strokeWidth: 3 },
              { cell: {row: 0, col: 2}, type: 'cross', color: '#2196f3', strokeWidth: 2 },
              { cells: [{row: 2, col: 0}, {row: 2, col: 2}], type: 'line', color: '#9c27b0', strokeWidth: 2 }
            ]"
            :chains="[
              { 
                cells: [{row: 0, col: 0}, {row: 2, col: 2}],
                style: 'dashed',
                color: '#4caf50',
                strokeWidth: 2,
                arrow: true
              }
            ]"
            mode="display"
          />
          <div class="text-xs text-gray-500 space-y-1">
            <p>• 蓝色背景：第 3 列前三格（相关区域）</p>
            <p>• 黄色背景：第 3 行前三格（候选数区域）</p>
            <p>• 红色圆圈：目标格</p>
            <p>• 紫色摒除线：行内关系</p>
            <p>• 绿色虚线箭头：推理路径</p>
          </div>
        </div>
      </div>

      <!-- 交互式绘图 -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">交互式绘图工具</h2>
        <div class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-600">点击单元格进行绘图操作</p>
          
          <!-- 绘图工具栏 -->
          <div class="w-full max-w-3xl space-y-4">
            <!-- 绘图模式选择 -->
            <div class="flex flex-wrap gap-2">
              <span class="text-sm font-medium text-gray-700 self-center min-w-20">绘图模式:</span>
              <button 
                v-for="mode in drawingModes" 
                :key="mode.id"
                @click="currentDrawMode = mode.id"
                :class="['px-3 py-1 text-sm rounded transition-colors', 
                  currentDrawMode === mode.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']"
              >
                {{ mode.label }}
              </button>
            </div>

            <!-- 标记类型（仅在标记模式下显示） -->
            <div v-if="currentDrawMode === 'marker'" class="flex flex-wrap gap-2">
              <span class="text-sm font-medium text-gray-700 self-center min-w-20">标记类型:</span>
              <button 
                v-for="type in markerTypes" 
                :key="type"
                @click="currentMarkerType = type"
                :class="['px-3 py-1 text-sm rounded transition-colors', 
                  currentMarkerType === type 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']"
              >
                {{ type }}
              </button>
            </div>

            <!-- 链条样式（仅在链条模式下显示） -->
            <div v-if="currentDrawMode === 'chain'" class="flex flex-wrap gap-2">
              <span class="text-sm font-medium text-gray-700 self-center min-w-20">链条样式:</span>
              <button 
                v-for="style in chainStyles" 
                :key="style.id"
                @click="currentChainStyle = style.id"
                :class="['px-3 py-1 text-sm rounded transition-colors', 
                  currentChainStyle === style.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']"
              >
                {{ style.label }}
              </button>
              <label class="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 border border-gray-400 rounded">
                <input type="checkbox" v-model="chainArrow" class="rounded">
                <span>箭头</span>
              </label>
            </div>

            <!-- 颜色选择 -->
            <div class="flex flex-wrap gap-2 items-center">
              <span class="text-sm font-medium text-gray-700 min-w-20">颜色:</span>
              <button 
                v-for="color in drawingColors" 
                :key="color.value"
                @click="currentColor = color.value"
                :class="['w-8 h-8 rounded border-2 transition-all', 
                  currentColor === color.value ? 'border-gray-900 scale-110' : 'border-gray-300']"
                :style="{ backgroundColor: color.value }"
                :title="color.name"
              ></button>
            </div>

            <!-- 操作按钮 -->
            <div class="flex flex-wrap gap-2">
              <button 
                v-if="currentDrawMode === 'chain' && drawingChain.length > 0"
                @click="finishChain"
                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                完成链条 ({{ drawingChain.length }} 个节点)
              </button>
              <button 
                v-if="currentDrawMode === 'chain' && drawingChain.length > 0"
                @click="cancelChain"
                class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button 
                @click="clearDrawing"
                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                清空绘图
              </button>
            </div>
          </div>

          <!-- 数独盘面 -->
          <SudokuBoard 
            :board="board" 
            :given="given"
            :showCandidates="true"
            :candidates="candidates"
            :customHighlights="drawnHighlights"
            :markers="drawnMarkers"
            :chains="drawnChains"
            mode="interactive"
            @cell-click="onDrawingCellClick"
          />

          <div class="text-xs text-gray-500 space-y-1">
            <p>• <strong>高亮模式:</strong> 点击单元格添加/移除高亮</p>
            <p>• <strong>标记模式:</strong> 点击单元格添加标记（圆圈、叉号等）</p>
            <p>• <strong>摒除线模式:</strong> 依次点击起点和终点（起点自动添加圆圈）</p>
            <p>• <strong>链条模式:</strong> 依次点击多个单元格，点击"完成链条"按钮结束</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Content: 完整功能 -->
    <div v-show="activeTab === 'full'">
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-xl font-semibold mb-4">交互式数独</h2>
      <div class="flex flex-col items-center gap-4">
        <!-- 控制按钮 -->
        <div class="flex flex-wrap gap-2 justify-center">
          <button @click="saveAsImage" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            保存为图片
          </button>
          <button @click="savePuzzle" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            保存盘面数据
          </button>
          <button @click="loadPuzzle" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            加载盘面
          </button>
          <button @click="exportPuzzle" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            导出为文件
          </button>
          <input ref="fileInput" type="file" accept=".json" @change="importPuzzle" class="hidden">
          <button @click="fileInput?.click()" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            导入文件
          </button>
          <button @click="clearUserInput" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            清空输入
          </button>
          <button @click="clearPuzzle" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            清空全部
          </button>
        </div>
        
        <!-- 数独盘面 -->
        <SudokuBoard ref="sudokuBoard" :board="board" :given="given" @cell-click="onClick" />
        
        <!-- 保存的盘面列表 -->
        <div v-if="savedPuzzles.length > 0" class="w-full mt-4">
          <h3 class="text-lg font-semibold mb-2">已保存的盘面：</h3>
          <div class="flex flex-wrap gap-2">
            <button 
              v-for="(puzzle, index) in savedPuzzles" 
              :key="index"
              @click="loadSavedPuzzle(index)"
              class="px-3 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              盘面 {{ index + 1 }} ({{ puzzle.timestamp }})
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import type { DefineComponent } from 'vue'
import SudokuBoard from '../components/SudokuBoard.vue'
import type { CellHighlight, CellMarker, Chain } from '@/types/sudoku'

const board = reactive([
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9]
])

// 带有用户填入数字的盘面（用于展示明数与填入数的区别）
const boardWithUserInput = reactive([
  [5,3,4,6,7,8,9,1,2],
  [6,7,2,1,9,5,3,4,8],
  [1,9,8,3,4,2,5,6,7],
  [8,5,9,7,6,1,4,2,3],
  [4,2,6,8,5,3,7,9,1],
  [7,1,3,9,2,4,8,5,6],
  [9,6,1,5,3,7,2,8,4],
  [2,8,7,4,1,9,6,3,5],
  [3,4,5,2,8,6,1,7,9]
])

const given = reactive([
  [true,true,false,false,true,false,false,false,false],
  [true,false,false,true,true,true,false,false,false],
  [false,true,true,false,false,false,false,true,false],
  [true,false,false,false,true,false,false,false,true],
  [true,false,false,true,false,true,false,false,true],
  [true,false,false,false,true,false,false,false,true],
  [false,true,false,false,false,false,true,true,false],
  [false,false,false,true,true,true,false,false,true],
  [false,false,false,false,true,false,false,true,true]
])

const savedPuzzles = ref<any[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const sudokuBoard = ref(null)
const selectedCell = ref<{ row: number, col: number } | null>(null)
const practiceCell = ref<{ row: number, col: number } | null>({ row: 0, col: 2 })
const highlightType = ref<'row' | 'col' | 'box' | 'all' | 'none'>('all')

// Tab state
const activeTab = ref('basic')
const tabs = [
  { id: 'basic', label: '基础展示' },
  { id: 'interactive', label: '交互模式' },
  { id: 'drawing', label: '绘图功能' },
  { id: 'full', label: '完整功能' }
]

// 候选数二维数组（9×9），每个格子是一个 number[]，为空数组表示无候选
const candidates = reactive<number[][][]>(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[])))

// 交互式绘图状态
const currentDrawMode = ref<'highlight' | 'marker' | 'line' | 'chain'>('marker')
const currentMarkerType = ref<'circle' | 'cross' | 'dot' | 'star'>('circle')
const currentChainStyle = ref<'solid' | 'dashed' | 'dotted'>('solid')
const chainArrow = ref(true)
const currentColor = ref('#f44336')

const drawnHighlights = ref<CellHighlight[]>([])
const drawnMarkers = ref<CellMarker[]>([])
const drawnChains = ref<Chain[]>([])
const drawingChain = ref<{ row: number, col: number }[]>([])
const lineStartCell = ref<{ row: number, col: number } | null>(null)

const drawingModes: Array<{ id: 'highlight' | 'marker' | 'line' | 'chain'; label: string }> = [
  { id: 'highlight', label: '高亮' },
  { id: 'marker', label: '标记' },
  { id: 'line', label: '摒除线' },
  { id: 'chain', label: '链条' }
]

const markerTypes: Array<'circle' | 'cross' | 'dot' | 'star'> = ['circle', 'cross', 'dot', 'star']

const chainStyles: Array<{ id: 'solid' | 'dashed' | 'dotted'; label: string }> = [
  { id: 'solid', label: '实线' },
  { id: 'dashed', label: '虚线' },
  { id: 'dotted', label: '点线' }
]

const drawingColors = [
  { name: '红色', value: '#f44336' },
  { name: '粉色', value: '#e91e63' },
  { name: '紫色', value: '#9c27b0' },
  { name: '蓝色', value: '#2196f3' },
  { name: '青色', value: '#00bcd4' },
  { name: '绿色', value: '#4caf50' },
  { name: '橙色', value: '#ff9800' },
  { name: '棕色', value: '#795548' }
]

onMounted(() => {
  loadSavedPuzzlesFromStorage()
  loadSampleCandidates() // 默认加载候选数
})

function onClick(pos: any) {
  console.log('点击单元格', pos)
}

function onCellSelect(pos: { row: number, col: number }) {
  selectedCell.value = pos
  console.log('选中单元格', pos)
}

function onPracticeCellClick(pos: { row: number, col: number }) {
  console.log('唯余练习模式点击', pos)
}

// 交互式绘图事件处理
function onDrawingCellClick(pos: { row: number, col: number }) {
  switch (currentDrawMode.value) {
    case 'highlight':
      toggleHighlight(pos)
      break
    case 'marker':
      addMarker(pos)
      break
    case 'line':
      addLinePoint(pos)
      break
    case 'chain':
      addChainPoint(pos)
      break
  }
}

function toggleHighlight(pos: { row: number, col: number }) {
  // 查找是否已存在包含该单元格的高亮
  const existingIndex = drawnHighlights.value.findIndex(h => 
    h.cells.some(c => c.row === pos.row && c.col === pos.col)
  )
  
  if (existingIndex >= 0) {
    // 如果存在，移除该高亮
    drawnHighlights.value.splice(existingIndex, 1)
  } else {
    // 否则添加新高亮
    drawnHighlights.value.push({
      cells: [pos],
      color: currentColor.value,
      opacity: 0.5
    })
  }
}

function addMarker(pos: { row: number, col: number }) {
  // 添加标记
  drawnMarkers.value.push({
    cell: pos,
    type: currentMarkerType.value,
    color: currentColor.value,
    strokeWidth: 3,
    size: currentMarkerType.value === 'circle' ? 35 : currentMarkerType.value === 'star' ? 45 : 10
  })
}

function addLinePoint(pos: { row: number, col: number }) {
  if (!lineStartCell.value) {
    // 第一次点击，设置起点并添加圆圈
    lineStartCell.value = pos
    drawnMarkers.value.push({
      cell: pos,
      type: 'circle',
      color: currentColor.value,
      strokeWidth: 3,
      size: 35
    })
  } else {
    // 第二次点击，添加线段
    drawnMarkers.value.push({
      cells: [lineStartCell.value, pos],
      type: 'line',
      color: currentColor.value,
      strokeWidth: 3
    })
    lineStartCell.value = null
  }
}

function addChainPoint(pos: { row: number, col: number }) {
  // 检查是否与上一个点相同，如果相同则忽略
  const lastPoint = drawingChain.value[drawingChain.value.length - 1]
  if (lastPoint && lastPoint.row === pos.row && lastPoint.col === pos.col) {
    return // 忽略重复点击同一个单元格
  }
  drawingChain.value.push(pos)
}

function finishChain() {
  // 过滤掉连续重复的节点
  const filteredChain = drawingChain.value.filter((point, index) => {
    if (index === 0) return true
    const prev = drawingChain.value[index - 1]
    return !(prev && prev.row === point.row && prev.col === point.col)
  })
  
  if (filteredChain.length >= 2) {
    drawnChains.value.push({
      cells: [...filteredChain],
      style: currentChainStyle.value as any,
      color: currentColor.value,
      strokeWidth: 2.5,
      arrow: chainArrow.value,
      curve: 'smooth'
    })
  }
  drawingChain.value = []
}

function cancelChain() {
  drawingChain.value = []
}

function clearDrawing() {
  drawnHighlights.value = []
  drawnMarkers.value = []
  drawnChains.value = []
  drawingChain.value = []
  lineStartCell.value = null
}

function nextPracticeCell() {
  // 随机选择一个空格
  const emptyCells: Array<{ row: number, col: number }> = []
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r]![c] === 0) {
        emptyCells.push({ row: r, col: c })
      }
    }
  }
  if (emptyCells.length > 0) {
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    if (randomCell) {
      practiceCell.value = randomCell
    }
  }
}

function loadSampleCandidates() {
  // 自动计算候选数
  clearCandidates()
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      // 只为空格计算候选数
      if (board[r]![c] === 0) {
        const possible = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])
        
        // 排除同行的数字
        for (let col = 0; col < 9; col++) {
          const val = board[r]![col]
          if (val !== undefined && val > 0) possible.delete(val)
        }
        
        // 排除同列的数字
        for (let row = 0; row < 9; row++) {
          const val = board[row]?.[c]
          if (val && val > 0) possible.delete(val)
        }
        
        // 排除同宫的数字
        const boxStartRow = Math.floor(r / 3) * 3
        const boxStartCol = Math.floor(c / 3) * 3
        for (let row = boxStartRow; row < boxStartRow + 3; row++) {
          for (let col = boxStartCol; col < boxStartCol + 3; col++) {
            const val = board[row]?.[col]
            if (val && val > 0) possible.delete(val)
          }
        }
        
        // 将可能的数字设置为候选数
        candidates[r]![c] = Array.from(possible).sort((a, b) => a - b)
      }
    }
  }
}

function clearCandidates() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      candidates[r]![c] = []
    }
  }
}

async function saveAsImage() {
  try {
    const svgElement = document.querySelector('.sudoku-svg')
    if (!svgElement) {
      alert('找不到SVG元素，请确保数独盘面已正确加载')
      return
    }

    const clonedSvg = svgElement.cloneNode(true) as SVGElement
    clonedSvg.setAttribute('width', '900')
    clonedSvg.setAttribute('height', '900')
    
    const serializer = new XMLSerializer()
    let svgString = serializer.serializeToString(clonedSvg)
    svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `sudoku-${new Date().toISOString().slice(0,10)}-${Date.now()}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    alert('数独盘面已保存为SVG文件！')
  } catch (error: any) {
    console.error('保存图片时出错:', error)
    alert('保存图片失败: ' + error.message)
  }
}

function savePuzzle() {
  const puzzleData = {
    board: JSON.parse(JSON.stringify(board)),
    given: JSON.parse(JSON.stringify(given)),
    timestamp: new Date().toLocaleString('zh-CN')
  }
  
  savedPuzzles.value.push(puzzleData)
  localStorage.setItem('sudoku-puzzles', JSON.stringify(savedPuzzles.value))
  alert('盘面已保存！')
}

function loadSavedPuzzle(index: number) {
  const puzzle = savedPuzzles.value[index]
  if (puzzle) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board[r]![c] = puzzle.board[r][c]
        given[r]![c] = puzzle.given[r][c]
      }
    }
    console.log('已加载盘面:', puzzle.timestamp)
  }
}

function loadSavedPuzzlesFromStorage() {
  const saved = localStorage.getItem('sudoku-puzzles')
  if (saved) {
    try {
      savedPuzzles.value = JSON.parse(saved)
    } catch (e) {
      console.error('加载保存的盘面失败:', e)
    }
  }
}

function loadPuzzle() {
  if (savedPuzzles.value.length > 0) {
    loadSavedPuzzle(savedPuzzles.value.length - 1)
    alert('已加载最近保存的盘面！')
  } else {
    alert('没有已保存的盘面')
  }
}

function exportPuzzle() {
  const puzzleData = {
    board: board,
    given: given,
    timestamp: new Date().toLocaleString('zh-CN'),
    version: '1.0'
  }
  
  const dataStr = JSON.stringify(puzzleData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(dataBlob)
  link.download = `sudoku-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

function importPuzzle(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const puzzleData = JSON.parse(e.target?.result as string)
      
      if (puzzleData.board && puzzleData.given) {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            board[r]![c] = puzzleData.board[r][c]
            given[r]![c] = puzzleData.given[r][c]
          }
        }
        alert('文件导入成功！')
      } else {
        alert('文件格式不正确')
      }
    } catch (err: any) {
      alert('文件解析失败: ' + err.message)
    }
  }
  reader.readAsText(file)
  target.value = ''
}

function clearUserInput() {
  if (confirm('确定要清空用户输入吗？（保留原题数字）')) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!given[r]![c]) {
          board[r]![c] = 0
        }
      }
    }
    console.log('用户输入已清空，原题保留')
  }
}

function clearPuzzle() {
  if (confirm('确定要清空整个盘面吗？这将清空所有数字（包括原题）')) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board[r]![c] = 0
        given[r]![c] = false
      }
    }
    console.log('盘面已全部清空')
  }
}
</script>
