'use strict';

// Counter is used when shortid is called multiple times in one second.
var counter;

// Remember the last time in case counter is needed.
var previousTime;

/**
 * Generate unique id
 * Returns string id
 */
module.exports.generate = function generate() {

    var time = Date.now();

    if (time === previousTime) {
        counter++;
    } else {
        counter = 0;
        previousTime = time;
    }

    return '' + parseInt(process.env.NODE_UNIQUE_ID || 0, 10) + ',' + time + ',' + counter;
};

module.exports.clone = function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
};
