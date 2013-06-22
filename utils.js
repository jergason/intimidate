
var Utils = {
  merge: function(dstObj, srcObj) {
    for (var prop in srcObj) {
      if (srcObj.hasOwnProperty(prop)) {
        dstObj[prop] = srcObj[prop];
      }
    }
    return dstObj;
  }
}

module.exports = Utils;