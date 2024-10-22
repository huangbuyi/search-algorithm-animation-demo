export class PriorityQueue<T = number> {
  private _heap: T[];
  private _comparator: (a: T, b: T) => boolean;
  private static top = 0;
  private static parent = (i: number) => ((i + 1) >>> 1) - 1;
  private static left = (i: number) => (i << 1) + 1;
  private static right = (i: number) => (i + 1) << 1;

  constructor(comparator: (a: T, b: T) => boolean) {
    this._heap = [];
    this._comparator = comparator;
  }

  size() {
    return this._heap.length;
  }

  find(finder: (value: T) => boolean) {
    return this._heap.find(finder);
  }

  isEmpty() {
    return this.size() == 0;
  }

  peek() {
    return this._heap[PriorityQueue.top];
  }

  push(...values: T[]) {
    values.forEach(value => {
      this._heap.push(value);
      this._siftUp();
    });
    return this.size();
  }

  pop() {
    const poppedValue = this.peek();
    const bottom = this.size() - 1;
    if (bottom > PriorityQueue.top) {
      this._swap(PriorityQueue.top, bottom);
    }
    this._heap.pop();
    this._siftDown();
    return poppedValue;
  }
  
  replace(value: T) {
    const replacedValue = this.peek();
    this._heap[PriorityQueue.top] = value;
    this._siftDown();
    return replacedValue;
  }

  _greater(i: number, j: number) {
    return this._comparator(this._heap[i], this._heap[j]);
  }

  _swap(i: number, j: number) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }

  _siftUp() {
    let node = this.size() - 1;
    while (node > PriorityQueue.top && this._greater(node, PriorityQueue.parent(node))) {
      this._swap(node, PriorityQueue.parent(node));
      node = PriorityQueue.parent(node);
    }
  }

  _siftDown() {
    let node = PriorityQueue.top;
    while (
      (PriorityQueue.left(node) < this.size() && this._greater(PriorityQueue.left(node), node)) ||
      (PriorityQueue.right(node) < this.size() && this._greater(PriorityQueue.right(node), node))
    ) {
      let maxChild = (PriorityQueue.right(node) < this.size() && this._greater(PriorityQueue.right(node), PriorityQueue.left(node))) ? PriorityQueue.right(node) : PriorityQueue.left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}