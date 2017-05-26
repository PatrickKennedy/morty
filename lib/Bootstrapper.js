const path = require('path');

/**
 * A unique class that acts as something of a manager assisting in loading and
 * unloading plugins.
 */
module.exports = class Bootstrapper extends require('./Plugin') {
  constructor(owner, lookup_paths=['./plugins', './src/plugins']) {
    super("bootstrap", owner);
    this.lookup_paths = lookup_paths;
    this.cache_paths = {};

    this.on('load_plugin', this.proxy(this._load), false);
    this.on('unload_plugin', this.proxy(this._unload), false);
    this.emit('loaded', this);
  }

  /**
   * Load new plugins into memory
   * @param {*} msg - the original message activating this command
   * @param {string} names - a list of plugins separated by spaces
   */
  cmd_load(msg, names) { this._load(...names.split(' ')); }

  /**
   * Unload existing plugins from memory
   * @param {*} msg The original message activating this command
   * @param {string} names - a list of plugins separated by spaces
   */
  cmd_unload(msg, names) { this._unload(...names.split(' ')); }

  /**
   * Search for plugins within the `lookup_paths` and initialize them
   * @param {string} name - the name of a module containing a plugin to load
   */
  _load(...names){
    for (let name of names) {
      for (const prefix of this.lookup_paths) {
        let lookup_path = path.resolve(path.join(prefix, name));
        console.log(`[load] Looking for plugin at ${lookup_path}`);
        let Plugin = this.__require(prefix, name);
        if (typeof Plugin !== "undefined") {
          new Plugin(this.owner);
          this.cache_paths[name] = lookup_path;
          break;
        }
      }
    }
  }

  /**
   * Unload a plugin by emitting for it's unload handler and clearing the
   * require cache to ensure any changes are loaded again.
   * @param {string} name - name of the plugin module to be unloaded
   */
  _unload(...names) {
    for (let name of names) {
      this.emit('unload', name);
      let lookup_path = this.cache_paths[name];
      purgeCache(name, lookup_path);
      delete this.cache_paths[name];
    }
  }

  /**
   * Handles the joining and resolution to an absolute path using the bot's CWD
   * while covering the return so it can be used more easily in a loop.
   * @param {Array<string>} paths - a list of paths to join and then resolve
   */
  __require(...paths) {
    try {
      return require(path.resolve(path.join(...paths)));
    } catch (e) {
      console.log(`[require] Error loading module: ${e}`);
      return;
    }
  }
}

/**
 * Removes a module from the cache
 */
function purgeCache(name, path) {
  // Traverse the cache looking for the files
  // loaded by the specified module name
  searchCache(path, function (mod) {
    delete require.cache[mod.id];
  });

  // Remove cached paths to the module.
  // Thanks to @bentael for pointing this out.
  Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
    if (cacheKey.indexOf(name)>0) {
      delete module.constructor._pathCache[cacheKey];
    }
  });
};

/**
 * Traverses the cache to search for all the cached
 * files of the specified module name
 */
function searchCache(path, callback) {
  // Resolve the module identified by the specified name
  var mod = require.resolve(path);

  // Check if the module has been resolved and found within the cache
  if (!mod || ((mod = require.cache[mod]) === undefined))
    return;

  // Recursively go over the results
  (function traverse(mod) {
    // Go over each of the module's children and traverse them
    mod.children.forEach(function (child) {
      traverse(child);
    });

    // Call the specified callback providing the found cached module
    callback(mod);
  }(mod));
};