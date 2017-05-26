module.exports = class extends require('../../index').Plugin {
  constructor(owner) {
    let name = __filename.slice(__dirname.length + 1, -3);
    super(name, owner);
    this.registerEventTrap(this.trigger);
    this.emit('loaded', this);
  }

  trigger(cmd, ...args) { this.emit(`cmd:${cmd}`, ...args); }
}