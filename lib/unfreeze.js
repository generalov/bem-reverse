var PATH = require('path');

function unfreeze(srcPath, blockName, baseRoot) {
    var extension = PATH.extname(srcPath);
    return PATH.join(blockName) + extension;
}

module.exports.unfreeze = unfreeze;