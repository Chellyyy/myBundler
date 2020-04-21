/**
 * Create by Chelly
 * 2020/4/21
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const minifyHTML = require('html-minifier').minify;
const babelMinify = require("babel-minify");
const CleanCSS = require('clean-css');
const cheerio = require('cheerio');
const crypto = require('crypto');
//ignore数组不读取，copy数组会读取但不做操作仅拷贝
const ignoreArray = ['dirname'];
const copyArray = ['dir', "filename"];
let mode = 'development'

const handleProject = (inputPath, outputPath) => {
    outputPath = outputPath + mode;
    debugger;
    if (fs.existsSync(outputPath)) {
        deleteAll(outputPath);
        fs.mkdir(outputPath, mkdirErr);
    } else {
        fs.mkdir(outputPath, mkdirErr)
    }
    const pathObj = readAllDirSync(inputPath, ignoreArray, copyArray);
    const dependencies = {};
    for(let i in pathObj["ignore"]){
        let oldPath = pathObj["ignore"][i];
        let filename = path.join(outputPath, oldPath.slice(oldPath.indexOf("\\")));
        if (mkdirsSync(path.parse(filename).dir)) {
            fs.copyFileSync(oldPath, filename);
            console.log(oldPath, '->', filename)
        }
    }
    handleDependencies(pathObj, dependencies, outputPath, 'js');
    handleDependencies(pathObj, dependencies, outputPath, 'css');
    for (let item in pathObj) {
        if (!(/js$|css$|ignore$/.test(item))) {
            let jsArray = pathObj[item];
            if (/html|htm/.test(item)) {
                for (let i in jsArray) {
                    console.log(jsArray[i], '->', htmlAnalyseScript(jsArray[i], dependencies, outputPath));
                }
            } else {
                for (let i in jsArray) {
                    let filePath = jsArray[i];
                    let dir = path.parse(filePath).dir;
                    let sourceDir = dir.slice(dir.indexOf("\\") > -1 ? dir.indexOf("\\") + 1 : dir.length);
                    let fileDir = path.join(outputPath, sourceDir);
                    let filename = path.join(fileDir, path.parse(filePath).base);
                    if (mkdirsSync(fileDir)) {
                        fs.copyFile(filePath, filename, () => {
                            console.log(filePath, '->', filename)
                    })
                    }
                }
            }
        }
    }
    let outInfo =
        "#bundle time:" + getDate();
    fs.writeFileSync(outputPath + '/README.md', outInfo);
};
/**
 * 根据不同文件类型处理文件
 * @param pathObj
 * @param dependencies
 * @param outputPath
 * @param type
 */
const handleDependencies = function (pathObj, dependencies, outputPath, type) {
    let jsArray = pathObj[type];
    for (let i in jsArray) {
        let scriptPath = fileAnalyser(jsArray[i], outputPath, type);
        dependencies[type] ? "" : dependencies[type] = {};
        dependencies[type][path.parse(jsArray[i]).base] = path.parse(scriptPath).base;
        console.log(jsArray[i], '->', scriptPath);
    }
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
}
;
const mkdirErr = (err) => {
    console.error(err)
}
;
/**
 * 循环读取相应目录下的文件
 * @param filePath
 * @param ignoreArray
 * @paran copyArray
 * @param pathObj
 * @returns {*}
 */
const readAllDirSync = (filePath, ignoreArray, copyArray, pathObj) => {
    pathObj = pathObj || {};
    const ignore = ignoreArray;
    let ig = false;
    ignore.forEach(item => {
        filePath.indexOf(item)>-1 ? ig = true : "";
});
    if(!ig){
        const files = fs.readdirSync(filePath);
        files.forEach(function (ele) {
            let info = fs.statSync(path.join(filePath, ele));
            if (info.isDirectory()) {
                return Object.assign(pathObj, readAllDirSync(path.join(filePath, ele), ignoreArray, copyArray, pathObj));
            } else {
                let newPath = path.join(filePath, ele);
                let ig = false;
                ignore.forEach(item => {
                    newPath.indexOf(item)>-1 ? ig = true : "";
            });
                if (!ig) {
                    let cp = false;
                    copyArray.forEach(item => {
                        newPath.indexOf(item)>-1 ? cp = true : "";
                });
                    let ext;
                    if(cp){
                        ext = "ignore"
                    }else{
                        ext = ele.slice(ele.lastIndexOf(".") + 1);
                    }
                    pathObj[ext] = pathObj[ext] || [];
                    pathObj[ext].push(newPath);
                }
            }


        });
    }

    return pathObj
};
/**
 * 修改html文件中的链接地址
 * @param filePath
 * @param dependencies
 * @param dirPath
 * @returns {string}
 */
const htmlAnalyseScript = (filePath, dependencies, dirPath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(content);
    const getScript = $('script');
    const scriptDependencies = dependencies['js'];
    const cssDependencies = dependencies['css'];
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
    if (fileType === 'js') {
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
    let nowName = path.parse(filePath).name + '.' + crypto.createHash('md5').update(writeCode).digest('hex') + (fileType === 'js' ? '.js' : '.css');
    let fileDir = path.join(dirPath, sourceDir);
    let filename = path.join(fileDir, nowName);
    if (mkdirsSync(fileDir)) {
        fs.writeFileSync(filename, writeCode);
        return filename
    }
}
;
/**
 * 循环创建目录
 * @param dirname
 * @returns {boolean}
 */
const mkdirsSync = (dirname) => {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}
;
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
/**
 * 循环拷贝目录及文件
 * @param path
 */
const copyAll = (inputPath, outputPath) => {
    if (fs.statSync(inputPath).isDirectory()) {
        let files = [];
        if (fs.existsSync(inputPath)) {
            files = fs.readdirSync(inputPath);
            files.forEach(function (file) {
                let curPath = path.join(inputPath, file);
                if (fs.statSync(curPath).isDirectory()) { // recurse
                    copyAll(curPath, outputPath);
                } else {
                    let filename = path.join(outputPath, curPath.slice(curPath.indexOf("\\")));
                    if (mkdirsSync(path.parse(filename).dir)) {
                        fs.copyFileSync(curPath, filename);
                        console.log(curPath, '->', filename)
                    }
                }
            });
        }
    } else {
        let filename = path.join(outputPath, inputPath.slice(inputPath.indexOf("\\")));
        if (mkdirsSync(path.parse(filename).dir)) {
            fs.copyFileSync(inputPath, filename);
            console.log(inputPath, '->', filename)
        }
    }
};
if (global.process.argv[2]) {
    mode = global.process.argv[2];
}
handleProject('./my_source', './my_');