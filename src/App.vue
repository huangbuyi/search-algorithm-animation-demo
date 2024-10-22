<script setup lang="ts">
import { reactive, Ref, ref } from 'vue';
import { PriorityQueue } from './priorityQueue';

enum Action {
  Up = 0,
  Down,
  Left,
  Right
}

type State = [number, number];

namespace State {
  export function equals(a: State, b: State): boolean {
    return a[0] === b[0] && a[1] === b[1];
  }
}

class Node {
  constructor(
    public readonly state: State,
    public readonly parent: Node | null,
    public readonly action: Action | null,
    public readonly manhattanDistance: number,
    public readonly pathCost: number
  ) {

  }
}

interface IFrontier {
  add(node: Node): void;
  containers_state(state: State): boolean;
  empty(): boolean;
  remove(): Node;
  getLabel(n: Node): string;
}

class StackFrontier implements IFrontier {
  private readonly _frontier: Node[] = [];

  add(node: Node): void {
    this._frontier.push(node);
  }

  containers_state(state: State): boolean {
    return this._frontier.find(x => State.equals(x.state, state)) !== undefined;
  }

  empty(): boolean {
    return this._frontier.length === 0;
  }

  remove(): Node {
    if (this.empty()) {
      throw new Error('empty frontier');
    } else {
      return this._frontier.pop()!;
    }
  }

  getLabel(n: Node): string {
    return '';
  }
}

class QueueFrontier implements IFrontier {
  private readonly _frontier: Node[] = [];

  add(node: Node): void {
    this._frontier.push(node);
  }

  containers_state(state: State): boolean {
    return this._frontier.find(x => State.equals(x.state, state)) !== undefined;
  }

  empty(): boolean {
    return this._frontier.length === 0;
  }

  remove(): Node {
    if (this.empty()) {
      throw new Error('empty frontier');
    } else {
      return this._frontier.shift()!;
    }
  }

  getLabel(n: Node): string {
    return '';
  }
}

class GreedBestFrontier implements IFrontier {
  private readonly _frontier = new PriorityQueue<Node>(this._comparator.bind(this));

  add(node: Node): void {
    this._frontier.push(node);
  }

  containers_state(state: State): boolean {
    return this._frontier.find(x => State.equals(x.state, state)) !== undefined;
  }

  empty(): boolean {
    return this._frontier.isEmpty();
  }

  remove(): Node {
    return this._frontier.pop();
  }

  getLabel(n: Node): string {
    return n.manhattanDistance.toString();
  }

  private _comparator(a: Node, b: Node): boolean {
    return this._h(a) < this._h(b);
  }

  private _h(n: Node): number {
    return n.manhattanDistance;
  }
}

class AStarFrontier implements IFrontier {
  private readonly _frontier = new PriorityQueue<Node>(this._comparator.bind(this));

  add(node: Node): void {
    this._frontier.push(node);
  }

  containers_state(state: State): boolean {
    return this._frontier.find(x => State.equals(x.state, state)) !== undefined;
  }

  empty(): boolean {
    return this._frontier.isEmpty();
  }

  remove(): Node {
    return this._frontier.pop();
  }

  getLabel(n: Node): string {
    return n.pathCost.toString() + '+' + n.manhattanDistance.toString();
  }

  private _comparator(a: Node, b: Node): boolean {
    return this._f(a) < this._f(b);
  }

  private _f(n: Node): number {
    return this._g(n) + this._h(n);
  }

  private _g(n: Node): number {
    return n.pathCost
  }

  private _h(n: Node): number {
    return n.manhattanDistance;
  }
}

enum MazeCellType {
  Space = 0,
  Wall = 1,
  Start = 2,
  Goal = 3
}

enum MazeCellState {
  Unexplored = 0,
  Explored,
  Frontier,
  SolutionPath,
  Unreachable
}

interface MazeCell {
  type: MazeCellType;
  state: MazeCellState;
  label?: string;
}

type MazeData = MazeCell[][];

function setCellState(maze: MazeData, state: State, cellState: MazeCellState) {
  const [row, col] = state;
  maze[row][col].state = cellState;
}

function setCellLabel(maze: MazeData, state: State, label: string) {
  const [row, col] = state;
  maze[row][col].label = label;
}

function getCellState(maze: MazeData, state: State): MazeCellState {
  const [row, col] = state;
  return maze[row][col].state
}

function calcManhattanDistance(a: State, b: State): number {
  const [arow, acol] = a;
  const [brow, bcol] = b;
  return Math.abs(arow - brow) + Math.abs(acol - bcol);
}

enum SolutionType {
  Pending = 0,
  NoSolution,
  Continue,
  FoundSolution,
}

class Maze {
  private readonly _start: State;
  private readonly _goal: State;
  private readonly _width: number;
  private readonly _height: number;

  constructor(
    readonly maze: MazeData,
    readonly numExplored: Ref<number>,
    readonly solutionType: Ref<SolutionType>
  ) {
    this._height = this.maze.length;
    this._width = this.maze[0].length;
    let start: State | null = null;
    let goal: State | null = null;
    numExplored.value = 0;
    solutionType.value = SolutionType.Pending;

    for (let i = 0; i < this._height; i++) {
      for (let j = 0; j < this._width; j++) {
        const cell = this.maze[i][j];
        if (cell.type === MazeCellType.Start) {
          if (start !== null) {
            throw new Error('只能有一个起点');
          }
          start = [i, j];
        } else if (cell.type === MazeCellType.Goal) {
          if (goal !== null) {
            throw new Error('只能有一个终点');
          }
          goal = [i, j];
        }
      }
    }

    if (!start) {
      throw new Error('没有起点');
    }

    if (!goal) {
      throw new Error('没有终点');
    }

    this._start = start;
    this._goal = goal;
  }

  neighbors(state: State): [Action, State][] {
    const [row, col] = state;
    const candidates: [Action, State][] = [
      [Action.Up, [row - 1, col]],
      [Action.Down, [row + 1, col]],
      [Action.Left, [row, col - 1]],
      [Action.Right, [row, col + 1]]
    ]

    return candidates.filter(candidate => {
      const [, [row, col]] = candidate;

      if (row < 0 || row >= this._height) {
        return false;
      }
      if (col < 0 || col >= this._width) {
        return false;
      }
      return this.maze[row][col].type !== MazeCellType.Wall;
    });
  }

  solve(frontierClass: new () => IFrontier): () => void {
    const start = new Node(this._start, null, null, calcManhattanDistance(this._start, this._goal), 0);
    const frontier = new frontierClass();
    frontier.add(start);
    setCellState(this.maze, this._start, MazeCellState.Frontier);
    this.numExplored.value = 0
    this.solutionType.value = SolutionType.Continue;
    
    const next = () => {
      if (frontier.empty()) {
        this.solutionType.value = SolutionType.NoSolution;
        return;
      }

      const node = frontier.remove();
      this.numExplored.value++;

      if (State.equals(node.state, this._goal)) {
        let _node = node;
        setCellState(this.maze, _node.state, MazeCellState.SolutionPath);

        while (_node.parent !== null) {
          _node = _node.parent!;
          setCellState(this.maze, _node.state, MazeCellState.SolutionPath);
        }
        this.solutionType.value = SolutionType.FoundSolution;
        return;
      }

      setCellState(this.maze, node.state, MazeCellState.Explored);
      
      for (const [action, state] of this.neighbors(node.state)) {
        if (!frontier.containers_state(state) && getCellState(this.maze, state) !== MazeCellState.Explored) {
          const child = new Node(state, node, action, calcManhattanDistance(state, this._goal), node.pathCost + 1);
          frontier.add(child);
          setCellLabel(this.maze, child.state, frontier.getLabel(child));
          setCellState(this.maze, state, MazeCellState.Frontier);
        }
      }
    }

    return next;
  }
}

let template = 'AB';

function buildMaze(template: string): MazeData {
  const strTemplates = template.split(/\r?\n/);
  const maze: MazeData = [];
  for (let i = 0; i < strTemplates.length; i++) {
    const strTemplate = strTemplates[i];
    const row: MazeCell[] = [];
    for (let j = 0; j < strTemplate.length; j++) {
      const char = strTemplate.charAt(j);
      if (char === '#') {
        row.push({ type: MazeCellType.Wall, state: MazeCellState.Unreachable });
      } else if (char === 'A') {
        row.push({ type: MazeCellType.Start, state: MazeCellState.Unexplored });
      } else if (char === 'B') {
        row.push({ type: MazeCellType.Goal, state: MazeCellState.Unexplored });
      } else if (char === ' ') {
        row.push({ type: MazeCellType.Space, state: MazeCellState.Unexplored });
      } else {
        throw new Error('invalid template');
      }
    }
    maze.push(row);
  }
  return maze;
}

function mazeToTemplate(maze: MazeData): string {
  return maze.map(row => {
    return row.map(cell => {
      if (cell.type === MazeCellType.Wall) {
        return '#';
      } else if (cell.type === MazeCellType.Start) {
        return 'A';
      } else if (cell.type === MazeCellType.Goal) {
        return 'B';
      } else if (cell.type === MazeCellType.Space) {
        return ' ';
      }
    }).join('');
  }).join('\n');
}

enum DemoState {
  Ready = 0,
  Running = 1,
  Paused = 2,
  Done = 3
}

const mazeData = ref(reactive<MazeData>(buildMaze(template)));
const numExplored = ref(0);
const solutionType = ref(SolutionType.Pending);
const demoState = ref<DemoState>(DemoState.Ready);
const timeInterval = ref(200);
let interval: number;
let demoRunner: (() => void) | undefined;

function start() {
  try {
    doStart();
  } catch (e: any) {
    console.error(e);
    alert(e.message);
  }
}

function doStart() {
  const maze = new Maze(mazeData.value, numExplored, solutionType);
  const next = maze.solve(currAlgorithm.value.frontier);
  demoState.value = DemoState.Running;
  demoRunner = () => {
    if (solutionType.value === SolutionType.Continue) {
      next();
    }
    
    // solution type may change after next()
    if (solutionType.value !== SolutionType.Continue) {
      demoState.value = DemoState.Done;
      clearInterval(interval);
    }
  }

  interval = setInterval(demoRunner, timeInterval.value);
  brush.value = null;
}

function pause() {
  demoState.value = DemoState.Paused;
  clearInterval(interval);
}

function next() {
  if (demoRunner) {
    demoRunner();
  } else {
    start();
    pause();
  }
}

function resume() {
  if (demoRunner) {
    clearInterval(interval);
    demoState.value = DemoState.Running;
    interval = setInterval(demoRunner, timeInterval.value);
  }
}

function reset() {
  clearInterval(interval);

  for (const row of mazeData.value) {
    for (const cell of row) {
      cell.state = cell.type === MazeCellType.Wall ? MazeCellState.Unreachable : MazeCellState.Unexplored;
      cell.label = ''
    }
  }

  numExplored.value = 0;
  solutionType.value = SolutionType.Pending;
  demoState.value = DemoState.Ready;
  demoRunner = undefined;
}

interface AlgorithmItem {
  name: string;
  description: string;
  frontier: new () => IFrontier
}

const algorithms: [string, AlgorithmItem[]][] = [
  [
    '非启发式搜索', 
    [
      {
        name: '深度优先搜索',
        description: '深度优先搜索（Depth-First Search，简称DFS）是一种用于遍历或搜索树结构或图的算法。它从根节点开始（在图的情况下可以是任意选定的一个节点），尽可能深入地沿着每条分支探索，然后回溯。',
        frontier: StackFrontier
      },
      {
        name: '广度优先搜索',
        description: '广度优先搜索（Breadth-First Search，简称BFS）是一种用于遍历或搜索树或图的算法。与深度优先搜索不同，BFS从根节点开始（如果是图，则从一个指定的源节点开始），然后首先探索所有与给定节点直接相连的节点（也就是邻居节点），然后再移动到下一层级的节点。这种层级式的探索方式保证了如果存在一条从初始节点到目标节点的路径，那么这条路径将是其中最短的一条。',
        frontier: QueueFrontier
      },
    ]
  ],
  [
    '启发式搜索',
    [
      {
        name: '贪婪最佳优先搜索',
        description: '贪婪最佳优先搜索（Greedy Best-First Search）仅依赖于启发式函数 h(n) 来选择下一个要扩展的节点，而忽略了实际路径的成本。它总是选择看起来距离目标最近的节点进行扩展',
        frontier: GreedBestFrontier
      },
      {
        name: 'A* 搜索',
        description: 'A*（A-Star）算法结合了统一成本搜索（UCS）和启发式信息。它使用一个评价函数 f(n) = g(n) + h(n) ，其中 g(n) 表示从起始节点到节点 n 的实际代价， h(n) 是一个启发式函数，估计从节点 n 到目标节点的成本。',
        frontier: AStarFrontier
      }
    ]
  ]
]

const currAlgorithm = ref<AlgorithmItem>(algorithms[0][1][0]);

function onAlgorithmChange(algorithmItem: AlgorithmItem) {
  currAlgorithm.value = algorithmItem;
  reset();
}

const presetMazes: [string, string][] = [
  ['默认', 'mazes/default.txt'],
  ['长短双线', 'mazes/long-and-short.txt'],
  ['最深线路', 'mazes/deepest-route.txt'],
  ['广袤无垠', 'mazes/broadest.txt'],
  ['1024', 'mazes/1024.txt'],
]

loadMaze(presetMazes[0][1]);

async function loadMaze(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  updateMazeFromTemplate(text);
}

function updateMazeFromTemplate(template: string) {
  reset();
  mazeData.value = buildMaze(template);
  mazeWidth.value = mazeData.value[0].length;
  mazeHeight.value = mazeData.value.length;
}

const mazeWidth = ref(0);
const mazeHeight = ref(0);

function loadEmptyMaze(width: number, height: number) {
  const rowTemplate = ' '.repeat(width) + '\n';
  const mazeTemplate = rowTemplate.repeat(height).slice(0, -1); 
  updateMazeFromTemplate(mazeTemplate);
}

const cellWidth = ref(36);
const cellHeight = ref(36);
const brush = ref<MazeCellType | null>(null);
const consecutiveDrawing = ref(false);

function onCellMouseDown(cell: MazeCell) {
  drawCell(cell);
  consecutiveDrawing.value = true;
}

function onCellMouseEnter(cell: MazeCell) {
  if (consecutiveDrawing.value) {
    drawCell(cell);
  }
}

function drawCell(cell: MazeCell) {
  if (demoState.value === DemoState.Ready && brush.value !== null) {
    cell.state = brush.value === MazeCellType.Wall ? MazeCellState.Unreachable : MazeCellState.Unexplored;
    cell.type = brush.value;
  }
}

const legendItems: [string, string][] = [
  ['#202020', '墙体'],
  ['#dfdfdf', '未探索'],
  ['#808080', '已探索'],
  ['#ff9966', '搜索队列'],
  ['#6699ff', '解决方案路径'],
]

function downloadTxt(text: string) {
  const filename = `maze-${new Date().getTime()}.txt`;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function importTemplate() {
  const fileInput: HTMLInputElement = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt';
  fileInput.click();
  fileInput.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target) return;
      const fileContent = event.target.result;
      if (typeof fileContent === 'string') {
        updateMazeFromTemplate(fileContent);
      }
    };
    reader.readAsText(file);
  };
}

function exportTemplate() {
  const template = mazeToTemplate(mazeData.value);
  downloadTxt(template);
}

function genDFSMaze(width: number, height: number) {
  const cell: MazeCell = { type: MazeCellType.Wall, state: MazeCellState.Unreachable };
  const maze: MazeData = new Array(height);

  for (let i = 0; i < height; i++) {
    maze[i] = new Array(width);
    for (let j = 0; j < width; j++) {
      maze[i][j] = { ...cell };
    }
  }

  function carve_path(row: number, col: number, spaceCells: MazeCell[]) {
    const directions = [[row - 2, col], [row + 2, col], [row, col - 2], [row, col + 2]];

    shuffle(directions);
    for (const [drow, dcol] of directions) {
      if (drow >= 0 && drow < height && dcol >= 0 && dcol < width && maze[drow][dcol].type === MazeCellType.Wall) {
        const nextCell =  maze[drow][dcol];
        nextCell.type = MazeCellType.Space;
        nextCell.state = MazeCellState.Unexplored;
        spaceCells.push(nextCell);

        const middleCell = maze[(drow + row) / 2][(dcol + col) / 2]
        middleCell.type = MazeCellType.Space;
        middleCell.state = MazeCellState.Unexplored;
        spaceCells.push(middleCell);

        carve_path(drow, dcol, spaceCells);
      }
    }
  }

  const startRow = Math.floor(Math.random() * height);
  const startCol = Math.floor(Math.random() * width);
  const spaceCells: MazeCell[] = [];
  maze[startRow][startCol] 
  carve_path(startRow, startCol, spaceCells);
  maze[startRow][startCol].type = MazeCellType.Space;
  maze[startRow][startCol].state = MazeCellState.Unexplored;
  shuffle(spaceCells);
  spaceCells[0].type = MazeCellType.Start;
  spaceCells[1].type = MazeCellType.Goal;

  reset();
  mazeData.value = maze;
}

function shuffle(array: Array<any>) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}

</script>

<template>
  <div class="app">
    <div class="main">
      <div class="maze-editor">
        <div class="input-item-group">
          <div class="input-item">
            <label>单元格宽</label>
            <input v-model="cellWidth" type="number" min="1" />
          </div>
          <div class="input-item">
            <label>高</label>
            <input v-model="cellHeight" type="number" min="1" />
          </div>
        </div>
        <div class="input-item-group">
          <div class="input-item">
            <label>笔刷</label>
            <select v-model="brush" :disabled="demoState !== DemoState.Ready">
              <option label="无" :value="null"></option>
              <option label="空地" :value="MazeCellType.Space"></option>
              <option label="墙" :value="MazeCellType.Wall"></option>
              <option label="起点" :value="MazeCellType.Start"></option>
              <option label="终点" :value="MazeCellType.Goal"></option>
            </select>
          </div>
          <button v-if="brush !== null" @click="brush = null">取消绘制</button>
        </div>
        <div class="input-item-group button-list">
          <button @click="importTemplate">导入</button>
          <button @click="exportTemplate">导出</button>
        </div>
      </div>
      <div class="maze-container">
        <div class="legend">
          <div class="legend-item">A 起点</div>
          <div class="legend-item">B 终点</div>
          <div class="legend-item" v-for="[color, label] in legendItems">
            <div class="legend-item-color" :style="{ backgroundColor: color }"></div>
            <div class="legend-item-label">{{ label }}</div>
          </div>
        </div>
        <div class="maze" @mouseleave="consecutiveDrawing = false" @mouseup="consecutiveDrawing = false">
          <div class="row" v-for="row in mazeData">
            <div
              v-for="cell in row"
              class="cell"
              :class="{
                'drawable': brush !== null,
                'unexplored': cell.state === MazeCellState.Unexplored,
                'explored': cell.state === MazeCellState.Explored,
                'frontier': cell.state === MazeCellState.Frontier,
                'solution-path': cell.state === MazeCellState.SolutionPath,
                'unreachable': cell.state === MazeCellState.Unreachable
              }"
              :style="{
                width: `${cellWidth}px`,
                height: `${cellHeight}px`,
              }"
              @mousedown="onCellMouseDown(cell)"
              @mouseenter="onCellMouseEnter(cell)"
            >
              <div v-if="cell.type === MazeCellType.Space" class="cell-space">{{ cell.label }}</div>
              <div v-if="cell.type === MazeCellType.Wall" class="cell-wall"></div>
              <div v-if="cell.type === MazeCellType.Start" class="cell-start">A</div>
              <div v-if="cell.type === MazeCellType.Goal" class="cell-goal">B</div>
            </div>
          </div>
        </div>
      </div>
      <div class="maze-controller">
        <div class="maze-state-description">
          <div v-if="solutionType === SolutionType.Pending">点击右侧按钮开始演示</div>
          <div v-if="solutionType === SolutionType.Continue">正在搜索，已探索 {{ numExplored }}</div>
          <div v-else-if="solutionType === SolutionType.FoundSolution">找到解决方案，共计探索 {{ numExplored }}</div>
          <div v-else-if="solutionType === SolutionType.NoSolution">找不到解决方案，共计探索 {{ numExplored }}</div>
        </div>
        <div class="demo-controller">
          <div class="input-item">
            <label>时间间隔</label>
            <input v-model="timeInterval" type="number" min="0" />
          </div>
        </div>
        <div class="button-list">
          <button v-if="demoState === DemoState.Ready" @click="start">开始</button>
          <button v-if="demoState === DemoState.Paused" @click="resume">继续</button>
          <button v-if="demoState === DemoState.Done" disabled @click="resume">继续</button>
          <button v-if="demoState === DemoState.Running" @click="pause">暂停</button>
          <button :disabled="demoState === DemoState.Running || demoState === DemoState.Done" @click="next">下一步</button>
          <button @click="reset">重置</button>
        </div>
      </div>
    </div>
    <div class="aside">
      <div>
        <div v-for="group in algorithms">
          <div class="aside-title">{{ group[0] }}</div>
          <div
            v-for="item in group[1]"
            class="algorithm-item"
            :class="{
              'is-selected': item.name === currAlgorithm.name
            }"
            @click="onAlgorithmChange(item)"
          >
            <div>{{ item.name }}</div>
          </div>
        </div>
        <div class="aside-title">算法描述</div>
        <div class="algorithm-description">{{ currAlgorithm.description }}</div>
      </div>
      <div>
        <div class="aside-title">新建迷宫</div>
        <div class="input-item-group">
          <div class="input-item">
            <label>宽</label>
            <input v-model="mazeWidth" type="number" min="1" />
          </div>
          <div class="input-item">
            <label>高</label>
            <input v-model="mazeHeight" type="number" min="1" />
          </div>
        </div>
        <div class="gen-maze-buttons">
          <button @click="loadEmptyMaze(mazeWidth, mazeHeight)">新建空迷宫</button>
          <button @click="genDFSMaze(mazeWidth, mazeHeight)">生成随机迷宫</button>
        </div>
      </div>
      <div>
        <div class="aside-title">预设迷宫</div>
        <div class="preset-mazes">
          <div
            v-for="item in presetMazes"
            class="preset-maze-item"
            @click="loadMaze(item[1])"
          >
            {{ item[0] }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  height: 100%;
  background-color: #f0f0f0;
  font-size: 14px;
  min-width: 830px;
}

.app input {
  width: 60px;
}

.app label {
  margin-right: 6px;
}

.main {
  display: flex;
  flex-flow: column;
  flex: 1;
  min-width: 0;
}

.aside {
  width: 300px;
  border-left: 1px solid #f0f0f0;
  padding: 0 12px;
  background-color: #ffffff;
}

.maze-editor {
  display: flex;
  align-items: center;
  height: 36px;
  background-color: #ffffff;
  padding: 0 12px;
}

.maze-editor .button-list {
  margin-left: auto;
  margin-right: 0;
}

.maze-controller {
  display: flex;
  align-items: center;
  flex: none;
  border-top: 1px solid #f0f0f0;
  height: 36px;
  padding: 0 12px;
  background-color: #ffffff;
}

.maze-state-description {
  flex: 1;
}

.button-list button {
  margin-left: 6px;
}

.maze-container {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.legend {
  display: flex;
  font-size: 12px;
  padding: 12px;
  /* flex-flow: row-reverse; */
}

.legend-item {
  display: flex;
  align-items: center;
  margin-right: 12px;
}

.legend-item-color {
  width: 16px;
  height: 16px;
  margin-right: 4px;
  border: 1px solid #fff;
}

.maze {
  display: inline-flex;
  flex-flow: column;
  font-size: 12px;
  user-select: none;
  margin: 12px;
}

.row {
  border-bottom: 1px solid #ffffff;
  display: inline-flex;
}

.row:first-child {
  border-top: 1px solid #ffffff;
}

.cell {
  width: 36px;
  height: 36px;
  border-right: 1px solid #ffffff;
  text-align: center;
  color: #303030;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell:first-child {
  border-left: 1px solid #ffffff;
}

.cell.unexplored {
  background-color: #dfdfdf;
}

.cell.explored {
  background-color: #808080;
}

.cell.frontier {
  background-color: #ff9966;
}

.cell.solution-path {
  color: #fff;
  background-color: #6699ff;
}

.cell.unreachable {
  background-color: #202020;
}

.cell.drawable {
  cursor: cell;
}

.cell.drawable:hover {
  outline: 1px solid #6699ff;
  z-index: 1;
}

.cell-start, .cell-goal {
  font-size: 16px;
  color: #6699ff;
  font-weight: bold;
}

.aside-title {
  color: #6699ff;
  margin: 8px 0 4px;
}

.algorithm-item {
  margin-bottom: 4px;
  padding: 4px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
}

.algorithm-item.is-selected {
  color: #fff;
  background-color: #6699ff;
}

.algorithm-description {
  font-size: 12px;
}

.gen-maze-buttons {
  margin-top: 6px;
}

.gen-maze-buttons button {
  margin-right: 6px;
}

.preset-mazes {
  display: flex;
  flex-wrap: wrap;
}

.preset-maze-item {
  font-size: 12px;
  margin: 0 4px 4px 0;
  padding: 4px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 5px;
  cursor: pointer;
}

.preset-maze-item:hover {
  background-color: #6699ff31;
}

.input-item-group {
  display: flex;
  align-items: center;
  margin-right: 12px;
}

.input-item {
  margin-right: 12px;
}
</style>
