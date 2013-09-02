var FS = require("fs"),
    cssFile = process.argv[2],
    src = FS.readFileSync(cssFile, 'utf-8');

var HTML2BEMJSON = require('html2bemjson');
var _ = require('underscore');
var PATH = require('path');
var mkdirp = require("mkdirp");

var outputDir = '.', cssMap;

cssMap = HTML2BEMJSON.uncss(src);

_.pairs(cssMap).forEach(function(n) {
    var path = n[0],
        css = n[1];
    mkdirp.sync(PATH.dirname(PATH.join(outputDir, path)));
    FS.writeFileSync(PATH.join(outputDir, path), css, 'utf-8');
});
