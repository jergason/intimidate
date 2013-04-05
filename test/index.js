var assert = require('assert')
var Retry = require('../index')

describe('Retry', function() {
  describe('calculateBackoff', function() {
    it('returns a larger backoff for larger numbers of retries', function() {
      var lessRetriesBackoff, moreRetriesBackoff
      lessRetriesBackoff = Retry.calculateBackoff(1)
      moreRetriesBackoff = Retry.calculateBackoff(10)
      assert(moreRetriesBackoff > lessRetriesBackoff)
    })
  })
})
