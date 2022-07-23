"use strict";

const path = require("path");

module.exports = function formatPath(p) {
  if (p && typeof p === "string") {
    const sep = path.sep;
    //separate 分隔符
    // mac:  /  window: \ 统一转换成/
    if (sep === "/") {
      return p;
    } else {
      return p.replace(/\\/g, "/");
    }
  }
  return p;
};
