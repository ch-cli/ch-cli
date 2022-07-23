"use strict";

const log = require("npmlog");
// 等级 判断debug模式
log.level = process.env.LOG_LEVELE ? process.env.LOG_LEVELE : "info";
// 修改前缀
log.heading = "ch";
log.headingStyle = { fg: "red", bg: "white" };
// 添加自定义颜色
log.addLevel("success", 2000, { fg: "green", bold: true });

module.exports = log;
