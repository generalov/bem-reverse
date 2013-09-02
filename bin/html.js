var UNHTML = require("../lib/unhtml"),
    FS = require("fs"),
    htmlFile = process.argv[2];

var html = FS.readFileSync(htmlFile),
    bemjson = UNHTML.html2bemjson(html);

if (bemjson.length === undefined) {
    bemjson = [bemjson];
}

console.log(require('util').inspect(bemjson, false, null))
