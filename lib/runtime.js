'use strict';

var Assert = require('assert');
var Domain = require('domain');

Domain.create = (function (original) {
    return function clsCreateDomain() {
        var _domain = original.apply(Domain, arguments);
        // inherit parent context if any or create new one if root transaction
        _domain._alCtx = process.domain && process.domain._alCtx ?
            Object.create(process.domain._alCtx) : {};
        return _domain;
    };
})(Domain.create);

module.exports = {
    run: function run(next) {
        var parentDomain = process.domain;
        var domain = Domain.create();

        // hook to the parentDomain coontext for error dispatching if any
        // works in 0.12+
        // parentDomain && parentDomain.add(domain);

        // workaround for 0.10 to pipe error into parent domain
        domain.on('error', function domainError(err) {
            if (parentDomain) {
                return parentDomain.emit('error', err);
            }
            process.emit('uncaughtException', err);
        });

        domain.run(next);
    }
};

Object.defineProperty(module.exports, 'context', {
    /*
     * Provide default/root namespace
     */
    get: function getMethod() {
        var ctx = process.domain ? process.domain._alCtx : undefined;
        Assert.ok(ctx, 'Context does not seem to have been initialized, please make sure you use async-trace middleware');
        return ctx;
    }
});

module.exports.isInContext = function isInContext() {
    return process.domain && !!process.domain._alCtx;
};
