"use strict";

const semver = require("semver");
const colors = require("colors/safe");
const log = require("@ch-cli-dev/log");
const LOWEST_NODE_VERSION = "12.0.0";

class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error("参数不能为空 !");
    }
    if (!Array.isArray(argv)) {
      throw new Error("参数必须为数组!");
    }
    this._argv = argv;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => {
        this.checkNodeVersion();
      });
      chain = chain.then(() => {
        this.initArgs();
      });
      chain = chain.then(() => {
        this.init(); // 父类引用指向子类,普通方法相同时使用的是子类的方法
      });
      chain = chain.then(() => {
        this.exec();
      });
      chain.catch((e) => {
        log.error(e.message);
      });
    });
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }

  checkNodeVersion() {
    // 第一步,获取当前node版本号
    // 第二部,比对最低版本号
    const currentVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    // semver 比对版本号 gte大于或者等于
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(
        colors.red(`ch-cli 需要安装 v${lowestVersion} 以上版本的node`)
      );
    }
  }

  init() {
    throw new Error("init必须实现！");
  }

  exec() {
    throw new Error("exec必须实现！");
  }
}

module.exports = Command;
