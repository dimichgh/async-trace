'use strict';

var Assert = require('assert');
var Events = require('../lib/events');
var Runtime = require('../lib/runtime');
var Utils = require('./fixtures/utils');

var events = [];
process.on('async-trace-evt', function (evt) {
    events.push(evt);
});

describe(__filename, function () {

    describe('events', function() {
        before(function () {
            while(process.domain) {
                process.domain.exit();
            }
            events = [];
        });

        afterEach(function () {
            while(process.domain) {
                process.domain.exit();
            }
            events = [];
        });

        it('should create simple event', function (done) {
            var evt = Events.create('test');
            Assert.ok(evt);
            Assert.ok(/\d+,\d+:\d+:\d+\.\d+,\d+/);
            Assert.ok(evt.data.timestamp);
            Assert.ok(evt.data.status === undefined);
            Assert.deepEqual({
                name: 'test',
                uid: evt.data.uid,
                timestamp: evt.data.timestamp,
                duration: 0,
                master: true,
                attributes: {
                    class: 'event'
                }
            }, evt.data);

            setTimeout(function () {
                evt.complete(1);
                Assert.equal(1, evt.data.status);
                Assert.ok(evt.data.duration > 19);
                done();
            }, 20);
        });

        it('should create two events with different uids', function () {
            var foo = Events.create('foo');
            var bar = Events.create('bar');
            Assert.ok(foo);
            Assert.deepEqual({
                name: 'foo',
                uid: foo.data.uid,
                timestamp: foo.data.timestamp,
                duration: 0,
                master: true,
                attributes: {
                    class: 'event'
                }
            }, foo.data);
            if (foo.data.uid.split(',')[1] === bar.data.uid.split(',')[1]) {
                Assert.equal(parseInt(foo.data.uid.split(',').pop()) + 1, parseInt(bar.data.uid.split(',').pop()),
                    'Should increment counter for foo.uid: ' + foo.data.uid + ', bar.uid: ' + bar.data.uid);
            }
            else {
                Assert.equal(parseInt(foo.data.uid.split(',').pop()),
                    parseInt(bar.data.uid.split(',').pop()), 'Should increment counter');
            }
        });

        it('should create transaction', function (done) {
            Assert.ok(!Runtime.isInContext());

            Events.create('fooTx', function (evt) {
                Assert.ok(Runtime.isInContext());
                Assert.equal(evt, Runtime.context.current);
                Assert.deepEqual({
                    name: 'fooTx',
                    uid: evt.data.uid,
                    timestamp: evt.data.timestamp,
                    duration: 0,
                    master: true,
                    attributes: {
                        class: 'span'
                    }
                }, evt.data);

                setTimeout(function delay() {
                    evt.complete(2);
                    Assert.ok(evt.data.duration > 9);
                    done();
                }, 10);
            });
        });
    });

    describe('transaction with nested event', function () {
        var masterEvt, bar;

        it('should create first event', function (next) {
            Events.create('fooTx', function (evt) {
                Assert.equal(true, Runtime.isInContext());
                Assert.equal(true, evt.data.master, 'should be master');
                masterEvt = evt;
                next();
            });
        });

        it('should not be completed', function (next) {
            Assert.equal(true, Runtime.isInContext());
            next();
        });

        it('should create nested event', function (next) {
            bar = Events.create('bar');
            Assert.equal(false, bar.data.master, 'should not be master');
            Assert.equal(false, !!bar.data.status);
            next();
        });

        it('child should complete', function (next) {
            bar.complete();
            Assert.equal(true, bar.data.status !== undefined);
            next();
        });

        it('master should not be completed', function (next) {
            Assert.equal(true, masterEvt.data.status === undefined);
            next();
        });

        it('master should complete', function (next) {
            setTimeout(function delay() {
                masterEvt.complete();
                Assert.equal(true, masterEvt.data.status !== undefined);
                Assert.ok(masterEvt.data.duration > 15, masterEvt.data.duration + ' should be > 15');
                next();
            }, 20);
        });
    });

    it('should create transaction with nested transactions', function (done) {
        var finalDone = done;
        done = Utils.done(2, setTimeout.bind(null, function () {
            // console.log(events);
            Assert.equal(6, events.length);
            finalDone();
        }, 1000));

        Events.create('fooTx', function (evt) {
            // Assert.equal(0, evt.data.children.length);

            var bar = Events.create('bar');
            bar.complete();
            // Assert.equal(0, bar.data.children.length);
            // Assert.equal(1, evt.data.children.length);
            Assert.equal(true, evt.data.master);
            Assert.equal(false, bar.data.master);
            // Assert.equal(bar.data, evt.data.children[0]);

            setTimeout(function delay() {
                Events.create('barTx', function (barTx) {
                    // Assert.equal(2, evt.data.children.length);
                    Assert.ok(evt.data.duration > 9);

                    var qaz = Events.create('qaz');
                    Assert.equal(false, barTx.data.master);
                    qaz.complete();
                    barTx.complete();

                    done();
                });
            }, 30);

            setTimeout(function delay() {
                evt.complete(2);
                // Assert.equal(1, evt.data.children.length);
                Assert.ok(evt.data.duration > 9);
                done();
            }, 20);
        });
    });

});
