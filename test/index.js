var assert = require('assert')
var path = require('path')
var Retry = require('../index')

describe('Retry', function() {
  var noopKnox = {createClient: function() {}}

  it('throws an error if required options are not passed in', function() {
    assert.throws(function () {
      var client = new Retry({})
    })
  })

  it('does not throw an error if required options are passed in', function () {
    assert.doesNotThrow(function() {
      var client = new Retry({key: 1, secret: 1, bucket: 1}, noopKnox)
    })
  })

  describe('calculateBackoff', function() {
    it('returns a larger backoff for larger numbers of retries', function() {
      var client = new Retry({key: 1, secret: 1, bucket: 1}, noopKnox)
      var lessRetriesBackoff = client.calculateBackoff(1)
      var moreRetriesBackoff = client.calculateBackoff(10)
      assert(moreRetriesBackoff > lessRetriesBackoff)
    })
  })

  describe('upload', function() {
    // THIS IS SPARTA
    var mockKnox = {
      createClient: function() {
        return {
          put: function(put, destination) {
            return {
              eventHandlers: {},
              on: function(event, cb) {
                this.eventHandlers[event] = cb
              },
              end: function(data) {
                this.eventHandlers['error']('AN ERROR')
              }
            }
          }
        }
      }
    }

    it('tries uploading to s3 until maxRetries tries or it gets the hose again', function(done) {
      var client = new Retry({key: 1, secret: 1, bucket: 1, backoffInterval: 1, maxRetries:4 }, mockKnox)
      client.upload(path.join(__dirname, 'fakeFile.txt'), 'destination', function(err, res, timesRetried) {
        assert(err)
        assert(res == null)
        assert.equal(timesRetried, 4)
        done()
      })
    })

    it('calls the callback with a response object if the request succeeds', function(done) {
      var successKnox = {
        createClient: function() {
          return {
            put: function(put, destination) {
              return {
                eventHandlers: {},
                on: function(event, cb) {
                  this.eventHandlers[event] = cb
                },
                end: function(data) {
                  this.eventHandlers['response']({statusCode: 200})
                }
              }
            }
          }
        }
      }
      var client = new Retry({key: 1, secret: 1, bucket: 1 }, successKnox)
      client.upload(path.join(__dirname, 'fakeFile.txt'), 'destination', function(err, res) {
        assert.ifError(err)
        assert(res)
        done()
      })
    })
  })
})
