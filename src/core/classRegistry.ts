import { inspect } from 'util'

/**
 * A registry for managing named class instances, similar to Python's metaclass-based registry.
 */
export class Registry<T> {
  private registry = new Map<string, new (...args: any[]) => T>()

  /**
   * Registers a class with a given name and optional aliases.
   *
   * @param name - Primary name of the class to register.
   * @param klass - The class constructor to register.
   * @param aliases - Optional list of additional aliases for the class.
   */
  register(name: string, klass: new (...args: any[]) => T, aliases?: string[]) {
    this.registry.set(name, klass)
    if (aliases) {
      for (const alias of aliases) {
        this.registry.set(alias, klass)
      }
    }
  }

  /**
   * Retrieves and instantiates a registered class by name.
   *
   * @param name - The name or alias of the class.
   * @param args - Arguments to pass to the class constructor.
   * @returns An instance of the requested class.
   * @throws If no class is registered under the given name.
   */
  create(name: string, ...args: any[]): T {
    const klass = this.registry.get(name)
    if (!klass) {
      throw new Error(
        `Class "${name}" is not registered. Available: ${[...this.registry.keys()].join(', ')}`,
      )
    }
    return new klass(...args)
  }

  /**
   * Lists all registered names (including aliases).
   *
   * @returns An array of all names registered in the registry.
   */
  listNames(): string[] {
    return [...this.registry.keys()]
  }
}

/**
 * A dictionary that prevents direct mutation after initialization.
 * Useful for maintaining read-only mappings like market times.
 */
export class ProtectedDict<T = any> {
  private store: Map<string, T> = new Map()
  private initialized = false

  constructor(initial: Record<string, T>) {
    for (const key of Object.keys(initial)) {
      this.store.set(key, initial[key])
    }
    this.initialized = true
  }

  /**
   * Internal setter used only before finalization.
   *
   * @param key - The key to set.
   * @param value - The value to assign.
   */
  _set(key: string, value: T) {
    this.store.set(key, value)
  }

  /**
   * Internal deleter used only before finalization.
   *
   * @param key - The key to delete.
   */
  _del(key: string) {
    this.store.delete(key)
  }

  /**
   * Prevents setting properties after construction.
   */
  set(key: string, value: T): void {
    if (!this.initialized) {
      this._set(key, value)
      return
    }
    throw new TypeError(
      'Direct modification is not allowed. Use specific helper methods for updates.',
    )
  }

  /**
   * Prevents deleting properties after construction.
   */
  delete(key: string): void {
    if (!this.initialized) {
      this._del(key)
      return
    }
    throw new TypeError(
      'Direct deletion is not allowed. Use specific helper methods for updates.',
    )
  }

  /**
   * Gets a value by key.
   *
   * @param key - The key to retrieve.
   * @returns The corresponding value.
   */
  get(key: string): T | undefined {
    return this.store.get(key)
  }

  /**
   * Checks if a key exists in the dictionary.
   *
   * @param key - The key to check.
   * @returns True if the key exists.
   */
  has(key: string): boolean {
    return this.store.has(key)
  }

  /**
   * Returns a shallow copy of the internal dictionary as a plain object.
   */
  toObject(): Record<string, T> {
    const result: Record<string, T> = {}
    for (const [key, value] of this.store.entries()) {
      result[key] = value
    }
    return result
  }

  /**
   * Returns a stringified version of the dictionary for debugging.
   */
  toString(): string {
    return `ProtectedDict(${inspect(this.toObject(), { depth: null, sorted: false })})`
  }
}
