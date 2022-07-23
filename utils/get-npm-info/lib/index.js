"use strict";

const axios = require("axios");
const semver = require("semver"); // 比对版本号
const urlJoin = require("url-join");

function getNpmInfo(npmName, registry) {
  //   console.log(npmName);
  if (!npmName) return null;
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  // console.log(npmInfoUrl);
  return axios
    .get(npmInfoUrl)
    .then((res) => {
      if (res.status === 200) {
        return res.data;
      } else {
        return null;
      }
    })
    .catch((err) => {
      Promise.reject(err);
    });
}

function getDefaultRegistry(isOrigin = false) {
  const registry = isOrigin
    ? "https://registry.npmjs.org/"
    : "https://registry.npm.taobao.org/";
  return registry;
}

async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  } else {
    return [];
  }
}

function getSemverVersions(baseVersion, versions) {
  // satisfies 满足条件 对比版本号
  // const versionsArr = versions.filter((ele) =>
  //   semver.satisfies(ele, `^${baseVersion}`)
  // );
  // let maxVersion = versionsArr[0] || null;
  // if (maxVersion) {
  //   versionsArr.forEach((ele) => {
  //     // 大于
  //     if (semver.gt(ele, maxVersion)) {
  //       maxVersion = ele;
  //     }
  //   });
  // }
  // return maxVersion;

  // 方式二
  const versionsArr = versions
    .filter((ele) => semver.satisfies(ele, `>${baseVersion}`))
    .sort((a, b) => (semver.gt(b, a) ? 1 : -1));
  if (versionsArr && versionsArr.length > 0) {
    return versionsArr[0];
  }
  return null;
}

async function getNmpSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersions = getSemverVersions(baseVersion, versions);
  return newVersions;
}

async function getNpmLatestVersion(npmName, registry) {
  const version = await getNpmVersions(npmName, registry);
  if (version) {
    return version.sort((a, b) => (semver.gt(b, a) ? 1 : -1))[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNmpSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion,
};
