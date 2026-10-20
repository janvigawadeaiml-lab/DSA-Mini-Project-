import { CheckersMove, CheckersTTEntry, TTFlag } from './types';

export class TranspositionTable {
  private table: Map<bigint, CheckersTTEntry>;
  public hits: number = 0;
  public lookups: number = 0;
  public stores: number = 0;
  public overwrites: number = 0;

  constructor() {
    this.table = new Map<bigint, CheckersTTEntry>();
  }

  public clear(): void {
    this.table.clear();
    this.hits = 0;
    this.lookups = 0;
    this.stores = 0;
    this.overwrites = 0;
  }

  public get(hashKey: bigint): CheckersTTEntry | undefined {
    this.lookups++;
    const entry = this.table.get(hashKey);
    if (entry) {
      this.hits++;
    }
    return entry;
  }

  public set(
    hashKey: bigint,
    depth: number,
    score: number,
    flag: TTFlag,
    bestMove?: CheckersMove
  ): void {
    if (this.table.has(hashKey)) {
      this.overwrites++;
    } else {
      this.stores++;
    }

    this.table.set(hashKey, {
      hashKey,
      depth,
      score,
      flag,
      bestMove,
    });
  }

  public size(): number {
    return this.table.size;
  }

  public getEntries(limit: number = 50): CheckersTTEntry[] {
    const entries: CheckersTTEntry[] = [];
    for (const entry of this.table.values()) {
      entries.push(entry);
      if (entries.length >= limit) break;
    }
    return entries;
  }

  public getStats() {
    return {
      size: this.table.size,
      lookups: this.lookups,
      hits: this.hits,
      hitRate: this.lookups > 0 ? ((this.hits / this.lookups) * 100).toFixed(1) : '0.0',
      stores: this.stores,
      overwrites: this.overwrites,
    };
  }
}
