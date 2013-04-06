var assert = require('assert')
var path = require('path')
var Retry = require('../index')

describe('Retry', function() {
  describe('calculateBackoff', function() {
    it('returns a larger backoff for larger numbers of retries', function() {
      var client = new Retry({}, {createClient: function() {}})
      var lessRetriesBackoff = client.calculateBackoff(1)
      var moreRetriesBackoff = client.calculateBackoff(10)
      assert(moreRetriesBackoff > lessRetriesBackoff)
    })
  })

  describe('upload', function() {
    // THIS IS SPARTA
    var timesCalled = 0
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
                timesCalled++
                if (timesCalled < 4) {
                  this.eventHandlers['error']('AN ERROR')
                }
                else {
                  this.eventHandlers['response']('A RESPONSE')
                }
              }
            }
          }
        }
      }
    }

    it('tries uploading to s3 until success', function(done) {
      var client = new Retry({ backoffInterval: 1, maxRetries:4 }, mockKnox)
      client.upload(path.join(__dirname, 'fakeFile.txt'), 'destination', function(err) {
        assert.ifError(err)
        assert.equal(timesCalled, 4)
        done()
      })
    })
  })
})
