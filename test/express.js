'use strict';

var async = require('asyncawait/async');
var await = require('asyncawait/await');
var Assert = require('assert');
var express = require('express');
var Supertest = require('supertest');
var Http = require('http');
var Events = require('../lib/events');
var Utils = require('./fixtures/utils');

Http.createServer = (function createServerFactory(original) {
    return function _createServer() {
        var svr = original.apply(Http, arguments);
        Events.create('server-connection', function (connTx) {
            process.domain && process.domain.add(svr);
            svr.on('connection', function (socket) {
                process.domain && process.domain.add(socket);
                console.log('* connection');
                socket.on('data', function () {
                    console.log('* data');
                });
                socket.on('close', function () {
                    console.log('* sock is to be closed');
                    connTx.complete();
                });
                socket.on('end', function () {
                    console.log('* sock is closed');
                });
                socket.on('timeout', function () {
                    console.log('* sock is timeout');
                    connTx.complete('ETIMEDOUT');
                });
            });
            svr.on('request', function (req, res) {
                Events.create('server-request', function (reqTx) {
                    process.domain && process.domain.add(req);
                    process.domain && process.domain.add(res);
                    console.log('* req & res');

                    var reqEvt = Events.create('request');
                    reqEvt.data.attributes.url = req.url;
                    reqEvt.data.attributes.headers = req.headers;
                    reqEvt.complete();

                    req.on('response', function () {
                        console.log('* res');
                    });
                    req.on('abort', function () {
                        console.log('* abort');
                        reqTx.complete('ABORT');
                    });
                    res.on('finish', function () {
                        console.log('* res finish');
                        var resEvt = Events.create('response');
                        resEvt.data.attributes.status = res.statusCode;
                        resEvt.data.attributes.headers = res.headers;
                        resEvt.complete();
                        reqTx.complete();
                    });
                    res.on('end', function () {
                        console.log('* res end');
                    });
                });
            });
        });
        return svr;
    };
}) (Http.createServer);

describe(__filename, function() {

    var events = [];
    function catcher(evt) {
        events.push(evt);
    }

    before(function () {
        process.on('async-trace-evt', catcher);
    });

    after(function () {
        process.removeListener('async-trace-evt', catcher);
    });

    it('should instrument incoming request', function (done) {
        // done = Utils.done(2, done);

        var app = express();

        app.get('/index', function (req, res) {
            // req.socket.destroy();
            res.send('ok');
        });

        var makeRequest = async (function makeRequest() {
            var r = await (function (cb) {
                Supertest(app).get('/index').end(cb);
            });
            return r;
        });

        async(function () {
            var results = await ([makeRequest(), makeRequest()]);
            Assert.equal('ok', results[0].text);
            Assert.equal('ok', results[1].text);
            Assert.equal(12, events.length);
            // console.log(events)
            done();
        })();

    });
});
