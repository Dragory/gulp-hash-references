process.on('unhandledRejection', err => {
	console.error(err);
	process.exit(1);
});

var Vinyl = require('vinyl'),
	through = require('through2'),
	references = require('../index.js'),
	assert = require('assert'),
	Stream = require('stream');

it('should replace file references in buffer content', function (done) {
	var fakeFile = new Vinyl({
		path: '',
		contents: new Buffer('<img src="dir/img.png" alt="">')
	});

	var fakeFileStream = through.obj();

	fakeFileStream
		.pipe(references(__dirname + '/fixtures/asset-hashes.json'))
		.pipe(through.obj(function(file) {
			assert.equal(file.contents.toString('utf8'), '<img src="dir/img.12345678.png" alt="">');
			done();
		}));

	fakeFileStream.write(fakeFile);
	fakeFileStream.push(null);
});

it('should replace file references in stream content', function (done) {
	var readable = new Stream.Readable({ objectMode: false });
	readable._read = function () {
		this.push(new Buffer('<img src="dir/img.png" alt="">'));
		this.push(null);
	};

	var fakeFile = new Vinyl({
		path: '',
		contents: readable
	});

	var fakeFileStream = through.obj();

	fakeFileStream
		.pipe(references(__dirname + '/fixtures/asset-hashes.json'))
		.pipe(through.obj(function(file) {
			file.contents.pipe(through(function(contents) {
				assert.equal(contents.toString('utf8'), '<img src="dir/img.12345678.png" alt="">');
				done();
			}));
		}));

	fakeFileStream.write(fakeFile);
	fakeFileStream.push(null);
});

it('should dereference', function(done) {
	var fakeFile = new Vinyl({
		path: '',
		contents: new Buffer('<img src="dir/img.12345678.png" alt="">')
	});

	var fakeFileStream = through.obj();

	fakeFileStream
		.pipe(references(__dirname + '/fixtures/asset-hashes.json', {dereference: true}))
		.pipe(through.obj(function(file) {
			assert.equal(file.contents.toString('utf8'), '<img src="dir/img.png" alt="">');
			done();
		}));

	fakeFileStream.write(fakeFile);
	fakeFileStream.push(null);
});

it('should replace repeated file references', function(done) {
	var fakeFile = new Vinyl({
		path: '',
		contents: new Buffer('dir/img.png dir/img.png')
	});

	var fakeFileStream = through.obj();

	fakeFileStream
		.pipe(references(__dirname + '/fixtures/asset-hashes.json'))
		.pipe(through.obj(function(file) {
			assert.equal(file.contents.toString('utf8'), 'dir/img.12345678.png dir/img.12345678.png');
			done();
		}));

	fakeFileStream.write(fakeFile);
	fakeFileStream.push(null);
});

it('should replace references from multiple manifests', function (done) {
	var fakeFile = new Vinyl({
		path: '',
		contents: new Buffer('dir/img.png dir/styles.css')
	});

	var fakeFileStream = through.obj();

	fakeFileStream
		.pipe(references([
			__dirname + '/fixtures/asset-hashes.json',
			__dirname + '/fixtures/asset-hashes-2.json'
		]))
		.pipe(through.obj(function (file) {
			assert.equal(file.contents.toString('utf8'), 'dir/img.12345678.png dir/styles.abcdef.css');
			done();
		}));

	fakeFileStream.write(fakeFile);
	fakeFileStream.push(null);
});
