var through = require('through2');
var fs = require('fs');

// http://stackoverflow.com/a/9310752/316944
function regexEscape(str) {
	return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Load file name mappings from the specified file and return them as
 * an array of objects with 'from' and 'to' properties. The source file
 * should be a JSON file containing an object where the keys correspond
 * to the 'from' and the values to the 'to' of the mappings.
 *
 * If the file doesn't exist, returns an empty array.
 *
 * If reverse is set to true, the from/to of the mappings are reversed.
 *
 * @param {String} manifestFilePath
 * @param {Boolean} reverse
 * @return {Object[]}
 */
function loadMappings(manifestFilePath, reverse) {
	try {
		var mappingsFile = fs.readFileSync(manifestFilePath, { encoding: 'utf8' });
	} catch (e) {
		return [];
	}

	var parsed = JSON.parse(mappingsFile);
	var mappings = [];

	for (var from in parsed) {
		var originalFrom = from;
		var to = parsed[from];

		if (reverse) {
			to = from;
			from = parsed[from];
		}

		mappings.push({
			originalFrom: originalFrom,
			from: new RegExp(regexEscape(from), 'g'),
			to: to
		});
	}

	return mappings;
}

/**
 * The exported main function of the plugin
 * @param {String|String[]} manifestFiles
 * @param {Object} options
 */
function references(manifestFiles, options) {
	var defaultOpts = {
		dereference: false
	};

	options = Object.assign({}, defaultOpts, options || {});

	// Load mappings
	if (typeof manifestFiles === 'string') manifestFiles = [manifestFiles];
	var mappings = manifestFiles.reduce(function(mappings, path) {
		return mappings.concat(loadMappings(path, options.dereference));
	}, []);

	var replaceReferences = function (str) {
		mappings.forEach(obj => {
			str = str.replace(obj.from, obj.to);
		});

		return str;
	};

	// Replace references in each file
	return through.obj(function(file, enc, cb) {
		if (file.isStream()) {
			var oldContents = file.contents;
			file.contents = through();

			oldContents.pipe(through(function(contents) {
				var replaced = replaceReferences(contents.toString('utf8'));
				file.contents.write(replaced);
				file.contents.push(null);
			}));
		} else {
			file.contents = new Buffer(replaceReferences(file.contents.toString('utf8')));
		}

		cb(null, file);
	});
};

module.exports = references;
