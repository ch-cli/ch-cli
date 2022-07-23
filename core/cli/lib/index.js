"use strict";

const path = require("path");
const semver = require("semver");
const colors = require("colors/safe");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const commander = require("commander");

// require 加载资源类型 .js/ .json /.node
// .js > module.exports/exports
// .json > JSON.parse
// .node > C++ process.dlopen
// 其他文件 > 会用js引擎来解析
const pkg = require("../package.json");
const log = require("@ch-cli-dev/log");
const init = require("@ch-cli-dev/init");
const exec = require("@ch-cli-dev/exec");

const constant = require("./const");

const program = new commander.Command();

async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error(e.message);
    if (program.debug) {
      console.log(e);
    }
  }
}

async function prepare() {
  checkPkgVersion();
  // checkNodeVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

// 检查版本是否需要全局更新
async function checkGlobalUpdate() {
  // 1.获取当前版本号
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 2.调用npm API,获取所有的版本号
  const { getNmpSemverVersion } = require("@ch-cli-dev/get-npm-info");
  // TODO: test
  // const newVersion = await getNmpSemverVersion(
  //   currentVersion,
  //   "@imooc-cli/core"
  // );
  const newVersion = await getNmpSemverVersion(currentVersion, npmName);
  // console.log(newVersion, "===data");
  // 3.提取所有版本号,对比那些版本号大于当前版本号
  // 4.获取最新版本号,提示用户更新到该版本
  if (newVersion && semver.gt(newVersion, currentVersion)) {
    log.warn(
      `更新提示:`,
      colors.yellow(
        `请手动更新到${newVersion},当前版本:${currentVersion},最新版本:${newVersion} 更新命令: npm install -g ${npmName}`
      )
    );
  }
}

// 配置环境变量
function checkEnv() {
  // 加载环境变量配置
  const dotenv = require("dotenv");
  const dotenvPath = path.resolve(userHome, ".env");
  // 本地目录Users/chenhuan/.env有环境变量
  if (pathExists(dotenvPath)) {
    // 加载环境变量从.env中
    dotenv.config({
      path: dotenvPath,
    });
  }
  createDefaultConfig();
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig["cliHome"] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig["cliHome"] = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

// function checkoutInputArgs() {
//   // parse argument options
//   const minimist = require("minimist");
//   args = minimist(process.argv.slice(2));
//   // console.log(args);
//   checkArgs();
// }

// // 检查入参
// function checkArgs() {
//   if (args.debug) {
//     process.env.LOG_LEVELE = "verbose";
//   } else {
//     process.env.LOG_LEVELE = "info";
//   }
//   log.level = process.env.LOG_LEVELE;
// }

// 判断用户主目录,没有用户主目录 缓存这些都做不了
function checkUserHome() {
  // pathExists 当前文件是否存在
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red(`当前用户主目录不存在`));
  }
}

// 检查root启动
// root创建文件的话 就是root账户, 普通用户没法修改, 甚至有读写权限的话 各种权限会报错
function checkRoot() {
  // console.log(process.geteuid()); // sudu 0
  // root-check 检查是否是sudo启动, 降级权限
  const rootCheck = require("root-check");
  rootCheck();
}

// 为啥要检查呢? 因为node api低版本是不支持的
function checkNodeVersion() {
  // 第一步,获取当前node版本号
  // 第二部,比对最低版本号
  const currentVersion = process.version;
  const lowestVersion = constant.LOWWEST_NODE_VERSION;

  // semver 比对版本号 gte大于或者等于
  if (!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(
      colors.red(`ch-cli 需要安装 v${lowestVersion} 以上版本的node`)
    );
  }
}

function checkPkgVersion() {
  log.notice("cli", pkg.version);
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <path>", "是否指定本地调试文件路径", "");

  program
    .command("init [projectName]")
    .description("创建一个新项目")
    .option("-f, --force", "是否强制创建项目")
    .action(exec);

  program.on("option:debug", function (value) {
    if (program.debug) {
      process.env.LOG_LEVELE = "verbose";
    } else {
      process.env.LOG_LEVELE = "info";
    }
    log.level = process.env.LOG_LEVELE;
  });

  program.on("option:targetPath", function () {
    if (program.targetPath) {
      process.env.CLI_TARGET_PATH = program.targetPath;
    }
  });

  program.on("command:*", function (command) {
    log.error(`命令 ${command} 不存在`);
    const availableCommands = program.commands.map((cmd) => cmd.name);
    if (availableCommands.length > 0) {
      console.log(`可用命令: ${availableCommands.join(", ")}`);
    }
  });

  program.parse(process.argv);

  if (program.args && program.args.length < 1) {
    program.outputHelp();
    console.log();
  }
}

module.exports = core;
