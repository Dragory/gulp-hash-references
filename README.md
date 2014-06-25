# gulp-hash-references
Replaces references (paths) to files according to the specified mapping file.
Designed to be used with [gulp-hash](https://github.com/Dragory/gulp-hash).

## Usage
```javascript
var hash = require('gulp-hash'),
	references = require('gulp-hash-references');

gulp.src('css/styles.css')
	.pipe(hash()) // Generate a hash for styles.css and rename it
	.pipe(gulp.dest('css')) // Save the renamed styles.css (now something like styles.abc123df.css)
	.pipe(hash.manifest('style-manifest.json')) // Retrieve the generated manifest for styles.css with an optional filename for saving
	.pipe(gulp.dest('.')) // Save the manifest file (optional)
	.pipe(references(gulp.src('index.html'))) // Pipe the manifest and pass a gulp.src of files to update references in (only index.html in this example)
	.pipe(gulp.dest('.')); // Save the updated index.html
```

You can also generate the manifest file(s) in advance and then just:
```javascript
gulp.src('asset-manifests/**/*.json')
	.pipe(references(gulp.src('index.html')))
	.pipe(gulp.dest('.'));
```