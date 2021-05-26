const {join} = require('path');
const {unlinkSync} = require('fs');
const {set, ln, rm, mkdir} = require('shelljs');
const {fork} = require('child_process');
const {getNpmPackagesFromRunfiles} = require('../npm-packages-from-runfiles');
const {runfiles} = require('@bazel/runfiles');

// Exit if any command fails.
set('-e');

// List of NPM packages that have been built for the current test target.
const npmPackages = getNpmPackagesFromRunfiles();
// Path to the node modules of the workspace.
const nodeModulesDir = runfiles.resolve('npm/node_modules');
// Path to the generated file that imports all entry-points.
const testFilePath = require.resolve('./import-all-entry-points.ts');

/**
 * Runs the TypeScript compatibility test with the specified tsc binary. The
 * compatibility test, links the built release packages into `node_modules` and
 * compiles a test file using the specified tsc binary which imports all entry-points.
 */
exports.runTypeScriptCompatibilityTest = async (tscBinPath) => {
  return new Promise((resolve, reject) => {
    const angularDir = join(nodeModulesDir, '@angular/');

    // Create the `node_modules/@angular` directory in case it's not present.
    mkdir('-p', angularDir);

    // Symlink npm packages into `node_modules/` so that the project can
    // be compiled without path mappings (simulating a real project).
    for (const {name, pkgPath} of npmPackages) {
      console.info(`Linking "@angular/${name}" into node modules..`);
      ln('-sf', pkgPath, join(angularDir, name));
    }

    const tscArgs = [
      '--strict',
      '--lib', 'es2015,dom',
      // Ensures that `node_modules` can be resolved. By default, in sandbox environments the
      // node modules cannot be resolved because they are wrapped in the `npm/node_modules` folder
      '--baseUrl', nodeModulesDir,
      testFilePath
    ];
    // Run `tsc` to compile the project. The stdout/stderr output is inherited, so that
    // warnings and errors are printed to the console.
    const tscProcess = fork(tscBinPath, tscArgs, {stdio: 'inherit'});

    tscProcess.on('exit', (exitCode) => {
      // Remove symlinks to keep a clean repository state.
      for (const {name} of npmPackages) {
        console.info(`Removing link for "@angular/${name}"..`);
        unlinkSync(join(angularDir, name));
        rm('-rf', join(angularDir, name));
      }
      exitCode === 0 ? resolve() : reject();
    });
  });
};

