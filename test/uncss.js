var assert = require("assert");
var UNFREEZE = require("../lib/unfreeze.js"),
    unfreeze = UNFREEZE.unfreeze;

describe('unfreeze', function() {

    it('should rfil nam', function() {
        assert.deepEqual(
            unfreeze('/frz/rqrwrwrwrwqrqwrr.png', 'b-name'),
            'b-name.png');

    });

    it('should rfil nam', function() {
        assert.deepEqual(
            unfreeze('/frz/rqrwrwrwrwqrqwrr.png', 'b-name'),
            'b-name.png');

    });

});