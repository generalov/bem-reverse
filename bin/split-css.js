#!/usr/bin/env node

var FS = require("fs"),
    cssFile = process.argv[2],
    src = FS.readFileSync(cssFile, 'utf-8');

var UNCSS= require('../lib/uncss');
var _ = require('underscore');
var PATH = require('path');
var mkdirp = require("mkdirp");

var outputDir = PATH.dirname(PATH.dirname(PATH.resolve(cssFile)));

cssMap = UNCSS.uncss(src, PATH.resolve(cssFile), "fix");

_.pairs(cssMap).forEach(function(n) {
    var path = PATH.join(outputDir, n[0]),
        css = n[1];
    mkdirp.sync(PATH.dirname(path));
    FS.writeFileSync(path, css, 'utf-8');
});
