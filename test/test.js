var File = require('vinyl'),
	references = require('../index.js'),
	assert = require('assert'),
	Stream = require('stream');

describe('buffer contents', function() {
	var fakeFile = new File({
		'path': '',
		'contents': new Buffer('<img src="dir/img.png" alt="">')
	});

	var testReferences = references(__dirname + '/fixtures/asset-hashes.json');

	it('should replace file path', function(done) {
		var testStream = new Stream.Writable();
		testStream._write = function(contents) {
			assert.equal(contents.toString(), '<img src="dir/img.12345678.png" alt="">');
			done();
		};

		testReferences.write(fakeFile);
		fakeFile.pipe(testStream);
	});
});

describe('stream contents', function() {
	var readable = new Stream.Readable();
	readable._read = function() {
		this.push(new Buffer('<img src="dir/img.png" alt="">'));
	};

	var fakeFile = new File({
		'path': '',
		'contents': readable
	});

	var testReferences = references(__dirname + '/fixtures/asset-hashes.json');

	it('should replace file path', function(done) {
		var testStream = new Stream.Writable();
		testStream._write = function(contents) {
			assert.equal(contents.toString(), '<img src="dir/img.12345678.png" alt="">');
			done();
		};

		testReferences.write(fakeFile);
		fakeFile.pipe(testStream);
	});
});

describe('error handling', function() {
	it('should respect the ignoreNotFound option', function() {
		try {
			references(__dirname + '/non-existent.json', {
				ignoreNotFound: true
			});
			assert(true);
		} catch (e) {
			assert(false);
		}

		try {
			references(__dirname + '/non-existent.json', {
				ignoreNotFound: false
			});
			assert(false);
		} catch (e) {
			assert(true);
		}
	});
});