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
export class ProtectedDict<T = any> extends Map<string, T> {
  constructor(initial?: Record<string, T>) {
    super()
    if (initial) {
      for (const [k, v] of Object.entries(initial)) {
        this.set(k, v)
      }
    }
    this._INIT_RAN_NORMALLY = true
  }

  private _INIT_RAN_NORMALLY: boolean

  override set(key: string, value: T): this {
    if (!this._INIT_RAN_NORMALLY) return super.set(key, value)
    throw new TypeError('You cannot set a value directly...')
  }

  override delete(key: string): boolean {
    if (!this._INIT_RAN_NORMALLY) return super.delete(key)
    throw new TypeError('You cannot delete an item directly...')
  }

  copy(): ProtectedDict<T> {
    return new ProtectedDict<T>(Object.fromEntries(this))
  }

  toString(): string {
    return `ProtectedDict(${JSON.stringify(Object.fromEntries(this), null, 2)})`
  }
}
