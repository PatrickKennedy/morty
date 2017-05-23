/**
 * The underlying structure for the Kuso plugin framework.
 * BasePlugin attempts to automate much of the boilerplate necessary on all
 * plugins, acting as a mini-manager for each plugin and it's event handlers.
 *
 * Additionally, it defines the various framework conventions that should be
 * followed by plugins (e.g. command events being prefixed by `cmd:`).
 *
 * It does not seek to solve any of the global management tasks, such as loading
 * new plugins or hooking into the application EventEmitter. For that a
 * special bootstrap plugin exists
 */
module.exports = class BasePlugin {
  /**
   * @param {String} name - The name of the plugin, must match module name
   * @param {EventEmitter} owner - any EventEmitter
   * @param {string} [namespace="kuso"] - The namespace used to namespace emitter events
   */
  constructor(name, owner, namespace="kuso") {
    console.log(`[new] Constructing ${name}`);
    this.name = name;
    this.owner = owner;
    this.namespace = namespace;

    this.traps = {
      apply: (target, thisArg, args) => {
        return Reflect.apply(target, this, args);
      }
    }

    this.proxies = new Map();
    this.events = {};

    this.registerHandler(this.unload);

    // automatically register commands defined on subclasses
    let proto = Object.getPrototypeOf(this);
    do {
      for (let method of Object.getOwnPropertyNames(proto)) {
        method = this[method];
        if (method.name && method.name.startsWith('cmd_'))
          this.registerCommand(method);
      }
    } while (proto = Object.getPrototypeOf(proto));
  }

  /**
   * Wrap the owner's .on() call optionally namespacing events and tracking
   * event handlers to automatically unregister them when the plugin is unloaded
   * @param {string} event - the event to listen for
   * @param {function} handler - a handler function, ideally one bound to the
   * plugin context
   * @param {boolean} [namespace=true] - if true the event name will be prefixed
   * with the configured namespace
   */
  on(event, handler, namespace=true) {
    let e = (namespace ? `${this.namespace}:` : '') + event;
    if (e in this.events)
      throw new Error(`Attempting to register another handler to ${e} on the ${this.name} plugin`);
    this.events[e] = handler;
    console.log(`[on] Registering event ${e}`);
    return this.owner.on(e, handler);
  }

  /**
   * Unregister the handler from the event, and update the internal event list.
   * @param {string} event - the event to listen for
   * @param {function} handler - a handler function, ideally one bound to the
   * plugin context
   * @param {boolean} [namespace=true] - if true the event name will be prefixed
   * with the configured namespace
   */
  off(event, handler, namespace=true) {
    let e = (namespace ? `${this.namespace}:` : '') + event;
    handler = this.events[e];
    console.log(`[off] Unregistering event ${e}`);
    this.owner.removeListener(event, handler);
    delete this.events[e];
  }

  /**
   * Wrap the owner's emit to conveniently handle namespacing.
   * Note: All events emitted from plugins should be namespaced to avoid
   * conflicts with the emitter we're hijacking.
   * @param {string} event
   * @param {*} args
   */
  emit(event, ...args) {
    let e = `${this.namespace}:${event}`;
    console.log(`[emit] Emitting event ${e}`);
    return this.owner.emit(e, ...args);
  }

  /**
   * Wrap the passed function in a Proxy object which, currently, simulates
   * binding the function to a specific context, overwriting the EventEmitter
   * object that's passed for the thisArg. This may be overkill and .bind being
   * all that's necessary.
   * @param {function} handler - a function to be used as an event handler
   */
  proxy(handler) {
    if(this.proxies.has(handler))
      return this.proxies.get(handler);

    let proxy = new Proxy(handler, this.traps);
    this.proxies.set(handler, proxy);
    return proxy;
  }

  /**
   * Register an un-namespaced event on the owner. This is useful for handling
   * application events.
   * @param {function} handler
   */
  registerEventTrap(handler) {
    let event = handler.name;
    return this.on(event, this.proxy(handler), false);
  }

  /**
   * Register a namespaced event intended for cross-plugin communication.
   * @param {function} handler
   */
  registerHandler(handler) {
    let event = handler.name.toLowerCase();
    return this.on(event, this.proxy(handler));
  }

  /**
   * Register an interactive command namespaced to it's own event (although not
   * strictly limited to a single handler, currently).
   * @param {function} handler
   */
  registerCommand(handler) {
    let event = handler.name.replace('cmd_', '').toLowerCase();
    return this.on(`cmd:${event}`, this.proxy(handler));
  }

  /**
   * A placeholder handler for global `loaded` event every plugin should fire.
   * Should be replaced by subclasses.
   * @param {BasePlugin} plugin - the instance of the plugin loaded
   */
  loaded(plugin) {}

  /**
   * Handles `unload` events. Must unregister events from the owner and perform
   * any plugin specific cleanup (disconnecting from databases, etc.). Should be
   * extended with `super.unload(...)` but isn't strictly necessary.
   * @param {string} name - The name of the plugin that should perform the unload
   */
  unload(name) {
    if (name !== this.name)
      return;

    for (let event in this.events) {
      this.off(event, this.events[event], false);
    }

    this.emit('unloaded', this);
  }
}