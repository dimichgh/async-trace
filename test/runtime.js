'use strict';

var Assert = require('assert');
var Runtime = require('../lib/runtime');
var Utils = require('./fixtures/utils');

describe(__filename, function () {
    afterEach(function () {
        while(process.domain) {
            process.domain.exit();
        }
    });

    before(function () {
        while(process.domain) {
            process.domain.exit();
        }
    });

    it('should have no context', function () {
        Assert.ok(!Runtime.isInContext());
    });

    it('should fail when access context outside of it', function (done) {
        try {
            Runtime.context;
            done('Should have failed due to no context');
        }
        catch (err) {
            done();
        }
    });

    it('should setup context', function (done) {
        Runtime.run(function () {
            Assert.ok(Runtime.context);
            Assert.equal(true, Runtime.isInContext());
            done();
        });
    });

    it('should preserve setup context in async function', function (done) {
        Runtime.run(function () {
            setTimeout(function () {
                Assert.ok(Runtime.context);
                Assert.equal(true, Runtime.isInContext());
                done();
            }, 10);
        });
    });

    it('should preserve values in respective context ', function (done) {
        done = Utils.done(3, done);
        Runtime.run(function () {
            Runtime.context.foo = 'bar';
            setTimeout(function () {
                Assert.equal('bar', Runtime.context.foo);
                Assert.equal(true, Runtime.isInContext());
                done();
                Runtime.run(function () {
                    Assert.equal('bar', Runtime.context.foo);
                    Runtime.context.foo = 'qaz';
                    setTimeout(function () {
                        Assert.equal('qaz', Runtime.context.foo);
                        done();
                    }, 10);
                });
                setTimeout(function () {
                    Assert.equal('bar', Runtime.context.foo);
                    done();
                }, 10);
            }, 10);
        });
    });
});
