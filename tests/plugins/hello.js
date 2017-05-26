module.exports = class extends require('../../index').Plugin {
  constructor(owner) {
    let name = __filename.slice(__dirname.length + 1, -3);
    super(name, owner);
    this.emit('loaded', this);
  }

  cmd_hello(name) { console.log(`Hello, ${name}`); }
}