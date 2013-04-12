var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var args = process.argv; //获取命令行参数
var exportPath = '../../../../ued_doc' //文档导出目录
var sassPath = '../';                  //sass目录

//=======文档类语法识别正则
var h1 = /(\/=)[^\=]+(=\/)/;                            //一级标题
var h2 = /(\/==)[^\=]+(\/==)/;                          //二级标题
var centerTextReg = /(\/c)[^\=]+(c\/)/;                 //文字居中
var pReg = /^(\s+)(?!\s)/;
//=======文档类语法识别正则 end
  




//=======sass文档语法识别正则
var mixinReg    = /@mixin[^{]+/;                        //识别mixin
var funReg      = /@function[^{]+/;                     //识别function
var noteReg     = /\/\/=\s(?=[^@])/;                    //识别mixin注释
var funNoteReg  = /\/\/==\s(?=[^@])/;                   //识别function注释
var variableReg = /\$[^:|,|\)|\s|;]+(?=:|,|\)|\s|;)/g;  //识别变量
var paramReg    = /\/\/=+\s@param/;                     //识别变量说明
var returnReg   = /\/\/=+\s@return/;                    //识别返回值说明
var fileNoteReg = /\/\/@descrip/;                       //识别文件说明
//=======sass文档语法识别正则 end
var endHtml  = ''; //记录解析后sass代码
var menuHtml = ''; //记录生成的sass菜单代码
  
//===========命令参数解析
switch(args[2]){
    case '-sass':
        compiledSass(fs.readdirSync(sassPath),sassPath); //编译开始
        fs.writeFileSync(path.join(exportPath,'app/views/sass/menu.html'),menuHtml);
        break
    default:
        compiledDoc(args[2]);
}
return;
  

function compiledDoc(file){
    console.log('parse '+path.basename(file)+'...');
    var docHtml = '<div class="doc-box">';
    var lines = fs.readFileSync(file).toString('utf8').split('\n');
    for(var i = 0;i<lines.length;i++){
        var line = lines[i];
        checkLine(line);
    }
    function checkLine(line){
        var h1Tag = line.match(h1)
            var centerText = line.match(centerTextReg)
            var p = line.match(pReg)
            if(centerText){
                line = line.replace(/\/c/,'<div class="t-center">');
                line = line.replace(/c\//,'</div>');
                docHtml += line;
            }else if(h1Tag){
                line = line.replace(/\/=/,'<div class="doc-title">');
                line = line.replace(/=\//,'</div>');
                docHtml += line;
            }else if(p){
                line = line.replace(/\</g,'&lt;');
                line = line.replace(/\>/g,'&gt;');
                line = line.replace(pReg,'');
                line = line.replace(line,'<p class="p'+p[0].length+'">$&</p>');
                docHtml += line;
            }else{
                line = line.replace(/\</g,'&lt;');
                line = line.replace(/\>/g,'&gt;');
                line = line.replace(pReg,'');
                line = line.replace(line,'<p class="p0">$&</p>');
                docHtml += line;
            }
    }
    docHtml += '</div>';
    if(args[3]){
        var exportFile = args[3]; //输出文档名;
    }else{
        var exportFile = path.basename(args[2],path.extname(args[2])); //输出文档名;
    }
    fs.writeFileSync(path.join(exportPath,'app/views/doc/'+exportFile),docHtml);
    console.log('ok!');
}

function compiledSass(files,basePath){
    for(var i = 0;i<files.length;i++){
        var file = files[i];
        filePath = path.join(basePath,file);
        if(fs.statSync(filePath).isDirectory() && !/^\./.test(file)){
            //判断如果子元素是文件夹则进行递归
            compiledSass(fs.readdirSync(filePath),filePath);
        }else if(fs.statSync(filePath).isFile() && /\.scss$/.test(file) && !/old/.test(file)){
            console.log('parse '+path.basename(filePath)+'...');
            var data = fs.readFileSync(filePath); //读出的文件内容，为提高性能采用二进制的buffer形式
            var fileName = file.match(/(?!_)[^.]+(?=\.)/)[0];
            endHtml += '<div class="main-inner"><div class="file-block"><h2 class="file-name">文件名：'+file+'</h2>'
            menuHtml += '<%link href=\'sass/api/'+fileName+'\' class=\'menu-level1\' label=\''+fileName+'\'%>';
            if(Buffer.isBuffer(data)){
                var dataArr = data.toString('utf8').split('\n');
                var mixinNote = '';
                var paramStr = '';
                var returnStr = '';
                for(var k = 0;k < dataArr.length;k++){
                    var fileNote   = dataArr[k].match(fileNoteReg); //提取文件说明
                    var mixin      = dataArr[k].match(mixinReg);    //提取mixin
                    var funNote    = dataArr[k].match(funNoteReg);  //提取function说明
                    var note       = dataArr[k].match(noteReg);     //提取mixin说明
                    var fun        = dataArr[k].match(funReg);      //提取function
                    var paramInfo  = dataArr[k].match(paramReg);    //提取变量说明
                    var returnInfo = dataArr[k].match(returnReg);   //提取返回值说明

                    if(fileNote){
                        var tmp = fileNote.input;
                        tmp = tmp.replace(fileNoteReg,'文件说明');
                        endHtml += '<div class="file-info"><div class="info-inner">'+tmp+'</div></div>'
                    }else if(note){
                        var tmp = note.input;
                        tmp = tmp.replace('//=','');
                        tmp = tmp.replace(/\</g,'&lt;');
                        tmp = tmp.replace(/\>/g,'&gt;');
                        mixinNote += '<h3 class="mixin-name">';
                        mixinNote += tmp;
                        mixinNote += '</h3>';
                    }else if(funNote){
                        var tmp = funNote.input;
                        tmp = tmp.replace('//==','');
                        tmp = tmp.replace(/\</g,'&lt;');
                        tmp = tmp.replace(/\>/g,'&gt;');
                        mixinNote += '<h3 class="function-name">';
                        mixinNote += tmp;
                        mixinNote += '</h3>';
                    }else if(paramInfo){
                        paramInfo.input = paramInfo.input.replace(/\/\/.+@param/g,'参数');
                        paramStr += '<div class="prama-info">' + paramInfo.input + '</div>';
                    }else if(returnInfo){
                        returnInfo.input = returnInfo.input.replace(/\/\/.+@return/g,'返回值');
                        returnStr += '<div class="return-info">' + returnInfo.input + '</div>';
                    }else if(mixin){
                        var mixinName = mixin[0].match(/(@mixin\s)([^\(]+)(?=\()/)[2];
                        menuHtml += '<%link href=\'sass/api/'+fileName+'#'+mixinName+'\' class=\'menu-item\' label=\'<span class="code-tag mixin-tag">mixin</span>'+mixinName+'\'%>';
                        mixin[0] = mixin[0].replace(variableReg,'<span class="variable">$&</span>');
                        mixin[0] = mixin[0].replace('@mixin','<span class="blue">@mixin</span>');
                        endHtml += '<div id="'+mixinName+'">'+mixinNote+'<div class="block">' + '<div class="code">' + mixin[0] + '</div>' + paramStr + returnStr + '</div></div>';
                        returnStr = '';
                        paramStr = '';
                        mixinNote='';
                    }else if(fun){
                        var funName = fun[0].match(/(?![@function])[^\(]+(?=\()/)[0];
                        menuHtml += '<a href="'+fileName+'.html#'+funName+'" class="menu-item"><span class="code-tag function-tag">function</span>'+funName+'</a>'
                        fun[0] = fun[0].replace(variableReg,'<span class="variable">$&</span>');
                        fun[0] = fun[0].replace('@function','<span class="red">@function</span>')
                        endHtml += '<div id="'+funName+'">'+mixinNote+'<div class="block">' + '<div class="code">' + fun[0] + '</div>' + paramStr + returnStr +'</div></div>';
                        returnStr = '';
                        paramStr = '';
                        mixinNote='';
                    }
                }
            }
            endHtml += '</div></div>';
            fs.writeFileSync(path.join(exportPath,'app/views/sass',fileName+'.html'),endHtml);
            endHtml = '';
            console.log('ok!');
        }
    }
}
