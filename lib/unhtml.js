var cheerio = require("cheerio"),
    _ = require('underscore'),
    _string = require('underscore.string'),
    cheerioUtils = require('cheerio/lib/utils');


var CLASS_ATTR = 'class',
    DEFAULT_TAG = 'div',
    BLOCK_I_BEM = 'i-bem',
    ONCLICK_ATTR = 'onclick';


var bemRE = /^([a-zA-Z0-9-]+)(?:__([a-zA-Z0-9-]+))?(?:_([a-zA-Z0-9-]+))?(?:_([a-zA-Z0-9-]+))?$/;
// var keys = [ 'block', 'mods', 'elem', 'elemMods', 'mix', 'tag', 'attrs', 'cls', 'js', 'bem' ];wge

var paramsRE = /^return\s+/;

var ignoredClasses = ['i-bem', 'b-page__body'];

function isBemName(cls) {
    return cls.length > 0 && cls.match(bemRE) && ignoredClasses.indexOf(cls) === -1;
}

function isBemCls(cls) {
    return cls.length > 0 && !cls.match(bemRE) && ignoredClasses.indexOf(cls) === -1;
}


function _bemParseParams(val) {
    if (!val) {
        return false;
    }
    if (!val.match(paramsRE)) {
        throw "Can't parse params " + val;
    }
    var paramStr = _string.trim(val.replace(paramsRE, ''));
    if (paramStr) {
        try {
            return JSON.parse(paramStr);
        } catch (e) {
            var r = require('vm').runInNewContext('(' + paramStr + ')');
            return r;
        }
    }
}


function _bemNode(matched) {
    var node = {
        block: matched[1]
    };

    if (matched[2]) {
        node.elem = matched[2];
    }
    if (matched[3]) {
        var modName = matched[3],
            modVal = (typeof matched[4] !== 'undefined' ? matched[4] : 'yes');
        (node[!matched[2] ? 'mods' : 'elemMods'] || (node[!matched[2] ? 'mods' : 'elemMods'] = {}))[modName] = modVal;
    }
    return node;
}


function _bemParentBlock(stack) {
    for (var i = stack.length - 1; i >= 0; i--) {
        if (stack[i].block) {
            return stack[i];
        }
    }
}


function _bemEntityKey(blockName, elemName) {
    return blockName + (elemName ? ('__' + elemName) : '');
}


function _bemAggregate(node, other, parent, jsParams) {
    var blockName = node.block || parent.block,
        elemMods = [],
        mods = [],
        mix = (node.mix || []);

    if (other.block === blockName) {
        if (other.elem) {
            if (other.elem === node.elem) {
                if (other.elemMods) {
                    elemMods.push(other.elemMods);
                }
            } else {
                mix.push(other);
            }
        } else {
            if (node.elem) {
                mix.push(other);
            } else {
                if (other.mods) {
                    mods.push(other.mods);
                }
            }
        }
    } else {
        mix.push(other);
    }


    var mixHasJsParams = false;
    if (mix.length > 0) {
        var all = {};
        for (var i = 0; i < mix.length; i++) {
            var key = _bemEntityKey(mix[i].block, mix[i].elem);
            if (all[key] === undefined) {
                all[key] = mix[i];
            } else {
                _bemAggregate(all[key], mix[i], node);
            }
        }
        node.mix = _.pairs(all).map(function(t) {
            var res = {}, key = t[0],
                n = t[1];
            if (n.block && (n.block !== blockName || node.elem && !n.elem)) {
                res.block = n.block;
            }
            if (n.elem && (n.block !== blockName || n.elem !== node.elem)) {
                res.elem = n.elem;
            }
            if (n.mods) {
                res.mods = n.mods;
            }
            if (n.elemMods) {
                res.elemMods = n.elemMods;
            }

            if (jsParams && jsParams[key]) {
                var val = _.isEmpty(jsParams[key]) || jsParams[key];
                delete jsParams[key];
                res.js = val;
                mixHasJsParams = true;
            }
            return res;
        });
    }

    var key = _bemEntityKey(blockName, node.elem);
    if (jsParams) {
        var t = jsParams[key] && (_.isEmpty(jsParams[key]) || jsParams[key]) ||
            !mixHasJsParams && (_.isEmpty(jsParams) || jsParams);
        if (t) {
            node.js = t;
        } else {
            if (node.js) {
                delete node.js;
            }
        }
    }

    if (mods.length > 0) {
        _.extend.apply((node.mods || (node.mods = {})), [node.mods].concat(mods));
    }
    if (elemMods.length > 0) {
        _.extend.apply((node.elemMods || (node.elemMods = {})), [node.elemMods].concat(elemMods));
    }

    return node;
}


function _bemify(node, bemNames, parentBlock, jsParams) {
    for (var i = 0; i < bemNames.length; i++) {
        var blockName = bemNames[i],
            matched = blockName.match(bemRE);

        if (blockName == BLOCK_I_BEM) {
            continue;
        }

        if (i === 0) {
            if (!parentBlock || matched[1] !== parentBlock.block) {
                node.block = matched[1];
            }
            if (matched[2]) {
                node.elem = matched[2];
            }
        }
        _bemAggregate(node, _bemNode(matched), parentBlock, jsParams);
    }

    return node;
}


function parseTree($, root, stack) {
    var content = [];

    $(root).each(function() { // including text nodes
        var node = {};

        if (!cheerioUtils.isTag(this[0])) {
            if (this[0].type === 'text') { // inore 'comment' and etc.
                var text = _string.trim(this[0].data);
                if (text.length) {
                    content.push(text);
                }
            }
            return;
        }

        if (this[0].name !== DEFAULT_TAG) {
            node.tag = this[0].name;
        }

        var attribs = {};
        for (var name in this[0].attribs) {
            if (Object.prototype.hasOwnProperty.call(this[0].attribs, name)) {
                switch (name) {
                    case ONCLICK_ATTR:
                        break;
                    case CLASS_ATTR:
                        var clsList = this.attr(name).split(/\s+/),
                            bemNames = clsList.filter(isBemName),
                            cls = clsList.filter(isBemCls);

                        if (cls.length) {
                            node.cls = cls;
                        }

                        if (bemNames.length) {
                            var jsParams = false;
                            try {
                                jsParams = _bemParseParams(this.attr(ONCLICK_ATTR));
                            } catch (e) {
                                attribs[ONCLICK_ATTR] = this.attr(ONCLICK_ATTR);
                            }
                            // fix old style parms {"b-name":{"name":"b-name"}} -> {"b-name":{}}
                            jsParams && _.pairs(jsParams).forEach(function(i) {
                                var key = i[0],
                                    val = i[1];
                                if (Object.prototype.hasOwnProperty.call(jsParams[key], 'name') && jsParams[key]['name'] === key) {
                                    delete jsParams[key]['name'];
                                }
                            });
                            _bemify(node, bemNames, _bemParentBlock(stack), jsParams);
                        }

                        break;
                    default:
                        attribs[name] = this.attr(name);
                        break;
                }
            }
        }
        if (!_.isEmpty(attribs)) {
            node.attrs = attribs;
        }

        stack.push(node);

        var nodeContent = parseTree($, this[0].children, stack);
        if (nodeContent) {
            node.content = nodeContent;
        }

        stack.pop(node);

        content.push(node);
    });

    return content.length > 1 ? content : (content.length === 1 ? content[0] : '');
}


function html2bemjson(htmlStr) {
    var $ = cheerio.load(htmlStr),
        bemjson = [];

    if ($('html').length > 0) {
        var node = {
            block: 'b-page'
        }, iGlobal;

        if ($('html').find("head").length > 0) {
            var head = [];

            $('html').find("head").children(function() {

                switch (this[0].name) {

                    case 'script':
                        if (this.attr('src')) {
                            head.push({
                                elem: 'js',
                                url: this.attr('src')
                            });
                        } else {
                            head.push({
                                elem: 'js',
                                content: this.text()
                            });
                        }
                        break;

                    case 'link':
                        if (this.attr("rel") === "stylesheet") {
                            head.push({
                                elem: 'css',
                                url: this.attr('href'),
                                ie: false
                            });
                        }
                        break;

                    case 'meta':
                        var attribs = {};
                        for (var name in this[0].attribs) {
                            if (Object.prototype.hasOwnProperty.call(this[0].attribs, name)) {
                                attribs[name] = this.attr(name);
                            }
                        }
                        head.push({
                            elem: 'meta',
                            attrs: attribs
                        });
                        break;

                    case 'title':
                        node.title = this.text();
                        break;

                }
            });

            if (head.length > 0) {
                node.head = head;
            }
        }

        if ($('html').find('body').length > 0) {
            var body = parseTree($, $('html').find('body'), [node]);
            if (body.content !== undefined) {
                node.content = body.content;
            }
            if (body.mix !== undefined) {
                var t = body.mix.filter(function(elem) {
                    if (elem.block !== 'i-global') {
                        return true;
                    }
                    iGlobal = elem;
                    if (iGlobal.js) {
                        iGlobal.params = iGlobal.js
                        delete iGlobal.js;
                    }
                });
                if (t.length > 0) {
                    node.mix = t;
                }
            }
        }

        if (iGlobal) {
            bemjson = [iGlobal, node];
        } else {
            bemjson = node;
        }

    } else {
        bemjson = parseTree($, $._root.children, []);
    }

    return bemjson;
}

module.exports.html2bemjson = html2bemjson;
module.exports._bemify = _bemify;
