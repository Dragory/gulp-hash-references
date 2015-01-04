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
module.exports = function(targetFiles, options) {
	var mappings = {},
		defaults = {
			dereference: false
		},
		resolver;

	options = extend(options || {}, defaults)

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
				if (options.dereference) {
					mappingPatterns.from.push(mappings[from]);
					mappingPatterns.to.push(new RegExp(regexEscape(from), 'g'));
					continue;
				}

				mappingPatterns.from.push(new RegExp(regexEscape(from), 'g'));
				mappingPatterns.to.push(mappings[from]);
			}

			resolver(mappingPatterns);
			// Don't end the stream; new files coming from below
		}
	);

	// Some trickery to accomodate for two streams ending in async (original manifest files and targetFiles)
	// (There has to be a better way...)
	var totalTargetFiles = 0,
		handled = 0,
		hasEnded = false;

	function finish() {
		if (! hasEnded || handled < totalTargetFiles) return;

		// All target files should now be handled and passed to the original stream; thus, we can end it.
		// This also needs to be done for certain modules (such as run-sequence) to notice we've handled each file.
		stream.queue(null);
	}

	targetFiles
		// Keep a count of how many files we receive
		.pipe(es.through(function(file) {
			totalTargetFiles++;
			this.queue(file);
		}))
		// Handle the files
		.pipe(es.through(
			function(targetFile) {
				// Wait for the manifest files to be parsed before doing anything
				targetFileHandlerPromise.then(function(mappingPatterns) {
					// Vinyl .pipe() allows us to handle both stream and buffer contents
					var replacer = es.through(function(data) {
						var strData = data.toString(),
							i, len;

						// Apply each mapping replacement to the file's contents
						for (i = 0, len = mappingPatterns.from.length; i < len; i++) {
							strData = strData.replace(mappingPatterns.from[i], mappingPatterns.to[i]);
						}

						if (targetFile.isBuffer()) {
							// For buffer files, just save the contents as a buffer
							targetFile.contents = new Buffer(strData);
							stream.queue(targetFile);
						} else {
							// For stream files, pass a new stream as the contents
							targetFile.contents = es.through();
							stream.queue(targetFile);

							targetFile.contents.write(new Buffer(strData));
							targetFile.contents.queue(null);
						}

						// Mark this file as handled
						handled++;
						finish();
					});

					if (! targetFile.isNull()) {
						targetFile.pipe(replacer);
					} else {
						// Ignore null files
						handled++;
						finish();
					}
				});
			},

			function() {
				// Keep track of when we've attached the promise listener above to each of the files
				hasEnded = true;
				finish();
			}
		));

	return stream;
};
