'use strict';

const Peon = require('../index.js');

const a = new Peon.Task('a');
const b = new Peon.Task('b');
const c = new Peon.Task('c');
const d = new Peon.Task('d');
const e = new Peon.Task('e');
const f = new Peon.Task('f');
const g = new Peon.Task('g', { dependsOn: [ b, e, f ] });

b.dependsOn(a);
c.dependsOn('b');
d.dependsOn(a, b);
f.dependsOn(e);

Peon.concurrency = 3;

Peon.run('d', 'c');
Peon.run(g).then(() => {
  console.log('Finished', g.name, g.state);
});
