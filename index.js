var fs = require('fs')
var knox = require('knox')
var mime = require('mime')
var q = require('q')

/**
 * @class Retry
 * @constructor
 * @param opts {Object} an object containing config parameters
 */
function Retry(opts) {
  // TODO: validate presence of these opts
  this.key = opts.key
  this.secret = opts.secret
  this.bucket = opts.bucket
  this.region = opts.region || 'us-west-2'

  this.s3Client = knox.createClient({
    key: this.key,
    secret: this.secret,
    bucket: this.bucket,
    region: this.region
  })

  this.maxRetries = opts.maxRetries || 10
}

Retry.calculateBackoff = function(numRetries) {
  var backoffInterval = 51
  var randMultiplier = Math.ceil(Math.random() * (Math.pow(2, numRetries + 2) - 1))
  return backoffInterval * randMultiplier
}

/**
 * Upload a file at sourcePath with automatic retries and exponential backoff
 *
 * @param sourcePath {String} location of the file to upload on the fs
 * @param destination {String} path in s3 to upload file to
 * @param cb {Function} function(err) called when upload is done or has failed too many times
 */
Retry.prototype.upload = function(sourcePath, destination, cb) {
  fs.readFile(sourcePath, function(err, file) {
    if (err) {
      return cb(err)
    }

    var headers = {
      'Content-Type': mime.lookup(sourcePath),
      'Content-Length': file.length
    }
    this.uploadWithRetries(headers, destination, file, cb)
  })
}

Retry.prototype.uploadWithRetries = function(headers, data, destination, numberOfRetries, cb) {
  var self = this
  // prevent callback from being called twice
  var callbackCalled = false

  if (typeof numberOfRetries === 'function') {
    cb = numberOfRetries
    numberOfRetries = 0
  }


  function endWithError(err) {
    numberOfRetries++
    if (numberOfRetries >= this.maxRetries) {
      if (!callbackCalled) {
        callbackCalled = true
        return cb(err)
      }
    }
    else {
      setTimeout(self.uploadWithRetries.bind(self),
      self.calculateBackoff(numberOfRetries), headers, data,
      destination, numberOfRetries, cb)
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
