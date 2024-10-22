<script setup lang="ts">
import { reactive, Ref, ref } from 'vue';
import { PriorityQueue } from './priorityQueue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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
    t('algorithms.uninformedSearch'), 
    [
      {
        name: t('algorithms.dfs'),
        description: t('algorithms.dfsDesc'),
        frontier: StackFrontier
      },
      {
        name: t('algorithms.bfs'),
        description: t('algorithms.bfsDesc'),
        frontier: QueueFrontier
      },
    ]
  ],
  [
    t('algorithms.informedSearch'), 
    [
      {
        name: t('algorithms.greedyBestFirstSearch'),
        description: t('algorithms.greedyBestFirstSearchDesc'),
        frontier: GreedBestFrontier
      },
      {
        name: t('algorithms.aStarSearch'),
        description: t('algorithms.aStarSearchDesc'),
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
  [t('presetMazes.default'), 'mazes/default.txt'],
  [t('presetMazes.longAndShort'), 'mazes/long-and-short.txt'],
  [t('presetMazes.deepestRoute'), 'mazes/deepest-route.txt'],
  [t('presetMazes.broadest'), 'mazes/broadest.txt'],
  [t('presetMazes.1024'), 'mazes/1024.txt'],
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
  ['#202020', t('legend.wall')],
  ['#dfdfdf', t('legend.unexplored')],
  ['#808080', t('legend.explored')],
  ['#ff9966', t('legend.frontier')],
  ['#6699ff', t('legend.solutionPath')],
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
            <label>{{ t('labels.cellWidth') }}</label>
            <input v-model="cellWidth" type="number" min="1" />
          </div>
          <div class="input-item">
            <label>{{ t('labels.cellHeight') }}</label>
            <input v-model="cellHeight" type="number" min="1" />
          </div>
        </div>
        <div class="input-item-group">
          <div class="input-item">
            <label>{{ t('labels.brush') }}</label>
            <select v-model="brush" :disabled="demoState !== DemoState.Ready">
              <option :label="t('brushes.none')" :value="null"></option>
              <option :label="t('brushes.space')" :value="MazeCellType.Space"></option>
              <option :label="t('brushes.wall')" :value="MazeCellType.Wall"></option>
              <option :label="t('brushes.start')" :value="MazeCellType.Start"></option>
              <option :label="t('brushes.goal')" :value="MazeCellType.Goal"></option>
            </select>
          </div>
          <button v-if="brush !== null" @click="brush = null">{{ t('buttons.cancelDraw') }}</button>
        </div>
        <div class="input-item-group i18n">
          <div class="input-item">
            <label class="i18n-label"><img src="/icons/i18n.png" /></label>
            <select v-model="$i18n.locale">
              <option v-for="locale in $i18n.availableLocales" :key="`locale-${locale}`" :value="locale">{{ locale }}</option>
            </select>
          </div>
        </div>
        <div class="input-item-group button-list">
          <button @click="importTemplate">{{ t('buttons.import') }}</button>
          <button @click="exportTemplate">{{ t('buttons.export') }}</button>
        </div>
      </div>
      <div class="maze-container">
        <div class="legend">
          <div class="legend-item">A {{ t('legend.start') }}</div>
          <div class="legend-item">B {{ t('legend.goal') }}</div>
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
          <div v-if="solutionType === SolutionType.Pending">{{ t('solutionTips.pending', [numExplored]) }}</div>
          <div v-if="solutionType === SolutionType.Continue">{{ t('solutionTips.continue', [numExplored]) }}</div>
          <div v-else-if="solutionType === SolutionType.FoundSolution">{{ t('solutionTips.found', [numExplored]) }}</div>
          <div v-else-if="solutionType === SolutionType.NoSolution">{{ t('solutionTips.onSolution', [numExplored]) }}</div>
        </div>
        <div class="demo-controller">
          <div class="input-item">
            <label>{{ t('labels.timeInterval') }}</label>
            <input v-model="timeInterval" type="number" min="0" />
          </div>
        </div>
        <div class="button-list">
          <button v-if="demoState === DemoState.Ready" @click="start">{{ t('buttons.start') }}</button>
          <button v-if="demoState === DemoState.Paused" @click="resume">{{ t('buttons.resume') }}</button>
          <button v-if="demoState === DemoState.Done" disabled @click="resume">{{ t('buttons.resume') }}</button>
          <button v-if="demoState === DemoState.Running" @click="pause">{{ t('buttons.pause') }}</button>
          <button :disabled="demoState === DemoState.Running || demoState === DemoState.Done" @click="next">{{ t('buttons.next') }}</button>
          <button @click="reset">{{ t('buttons.reset') }}</button>
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
        <div class="aside-title">{{ t('algorithms.desc') }}</div>
        <div class="algorithm-description">{{ currAlgorithm.description }}</div>
      </div>
      <div>
        <div class="aside-title">{{ t('titles.newMaze') }}</div>
        <div class="input-item-group">
          <div class="input-item">
            <label>{{ t('labels.mazeWidth') }}</label>
            <input v-model="mazeWidth" type="number" min="1" />
          </div>
          <div class="input-item">
            <label>{{ t('labels.mazeHeight') }}</label>
            <input v-model="mazeHeight" type="number" min="1" />
          </div>
        </div>
        <div class="gen-maze-buttons">
          <button @click="loadEmptyMaze(mazeWidth, mazeHeight)">{{ t('buttons.newEmptyMaze') }}</button>
          <button @click="genDFSMaze(mazeWidth, mazeHeight)">{{ t('buttons.genRandomMaze') }}</button>
        </div>
      </div>
      <div>
        <div class="aside-title">{{ t('titles.presetMazes') }}</div>
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

.cell.solution-path .cell-start, .cell.solution-path .cell-goal {
  color: #ffffff;
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
  display: flex;
  margin-right: 12px;
}

.i18n-label {
  display: flex;
}

.i18n-label img {
  width: 20px;
  height: 20px;
}
</style>
