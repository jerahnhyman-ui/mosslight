/** Pure game rules shared by the garden activity screens and their tests. */
export const MATCH_SYMBOLS = ["🍃", "🌼", "🍓", "🌙", "🐞", "🫧"] as const;
type Random = () => number;

function shuffled<T>(values: readonly T[], random: Random): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export class GardenMatch {
  readonly cards: string[];
  readonly matched = new Set<number>();
  open: number[] = [];
  moves = 0;
  waiting = false;

  constructor(random: Random = Math.random) {
    this.cards = shuffled([...MATCH_SYMBOLS, ...MATCH_SYMBOLS], random);
  }

  get complete() {
    return this.matched.size === this.cards.length;
  }

  reveal(index: number): "ignored" | "first" | "match" | "mismatch" {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.cards.length ||
      this.waiting ||
      this.matched.has(index) ||
      this.open.includes(index) ||
      this.complete
    )
      return "ignored";
    this.open.push(index);
    if (this.open.length === 1) return "first";
    this.moves++;
    const [a, b] = this.open as [number, number];
    if (this.cards[a] === this.cards[b]) {
      this.matched.add(a);
      this.matched.add(b);
      this.open = [];
      return "match";
    }
    this.waiting = true;
    return "mismatch";
  }

  hideMismatch() {
    if (!this.waiting) return;
    this.open = [];
    this.waiting = false;
  }
}

export const FALLING_WIDTH = 10;
export const FALLING_HEIGHT = 16;
export const FALLING_GOAL = 8;
type Point = readonly [number, number];
export type ShapeName =
  | "leaf"
  | "sun"
  | "branch"
  | "flower"
  | "berry"
  | "seed"
  | "moon";
const SHAPES: Record<ShapeName, readonly Point[]> = {
  leaf: [
    [-1, 0],
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  sun: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  branch: [
    [-1, 0],
    [0, 0],
    [1, 0],
    [0, -1],
  ],
  flower: [
    [-1, -1],
    [-1, 0],
    [0, 0],
    [1, 0],
  ],
  berry: [
    [1, -1],
    [-1, 0],
    [0, 0],
    [1, 0],
  ],
  seed: [
    [0, -1],
    [1, -1],
    [-1, 0],
    [0, 0],
  ],
  moon: [
    [-1, -1],
    [0, -1],
    [0, 0],
    [1, 0],
  ],
};
export type FallingCell = ShapeName | null;
export type FallingPiece = {
  name: ShapeName;
  x: number;
  y: number;
  rotation: number;
};

function points(piece: FallingPiece): Point[] {
  return SHAPES[piece.name].map(([initialX, initialY]) => {
    let x = initialX,
      y = initialY;
    if (piece.name !== "sun") {
      for (let i = 0; i < piece.rotation; i++) [x, y] = [-y, x];
    }
    return [piece.x + x, piece.y + y];
  });
}

export class FallingGarden {
  grid: FallingCell[][] = Array.from({ length: FALLING_HEIGHT }, () =>
    Array(FALLING_WIDTH).fill(null),
  );
  piece!: FallingPiece;
  next!: ShapeName;
  lines = 0;
  score = 0;
  state: "playing" | "won" | "lost" = "playing";
  private bag: ShapeName[] = [];
  private random: Random;

  constructor(random: Random = Math.random) {
    this.random = random;
    this.next = this.drawShape();
    this.spawn();
  }

  private drawShape(): ShapeName {
    if (!this.bag.length)
      this.bag = shuffled(Object.keys(SHAPES) as ShapeName[], this.random);
    return this.bag.pop()!;
  }

  private fits(piece: FallingPiece): boolean {
    return points(piece).every(
      ([x, y]) =>
        x >= 0 &&
        x < FALLING_WIDTH &&
        y < FALLING_HEIGHT &&
        (y < 0 || this.grid[y]![x] === null),
    );
  }

  private spawn() {
    this.piece = { name: this.next, x: 4, y: 1, rotation: 0 };
    this.next = this.drawShape();
    if (!this.fits(this.piece)) this.state = "lost";
  }

  cells(): Point[] {
    return points(this.piece);
  }

  move(dx: number): boolean {
    if (this.state !== "playing" || ![-1, 1].includes(dx)) return false;
    const next = { ...this.piece, x: this.piece.x + dx };
    if (!this.fits(next)) return false;
    this.piece = next;
    return true;
  }

  rotate(): boolean {
    if (this.state !== "playing") return false;
    const rotation = (this.piece.rotation + 1) % 4;
    for (const dx of [0, -1, 1, -2, 2]) {
      const next = { ...this.piece, x: this.piece.x + dx, rotation };
      if (this.fits(next)) {
        this.piece = next;
        return true;
      }
    }
    return false;
  }

  step(): boolean {
    if (this.state !== "playing") return false;
    const next = { ...this.piece, y: this.piece.y + 1 };
    if (this.fits(next)) {
      this.piece = next;
      return true;
    }
    this.lock();
    return false;
  }

  drop() {
    if (this.state !== "playing") return;
    while (this.state === "playing") {
      const next = { ...this.piece, y: this.piece.y + 1 };
      if (!this.fits(next)) break;
      this.piece = next;
      this.score += 2;
    }
    this.lock();
  }

  private lock() {
    const positions = points(this.piece);
    if (positions.some(([, y]) => y < 0)) {
      this.state = "lost";
      return;
    }
    for (const [x, y] of positions) this.grid[y]![x] = this.piece.name;
    const remaining = this.grid.filter((row) =>
      row.some((cell) => cell === null),
    );
    const cleared = FALLING_HEIGHT - remaining.length;
    this.lines += cleared;
    this.score += [0, 100, 300, 500, 800][cleared] ?? 800;
    this.grid = [
      ...Array.from({ length: cleared }, () =>
        Array<FallingCell>(FALLING_WIDTH).fill(null),
      ),
      ...remaining,
    ];
    if (this.lines >= FALLING_GOAL) {
      this.state = "won";
      return;
    }
    this.spawn();
  }
}
