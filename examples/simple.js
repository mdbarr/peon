'use strict';

module.exports = (peon) => {
  const a = new peon.Task('a');
  const b = new peon.Task('b');
  const c = new peon.Task('c');
  const d = new peon.Task('d');

  b.dependsOn(a);
  c.dependsOn(b);
  d.dependsOn(a, b);
};
