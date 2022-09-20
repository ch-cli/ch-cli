"use strict";

const pkgDir = require("pkg-dir");
const path = require("path");
const fse = require("fs-extra");
const npminstall = require("npminstall");
const pathExists = require("path-exists").sync;
const { isObject } = require("@ch-cli-dev/utils");
const formatPath = require("@ch-cli-dev/format-path");
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require("@ch-cli-dev/get-npm-info");

class Package {
  constructor(options) {
    if (!options) {
      throw new Error("Package类的options参数不能为空！");
    }
    if (!isObject(options)) {
      throw new Error("Package类的options参数必须为对象！");
    }
    // package的目标路径
    this.targetPath = options.targetPath;
    // 缓存package的路径
    this.storeDir = options.storeDir;
    // package的name
    this.packageName = options.packageName;
    // package的version
    this.packageVersion = options.packageVersion;
    // package的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace("/", "_");
  }

  // 查路径的时候需要具体到版本号
  async prepare() {
    // 先把文件夹创建出来
    if (this.storeDir && !pathExists(this.storeDir)) {
      // mkdir创建一个目录 mkdirp路径上没创建目录的所有创建好
      fse.mkdirpSync(this.storeDir);
    }
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
    // console.log(this.packageVersion);
    // _@imooc-cli_init@1.1.3@@imooc-cli // 目标地址
    // @imooc-cli/init 1.1.3 // 包名 转成目标路径
  }

  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
    );
  }

  // 判断当前Package是否存在
  async exists() {
    // 缓存模式
    if (this.storeDir) {
      await this.prepare();
      // console.log(this.cacheFilePath, "==this.cacheFilePath");
      return pathExists(this.cacheFilePath);
    } else {
      return pathExists(this.targetPath);
    }
  }
  // 安装package
  async install() {
    await this.prepare();
    return npminstall({
      root: this.targetPath, // 模块路径
      storeDir: this.storeDir, // 实际存储目录
      registry: getDefaultRegistry(true),
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    });
  }
  // 更新package
  async update() {
    // 1.获取最新的npm模块
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // console.log(latestPackageVersion, "==latestPackageVersion");
    // 2.查询最新版本对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 如果不存在则安装最新版本
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath, // 模块路径
        storeDir: this.storeDir, // 实际存储目录
        registry: getDefaultRegistry(true),
        pkgs: [{ name: this.packageName, version: latestPackageVersion }],
      });
      this.packageVersion = latestPackageVersion;
    } else {
      this.packageVersion = latestPackageVersion;
    }
  }

  // 获取入口文件的路径
  // 1.获取package.json所在目录 = pkg-dir
  // 2.读取package.json文件 - require()
  // 3.main/lib -path
  // 4,路径兼容处理
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 1. 获取package.json所在目录
      const dir = pkgDir.sync(targetPath);
      // console.log(dir, "==dir");
      if (dir) {
        // 2. 读取package.json
        const pkgFile = require(path.resolve(dir, "package.json"));
        // console.log(pkgFile, "===pkgFile");
        // 3.package.json main字段 > 寻找main/lib
        if (pkgFile && pkgFile.main) {
          // 4. 路径的兼容(macOS/windows)
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }
    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    } else {
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;
