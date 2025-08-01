#!/usr/bin/env node
import { run } from '@oclif/core';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Handle both regular Node.js and pkg bundled environments
const getProjectRoot = () => {
  if ((process as any).pkg) {
    // In pkg bundled environment, use the directory containing the executable
    return dirname(process.execPath);
  }
  // In regular Node.js environment
  return join(dirname(fileURLToPath(import.meta.url)), '..');
};

run(process.argv.slice(2), getProjectRoot()).catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
