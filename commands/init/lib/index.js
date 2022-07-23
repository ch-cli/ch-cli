"use strict";

const fs = require("fs");
const path = require("path");
const semver = require("semver");
const fse = require("fs-extra");
const inquirer = require("inquirer"); // inquirer库 命令交互
const userHome = require("user-home");
const glob = require("glob");
const ejs = require("ejs");
const Command = require("@ch-cli-dev/command");
const Package = require("@ch-cli-dev/package");
const log = require("@ch-cli-dev/log");
const { spinnerStart, sleep, execAsync } = require("@ch-cli-dev/utils");

const getProjectTemplate = require("./getProjectTemplate");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";

const WHITE_COMMAND = ["npm", "cnpm"];

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  // console.log("init 业务逻辑");
  async exec() {
    try {
      const projectInfo = await this.prepare();
      if (projectInfo) {
        log.verbose("projectInfo", projectInfo);
        this.projectInfo = projectInfo;
        // 2. 下载模板
        await this.downloadTemplate();
        // 3. 安装模板
        await this.installTemplate();
      }
    } catch (e) {
      log.error(e.message);
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(11111);
        console.log(e);
      }
    }
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 标准安装
        await this.installCustomTemplate();
      } else {
        throw new Error("无法识别项目模板类型");
      }
    } else {
      throw new Error("项目模板信息不存在！");
    }
  }

  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  async execCommand(command, message) {
    let ret;
    if (command) {
      const cmdArr = command.split(" ");
      const cmd = this.checkCommand(cmdArr[0]);
      if (!cmd) {
        throw new Error("命令不存在！命令：" + command);
      }
      const args = cmdArr.slice(1);
      ret = await execAsync(cmd, args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    }
    if (ret !== 0) {
      throw new Error(message);
    }
    return ret;
  }

  // 模板渲染
  async ejsRender(options) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;
    return new Promise((resolve, reject) => {
      glob(
        "**",
        {
          cwd: dir,
          ignore: options.ignore,
          nodir: true,
        },
        (err, files) => {
          if (err) {
            reject();
          }

          Promise.all(
            files.map((file) => {
              const filePath = path.resolve(dir, file);

              return new Promise((resolve1, reject1) => {
                ejs.renderFile(filePath, projectInfo, (err, str) => {
                  if (err) {
                    reject1(err);
                  } else {
                    // 拿到结果后重新写入
                    fse.writeFileSync(filePath, str);
                    resolve1(str);
                  }
                });
              });
            })
          )
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        }
      );
    });
  }

  // 安装标准模板
  async installNormalTemplate() {
    log.verbose("templateNpm", this.templateNpm);
    // 拿到当前缓存目录路径
    // console.log(this.templateNpm.cacheFilePath);
    let spinner = spinnerStart("正在安装模板...");
    await sleep();
    try {
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath,
        "template"
      );
      const targetPath = process.cwd(); // 拿到当前目录
      fse.ensureDirSync(templatePath); // 确保文件夹存在 如果不存在会去创建
      fse.ensureDirSync(targetPath); // 确保文件夹存在 如果不存在会去创建
      // 拷贝模板代码至当前目录
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      spinner.stop();
      log.success("模板安装成功");
    }
    const ignore = ["node_modules/**", "public/**"];
    // 模板替换渲染
    await this.ejsRender({ ignore });
    // 依赖安装
    const { installCommand, startCommand } = this.templateInfo;
    await this.execCommand(installCommand, "依赖安装过程失败!");
    await this.execCommand(startCommand, "启动执行命令失败！!");
  }

  // 安装自定义模板
  async installCustomTemplate() {}

  async downloadTemplate() {
    // console.log(this.projectInfo, this.template);
    // 1.通过项目模板API获取项目模板地址
    // 1.1 通过egg.js搭建一套后端系统
    // 1.2 通过npm 存储项目模板(vue-cli/vue-element-admin)
    // 1.3 将项目模板信息存储到mongodb数据库中
    // 1.4 通过egg.js获取mongodb中的数据并且通过API返回
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (ele) => ele.npmName === projectTemplate
    );
    const targetPath = path.resolve(userHome, ".ch-cli-dev", "template");
    const storeDir = path.resolve(
      userHome,
      ".ch-cli-dev",
      "template",
      "node_modules"
    );

    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });

    if (!(await templateNpm.exists())) {
      await sleep();
      const spinner = spinnerStart("正在下载模板...");
      try {
        await templateNpm.install();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          this.templateNpm = templateNpm;
          log.success("模板下载成功");
        }
      }
    } else {
      const spinner = spinnerStart("正在更新模板...");
      await sleep();
      try {
        await templateNpm.update();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          this.templateNpm = templateNpm;
          log.success("模板更新成功");
        }
      }
    }
  }

  async prepare() {
    // 0.判断项目模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error("项目模板不存在");
    }
    this.template = template;
    const localCwdPath = process.cwd(); // 拿到当前执行目录2种方式 process.cwd  / path.resolve(.)
    // 1.判断当前目录是否为空  > false 不为空 true为空
    if (!this.isDirEmpty(localCwdPath)) {
      let ifContinue = false;
      if (!this.force) {
        ifContinue = (
          await inquirer.prompt({
            type: "confirm",
            name: "ifContinue",
            default: false,
            message: "当前文件夹不为空,是否继续创建项目",
          })
        ).ifContinue;
        if (!ifContinue) {
          return;
        }
      }
      // 2. 是否启动强制更新
      if (ifContinue || this.force) {
        // 2次确认
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "是否确认清空当前目录",
        });
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localCwdPath);
        }
      }
    }
    // return 项目的基本信息(object)
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    function isValidName(v) {
      // 1.输入的首字符必须为英文字符
      // 2.尾字符必须为英文或数字,不能为字符
      // 3.字符仅允许"-_"
      // \w=a-zA-Z0-9
      // + 一个或多个
      // * 0次到多次
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
        v
      );
    }
    let projectInfo = {};
    // 3. 选择创建项目或者组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        {
          name: "项目",
          value: TYPE_PROJECT,
        },
        {
          name: "组件",
          value: TYPE_COMPONENT,
        },
      ],
    });
    log.verbose("type", type);
    if (type === TYPE_PROJECT) {
      let isProjectNameValid = false;
      if (isValidName(this.projectName)) {
        isProjectNameValid = true;
        projectInfo.projectName = this.projectName;
      }

      const projectNamePrompt = {
        type: "input",
        name: "projectName",
        message: "请输入项目名称",
        default: "",
        validate: function (v) {
          const done = this.async();
          setTimeout(function () {
            if (!isValidName(v)) {
              done(`请输入合法的名称`);
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: function (v) {
          return v;
        },
      };
      const projectPrompt = [];
      if (!isProjectNameValid) {
        projectPrompt.push(projectNamePrompt);
      }
      projectPrompt.push(
        {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号",
          default: "1.0.0",
          validate: function (v) {
            const done = this.async();
            setTimeout(function () {
              // semver.valid(v)错误的话返回null
              if (!!!semver.valid(v)) {
                done(`请输入合法版本号`);
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: function (v) {
            if (!!semver.valid(v)) {
              return semver.valid(v);
            } else {
              return v;
            }
          },
        },
        {
          type: "list",
          name: "projectTemplate",
          message: "请选择项目模板",
          choices: this.createTemplate(),
        }
      );
      // 4. 获取项目的基本信息
      const project = await inquirer.prompt(projectPrompt);

      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
    }

    // 项目名称转换  AbcEfg => abc-efg, package.json中的name 不能大写
    if (projectInfo.projectName) {
      projectInfo.className = require("kebab-case")(
        projectInfo.projectName
      ).replace(/^-/, "");
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    return projectInfo;
  }

  isDirEmpty(localCwdPath) {
    let fileList = fs.readdirSync(localCwdPath);
    // 文件过滤
    fileList = fileList.filter((ele) => {
      return !ele.startsWith(".") && !["node_modules"].includes(ele);
    });
    return !fileList || fileList.length <= 0;
  }

  createTemplate() {
    return this.template.map((ele) => ({
      name: ele.name,
      value: ele.npmName,
    }));
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
