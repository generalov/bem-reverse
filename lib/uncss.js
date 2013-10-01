var _ = require("underscore");
var PATH = require("path");
var CSS = require('css');

var FS = require("fs");

var PATHSEP = '/';


var bemRE = /^\.([a-zA-Z0-9-]+)(?:__([a-zA-Z0-9-]+))?(?:_([a-zA-Z0-9-]+))?(?:_([a-zA-Z0-9_-]+))?$/;
var bemREAll = /\.([a-zA-Z0-9-]+)(?:__([a-zA-Z0-9-]+))?(?:_([a-zA-Z0-9-]+))?(?:_([a-zA-Z0-9_-]+))?\b/g;


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
    return bemRE.test(cls) && ['i-ua', 'm-locale'].indexOf(cls.match(bemRE)[1]) === -1; /* i-ua_* has no wotn css rules */
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

function legacyBooleanModsFix(rule) {
    if (rule.type !== 'rule') {
        return;
    }

    for (var i = 0; i < rule.selectors.length; i++) {
        rule.selectors[i] = rule.selectors[i].replace(bemREAll, function(bemName, block, elem, modName, modVal) {
            if (modName && !modVal) {
                bemName += '_yes';
            }
            return bemName;
        });
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

    return candidates[0];

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

    return candidates[0];

    // for (var i = candidates.length - 1; i >= 0; i--) {
    //     var name = candidates[i];
    //     if (!res[block] && isBemBlock(name)) {
    //         res[block] = name;
    //     }
    //     if (!res[elem] && isBemElem(name)) {
    //         res[elem] = name;
    //     }
    //     if (/*!res[mod] && */isBemMod(name)) {
    //         res[mod] = name;
    //     }
    // }
    // return _.filter(res, function(val) {
    //     return val;
    // })[0];
}


function getBemPath(bemName, techExt, legacyBooleanMods) {
    var matches = bemName.match(bemRE),
        path = [matches[1]];

    if (matches[2]) {
        path.push('__' + matches[2]);
    }
    if (matches[3]) {
        path.push('_' + matches[3]);
        if (legacyBooleanMods && !matches[4]) {
            bemName += '_yes';
        }
    }
    path.push(bemName.slice(1) + techExt);

    return path.join(PATHSEP);
}



function uncss(src, cssFile, fix) {
    var ast = CSS.parse(src);
    var currentSheet = newStyleSheet(),
        sheets = {},
        levels = {},
        techExt = PATH.basename(cssFile).replace(/[^\.]+/, ''),
        options;

    if (fix === 'fix') {
        options = {
            legacyBooleanMods: true,
            indexCssName: cssFile,
            level: function(path) {
                return path;
            }
        };
    } else {
        options = {
            legacyBooleanMods: true,
            indexCssName: 'desktop.bundles/index/index' + techExt,
            level: function(path) {
                return PATH.join('level-' + (levels[path] || '0') + '.blocks', path);
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
            bemName = getBemName(rule),
            path, lpath;

        if (!bemName) {
            if (rule.type === 'media' || rule.type === 'keyframes') {
                currentSheet.stylesheet.rules.push(rule);
                continue;
            } else {
                bemName = '.b-page_unknown_' + bPageUnknownIdx;
                path = getBemPath(bemName, techExt);
                lpath = options.level(path);
                if (!sheets[lpath] || sheets[lpath] !== currentSheet) {
                    bemName = '.b-page_unknown_' + (++bPageUnknownIdx);
                }
            }
        }
        path = getBemPath(bemName, techExt, options.legacyBooleanMods);
        lpath = options.level(path);
        if (!sheets[lpath] || sheets[lpath] !== currentSheet) {
            currentSheet = addSheet(path);
        }
        if (options.legacyBooleanMods) {
            legacyBooleanModsFix(rule);
        }
        currentSheet.stylesheet.rules.push(rule);
    }

    if (fix === 'fix') {
        delete sheets[options.indexCssName];
    }

    return _.object(_.pairs(sheets).map(function(n) {
        var path = n[0],
            sheet = n[1],
            css = CSS.stringify(sheet);
        return [path, css];
    }));
}


module.exports.uncss = uncss;