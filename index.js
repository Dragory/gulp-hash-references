var es = require('event-stream'),
	Stream = require('stream'),
	fs = require('fs'),
	gutil = require('gulp-util');

var defaultOptions = {
	ignoreNotFound: false
};

function extend() {
	var args = Array.prototype.slice.call(arguments),
		target = args.shift(),
		sources = args,
		i, len;

	for (i = 0, len = sources.length; i < len; i++) {
		for (var prop in sources[i]) {
			if (! sources[i].hasOwnProperty(prop)) continue;
			target[prop] = sources[i][prop];
		}
	}

	return target;
}

// http://stackoverflow.com/a/9310752/316944
function regexEscape(str) {
	return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = function(mappingFilePath, userOptions) {
	if (typeof userOptions === 'undefined') userOptions = {};

	var options = extend({}, defaultOptions, userOptions),
		mappings,
		mappingFroms = [],
		mappingTos = [],
		i, len;

	// Load mappings from the file
	try {
		mappings = JSON.parse(fs.readFileSync(mappingFilePath));
	} catch (e) {
		if (! options.ignoreNotFound) {
			throw new gutil.PluginError('gulp-hash-references', 'Mapping file could not be found or read!');
		}
	}

	// Create regex objects from the mapping keys for a global replace
	for (var from in mappings) {
		mappingFroms.push(new RegExp(regexEscape(from), 'g'));
		mappingTos.push(mappings[from]);
	}

	return es.map(function(file, callback) {
		var rewriteStream = new Stream.Transform({objectMode: true});
		rewriteStream._transform = function(data, encoding, callback) {
			var strData = data.toString(),
				i, len;

			// Apply each mapping replacement to the file's contents
			for (i = 0, len = mappingFroms.length; i < len; i++) {
				strData = strData.replace(mappingFroms[i], mappingTos[i]);
			}

			this.push(new Buffer(strData));
		};

		file.pipe(rewriteStream);

		if (file.isBuffer()) {
			file.contents = new Buffer(rewriteStream.read());
		} else {
			file.contents = rewriteStream;
		}

		callback(null, file);
	});
};