"use strict";

const path = require("path");
const Package = require("@ch-cli-dev/package");
const log = require("@ch-cli-dev/log");
const cp = require("child_process");
const { exec: spawn } = require("@ch-cli-dev/utils");

const SETTINGS = {
  // init: "@ch-cli-dev/init",
  init: "@imooc-cli/init", // test
};

const CACHE_DIR = "dependencies";

// 1.targetPath > modulePath
// 2.modulePath > Package(npm模块)

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = "";
  let pkg = "";
  log.verbose(`targetPath: ${targetPath}`);
  log.verbose(`homePath: ${homePath}`);

  // console.log(arguments, "exec 是在program action中执行的,当前执行的命令是projectName, 和command object");
  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name(); // 拿到command的名称
  const packageName = SETTINGS[cmdName];
  const packageVersion = "latest"; // 最新版本

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR);
    // 生成缓存路径
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose(`targetPath: ${targetPath}`);
    log.verbose(`storeDir: ${storeDir}`);

    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });
    if (await pkg.exists()) {
      // 更新package
      await pkg.update();
    } else {
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const rootFile = pkg.getRootFilePath();
  // console.log(rootFile, "===rootFile");
  if (rootFile) {
    try {
      // 当前进程中使用
      // require(rootFile).call(null, Array.from(arguments));
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const obj = Object.create(null);
      Object.keys(cmd).forEach((key) => {
        if (
          cmd.hasOwnProperty(key) &&
          !key.startsWith("_") &&
          key !== "parent"
        ) {
          obj[key] = cmd[key];
        }
      });
      args[args.length - 1] = obj;

      // console.log(args, "===args");
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
      // const code = `console.log(1)`;  code = "console.log(1)" > node -e "console.log(1)"
      const child = spawn("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      child.on("error", (e) => {
        // exit code 1 表示程序执行执行过程中遇到了某些问题或者错误，非正常退出
        log.error(e.message);
        process.exit(1);
      });
      child.on("exit", (e) => {
        // exit code 0 表示程序执行成功，正常退出
        log.verbose("命令执行成功:" + e);
        process.exit(e);
      });
    } catch (e) {
      log.error(e.message);
    }
  }
}

module.exports = exec;
