const BasePlugin = require('./BasePlugin');

module.exports = class extends BasePlugin {
  constructor(owner) {
    let name = __filename.slice(__dirname.length + 1, -3);
    super(name, owner);
    this.emit('loaded', this);
  }

  cmd_ping(msg, args) { console.log('pong!'); }
}