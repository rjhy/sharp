'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const semver = require('semver');
const platform = require('./platform');

const env = process.env;
const minimumLibvipsVersionLabelled = env.npm_package_config_libvips || /* istanbul ignore next */
  require('../package.json').config.libvips;
const minimumLibvipsVersion = semver.coerce(minimumLibvipsVersionLabelled).version;

const spawnSyncOptions = {
  encoding: 'utf8',
  shell: true
};

const mkdirSync = function (dirPath) {
  try {
    fs.mkdirSync(dirPath);
  } catch (err) {
    /* istanbul ignore if */
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
};

const cachePath = function () {
  const npmCachePath = env.npm_config_cache || /* istanbul ignore next */
    (env.APPDATA ? path.join(env.APPDATA, 'npm-cache') : path.join(os.homedir(), '.npm'));
  mkdirSync(npmCachePath);
  const libvipsCachePath = path.join(npmCachePath, '_libvips');
  mkdirSync(libvipsCachePath);
  return libvipsCachePath;
};

const globalLibvipsVersion = function () {
  if (process.platform !== 'win32') {
    const globalLibvipsVersion = spawnSync(`PKG_CONFIG_PATH="${pkgConfigPath()}" pkg-config --modversion vips-cpp`, spawnSyncOptions).stdout || '';
    return globalLibvipsVersion.trim();
  } else {
    return '';
  }
};

const hasVendoredLibvips = function () {
  const currentPlatformId = platform();
  const vendorPath = path.join(__dirname, '..', 'vendor');
  let vendorVersionId;
  let vendorPlatformId;
  try {
    vendorVersionId = require(path.join(vendorPath, 'versions.json')).vips;
    vendorPlatformId = require(path.join(vendorPath, 'platform.json'));
  } catch (err) {}
  /* istanbul ignore if */
  if (vendorVersionId && vendorVersionId !== minimumLibvipsVersion) {
    throw new Error(`Found vendored libvips v${vendorVersionId} but require v${minimumLibvipsVersion}. Please remove the 'node_modules/sharp/vendor' directory and run 'npm install'.`);
  }
  /* istanbul ignore else */
  if (vendorPlatformId) {
    /* istanbul ignore else */
    if (currentPlatformId === vendorPlatformId) {
      return true;
    } else {
      throw new Error(`'${vendorPlatformId}' binaries cannot be used on the '${currentPlatformId}' platform. Please remove the 'node_modules/sharp' directory and run 'npm install' on the '${currentPlatformId}' platform.`);
    }
  } else {
    return false;
  }
};

const pkgConfigPath = function () {
  if (process.platform !== 'win32') {
    const brewPkgConfigPath = spawnSync('which brew >/dev/null 2>&1 && eval $(brew --env) && echo $PKG_CONFIG_LIBDIR', spawnSyncOptions).stdout || '';
    return [brewPkgConfigPath.trim(), env.PKG_CONFIG_PATH, '/usr/local/lib/pkgconfig', '/usr/lib/pkgconfig']
      .filter(function (p) { return !!p; })
      .join(':');
  } else {
    return '';
  }
};

const useGlobalLibvips = function () {
  if (Boolean(env.SHARP_IGNORE_GLOBAL_LIBVIPS) === true) {
    return false;
  }

  const globalVipsVersion = globalLibvipsVersion();
  return !!globalVipsVersion && /* istanbul ignore next */
    semver.gte(globalVipsVersion, minimumLibvipsVersion);
};

module.exports = {
  minimumLibvipsVersion,
  minimumLibvipsVersionLabelled,
  cachePath,
  globalLibvipsVersion,
  hasVendoredLibvips,
  pkgConfigPath,
  useGlobalLibvips,
  mkdirSync
};
