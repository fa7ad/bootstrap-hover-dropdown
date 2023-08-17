import fs from 'node:fs';
import { spawn } from 'node:child_process';
import gulp from 'gulp';
import bump from 'gulp-bump';
import git from 'gulp-git';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import filter from 'gulp-filter';
import replace from 'gulp-replace';
import streamqueue from 'streamqueue';
import tagVersion from 'gulp-tag-version';

gulp.task('default', () =>
    gulp
        .src('bootstrap-hover-dropdown.js')
        // minifiy preserving preserved comments
        .pipe(uglify({ output: { comments: 'some' } }))
        // rename to .min.
        .pipe(rename('bootstrap-hover-dropdown.min.js'))
        .pipe(gulp.dest('.'))
);

/**
 * Bumping version number and tagging the repository with it.
 * Please read http://semver.org/
 *
 * You can use the commands
 *
 *     gulp patch     # makes v0.1.0 → v0.1.1
 *     gulp feature   # makes v0.1.1 → v0.2.0
 *     gulp release   # makes v0.2.1 → v1.0.0
 *
 * To bump the version numbers accordingly after you did a patch,
 * introduced a feature or made a backwards-incompatible release.
 */
function increment(importance) {
    var packages = ['package.json', 'bower.json', 'composer.json'];
    var currentVersion = JSON.parse(fs.readFileSync('bower.json')).version;

    // get all the files to bump version in
    gulp.src(packages)

        // bump the version number in those files
        .pipe(bump({ type: importance }))

        // save it back to filesystem
        .pipe(gulp.dest('.'))

        .on('end', function () {
            var newVersion = JSON.parse(fs.readFileSync('bower.json')).version;

            var packagesStream = gulp.src(packages);

            var jsStream = gulp
                .src(['bootstrap-hover-dropdown.js', 'bootstrap-hover-dropdown.min.js'])

                // replace version # in the JS files
                .pipe(replace('Version: v' + currentVersion, 'Version: v' + newVersion))

                // save it back to filesystem
                .pipe(gulp.dest('.'));

            // merge the streams together to commit
            streamqueue({ objectMode: true }, jsStream, packagesStream)
                // commit the changed version number
                .pipe(git.commit("bump packages' version"))

                // read only one file to get the version number
                .pipe(filter('package.json'))

                // **tag it in the repository**
                .pipe(tagVersion())

                // run npm publish
                .on('end', function () {
                    spawn('npm', ['publish'], { stdio: 'inherit' });
                });
        });
}

gulp.task(
    'patch',
    gulp.series('default', () => increment('patch'))
);
gulp.task(
    'feature',
    gulp.series('default', () => increment('minor'))
);
gulp.task(
    'release',
    gulp.series('default', () => increment('major'))
);
