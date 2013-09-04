var _ = require("underscore");
var PATH = require("path");
var CSS = require('css');

var FS = require("fs");

var PATHSEP = '/';


var bemRE = /^\.([a-zA-Z0-9-]+)(?:__([a-zA-Z0-9-]+))?(?:_([a-zA-Z0-9-]+))?(?:_([a-zA-Z0-9_-]+))?$/;


function newStyleSheet() {
    return CSS.parse('');
}


function newImportRule(url) {
    return CSS.parse('@import url("' + url + '");').stylesheet.rules[0];
}


function cssSplitSelector(selector) {
    return selector.split(/\s+/);
}


function isBemCls(cls) {
    return bemRE.test(cls) && cls.match(bemRE)[1] !== 'i-ua'; /* i-ua_* has no wotn css rules */
}


function isBemBlock(cls) {
    var matches = cls.match(bemRE);
    return matches[1] && !(matches[2] || matches[3]);
}


function isBemElem(cls) {
    var matches = cls.match(bemRE);
    return matches[2] && !matches[3];
}


function isBemMod(cls) {
    var matches = cls.match(bemRE);
    return !!matches[3];
}

function cssCleanupSelector(selector) {
    var res;
    selector = selector.split(/::/)[0];
    selector = selector.split(/:/)[0];
    selector = selector.split(/\[/)[0];
    selector = selector.split(/(?=\.)/);
    res = _.filter(selector, isBemCls)[0];
    return res;
}


function getBemName(rule) {
    if (rule.type !== 'rule') {
        return undefined;
    }
    var candidates = _.filter(
        cssSplitSelector(rule.selectors[0]).map(function(val) {
            return cssCleanupSelector(val);
        }),
        isBemCls
    );
    var mod = 0,
        elem = 1,
        block = 2,
        res = [false /* mod */ , false /* elem */ , false /* block */ ];
    for (var i = candidates.length - 1; i >= 0; i--) {
        var name = candidates[i];
        if (!res[block] && isBemBlock(name)) {
            res[block] = name;
        }
        if (!res[elem] && isBemElem(name)) {
            res[elem] = name;
        }
        if (/*!res[mod] && */isBemMod(name)) {
            res[mod] = name;
        }
    }
    return _.filter(res, function(val) {
        return val;
    })[0];
}


function getBemPath(bemName, techExt) {
    var matches = bemName.match(bemRE),
        path = [matches[1]];

    if (matches[2]) {
        path.push('__' + matches[2]);
    }
    if (matches[3]) {
        path.push('_' + matches[3]);
    }
    path.push(bemName.slice(1) + techExt);

    return path.join(PATHSEP);
}



function uncss(src, cssFile, fix) {
    var ast = CSS.parse(src);
    var currentSheet = newStyleSheet(),
        sheets = {},
        levels = {},
        techExt = PATH.basename(cssFile).replace(/[^\.]+/, '');

    if (fix === 'fix') {
        var options = {
            indexCssName: cssFile,
            level: function(path) {
                return path;
            }
        };
    } else {
        var options = {
            indexCssName: 'desktop.bundles/index/index' + techExt,
            level: function(path) {
                return PATH.join(options.levelPrefix('level-' + (levels[path] || '0')) + '.blocks', path);
            }
        };
    }

    sheets[options.indexCssName] = currentSheet;

    function addSheet(path) {
        var lpath, stylesheet = newStyleSheet();
        levels[path] = ((levels[path] + 1) || 0);
        lpath = options.level(path);
        sheets[lpath] = stylesheet;
        sheets[options.indexCssName].stylesheet.rules.push(
            newImportRule(PATH.relative(PATH.dirname(options.indexCssName), lpath))
        );
        return stylesheet;
    }
    var bPageUnknownIdx = 0;

    for (var i = 0; i < ast.stylesheet.rules.length; i++) {
        var rule = ast.stylesheet.rules[i],
            bemName = getBemName(rule);

        if (!bemName) {
            if (rule.type === 'media' || rule.type === 'keyframes') {
                currentSheet.stylesheet.rules.push(rule);
                continue;
            } else {
                var bemName = '.b-page_unknown_' + bPageUnknownIdx,
                    path = getBemPath(bemName, techExt),
                    lpath = options.level(path);
                if (!sheets[lpath] || sheets[lpath] !== currentSheet) {
                    bemName = '.b-page_unknown_' + (++bPageUnknownIdx);
                }
            }
        }
        var path = getBemPath(bemName, techExt),
            lpath = options.level(path);
        if (!sheets[lpath] || sheets[lpath] !== currentSheet) {
            currentSheet = addSheet(path);
        }
        currentSheet.stylesheet.rules.push(rule);
    }

    if (fix === 'fix') {
        delete sheets[options.indexCssName];
    }

    return _.object(_.pairs(sheets).map(function(n){
        var path = n[0],
            sheet = n[1],
            css = CSS.stringify(sheet);
        return [path, css];
    }));
}


module.exports.uncss = uncss;
