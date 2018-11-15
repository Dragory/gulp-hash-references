# gulp-hash-references
Replaces references (paths) to files according to the specified mapping file.
Designed to be used with [gulp-hash](https://github.com/Dragory/gulp-hash).

## NOTE TO USERS UPGRADING FROM 1.x
The API of the plugin has changed significantly.
Files where the references are to be updated should now be piped to the plugin, with the first argument being the path to the manifest file.
See updated usage examples and API below.

## Usage
```javascript
var hash = require('gulp-hash');
var references = require('gulp-hash-references');

gulp.task('styles', function() {
	return gulp.src('styles/**/*.css')
		.pipe(hash()) // Generate hashes for the CSS files
		.pipe(gulp.dest('dist')) // Save the renamed CSS files (e.g. style.123456.css)
		.pipe(hash.manifest('asset-manifest.json')) // Generate a manifest file
		.pipe(gulp.dest('.')); // Save the manifest file
});

gulp.task('update-references', function() {
	return gulp.src('index.html')
		.pipe(references('asset-manifest.json')) // Replace file paths in index.html according to the manifest
		.pipe(gulp.dest('.'));
});
```

## API

### references(manifestPath[, options])

#### manifestPath
Type: `String` or `String[]`

Path to the manifest file, or an array of paths if using multiple manifest files.

#### options
Type: `Object`

##### options.dereference
Type: `boolean`  
Default: `false`

If set to true, the plugin's functionality is reversed and the replaced file paths are reverted to the original path instead.
