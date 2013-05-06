var fs = require('fs')
var knox = require('knox')
var mime = require('mime')
var waitress = require('waitress')

/**
 * @class Retry
 * @constructor
 * @param opts {Object} an object containing config parameters
 *   `key`, `secret` and `bucket` are all requried.
 *   `region` is the S3 region. It defaults to us-west-2
 *   `maxRetries` is the number of times to retry before failing. It defaults to 3
 *   `backoffInterval` is a multiplier used to calculate exponential backoff.
 *   It defaults to 51.
 * @param knox {Object} knox library by default, or mocked version for testing
 * @param mime {Object} mime lib by default, or mocked version for testing
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


  validateRequiredOptions(opts)

  this.key = opts.key
  this.secret = opts.secret
  this.bucket = opts.bucket
  this.region = opts.region || 'us-west-2'

  this.s3Client = this.knox.createClient(opts)

  this.maxRetries = opts.maxRetries || 3
  this.backoffInterval = opts.backoffInterval || 51
}

function validateRequiredOptions(opts) {
  if (!opts.hasOwnProperty('key')) {
    throw new Error("Missing required 'key' option from opts.")
  }
  else if (!opts.hasOwnProperty('secret')) {
    throw new Error("Missing required 'secret' option from opts.")
  }
  else if (!opts.hasOwnProperty('bucket')) {
    throw new Error("Missing required 'bucket' option from opts.")
  }
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

    self.uploadWithRetries(file, headers, destination, cb)
  })
}

/**
 * Upload a buffer with accompanying headers to S3.
 *
 * @param buffer {Buffer} buffer to put to s3
 * @param headers {Object} headers. Will set default Content-Type and
 *   Content-Length if none is provided.
 * @param destination {String} path to put buffer to
 * @param cb {Funtion} function(err, res) called when upload has succeeded
 *   or failed too many times.
 */
Retry.prototype.uploadBuffer = function(buffer, headers, destination, cb) {
  this.uploadWithRetries(buffer, headers, destination, cb)
}

/**
 * Upload a buffer with accompanying headers to s3. Recursively calls itself
 * until `timesRetried` exceeds `this.maxRetries`.
 *
 * @private
 * @param data {Buffer} data to put to S3
 * @param headers {Object} headers to send with request to S3. Will set a default
 *   Content-Length and Content-Type if none is provided.
 * @param destination {String} path to put the buffer to S3
 * @param timesRetried {Number} number of times this current upload has retried.
 *   Defaults to 0 if not passed in, and will increment every time an upload fails.
 * @param cb {Function} function(err, res) called when upload is done or has failed
 *   too many times.
 */
Retry.prototype.uploadWithRetries = function(data, headers, destination, timesRetried, cb) {
  var self = this
  // prevent callback from being called twice
  var callbackCalled = false

  // sometimes knox failures will give EPIPE errors after sending a non-200
  // status code, so we have to guard against recusing twice
  var recursionScheduled = false

  // Set content type and length if they aren't included
  headers = headers || {}
  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/octet-stream'
  }
  if (headers['Content-Length'] == undefined) {
    headers['Content-Length'] = data.length
  }

  if (typeof timesRetried === 'function') {
    cb = timesRetried
    // start at -1 so we can increment up to 0 on the first call
    timesRetried = -1
  }

  timesRetried++

  function endWithError(err) {
    if (callbackCalled) {
      return
    }
    if (timesRetried >= self.maxRetries) {
      if (!callbackCalled) {
        callbackCalled = true
        return cb(err, null, timesRetried)
      }
    }
    else {
      if (recursionScheduled) {
        return
      }
      recursionScheduled = true
      setTimeout(self.uploadWithRetries.bind(self),
        self.calculateBackoff(timesRetried), data, headers, destination,
        timesRetried, cb)
    }
  }

  function endWithResponse(res) {
    if (res.statusCode !== 200) {
      return endWithError(new Error('Invalid status code: ' + res.statusCode))
    }

    if (!callbackCalled) {
      callbackCalled = true
      return cb(null, res, timesRetried)
    }
  }

  var client = this.s3Client.put(destination, headers)
  client.on('response', endWithResponse)
  client.on('error', endWithError)

  client.end(data)
}

/**
 * Upload a file at sourcePath with automatic retries and exponential backoff
 *
 * @param files {Object} {src: /path, dest: /path} location and destination of the file to upload on the fs
 * @param cb {Function} function(err) called when all uploads are done or have failed too many times
 */
Retry.prototype.uploadFiles = function(files, cb) {
  var self = this
  var done = waitress(files.length, cb);

  files.forEach(function(file) {
    self.upload(file.src, file.dest, done);
  });
}

module.exports = Retry
