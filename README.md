#intimidate

intimidate is a node module to upload files to S3 with support for
automatic retry and exponential backoff.

It uses the excellent [knox](https://github.com/LearnBoost/knox) library to
handle the heavy lifting.

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

The constructor takes any opts that can be passed to
[knox's](https://github.com/LearnBoost/knox) `createClient` function. Here are
some important ones.

* `key` - S3 api key. Required.
* `secret` - S3 api secret. Required.
* `bucket` - S3 bucket to upload to. Required.
* `region` - S3 region to upload to. Defaults to `'us-west-2'`
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

Params:

* `sourcePath` location of the file to upload on the fs
* `destination` path in s3 to upload file to
* `cb` function(err, res) called when upload is done or has
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

### `uploadBuffer(buffer, headers, destination, cb)`

Upload a buffer

Params:

* `buffer` buffer to upload
* `headers` HTTP headers to set on request. `'Content-Length'` will default to
   `buffer.length`, and `'Content-Type'` will default to
   'application/octet-stream' if not provided.
* `destination` path on S3 to put file
* `cb` function(err, res) called when request completes or fails too many times


Example:

```JavaScript
var data = new Buffer('Shall I compare thee to a summer/'s day?')
var headers = {
  'Content-Type': 'application/text',
  'Content-Length': data.length
}

client.uploadBuffer(data, headers, 'poem_idea.txt', function(err, res) {
  if (err) {
    console.log('error uplaoding my sweet poem idea', err)
  }
  else {
    console.log('my poem idea is successfully archived to s3')
  }
})
```

### `uploadFiles(files, cb)`

Upload an array of files. The callback will be called when they all upload
successfully, or when at least one of the uploads has failed.

Params:

* `files` Array of `{src: 'some_path.file', dest: 'some_uploaded_path.file'}`
  file object to be uploaded.
* `cb` `function(err, res)` that will be called when upload is complete or
  one of the files has failed to upload.

Example:


```JavaScript
var files = [{src: 'hurp.txt', dest: 'durp.txt'}, {src: 'foo.txt', dest: 'foo.txt'}]
client.uploadFiles(files, function(err, res) {
  if (err) {
    console.error('error uploading one file', err)
  }
  else {
    console.log('hooray, successfully uploaded all files')
  }
})
```
