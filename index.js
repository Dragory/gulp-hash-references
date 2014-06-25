var es = require('event-stream'),
	extend = require('lodash.assign'),
	Promise = require('bluebird');

// http://stackoverflow.com/a/9310752/316944
function regexEscape(str) {
	return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Handled target files will be queued to the returned stream once the manifest files are parsed.
 */
module.exports = function(targetFiles) {
	var mappings = {},
		resolver;

	var targetFileHandlerPromise = new Promise(function(resolve) {
		resolver = resolve;
	});

	var stream = es.through(
		function(manifestFile) {
			var parser = es.through(function(contents) {
				mappings = extend(mappings, JSON.parse(contents));
			});

			manifestFile.pipe(parser);
			// Don't return, we will queue the target files after handling instead
		},

		function() {
			var mappingPatterns = {
				from: [],
				to: []
			};

			for (var from in mappings) {
				mappingPatterns.from.push(new RegExp(regexEscape(from), 'g'));
				mappingPatterns.to.push(mappings[from]);
			}

			resolver(mappingPatterns);
		}
	);
	
	targetFiles.pipe(es.map(function(targetFile, callback) {
		// Wait for the manifest files to be parsed
		targetFileHandlerPromise.then(function(mappingPatterns) {
			var replacer = es.through(function(data) {
				var strData = data.toString(),
					i, len;

				// Apply each mapping replacement to the file's contents
				for (i = 0, len = mappingPatterns.from.length; i < len; i++) {
					strData = strData.replace(mappingPatterns.from[i], mappingPatterns.to[i]);
				}

				if (targetFile.isBuffer()) {
					targetFile.contents = new Buffer(strData);
					stream.queue(targetFile);
				} else {
					targetFile.contents = es.through();
					stream.queue(targetFile);

					targetFile.contents.write(new Buffer(strData));
					targetFile.contents.end();
				}

			});

			targetFile.pipe(replacer);

			callback();
		});
	}));

	return stream;
};

/*module.exports = function(manifestFiles) {
	// We need to load the mappings from the manifests before we can perform any replacements
	var manifestLoadPromise = new Promise(function(resolve) {
		var mappings = {};

		manifestFiles.pipe(es.through(
			// Load manifest files
			function(file) {
				var parseStream = es.through(function(data) {
					mappings = extend(mappings, JSON.parse(data));
				});

				file.pipe(parseStream);
			},

			// Separate them into 'from' (a regex pattern) and 'to' (the replacement string)
			function() {
				var mappingPatterns = {
					from: [],
					to: []
				};

				for (var from in mappings) {
					mappingPatterns.from.push(new RegExp(regexEscape(from), 'g'));
					mappingPatterns.to.push(mappings[from]);
				}

				resolve(mappingPatterns);
			}
		));
	});

	return es.map(function(file, callback) {
		if (file.isNull()) {
			callback(null, file);
			return;
		}

		manifestLoadPromise.then(function(mappingPatterns) {
			file.pipe(es.through(
				// Perform each replacement on the file
				function(data) {
					var strData = data.toString(),
						i, len;

					// Apply each mapping replacement to the file's contents
					for (i = 0, len = mappingPatterns.from.length; i < len; i++) {
						strData = strData.replace(mappingPatterns.from[i], mappingPatterns.to[i]);
					}

					file.contents = new Buffer(strData);
				},

				// Pass the replacement result along in the stream
				function() {
					callback(null, file);
				}
			));
		});
	});
};*/