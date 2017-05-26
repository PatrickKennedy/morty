module.exports = class extends require('./Plugin') {
  constructor(owner) {
    let name = __filename.slice(__dirname.length + 1, -3);
    super(name, owner);
    this.emit('loaded', this);
  });

  cmd_ping(msg, name) { console.log(`Hello, ${name}`); }
}