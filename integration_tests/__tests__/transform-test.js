/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

jest.unmock('../runJest');

const {linkJestPackage, run} = require('../utils');
const path = require('path');
const runJest = require('../runJest');

const stripJestVersion = stdout =>
  stdout.replace(/Jest CLI v\d{1,2}\.\d{1,2}\.\d{1,2}/, '<<REPLACED>>');

describe('babel-jest', () => {
  const dir = path.resolve(__dirname, '..', 'transform/babel-jest');

  beforeEach(() => {
    run('npm install', dir);
    linkJestPackage('babel-jest', dir);
  });

  it('runs transpiled code', () => {
    // --no-cache because babel can cache stuff and result in false green
    const {json} = runJest.json(dir, ['--no-cache']);
    expect(json.success).toBe(true);
    expect(json.numTotalTests).toBeGreaterThanOrEqual(1);
  });

  it('instruments only specific files and collects coverage', () => {
    const {stdout} = runJest(dir, ['--coverage', '--no-cache']);
    expect(stdout).toMatch('covered.js');
    expect(stdout).not.toMatch('not-covered.js');
    expect(stdout).not.toMatch('excluded-from-coverage.js');
    // coverage result should not change
    expect(stripJestVersion(stdout)).toMatchSnapshot();
  });
});

describe('no babel-jest', () => {
  const dir = path.resolve(__dirname, '..', 'transform/no-babel-jest');

  it('fails with syntax error on flow types', () => {
    const {stderr} = runJest(dir, ['--no-cache']);
    expect(stderr).toMatch(/FAIL.*fails-with-syntax-error/);
    expect(stderr).toMatch('SyntaxError: Unexpected token :');
  });

  test('instrumentation with no babel-jest', () => {
    const {stdout} = runJest(dir, ['--no-cache', '--coverage']);
    expect(stdout).toMatch('covered.js');
    expect(stdout).not.toMatch('excluded-from-coverage.js');
    // coverage result should not change
    expect(stripJestVersion(stdout)).toMatchSnapshot();
  });
});

describe('custom preprocessor', () => {
  const dir = path.resolve(
    __dirname,
    '..',
    'transform/custom-instrumenting-preprocessor'
  );

  it('proprocesses files', () => {
    const {json, stderr} = runJest.json(dir, ['--no-cache']);
    expect(stderr).toMatch(/FAIL/);
    expect(stderr).toMatch(/instruments by setting.*global\.__INSTRUMENTED__/);
    expect(json.numTotalTests).toBe(2);
    expect(json.numPassedTests).toBe(1);
    expect(json.numFailedTests).toBe(1);
  });

  it('instruments files', () => {
    const {stdout, status} = runJest(dir, ['--no-cache', '--coverage']);
    // coverage should be empty because there's no real instrumentation
    expect(stripJestVersion(stdout)).toMatchSnapshot();
    expect(status).toBe(0);
  });
});
