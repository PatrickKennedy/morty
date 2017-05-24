module.exports = class Ping extends require('./Plugin') {
  constructor(owner) {
    let name = __filename.slice(__dirname.length + 1, -3);
    super(name, owner);
    this.emit('loaded', this);
  }

  cmd_ping(msg, args) { console.log('pong!'); }
}