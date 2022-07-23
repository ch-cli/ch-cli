"use strict";

function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

function spinnerStart(msg = "processing..", spinnerString = "|/-\\") {
  const Spinner = require("cli-spinner").Spinner;
  const spinner = new Spinner(msg + " %s");
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

function exec(command, args, options = {}) {
  // window 和 mac执行是不同的
  const win32 = process.platform === "win32";
  const cmd = win32 ? `cmd` : command;
  // /c表示静默执行
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
  return require("child_process").spawn(cmd, cmdArgs, options);
}

function exec(command, args, options = {}) {
  // window 和 mac执行是不同的
  const win32 = process.platform === "win32";
  const cmd = win32 ? `cmd` : command;
  // /c表示静默执行
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
  return require("child_process").spawn(cmd, cmdArgs, options);
}

function execAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options);
    p.on("error", (e) => {
      reject(e);
    });
    p.on("exit", (c) => {
      resolve(c);
    });
  });
}

module.exports = {
  isObject,
  sleep,
  spinnerStart,
  exec,
  execAsync,
};
