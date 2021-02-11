'use strict';

////////////////////////////////////////////////////////////
// Peon Instance
function Peon () {
  const tasks = {};

  /////////////////////////////////////////////////////////
  // Task definition
  this.Task = class {
    constructor (name, func, config = {}) {
      this.name = name;
      this.description = config.description || '';

      this.func = func;
      this.dependencies = [ ...config.dependencies ];

      this.state = Peon.STATE_READY;

      tasks[this.name] = this;
    }

    async run (peon) {
      if (this.func.length === 2) {
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

    dependsOn (name) {
      this.dependencies.push(name);
    }
  };
}

////////////////////////////////////////////////////////////
// Constants
Peon.prototype.STATE_READY = 'ready';
Peon.prototype.STATE_PASSED = 'passed';
Peon.prototype.STATE_FAILED = 'failed';

////////////////////////////////////////////////////////////
// Exports
module.exports = new Peon();
