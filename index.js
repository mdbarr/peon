'use strict';

require('barrkeep/pp');
const async = require('async');

////////////////////////////////////////////////////////////
// Peon
const Peon = {
  queue: null,
  tasks: {},

  get concurrency () {
    return Peon.queue.concurrency;
  },
  set concurrency (value) {
    Peon.queue.concurrency = value;
  },

  STATE_FAILED: 'failed',
  STATE_PASSED: 'passed',
  STATE_READY: 'ready',
  STATE_QUEUED: 'queued',
  STATE_RUNNING: 'running',
  STATE_UNRESOLVED: 'unresolved',

  pool: new Set(),
};

Peon.state = Peon.STATE_READY;

Peon.runner = async (task) => {
  console.log('running', task.name);

  if (!task.state === Peon.STATE_READY) {
    return task;
  }

  try {
    await task.run(Peon);
    task.state = Peon.STATE_PASSED;
  } catch (error) {
    task.error = error;
    task.state = Peon.STATE_FAILED;
  }

  Peon.enqueue(...Peon.scan());

  return task;
};

Peon.queue = async.queue(Peon.runner);
Peon.done = new Promise(async (resolve) => {
  await Peon.queue.drain();
  console.log('Done!');
  resolve(true);
});

Peon.lookup = (task) => {
  if (task instanceof Peon.Task) {
    return task;
  }
  if (Peon.tasks[task] === undefined) {
    throw new Error(`Undefined task ${ task }`);
  }
  return Peon.tasks[task];
};

Peon.prepare = () => {
  for (const name in Peon.tasks) {
    const task = Peon.tasks[name];

    for (let i = 0; i < task.dependencies.length; i++) {
      if (typeof task.dependencies[i] === 'string') {
        const id = task.dependencies[i];
        task.dependencies[i] = Peon.lookup(id);
        console.log('looked up', id);
      }
    }
  }
};

Peon.walk = (task, seen = new WeakSet()) => {
  if (!seen.has(task)) {
    console.log('walking', task.name);

    if (task.state === Peon.STATE_UNRESOLVED) {
      Peon.pool.add(task);
    }

    for (const dependency of task.dependencies) {
      Peon.walk(dependency);
    }
  }
};

Peon.scan = () => {
  const runnables = [];

  console.log('scanning');
  for (const task of Peon.pool) {
    console.log('scanning', task.name);

    if (task.state === Peon.STATE_UNRESOLVED) {
      if (task.dependencies.length === 0) {
        task.state = Peon.STATE_READY;
        runnables.push(task);
      } else {
        let passed = 0;
        for (const dependency of task.dependencies) {
          if (dependency.state === Peon.STATE_PASSED) {
            passed++;
          } else if (dependency.state === Peon.STATE_FAILED) {
            task.state = Peon.STATE_FAILED;
            task.error = new Error('Unrunnable, upstream failure');
            Peon.pool.delete(task);
          }
        }

        if (passed === task.dependencies.length) {
          task.state = Peon.STATE_READY;
          runnables.push(task);
        }
      }
    }
  }

  return runnables;
};

Peon.queued = new WeakSet();
Peon.enqueue = (...tasks) => {
  for (const task of tasks) {
    if (!Peon.queued.has(task)) {
      Peon.queued.add(task);
      Peon.pool.delete(task);
      Peon.queue.push(task);
    }
  }
};

Peon.run = (task) => {
  task = Peon.lookup(task);

  if (Peon.state === Peon.STATE_RUNNING) {
    Peon.walk(task);
    return Peon.done;
  }

  Peon.state = Peon.STATE_RUNNING;

  Peon.prepare();
  Peon.walk(task);
  console.log('pool', Peon.pool);

  const ready = Peon.scan();
  if (!ready.length) {
    throw new Error(`Task dependency chain unresolvable: ${ task.name }`);
  }
  console.log('ready', ready);

  Peon.enqueue(...ready);

  return Peon.done;
};

///////////////////////////////////////////////////////////
// Task
class Task {
  constructor (name, func, options) {
    this.name = name;

    if (options === undefined) {
      if (typeof func === 'object') {
        options = func;
        func = undefined;
      } else {
        options = {};
      }
    }

    this.description = options.description || '';

    this.func = func;

    this.dependencies = Array.isArray(options.dependsOn) ? [ ...options.dependsOn ] : [];

    this.state = Peon.STATE_UNRESOLVED;

    Peon.tasks[this.name] = this;
  }

  async run (peon) {
    if (!this.func) {
      return true;
    } else if (this.func.length === 2) {
      return new Promise((resolve, reject) => {
        this.func(peon, (error, result) => {
          if (error) {
            return reject(error);
          }

          return resolve(result);
        });
      });
    }
    return await this.func(peon);
  }

  dependsOn (...args) {
    this.dependencies.push(...args);
  }
}

Peon.Task = Task;

///////////////////////////////////////////////////////////

module.exports = Peon;
