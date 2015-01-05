var File = require('gulp-util').File,
	vfs = require('vinyl-fs'),
	es = require('event-stream'),
	references = require('../index.js'),
	assert = require('assert'),
	Stream = require('stream');

it('should replace file references in buffer content', function(done) {
	var fakeFile = new File({
		'path': '',
		'contents': new Buffer('<img src="dir/img.png" alt="">')
	});

	var fakeFileStream = es.through();

	var testStream = vfs.src(__dirname + '/fixtures/asset-hashes.json')
		.pipe(references(fakeFileStream))
		.pipe(es.through(function(modifiedFile) {
			var contentReader = es.through(function(contents) {
				assert.equal(contents, '<img src="dir/img.12345678.png" alt="">');
				done();
			});
			
			modifiedFile.pipe(contentReader);
		}));

	fakeFileStream.write(fakeFile);
	fakeFileStream.end();
});

it('should replace file references in stream content', function(done) {
	var readable = new Stream.Readable();
	readable._read = function() {
		this.push(new Buffer('<img src="dir/img.png" alt="">'));
		this.push(null);
	};

	var fakeFile = new File({
		'path': '',
		'contents': readable
	});

	var fakeFileStream = es.through();

	var testStream = vfs.src(__dirname + '/fixtures/asset-hashes.json')
		.pipe(references(fakeFileStream))
		.pipe(es.through(function(modifiedFile) {
			var contentReader = es.through(function(contents) {
				assert.equal(contents, '<img src="dir/img.12345678.png" alt="">');
				done();
			});
			
			modifiedFile.pipe(contentReader);
		}));

	fakeFileStream.write(fakeFile);
	fakeFileStream.end();
});

it('should dereference', function(done) {
	var readable = new Stream.Readable();
	readable._read = function() {
		this.push(new Buffer('<img src="dir/img.12345678.png" alt="">'));
		this.push(null);
	};

	var fakeFile = new File({
		'path': '',
		'contents': readable
	});

	var fakeFileStream = es.through();

	var testStream = vfs.src(__dirname + '/fixtures/asset-hashes.json')
		.pipe(references(fakeFileStream, {dereference: true}))
		.pipe(es.through(function(modifiedFile) {
			var contentReader = es.through(function(contents) {
				assert.equal(contents, '<img src="dir/img.png" alt="">');
				done();
			});
			
			modifiedFile.pipe(contentReader);
		}));

	fakeFileStream.write(fakeFile);
	fakeFileStream.end();
});