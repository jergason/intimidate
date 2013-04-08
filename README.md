#intimidate

intimidate is a node module to upload files to S3 with support for
automatic retry and exponential backoff.

> When you need those uploads to back off, use *intimidate*™. - The Readme

## Installation

```bash
npm install intimidate
```

## Examples

Upload a local file:

```JavaScript
var Intimidate = require('intimidate')
// Create a client
var client = new Intimidate({
  key: 'some-aws-key',
  secret: 'some-aws-secret',
  bucket: 'lobsters',
  maxRetries: 5
})

client.upload('path/to/a/file.xml', 'destination/path/on/s3.xml', function(err, res) {
  if (err) {
    console.log('oh noes, all uploads failed! last error was', err)
  }
  else {
    console.log('yahoo, upload succeeded!')
  }
})
```

## API

### `Intimidate(opts)`

Constructor function that takes the following opts:

* `key` - S3 api key. Required.
* `secret` - S3 api secret. Required.
* `bucket` - S3 bucket to upload to. Required.
* `region` - S3 region to upload to. Defautls to `'us-west-2'`
* `maxRetries` - the number of times to retry before failing. Defaults to 3.
* `backoffInterval` a multiplier used to calculate exponential backoff. Larger
   numbers result in much larger backoff times after each failure. Defaults to 51.

Example:

```JavaScript
var Intimidate = require('intimidate')
var s3Uploader = new Intimidate({
  key: 'love',
  secret: 'a sneaky secret',
  bucket: 'kicked',
  maxRetries: 4,
  backoffInterval: 20
})
```

### `upload(sourcePath, destination, cb)`


 Upload a file at sourcePath with automatic retries and exponential backoff

* @param sourcePath {String} location of the file to upload on the fs
* @param destination {String} path in s3 to upload file to
* @param cb {Function} function(err, res) called when upload is done or has
    failed too many times. `err` is the last error, and `res` is the reponse
    object if the request succeeded


Example:

```JavaScript
client.upload('a_car.zip', 'uploaded_cars/car.zip', function(err, res) {
  if (err) {
    console.log('Dang, guess you can\'t upload a car.', err)
  }
  else {
    console.log('I uploaded a car.')
  }
})
```
