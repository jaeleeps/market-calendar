/**
 * A registry for managing named class instances, similar to Python's metaclass-based registry.
 */
export class Registry<T> {
  private registry = new Map<string, new (...args: any[]) => T>()

  /** Registered names in the casing they were declared with. */
  private names: string[] = []

  /**
   * Registers a class with a given name and optional aliases.
   *
   * Lookup is case-insensitive, so "nyse" and "NYSE" resolve alike.
   *
   * @param name - Primary name of the class to register.
   * @param klass - The class constructor to register.
   * @param aliases - Optional list of additional aliases for the class.
   */
  register(name: string, klass: new (...args: any[]) => T, aliases?: string[]) {
    for (const key of [name, ...(aliases ?? [])]) {
      this.registry.set(key.toLowerCase(), klass)
      this.names.push(key)
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
    const klass = this.registry.get(name.toLowerCase())
    if (!klass) {
      throw new Error(
        `Class "${name}" is not registered. Available: ${this.names.join(', ')}`,
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
    return [...this.names]
  }
}

/**
 * A dictionary that prevents direct mutation after initialization.
 * Useful for maintaining read-only mappings like market times.
 */
/**
 * A key-value dictionary that protects against direct item mutation.
 * You must use `.changeTime`, `.addTime`, or `.removeTime` to modify.
 */
export class ProtectedDict<T> extends Map<string, T> {
  private _INIT_RAN_NORMALLY: boolean

  constructor(entries?: [string, T][]) {
    super(entries)
    this._INIT_RAN_NORMALLY = true
  }

  /**
   * Internal use for setting values without triggering protection.
   */
  _set(key: string, value: T): void {
    super.set(key, value)
  }

  /**
   * Internal use for deleting values without triggering protection.
   */
  _del(key: string): void {
    super.delete(key)
  }

  /**
   * Prevent direct use of `.set()`
   * @throws TypeError
   */
  override set(key: string, value: T): this {
    if (!this._INIT_RAN_NORMALLY) return super.set(key, value)
    throw new TypeError(
      'You cannot set a value directly. Use .changeTime, .addTime or .removeTime instead.',
    )
  }

  /**
   * Prevent direct use of `.delete()`
   * @throws TypeError
   */
  override delete(key: string): boolean {
    if (!this._INIT_RAN_NORMALLY) return super.delete(key)
    throw new TypeError(
      'You cannot delete an item directly. Use .changeTime, .addTime or .removeTime instead.',
    )
  }

  /**
   * Pretty-print the contents of the ProtectedDict.
   */
  override toString(): string {
    return `ProtectedDict(${JSON.stringify(Object.fromEntries(this.entries()), null, 2)})`
  }

  /**
   * Make a mutable shallow copy of the dictionary.
   */
  copy(): Map<string, T> {
    return new Map(this.entries())
  }
}
