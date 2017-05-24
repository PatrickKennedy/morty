About
===
KusoPlugins is a lightweight plugin framework that wraps an EventEmitter style object to interact with a larger application. The emitter may by the basis for that application (e.g. a Discord.js bot) or be entirely dedicated to the plugins themselves.

More importantly for an interactive application the plugins themselves are hotswappable and can be easily unloaded when no longer needed or reloaded for rapid development.

It intentionally has no node dependencies and is entirely self-contained. Each part of it is based on the `Plugin` class. There are no extra components or concepts to worry about. Because it can tie directly into an application's events it can be used as a direct extension of the application.

There are two main components to the plugin:
  1. `Plugin` is the base class for all plugins. It primarily provides functions for registering and unregistering handlers with the owning emitter as well as namespacing events attached to and emitted. However, it also contains many convenience features built in, including automatically registering commands, and tracking registered events and unloading them when responding to the `unload` event.
  2. `Bootstrapper` is a psudo-management plugin that includes two commands: `load` and `unload` for use with interactive applications. It also listens to the `load_plugin` and `unload_plugin` events. It offers multiple plugin directories and handles clearing the module/require caches to ensure plugins are loaded fresh each time.

Most importantly `Bootstrapper` does not make any assumptions regarding the application it's attached to. Each application is expected to manage it's own plugins for integrating with user interaction and of course the various events emitted by the application.

Again, out of the box no assumptions are made, and the framework will sit quietly until plugins designed to work with the application are added. This also means there's currently no explicit interoperability between plugins built for different applications. A Discord.js plugin most likely will not work with a Twitch bot, or even a different Discord bot framework. In the future there may be configurable functions/events added to ease the difference, but that's currently outside the scope of the framework as it exists today.


Installation
===
Install using npm:
```
$ npm install --save kuso-plugins
```
Install using yarn
```
$ yarn add kuso-plugins
```


Usage
===
Hooking into your application is simple and can be done in one of two ways:

  1. By creating an `EventEmitter` specifically for plugin interaction
  2. Attaching to an existing `EventEmitter`

Either method involves adding these lines as part of the application initialization:
```js
// index.js
new (require('kuso-plugins').Bootstrapper)(ee);
ee.emit('load_plugin', 'app-specific-integration');
```
Note: it's preferred to load plugins via events rather than manual initialization to ensure the plugins can be fully removed from the require/module cache.

Where `app-specific-integration` might look like:
```js
// app-specific-integration.js
module.exports = class AppIntegration extends require('kuso-plugins').Plugin {
  constructor(owner) {
    let name = __filename.slice(__dirname.length + 1, -3);
    super(name, owner);
    this.registerEventTrap(this.message);
    this.emit('loaded', this);
  }

  /**
   * Handle messages, specifically processing namespaced commands
   * @param {string} message
   */
  message(message) {
    if (message.author.id === this.owner.id)
      return;

    console.log(`[message] Received Message: ${message}`);
    let content = message.content;
    if(content.startsWith('!')) {
      let [cmd, ...args] = content.split(' ');
      cmd = cmd.substr(1).toLowerCase();
      args = args.join(' ');
      this.emit(`cmd:${cmd}`, message, args);
    }
  }
}
```
Note: The integration generally exists to provide the external command control. In the case of a chat bot this might mean incoming messages. If your application doesn't have an interactive interface but instead an admin configuration it could listen for changes (ala RethinkDB for example) to the plugins and process those changes. The `Bootstrapper` exposes the interactive commands for managing plugins but also the event-based interface.

Plugin Development
===
Plugins in KusoPlugin can be as small as a single command or listener, or multi-command monstrosities that interact with external resources or even expose their own set of event hooks other plugins can use.

An example of the simplest single-command plugin:
```Javascript
module.exports = class Ping extends require('kuso-plugins').Plugin {
  constructor(owner) {
    let name = __filename.slice(__dirname.length + 1, -3);
    super(name, owner);
    this.emit('loaded', this);
  }

  cmd_ping(msg, args) { console.log('pong!'); }
}
```

This is about as small a plugin as possible. Lets walk through it line-by-line:
  - 1 - This plugin is named `Ping` and extends the Plugin.
  - 3 - The name is built from the filename of the module. While it could be hardcoded this eliminates the small overhead if the module name changes. The name passed to `Plugin` must match the name of the module as unload events pass along the module name to the unload handler to be compared to when deciding whether to deregister events.
  - 4 - Plugin is expecting the name in addition to the owner and will set it for us.
  - 5 - Every plugin is expected to emit the `loaded` event and include it's instance.
  - 8 - the `ping` command doesn't need to be registered because it's prefix allowing the `Plugin` to do it for us. It can expect to arguments, the original `msg` object that triggered it and any `args` that may have been included.

Functions prefixed with `cmd_` are automatically registered with the owning emitter with an event using this template `cmd:${handler.name.replace('cmd_', '')}`. Unlike unload events commands are not called every time and passed a string representing the command to be executed. They're uniquely namespaced and only a single handler may be loaded for a given event per plugin (in the future this may change to inspect the emitter itself, especially for commands).
