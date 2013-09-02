var assert = require("assert");
var UNHTML = require("../lib/unhtml.js"),
    html2bemjson = UNHTML.html2bemjson;

describe('html2bemjson', function() {

    describe('b-page', function() {

        it('should recognize "html"', function() {
            assert.deepEqual(
                html2bemjson('<html></html>'), {
                    block: "b-page"
                });
        });

        it('should recognize "html title"', function() {
            assert.deepEqual(
                html2bemjson('<html><head><title>me</title></head></html>'), {
                    block: "b-page",
                    title: "me"
                });
        });

        it('should recognize "html head script"', function() {
            assert.deepEqual(
                html2bemjson('<html><head><script src="index.js"></script></head></html>'), {
                    block: "b-page",
                    head: [{
                        elem: "js",
                        url: "index.js"
                    }]
                });
        });

        it('should recognize "html head script"', function() {
            assert.deepEqual(
                html2bemjson('<html><head><script>var me = true;</script></head></html>'), {
                    block: "b-page",
                    head: [{
                        elem: "js",
                        content: "var me = true;"
                    }]
                });
        });

        it('should recognize "html head meta"', function() {
            assert.deepEqual(
                html2bemjson('<html><head><meta charset="utf-8"></head></html>'), {
                    block: "b-page",
                    head: [{
                        elem: "meta",
                        attrs: {
                            charset: "utf-8"
                        }
                    }]
                });
        });

        it('should recognize "html head link rel="stylesheet"', function() {
            assert.deepEqual(
                html2bemjson('<html><head><link rel="stylesheet" href="index.css"></head></html>'), {
                    block: "b-page",
                    head: [{
                        elem: "css",
                        url: "index.css",
                        ie: false
                    }]
                });
        });

        it('b-page b-page__body', function() {
            assert.deepEqual(
                html2bemjson('<html><body>me</body></html>'), {
                    block: "b-page",
                    content: "me"
                });
        });

        it('b-page b-page__body ignore elem', function() {
            assert.deepEqual(
                html2bemjson('<html><body class="b-page b-page__body"></body></html>'), {
                    block: "b-page"
                });
        });

        it('b-page i-global', function() {
            assert.deepEqual(
                html2bemjson('<html><body class="b-page i-global" onclick=\'return {"i-global":{"lang":"ru"}}\'></body></html>'), [
                    {
                        block: 'i-global',
                        params: {
                            'lang': "ru"
                        }
                    },
                    {
                        block: "b-page",
                    }
                ]);
        });

    });

    describe('tag', function() {

        it('should recognize tag', function() {
            assert.deepEqual(
                html2bemjson('<span></span>'), {
                    tag: "span"
                });
        });

        it('should recognize default tag', function() {
            assert.deepEqual(
                html2bemjson('<div></div>'), {
                    // tag: "span"
                });
        });

        describe('content', function() {
            it('should recognize nested tags', function() {
                assert.deepEqual(
                    html2bemjson('<div><div></div></div>'), {
                        content: {}
                    });
            });

            it('should recognize text', function() {
                assert.deepEqual(
                    html2bemjson('<div>me</div>'), {
                        content: 'me'
                    });
            });

            it('should recognize content list', function() {
                assert.deepEqual(
                    html2bemjson('<div><br>me<i></i></div>'), {
                        content: [
                            {
                                tag: 'br'
                            },
                            'me',
                            {
                                tag: 'i'
                            }
                        ]
                    });
            });

            it('should recognize embeded script', function() {
                assert.deepEqual(
                    html2bemjson('<script>var me;</script>'), {
                        tag: 'script',
                        content: 'var me;'
                    });
            });
        });

        describe('attributes', function() {

            it('should recognize attributes', function() {
                assert.deepEqual(
                    html2bemjson('<div id="a2"></div>'), {
                        attrs: { id: "a2" }
                    });
            });

            it('should recognize plain class', function() {
                assert.deepEqual(
                    html2bemjson('<div class="a2"></div>'), {
                        cls: [ "a2" ]
                    });
            });

        });
    });

    describe('bem block', function() {

        it('b-name', function() {
            assert.deepEqual(
                html2bemjson('<div class="b-name"></div>'), {
                    block: "b-name"
                });
        });

        it('b-name > b-name__elem', function() {
            assert.deepEqual(
                html2bemjson('<div class="b-name"><div class="b-name__elem"></div></div>'), {
                    block: "b-name",
                    content: {
                        elem: "elem"
                    }
                });
        });

        it('b-name params', function() {
            assert.deepEqual(
                html2bemjson('<div class="b-name" onclick=\'return {"b-name":{}}\'></div>'), {
                    block: "b-name",
                    js: true
                });
        });

        it('b-name__elem params', function() {
            assert.deepEqual(
                html2bemjson('<div class="b-name__elem" onclick=\'return {"b-name__elem":{}}\'></div>'), {
                    block: "b-name",
                    elem: 'elem',
                    js: true
                });
        });

        it('b-name with old-style params', function() {
            assert.deepEqual(
                html2bemjson('<div class="b-name" onclick=\'return {"b-name":{"name":"b-name"}}\'></div>'), {
                    block: "b-name",
                    js: true
                });
        });

        it('b-name b-other params', function() {
            assert.deepEqual(
                html2bemjson('<div class="b-name b-other" onclick=\'return {"b-other":{}}\'></div>'), {
                    block: "b-name",
                    mix: [ { block: 'b-other', js: true} ]
                });
        });

    });

});


var _bemify = UNHTML._bemify;

describe('_bemify', function() {
    it('b-name', function() {
        assert.deepEqual(
            _bemify({}, ['b-name']), {
                block: 'b-name'
            });
    });

    it('i-bem is not a block', function() {
        assert.deepEqual(
            _bemify({}, ['i-bem']), {
            });
    });

    it('is element', function() {
        assert.deepEqual(
            _bemify({}, ['b-name__elem']), {
                block: "b-name",
                elem: 'elem'
            });
    });

    it('b-name b-name_mod_on', function() {
        assert.deepEqual(
            _bemify({}, ['b-name', 'b-name_mod_on']), {
                block: "b-name",
                mods: {'mod': "on"}
            });
    });

    it('b-name b-name_mod', function() {
        assert.deepEqual(
            _bemify({}, ['b-name', 'b-name_mod']), {
                block: "b-name",
                mods: {'mod': true}
            });
    });

    it('b-name b-name__elem', function() {
        assert.deepEqual(
            _bemify({}, ['b-name', 'b-name__elem']), {
                block: "b-name",
                mix: [ { elem: 'elem' }]
            });
    });

    it('b-name b-name__elem_mod_on', function() {
        assert.deepEqual(
            _bemify({}, ['b-name', 'b-name__elem_mod_on']), {
                block: "b-name",
                mix: [ { elem: 'elem', elemMods: { 'mod': 'on' } }]
            });
    });

    it('b-name__elem b-name', function() {
        assert.deepEqual(
            _bemify({}, ['b-name__elem', 'b-name']), {
                block: "b-name",
                elem: "elem",
                mix: [ { block: "b-name" }]
            });
    });

    it('b-name__elem b-name__elem_mod_on', function() {
        assert.deepEqual(
            _bemify({}, ['b-name__elem', 'b-name__elem_mod_on']), {
                block: "b-name",
                elem: "elem",
                elemMods: { mod: "on" }
            });
    });

    it('b-name__elem b-other__elem', function() {
        assert.deepEqual(
            _bemify({}, ['b-name__elem', 'b-other__elem']), {
                block: "b-name",
                elem: "elem",
                mix: [ { block: "b-other", elem: 'elem' } ]
            });
    });

    it('b-name b-other b-other_mod_on', function() {
        console.log('d')
        assert.deepEqual(
            _bemify({}, ['b-name', 'b-other', 'b-other_mod_on']), {
                block: "b-name",
                mix: [ { block: "b-other", mods: { 'mod': 'on' } } ]
            });
    });

    it('b-name__elem b-other__elem_mod_on', function() {
        assert.deepEqual(
            _bemify({}, ['b-name__elem', 'b-other__elem_mod_on']), {
                block: "b-name",
                elem: "elem",
                mix: [ { block: "b-other", elem: 'elem', elemMods: { mod: "on" } }]
            });
    });
});