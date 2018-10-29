'use strict';

var gulp = require('gulp'),
    patternControllerGenerator = require("../");

function exportController() {
    return gulp.src("./patterns")
    .pipe(patternControllerGenerator({
        namespace: "ProjectBundle\\Bundle\\PatternlabBundle\\Model\\ConverterItems"
    }))
    .pipe(gulp.dest("./dest"));
}

gulp.task('export:controller', exportController);