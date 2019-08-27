/**
 * Create by Chelly
 * 2019/8/27
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const minifyHTML = require('html-minifier').minify;
const babelMinify = require("babel-minify");
const CleanCSS = require('clean-css');
const cheerio = require('cheerio');
const crypto = require('crypto');
let mode = 'development';
const handleProject = (inputPath, outputPath) => {
    outputPath = outputPath + mode;
    debugger;
    if (fs.existsSync(outputPath)) {
        deleteAll(outputPath);
        fs.mkdir(outputPath, mkdirErr);
    } else {
        fs.mkdir(outputPath, mkdirErr)
    }
    const cssArray = readRegDirSync(inputPath, /\.css$/);
    const cssDependencies = {};
    for (let i = 0; i < cssArray.length; i++) {
        let cssPath = fileAnalyser(cssArray[i], outputPath, 'css');
        cssDependencies[path.parse(cssArray[i]).base] = path.parse(cssPath).base;
        console.log(cssArray[i], '->', cssPath);
    }
    const jsArray = readRegDirSync(inputPath, /\.js$/);
    const jsDependencies = {};
    for (let i = 0; i < jsArray.length; i++) {
        let scriptPath = fileAnalyser(jsArray[i], outputPath, 'script');
        jsDependencies[path.parse(jsArray[i]).base] = path.parse(scriptPath).base;
        console.log(jsArray[i], '->', scriptPath);
    }
    let htmlArray = readRegDirSync(inputPath, /\.html|\.htm/);
    for (let j = 0; j < htmlArray.length; j++) {
        debugger;
        console.log(htmlArray[j], '->', htmlAnalyseScript(htmlArray[j], jsDependencies, cssDependencies, outputPath));
    }
    let outInfo =
        "#packageTime:" + getDate();
    fs.writeFileSync(outputPath+'/README.md', outInfo);
};
const getDate = () => {
    let time = new Date(),
        y = time.getFullYear(),
        m = time.getMonth() + 1,
        d = time.getDate(),
        h = time.getHours(),
        mm = time.getMinutes(),
        s = time.getSeconds();
    return y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d) + " "
        + (h < 10 ? "0" + h : h) + ":" + (mm < 10 ? "0" + mm : mm) + ":" + (s < 10 ? "0" + s : s)
};
const mkdirErr = (err) => {
    console.error(err)
};
/**
 * 循环读取相应目录下的文件
 * @param filePath
 * @param reg
 * @param pathArray
 * @returns {*}
 */
const readRegDirSync = (filePath, reg, pathArray) => {
    const pa = fs.readdirSync(filePath);
    if (!pathArray) {
        pathArray = [];
    }
    pa.forEach(function (ele) {
        let info = fs.statSync(path.join(filePath, ele));
        if (info.isDirectory()) {
            return pathArray.concat(readRegDirSync(path.join(filePath, ele), reg, pathArray));
        } else {
            let newPath = path.join(filePath, ele);
            // reg.compile(reg);
            if (reg.test(ele)) {
                pathArray.push(newPath);
            }
        }
    });
    return pathArray
};
/**
 * 修改html文件中的链接地址
 * @param filePath
 * @param scriptDependencies
 * @param cssDependencies
 * @param dirPath
 * @returns {string}
 */
const htmlAnalyseScript = (filePath, scriptDependencies, cssDependencies, dirPath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(content);
    const getScript = $('script');
    for (let i = 0; i < getScript.length; i++) {
        if (getScript[i].attribs.src) {
            let pathIndex = getScript[i].attribs.src.lastIndexOf("/") + 1;
            let prePath = getScript[i].attribs.src.slice(0, pathIndex);
            let scriptPath = getScript[i].attribs.src.slice(pathIndex);
            let scriptKey = Object.keys(scriptDependencies);
            let scriptIndex = scriptKey.indexOf(scriptPath);
            if (scriptIndex > -1) {
                $(getScript[i]).attr('src', prePath + scriptDependencies[scriptPath])
                // $(getScript[i]).attr('src', scriptDependencies[scriptPath])
            }
        }
    }
    const getCSS = $('link');
    for (let i = 0; i < getCSS.length; i++) {
        if (getCSS[i].attribs.href) {
            let pathIndex = getCSS[i].attribs.href.lastIndexOf("/") + 1;
            let prePath = getCSS[i].attribs.href.slice(0, pathIndex);
            let cssPath = getCSS[i].attribs.href.slice(pathIndex);
            let cssKey = Object.keys(cssDependencies);
            let cssIndex = cssKey.indexOf(cssPath);
            if (cssIndex > -1) {
                $(getCSS[i]).attr('href', prePath + cssDependencies[cssPath])
                // $(getScript[i]).attr('src', scriptDependencies[scriptPath])
            }
        }
    }
    let dir = path.parse(filePath).dir;
    let sourceDir = dir.slice(dir.indexOf("\\") > -1 ? dir.indexOf("\\") + 1 : dir.length);
    let fileDir = path.join(dirPath, sourceDir);
    let filename = path.join(fileDir, path.parse(filePath).base);
    if (mkdirsSync(fileDir)) {
        fs.writeFileSync(filename, minifyHTML($.html(), {
            removeComments: true,
            collapseWhitespace: true,
            minifyCSS: true
        }));
        return filename
    }
};
const getScript = (filename) => {
    const content = fs.readFileSync(filename, 'utf-8');
    return content
};
/**
 * 分析文件并对其进行相应操作
 * @param filePath
 * @param dirPath
 * @param fileType
 * @returns {string}
 */
const fileAnalyser = (filePath, dirPath, fileType) => {
    let fileContent = getScript(filePath);
    let writeCode;
    if (fileType === 'script') {
        fileContent = babel.transformSync(fileContent, {
            presets: ["@babel/preset-env"]
        }).code;
        if (mode === 'production') {
            const {code} = babelMinify(fileContent, {
                mangle: {
                    keepClassName: true
                }
            });
            writeCode = code;
        } else if (mode === 'development') {
            writeCode = fileContent;
        }
    } else if (fileType === 'css') {
        if (mode === 'production') {
            writeCode = new CleanCSS({}).minify(fileContent).styles;
        } else if (mode === 'development') {
            writeCode = fileContent;
        }
    }
    let dir = path.parse(filePath).dir;
    let sourceDir = dir.slice(dir.indexOf("\\") + 1);
    let nowName = path.parse(filePath).name + '.' + crypto.createHash('md5').update(writeCode).digest('hex') + (fileType === 'script' ? '.js' : '.css');
    let fileDir = path.join(dirPath, sourceDir);
    let filename = path.join(fileDir, nowName);
    if (mkdirsSync(fileDir)) {
        fs.writeFileSync(filename, writeCode);
        return filename
    }
};
/**
 * 循环创建目录
 * @param dirname
 * @returns {boolean}
 */
const mkdirsSync = (dirname) => {
    //console.log(dirname);
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
};
/**
 * 循环删除目录及文件
 * @param path
 */
const deleteAll = (path) => {
    let files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function (file) {
            let curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) { // recurse
                deleteAll(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};
mode = global.process.argv[2];
handleProject('./my_source', './my_');