// @ts-check
const gulp = require('gulp');
const del = require('del');
const { build } = require("./scripts/build");
const minimist = require("minimist");
const mocha = require('gulp-mocha');
const options = /** @type {minimist.ParsedArgs & Options} */ (minimist(process.argv.slice(2), {
    boolean: ["force", "verbose"],
    alias: { "f": "force" },
    default: { force: false, verbose: "minimal" }
}));

let useDebug = process.env.npm_lifecycle_event !== "prepublishOnly";
let watching = false;

gulp.task("build", build("tsconfig.json", { force: options.force, verbose: options.verbose, debug: useDebug }));
gulp.task("clean", () => del("dist"));
gulp.task("test", ["build"], () => test({ main: "dist/__test__/index.js", coverage: { thresholds: { global: 80 } } }));
gulp.task("watch", () => watch(["src/**/*"], ["test"]));
gulp.task("default", ["test"]);
gulp.task("prepublishOnly", ["clean"], () => gulp.start(["test"]));

function test(opts) {
    const stream = gulp
        .src(opts.main, { read: false })
        .pipe(mocha({ reporter: watching ? 'min' : 'dot' }));
    return stream;
}

function watch(src, tasks) {
    watching = true;
    return gulp.watch(src, tasks);
}

/**
 * @typedef Options
 * @property {boolean} [force]
 * @property {boolean|"minimal"} [verbose]
 */
void 0;