console.log("Test Space Running");

const ee = new (require('events')).EventEmitter();

new (require('../index')).Bootstrapper(ee, ['./tests/plugins']);
ee.emit('load_plugin', 'tester');
ee.emit('load_plugin', 'broken');

ee.emit('trigger', 'load', '', 'ping');
ee.emit('trigger', 'ping');

ee.emit('trigger', 'load', '', 'hello');
ee.emit('trigger', 'hello', 'Patrick');

ee.emit('trigger', 'unload', '', 'hello');
ee.emit('trigger', 'hello', 'Patrick');

console.log('End of Test Space');