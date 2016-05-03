'use strict';

module.exports.done = function _done(count, done) {
    return function(err) {
        count--;
        if(count <= 0) {
            return done(err);
        }
    };
};
