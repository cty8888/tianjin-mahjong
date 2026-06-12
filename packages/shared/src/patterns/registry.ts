import type { PatternChecker } from '../types';

/**
 * Registry for pluggable win-pattern checkers.
 * New patterns can be added without modifying core game code.
 */
export class PatternRegistry {
  private checkers: Map<string, PatternChecker>;

  constructor() {
    this.checkers = new Map();
  }

  /** Register a pattern checker. If a checker with the same name already exists, it is replaced. */
  register(checker: PatternChecker): void {
    this.checkers.set(checker.name, checker);
  }

  /** Remove a checker by name. Does nothing (no error) if not found. */
  unregister(name: string): void {
    this.checkers.delete(name);
  }

  /** Return a shallow copy of all registered checkers. */
  list(): PatternChecker[] {
    return Array.from(this.checkers.values());
  }

  /** Remove all registered checkers. */
  clear(): void {
    this.checkers.clear();
  }
}
