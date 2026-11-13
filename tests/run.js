#!/usr/bin/env node
/* Führt alle JS-Tests in Node aus: lädt die testbaren js/*.js und tests/*.test.js per vm. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
// Nur DOM-freie Module; Reihenfolge wie in index.html
const sources = ['notation', 'layout', 'render', 'analyzer-client', 'storage', 'share', 'example']
  .map(function (m) { return path.join(root, 'js', m + '.js'); })
  .filter(function (f) { return fs.existsSync(f); });
const testFiles = fs.readdirSync(__dirname)
  .filter(function (f) { return f.endsWith('.test.js'); })
  .sort()
  .map(function (f) { return path.join(__dirname, f); });

function load(file) {
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}

load(path.join(__dirname, 'runner.js'));
sources.forEach(load);
testFiles.forEach(load);

globalThis.T.run(function (status, name, detail) {
  const mark = status === 'ok' ? '✓' : status === 'skip' ? '-' : '✗';
  console.log(mark + ' ' + name + (detail ? '\n    ' + detail.split('\n').join('\n    ') : ''));
}).then(function (r) {
  console.log('\n' + r.passed + ' bestanden, ' + r.failed + ' fehlgeschlagen, ' + r.skipped + ' übersprungen');
  process.exitCode = r.failed ? 1 : 0;
});
