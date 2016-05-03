'use strict';

var Utils = require('./utils');
var Runtime = require('./runtime');

function Event(name, attrs) {
    this.data = {
        name: name,
        uid: Utils.generate(),
        timestamp: Date.now(),
        duration: 0,
        attributes: attrs || {}
    };
}

var proto = Event.prototype;

proto.complete = function complete(status) {
    status = status || 0;
    this.data.duration = Date.now() - this.data.timestamp;
    this.data.status = status || 0;
    this.complete = function noop() {};
    setImmediate(process.emit.bind(process, 'async-trace-evt', Utils.clone(this.data)));
    return this;
};

proto.flush = function flush() {
    this.data.attributes.subclass = 'start';
    setImmediate(process.emit.bind(process, 'async-trace-evt', Utils.clone(this.data)));
    this.data.attributes.subclass = 'end';
    this.flush = function noop() {};
};

module.exports.Event = Event;

module.exports.create = function create(name, callback) {
    var isTx = !!callback;

    var evt = new Event(name, {
        class: isTx ? 'span' : 'event'
    });

    evt.data.master = true;
    if (Runtime.isInContext()) {
        var parent = Runtime.context.current;
        // flush parent
        parent.flush();

        evt.data.master = false;
        evt.data.uid = parent.data.uid + '/' + evt.data.uid;
    }

    if (!isTx) {
        return evt;
    }

    Runtime.run(function run() {
        Runtime.context.current = evt;
        callback(evt);
    });
};
