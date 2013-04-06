var fs = require('fs')
var knox = require('knox')
var mime = require('mime')

/**
 * @class Retry
 * @constructor
 * @param opts {Object} an object containing config parameters
 * @param knox {Object} knox library by default, or other deps for testing
 * @param mime {Object} mime lib by default, or other stuff for testing
 */
function Retry(opts, s3Lib, mimeLib) {
  // Inject deps for testing
  if (typeof s3Lib === 'undefined') {
    s3Lib = knox
  }
  this.knox = s3Lib

  if (typeof mimeLib === 'undefined') {
    mimeLib = mime
  }
  this.mime = mimeLib


  // TODO: validate presence of these opts
  this.key = opts.key
  this.secret = opts.secret
  this.bucket = opts.bucket
  this.region = opts.region || 'us-west-2'

  this.s3Client = this.knox.createClient({
    key: this.key,
    secret: this.secret,
    bucket: this.bucket,
    region: this.region
  })

  this.maxRetries = opts.maxRetries || 10
  this.backoffInterval = opts.backoffInterval || 51
}

Retry.prototype.calculateBackoff = function(numRetries) {
  var randMultiplier = Math.ceil(Math.random() * (Math.pow(2, numRetries + 2) - 1))
  return this.backoffInterval * randMultiplier
}

/**
 * Upload a file at sourcePath with automatic retries and exponential backoff
 *
 * @param sourcePath {String} location of the file to upload on the fs
 * @param destination {String} path in s3 to upload file to
 * @param cb {Function} function(err) called when upload is done or has failed too many times
 */
Retry.prototype.upload = function(sourcePath, destination, cb) {
  var self = this

  fs.readFile(sourcePath, function(err, file) {
    if (err) {
      return cb(err)
    }

    var headers = {
      'Content-Type': self.mime.lookup(sourcePath),
      'Content-Length': file.length
    }

    self.uploadWithRetries(headers, destination, file, cb)
  })
}

Retry.prototype.uploadWithRetries = function(headers, data, destination, timesRetried, cb) {
  var self = this
  // prevent callback from being called twice
  var callbackCalled = false

  if (typeof timesRetried === 'function') {
    cb = timesRetried
    timesRetried = 0
  }


  function endWithError(err) {
    timesRetried++
    if (timesRetried >= this.maxRetries) {
      if (!callbackCalled) {
        callbackCalled = true
        return cb(err)
      }
    }
    else {
      setTimeout(self.uploadWithRetries.bind(self),
      self.calculateBackoff(timesRetried), headers, data,
      destination, timesRetried, cb)
    }
  }

  function endWithSuccess(res) {
    // TODO: what if res finished but not successfully?
    if (!callbackCalled) {
      callbackCalled = true
      return cb()
    }
  }

  var client = this.s3Client.put(destination, headers)
  client.on('response', endWithSuccess)
  client.on('error', endWithError)

  client.end(data)
}

module.exports = Retry
