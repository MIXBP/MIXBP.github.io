---
title: misc学习
date: 2025-04-17 21:54:24
tags:
- misc
category:
- 学习笔记
---

[misc简介](https://ctf-wiki.org/misc/encode/computer/)

## zip伪加密

**1.伪加密原理：**

ZIP伪加密是通过修改ZIP文件结构中特定的‌**全局方式位标记**‌（通常位于压缩源文件目录区），使压缩包被识别为加密状态，但实际上并未对数据加密。关键点包括：

- ‌**文件结构**‌：ZIP文件由三部分组成：压缩源文件数据区、目录区和目录结束标志。

- ‌**加密标志位**‌

  ‌**数据区**‌的全局方式位标记（如`00 00`表示无加密，`01 00`表示真加密）。

  目录区的全局方式位标记（若为奇数如`09 00`或`01 00`，则被识别为加密，但数据区未加密时即为伪加密）。

- ‌**伪装效果**‌：仅修改目录区的标志位，实际数据未加密，因此无需密码即可破解。

**2. ‌识别伪加密的方法‌**

- ‌**检查标志位**‌使用十六进制编辑器（如Winhex或HxD）查看文件头：

  搜索`50 4B 01 02`（目录区标识），定位到第9-10字节，若为奇数（如`09 00`）且数据区标志为`00 00`，则为伪加密。

  真加密需数据区和目录区标志位均为奇数。

![](../image/misc学习-1.png)

使用工具：010editor、winhex

```
1.无加密： 压缩源文件数据区的全局方式位标记应当为00 00 （50 4B 03 04 14 00 后） 且压缩源文件目录区的全局方式位标记应当为00 00 （50 4B 01 02 14 00 后）

2.伪加密：
压缩源文件数据区的全局方式位标记应当为 00 00 （50 4B 03 04 14 00 后） 且压缩源文件目录区的全局方式位标记应当为 09 00 （50 4B 01 02 14 00 后）

3.真加密：
压缩源文件数据区的全局方式位标记应当为09 00 （50 4B 03 04 14 00 后）
且压缩源文件目录区的全局方式位标记应当为09 00 （50 4B 01 02 14 00 后）

4.修改方法：确定是伪加密后就需要将其修改为无加密，方法很简单，就是将压缩源文件目录区的全局方式位标记从09 00改为00 00。
```

---

## 盲水印

盲水印技术是一种用于隐藏信息的技术，通常用于在图像或文件中嵌入不可见的标记或信息，使得这些信息在不被察觉的情况下可以被追踪或识别。这种技术可以用于版权保护、追踪来源、甚至是隐藏秘密信息。

使用工具：BlindWaterMark

```
1.png	原图
2.png 	藏有盲水印的图片
3.png	盲水印图片


python bwmforpy3.py decode 1.png 2.png 3.png
```

---

## 常见文件头、文件尾

- JPEG (jpg)文件头：FF D8 FF；文件尾：FF D9

- PNG (png)文件头：为89 50 4E 47 0D 0A 1A 0A，文件尾格式为49 45 4E 44 AE 42 60 82

- GIF (gif) 文件头：47 49 46 38 39 61；文件尾：00 3B

- TIFF (tif)文件头：49 49 2A 00

- XML (xml)文件头：3C 3F 78 6D 6C

- HTML (html)文件头：68 74 6D 6C 3E

- Adobe Acrobat (pdf)文件头：25 50 44 46 2D 31 2E

- ZIP Archive (zip)文件头：50 4B 03 04；文件尾：50 4B

- TAR （tar.gz）文件头：1F 8B 08 00

- RAR Archive (rar)文件头：526172211A0700 C43D7B00400700

- Wave (wav)文件头：57415645

- AVI (avi)，文件头：41564920

- MS Word/Excel (xls.or.doc)文件头：D0CF11E0

- Adobe Photoshop (psd)文件头：38425053 Windows Bitmap (bmp) 文件头：424D
  

---

## base64隐写

原理：[大佬博客](https://www.cnblogs.com/tolele/p/16271548.html)

大概就是解码时会将多余的比特位去掉（因为凑不到8位），所以这部分多余的比特位即使我们随意的改变值也不会影响解码后的结果，因为它会被丢弃掉，所以就能在这些多余的比特位中实现隐写。

base64隐写提取脚本

```
# -*- coding: utf-8 -*-

import base64

def Base64Stego_Decrypt(LineList):
    Base64Char = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"     #Base64字符集 已按照规范排列
    BinaryText = ""
    for line in LineList:
        if line.find("==") > 0:     #如果文本中有2个=符号
            temp = bin(Base64Char.find(line[-3]) & 15)[2:]      #通过按位与&15运算取出二进制数后4位 [2:]的作用是将0b过滤掉
            BinaryText = BinaryText+"0"*(4-len(temp))+temp      #高位补0
        elif line.find("=") > 0:        #如果文本中有1个=符号
            temp = bin(Base64Char.find(line[-2]) & 3)[2:]       #通过按位与&3运算取出二进制数后2位
            BinaryText = BinaryText+"0"*(2-len(temp))+temp      #高位补0
    Text = ""
    if(len(BinaryText) % 8 != 0):       #最终得到的隐写数据二进制位数不一定都是8的倍数，为了避免数组越界，加上一个判断
        #print("警告:二进制文本位数有误，将进行不完整解析。")
        for i in range(0, len(BinaryText), 8):
            if(i+8 > len(BinaryText)):
                Text = Text+"-"+BinaryText[i:]
                return Text
            else:
                Text = Text+chr(int(BinaryText[i:i+8], 2))
    else:
        for i in range(0, len(BinaryText), 8):
            Text = Text+chr(int(BinaryText[i:i+8], 2))      #将得到的二进制数每8位一组对照ASCII码转化字符
        return Text

def Base64_ForString_Decrypt(Text):     #Base64解密
    try:
        DecryptedText = str(Text).encode("utf-8")
        DecryptedText = base64.b64decode(DecryptedText)
        DecryptedText = DecryptedText.decode("utf-8")
    except:
        return 0
    return DecryptedText

if __name__ == "__main__":
    Course = input("filename:")
    File = open(Course, "r")
    LineList = File.read().splitlines()
    print("The explicit content is:")
    for line in LineList:
        print(Base64_ForString_Decrypt(line),end="")
    print("Steganography is:")
    print(Base64Stego_Decrypt(LineList))

```

感觉不如随波逐流，太麻烦了。

---

## NTFS交换数据流实现隐写

原理：[NTFS 交换数据流 实现隐藏文件](https://zhuanlan.zhihu.com/p/654643812)

**注意：如果压缩包内文件有隐写，必须用winrar解压，不然是提取不出来的**

提取隐写。

方法一：

在1.txt文件所在的文件夹，右键选择“在终端中打开”，打开命令行输入以下命令，回车打开flag.txt文件。

```
notepad 1.txt:flag.txt
```

方法二：
使用NtfsStreamsEditor工具

---

## outguess隐写

OutGuess 是一款通用的隐写工具，允许用户将隐藏信息插入到数据源的冗余位中。无论是PPM（便携式像素图）、PNM（便携式任意图）还是JPEG图像格式，OutGuess都能轻松处理。更令人兴奋的是，OutGuess的核心设计并不依赖于数据源的性质，只要提供相应的数据处理程序，它可以应用于任何类型的数据。
对于JPEG图像，OutGuess通过保留基于频率计数的统计数据，确保了隐写内容的不可检测性。在嵌入数据之前，OutGuess系统可以确定在保持频率计数统计数据的前提下，可以隐藏的最大消息大小。

使用outguess工具提取隐写文件。

```
outguess -k 'key' -r textfile outputfile
```

---

## 字频隐写

一般都是杂乱无章的文本，然后通过统计字频后按照一定顺序排列即可看到隐写的信息

简单的字频分析python脚本

```
# -*- coding:utf-8 -*-
with open('Autopy/misc/word_frequency_statistics/in.txt','r',encoding='utf8') as infile:
    content = infile.read()
table = dict(map(lambda c:(chr(c),0),[x for x in range(32,127)]))
for c in content:
    try:
        table[c] += 1
    except:
        pass
order = sorted(table.items(),key = lambda k:k[1], reverse=True)
print(order)
print(''.join([x[0] for x in order]))
```

也可以使用随波逐流自带的字频分析功能

---

## png宽高CRC爆破

[参考博客](https://www.cnblogs.com/Yolololo/p/18628384)

这里的CRC指的是CRC32，也就是PNG图片的一个效验位，是一种不可逆运算，类似于MD5，作为数据效验或效验文件的完整性使用

当一个png图片宽高有问题时，010回有CRC报错

---

## LSB隐写+数据提取

利用LSB（最低有效位）来进行隐写
原理：在大多数彩色图像中，每个像素的颜色值通常由三个颜色通道组成：红色（R）、绿色（G）和蓝色（B），每个通道的数值通常在0到255之间。在LSB隐写术中，秘密信息被嵌入到这些颜色通道的最低有效位（即二进制表示的最后一位）中。

例如，一个秘密信息比特“1”可以被嵌入到像素值129（二进制为10000001）的最低位上，使其变为130（二进制为10000010）。相反，一个“0”则保持不变或通过清除最低位来实现。例如：在.png图片的存储中，每个颜色会有8bit，LSB隐写就是修改了像数中最低的1bit，在人烟看来是看不出区别的，也就隐藏了信息

例如：把‘A’隐藏进图片，可以把‘A’转成16进制0x61再转成二进制01100001，再修改为红色通道的最低位为这些二进制字符串
工具：stegsolve
注意：隐写的载体不能使.jpg格式，jpg图片对像素数进行了有损的压缩，修改的信息可能会被破坏

**png lsb数据提取**

工具：cloacked-pixel-master、随波逐流

cloacked-pixel-master使用格式

```
python lsb.py extract xxx.png flag.txt key
```

随波逐流的话直接放进去然后在图片工具栏找到Png lsb数据提取即可

---

## pyc反编译

PyC是Python字节码的缩写，它是Python解释器执行Python代码的核心。当Python代码被运行时，它会首先被解释器转换为PyC字节码，然后由CPython解释器执行。

`Pyc反编译`在线网站进行反编译：https://tool.lu/pyc/

推荐 py反编译网站：[PyLingual](https://pylingual.io/)

---

## 电报码

电报码在线翻译网站：https://usetoolbar.com/convert/cccn.html

例如：

```
0086 1562 2535 5174
 人    工   智   能
```

---

## 盲文

盲文加解密在线网站：

https://www.lddgo.net/common/braille

---

## **汉字五笔编码**

汉字五笔编码在线网站查询：https://www.qqxiuzi.cn/bianma/wubi.php

例如：

```
bnhn s wwy vffg vffg rrhy fhnv
也   要 从   娃    娃  抓    起
```

---

## 零宽字节隐写

零宽度字符是隐藏的不显示的，也是不可打印的，也就是说使用大部分程序和编辑器是看不到这种字符的。它们存在于页面中主要用于调整字符的显示格式。

在线加解密网站：https://yuanfux.github.io/zero-width-web/

https://330k.github.io/misc_tools/unicode_steganography.html

https://330k.github.io/misc_tools/unicode_steganography.html

例如这个例子：

![](../image/misc学习-2.png)

表面上看起来是这样的，但是实际上是这样

```
D﻿‏‎​﻿‍‎​‍﻿﻿​‍﻿﻿​‌‎‎​‏﻿‍​‌‎‎​‌‎‍​‍‎﻿​‌‎‏​﻿‍‍​﻿‍‍x8CBEl3S0EtQgYbOyVbU2JN
```

两种判断方法。

第一种将文字复制入Sublime_txt，可以看到零宽度字符（灰色部分）

第二种就是肉眼看出异常。

---

## 栅栏加密/解密

在线加解密网站：https://ctf.bugku.com/tool/railfence

也可以用随波逐流

栅栏密码是古典密码的一种，其原理是将一组要加密的明文划分为n个一组（n通常根据加密需求确定，且一般不会太大，以保证密码的复杂性和安全性），然后取每个组的第一个字符（有时也涉及取其他位置的字符，但规则需事先约定），根据情况将这些字符重新排列组合成一段无规律的话，形成密文。

栅栏密码的“栏”数，即分组后形成的“列”数或“行”数（具体取决于加密时的排列方式），是栅栏密码的一个重要参数。根据栏数的不同，栅栏密码可以分为多种类型，其中比较常见的是2栏栅栏密码。但理论上，栏数n可以是任何正整数（实际应用中受限于明文的长度和加密的安全性要求）。

例如题目给我们一个打乱顺序的字符串：

```
kanbbrgghjl{zb____}vtlaln
```

通过栅栏加密得到原始字符串，这里栏数需要一个个试

![](../image/misc学习-3.png)

```
kzna{blnl_abj_lbh_trg_vg}
```

这里顺序还是不对还需要进行rot13解密

---

## 凯撒密码

[凯撒加密](https://so.csdn.net/so/search?q=凯撒加密&spm=1001.2101.3001.7020)是一种替换加密的技术，明文中的所有字母都在字母表上向后（或向前）按照一个固定数目进行偏移后被替换成密文。例如，当偏移量是3的时候，所有的字母A将被替换成D，B变成E，以此类推。这个加密方法是以罗马共和时期凯撒的名字命名的，据说凯撒曾用此方法与其将军们进行联系。

例如rot13即为凯撒密码的一种特殊情况，即当凯撒密码的密钥为13的情况。

---

## CRC碰撞

什么是CRC32

CRC 本身是「冗余校验码」的意思，CRC32 则表示会产生一个 32 bit ( 8 位十六进制数) 的校验值。由于 CRC32 产生校验值时源数据块的每一个 bit (位) 都参与了计算，所以数据块中即使只有一位发生了变化，也会得到不同的 CRC32 值。
CRC32 校验码出现在很多文件中比如 png 文件，同样 zip 中也有 CRC32 校验码。值得注意的是 zip 中的 CRC32 是未加密文件的校验值。
CRC32攻击

这也就导致了基于 CRC32 的攻击手法。
文件内内容很少 (一般比赛中大多为 4 字节左右)
加密的密码很长
我们不去爆破压缩包的密码，而是直接去爆破源文件的内容 (一般都是可见的字符串)，从而获取想要的信息。

python脚本

```
import zipfile, string, binascii

def CrackCrc(crc, dic):
    for i in dic:
        for j in dic:
            for k in dic:
                for h in dic:
                    s = i+j+k+h
                    if crc == (binascii.crc32(s.encode()) & 0xffffffff):
                        return s
    return ''

dic = string.ascii_letters + string.digits + string.punctuation
with open('crc32.txt', 'w') as f:
    for i in range(1,7):
        with zipfile.ZipFile(f'pass{i}.zip') as zf:
            crc = zf.getinfo(f'data{i}.txt').CRC
            f.write(CrackCrc(crc, dic) + '\n')

```

---

## DTMF拨号音识别

[双音多频](https://baike.baidu.com/item/双音多频/10445258?fromModule=lemma_inlink) DTMF（Dual Tone Multi Frequency），双音多频，由高频群和低频群组成，高低频群各包含4个频率。一个高频信号和一个低频信号叠加组成一个组合信号，代表一个数字。DTMF信号有16个编码。利用DTMF信令可选择呼叫相应的[对讲机](https://baike.baidu.com/item/对讲机/641751?fromModule=lemma_inlink)。

利用软件进行识别

http://aluigi.altervista.org/mytoolz/dtmf2num.zip

```
输入命令dtmf2num.exe girlfriend.wav
```

![](../image/misc学习-4.png)

---

## 手机键盘密码

手机键盘加密方式，是每个数字键上有3-4个字母，用两位数字来表示字母，例如：ru用手机键盘表示就是：7382，那么这里就可以知道了，手机键盘加密方式不可能用1开头，第二位数字不可能超过4，解密的时候参考此

![](../image/misc学习-5.png)

也有另一种方式，数字顺序按多少下，例如999就是按三下9键即为y

---

## exif信息与exiftool

**EXIF信息，是可交换图像文件的缩写，是专门为数码相机的照片设定的，可以记录数码照片的属性信息和拍摄数据。EXIF可以附加于JPEG、TIFF、RIFF等文件之中，为其增加有关数码相机拍摄信息的内容和索引图或图像处理软件的版本信息。**

---

ExifTool是一款免费开源的图像信息查看工具，一个命令行应用程序。可用于读写和编辑图像（主要）、音视频和PDF等文件的元数据（metadata）。元数据是由一系列参数（下文为了与命令行参数做区别将称为标签）组成，如快门速度、光圈、白平衡、相机品牌和型号、镜头、焦距等等。而ExifTool可以帮助用户读取和处理这些数据， 支持许多不同的元数据格式，包括 EXIF，GPS，IPTC，XMP，JFIF，GeoTIFF，ICC 配置文件等等。支持多种输出格式设置选项（包括制表符分隔，HTML，XML 和 JSON），还可以多语言输出（cs，de，en，en-ca，en-gb，es，fi，fr，it，ja，ko，nl，pl，ru，sv，tr，zh-cn 或 zh-tw）。可以读取和写入许多数码相机的制造商说明。

**使用实例：使用Kali上的exiftool工具，批量分析图片，寻找flag**

```
exiftool * | grep flag
```

![](../image/misc学习-6.png)

---

## mimikatz与lsass

Mimikatz 是一款功能强大的轻量级调试神器，通过它你可以提升进程权限注入进程读取进程内存，当然他最大的亮点就是他可以直接从 lsass.exe 进程中获取当前登录系统用户名的密码， lsass是微软Windows系统的安全机制它主要用于本地安全和登陆策略，通常我们在登陆系统时输入密码之后，密码便会储存在 lsass内存中，经过其 wdigest 和 tspkg 两个模块调用后，对其使用可逆的算法进行加密并存储在内存之中， 而 mimikatz 正是通过对lsass逆算获取到明文密码！也就是说只要你不重启电脑，就可以通过他获取到登陆密码，只限当前登陆系统！

* **lsass是[windows](http://d.hatena.ne.jp/keyword/windows)系统的一个进程，用于本地安全和登陆策略。**
* **Procdump工具一般用来抓取windows的lsass进程中的用户明文密码**
  **lsass是windows系统的一个进程，用于本地安全和登陆策略。**

mimikatz下载链接：https://github.com/gentilkiwi/mimikatz/releases/tag/2.2.0-20200917

注意：点开64位的“猕猴桃”，输入以下命令（记得右键管理员权限打开mimikatz，不然会报错）

使用格式：

```
将lsass.dmp文件放到mimikatz.exe下目录
//提升权限
privilege::debug
//载入dmp文件
sekurlsa::minidump lsass.dmp
//读取登陆密码
sekurlsa::logonpasswords full

得到密码
W3lc0meToD0g3
```

---

## TLS流量

**TLS（Transport Layer Security）是一种加密通讯协议，它用于在计算机网络上保证通信安全和数据完整性。TLS 通常用于安全地传输 HTTP、SMTP、FTP 等应用层协议。TLS协议位于传输层和应用层中间，其功能是一个加密通道，和上层应用协议无关。由于HTTP采用明文传输，很容易被攻击者窃听或者篡改内容，通过引用TLS对HTTP的内容进行加密等操作，可以有效防止窃听、篡改和劫持等。**

TLS流量是指通过TLS协议加密的数据传输，它在客户端和服务器之间建立一个加密的通道，确保数据在传输过程中不被窃听、篡改或伪造。

一般的TLS流量就是找到key，导入key，在导入key之后就会多出几个流量包（即加密流量包），在里边会有想要的答案

例如：

```
-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQDCm6vZmclJrVH1AAyGuCuSSZ8O+mIQiOUQCvN0HYbj8153JfSQ
LsJIhbRYS7+zZ1oXvPemWQDv/u/tzegt58q4ciNmcVnq1uKiygc6QOtvT7oiSTyO
vMX/q5iE2iClYUIHZEKX3BjjNDxrYvLQzPyGD1EY2DZIO6T45FNKYC2VDwIDAQAB
AoGAbtWUKUkx37lLfRq7B5sqjZVKdpBZe4tL0jg6cX5Djd3Uhk1inR9UXVNw4/y4
QGfzYqOn8+Cq7QSoBysHOeXSiPztW2cL09ktPgSlfTQyN6ELNGuiUOYnaTWYZpp/
QbRcZ/eHBulVQLlk5M6RVs9BLI9X08RAl7EcwumiRfWas6kCQQDvqC0dxl2wIjwN
czILcoWLig2c2u71Nev9DrWjWHU8eHDuzCJWvOUAHIrkexddWEK2VHd+F13GBCOQ
ZCM4prBjAkEAz+ENahsEjBE4+7H1HdIaw0+goe/45d6A2ewO/lYH6dDZTAzTW9z9
kzV8uz+Mmo5163/JtvwYQcKF39DJGGtqZQJBAKa18XR16fQ9TFL64EQwTQ+tYBzN
+04eTWQCmH3haeQ/0Cd9XyHBUveJ42Be8/jeDcIx7dGLxZKajHbEAfBFnAsCQGq1
AnbJ4Z6opJCGu+UP2c8SC8m0bhZJDelPRC8IKE28eB6SotgP61ZqaVmQ+HLJ1/wH
/5pfc3AmEyRdfyx6zwUCQCAH4SLJv/kprRz1a1gx8FR5tj4NeHEFFNEgq1gmiwmH
2STT5qZWzQFz8NRe+/otNOHBR2Xk4e8IS+ehIJ3TvyE=
-----END RSA PRIVATE KEY-----
```

这里将私钥保存为private.key，wireshark允许添加TLS私钥查看加密传输数据

步骤：

**点击 编辑-->首选项-->Protocols-->TLS**	

---

## zsteg工具的使用

`‌zsteg`是一款用于检测`PNG`和`BMP`图片中隐藏数据的工具，可以快速提取隐藏信息。

`zsteg`支持检测多种隐写技术，包括`LSB`隐写、`zlib`压缩数据、`OpenStego、Camouflage`等。

**zsteg的使用方法：**

常用参数：	

- `-E` 导出内容一般导出隐写内容
- `-v` 命令可以显示图片的详细信息
- `-a` 命令尝试所有已知的隐写组合

```
查看LSB信息
zsteg xxx	##文件名

提取LSB数据
zsteg -E "b1,bgr,lsb,xy" xxx.png > 1.txt

检测zlib压缩数据
zsteg zlib.bmp -b 1 -o xy -v
命令可以检测BMP图片中的zlib压缩数据，其中-b参数指定了要检查的位数，从1开始
```

---

## DES加密

DES是一种对称密钥加密块密码算法，1976年被美国联邦政府的国家标准局确定为联邦资料处理标准（FIPS），随后在国际上广泛流传开来。它基于使用56位密钥的对称算法

在线解码网站：https://www.sojson.com/encrypt_des.html

例如：

```
秘钥：6XaMMbM7
U2FsdGVkX18IBEATgMBe8NqjIqp65CxRjjMxXIIUxIjBnAODJQRkSLQ/+lHBsjpv1BwwEawMo1c=
-->ctf{67a166801342415a6da8f0dbac591974}
```

特点：

很像base64，并且base64解码后前面有Salted

```
例如：U2FsdGVkX1+zHjSBeYPtWQVSwXzcVFZLu6Qm0To/KeuHg8vKAxFrVQ==
base64解码后
Salted__4y홅R|ܔVK&Ѻ?)뇃ˊkU
```

---

## AES加密

在线加解密网站：https://www.jijie.ink/tool/aes

AES（Advanced Encryption Standard）即高级加密标准，是一种广泛使用的对称加密算法，由美国国家标准与技术研究院（NIST）于2001年发布，用于保护电子数据的机密性。AES算法是替代原先DES（数据加密标准）算法的，因为它提供了更高的安全性。AES加密过程是可逆的，意味着使用相同的密钥可以解密加密的数据。

例如：

```
U2FsdGVkX1/nSQN+hoHL8OwV9iJB/mSdKk5dmusulz4=
```

并且得到密钥：`Tokyo`

解密得到：

```
CCGandGulu
```

![](../image/misc学习-13.png)

---

## RAR

RAR是有四个文件块组成的，分别是分别是标记块、归档头部块、文件块、结束块，这些块之间没有固定地先后顺序，但要求第一个块必须是标志块并且其后紧跟一个归档头部块。每个块都包含以下内容：

![](../image/misc学习-7.png)

归档头部块和文件块的内容较多，仅列出每个块头部内容：

![](../image/misc学习-8.png)

RAR的标记块和结束块都是固定的7字节序列，分别为0x52 61 72 21 1A 07 00和0xC4 3D 7B 00 40 07 00。文件块这边要注意一下HEAD_FLAGS这个头部，其中HEAD_FLAGS的低三位代表加密标志，此位若被置为1，则文件使用了基于密钥的加密。

**块类型为0x74，有时题目会将块类型修改，形成隐写，只要将其改回0x74即可在解压是看到隐写的文件**

---

## USB键盘隐写（Tshark与UsbKeyboardDataHacker.py）

SB隐写——键盘隐写：键盘数据包的数据长度为 8 个字节
第1个字节的作用主要是判断是否按下Shift，Alt，Control等键
第2个字节是保留位
第3~8个字节是普通按键，但击键信息集中在第 3 个字节。（如果遇到多个按键一起按的情况，这个时候3～8字节可能会被利用起来。）
根据 data 值与具体键位的对应关系，可从数据包恢复出键盘的按键信息

可使用Tshark.exe工具提取键盘数据：

在kali里Tshark是内置的工具

```
tshark -r key.pcap -T fields -e usb.capdata > usbdata.txt

hid data 鼠标流量 左键：
tshark -r usb.pcapng -T fields -e usbhid.data | sed '/^\s*$/d' > usbdata.txt
```

**| sed '/^\s*$/d'**

- ​    |: 管道符，将前一个命令的输出传递给下一个命令（sed）。
- ​    sed '/^\s*$/d': 用 sed 工具删除空行或仅包含空白字符的行。
- ​        ^\s*$ 是正则表达式，匹配：
- ​            ^ 行首
- ​            \s* 任意数量的空白字符（空格、制表符等）
- ​            $ 行尾
- ​        d 表示删除匹配的行。

例如：

一个key.pcap文件，用Wireshark打开全是usb

![](../image/misc学习-9.png)

### 使用Tshark.exe工具提取usb键盘数据

```
tshark -r key.pcap -T fields -e usb.capdata > usbdata.txt
```

![](../image/misc学习-10.png)

### **使用脚本提取数据**

UsbKeyboardDataHacker.py

使用脚本提取数据：

```
python3 UsbKeyboardDataHacker.py key.pcap
```

![](../image/misc学习-11.png)

得到密钥xinan

---

## 维吉尼亚密码

[维吉尼亚密码](https://so.csdn.net/so/search?q=维吉尼亚密码&spm=1001.2101.3001.7020)（Vigenère cipher）是一种使用一系列凯撒密码组成密码字母表的加密算法，它属于多表密码的一种简单形式。

简单来说就是凯撒密码的加强版，引入了密钥

解密网站[维吉尼亚加密/解密 - Bugku CTF](https://ctf.bugku.com/tool/vigenere?code=ci{v3erf_0tygidv2_fc0})

[带符号和数字的解密网站](https://ctf.bugku.com/tool/vigenere)

示例：

```
ci{v3erf_0tygidv2_fc0}
```

特点：有字母密钥，如果满足凯撒密码的格式但是解不出来那就是维吉尼亚了

PPS：秘钥一般需要自己解出来。

密钥：

```
xinan
```

结果：

```
fa{i3eei_0llgvgn2_sc0}
```

这里解出来的结果一看就知道还要栅栏密码解密，就不说了。

---

## logo解释器

在线网站：https://www.calormen.com/jslogo/

例如：

```
cs pu lt 90 fd 500 rt 90 pd fd 100 rt 90 repeat 18[fd 5 rt 10] lt 135 fd 50 lt 135 pu bk 100 pd setcolor pick [ red orange yellow green blue violet ] repeat 18[fd 5 rt 10] rt 90 fd 60 rt 90 bk 30 rt 90 fd 60 pu lt 90 fd 100 pd rt 90 fd 50 bk 50 setcolor pick [ red orange yellow green blue violet ] lt 90 fd 50 rt 90 fd 50 pu fd 50 pd fd 25 bk 50 fd 25 rt 90 fd 50 pu setcolor pick [ red orange yellow green blue violet ] fd 100 rt 90 fd 30 rt 45 pd fd 50 bk 50 rt 90 fd 50 bk 100 fd 50 rt 45 pu fd 50 lt 90 pd fd 50 bk 50 rt 90 setcolor pick [ red orange yellow green blue violet ] fd 50 pu lt 90 fd 100 pd fd 50 rt 90 fd 25 bk 25 lt 90 bk 25 rt 90 fd 25 setcolor pick [ red orange yellow green blue violet ] pu fd 25 lt 90 bk 30 pd rt 90 fd 25 pu fd 25 lt 90 pd fd 50 bk 25 rt 90 fd 25 lt 90 fd 25 bk 50 pu bk 100 lt 90 setcolor pick [ red orange yellow green blue violet ] fd 100 pd rt 90 arc 360 20 pu rt 90 fd 50 pd arc 360 15 pu fd 15 setcolor pick [ red orange yellow green blue violet ] lt 90 pd bk 50 lt 90 fd 25 pu home bk 100 lt 90 fd 100 pd arc 360 20 pu home
```

经过解释器后结果：

![](../image/misc学习-12.png)

---

## TTL隐写

TTL是 Time To Live的缩写，该字段指定IP包被路由器丢弃之前允许通过的最大网段数量。TTL是IPv4报头的一个8bit字段。注意：TTL与DNS TTL有区别。二者都是生存时间，前者指ICMP包的转发次数（跳数），后者指域名解析信息在DNS中的存在时间。

IP报文在路由间穿梭的时候每经过一个路由，TTL就会减1。
这个东西是用来防止数据过多的。计算机网络知识。

大多数情况下通常只需要经过很小的跳数就能完成报文的转发，远远比上限255小得多，所以我们可以用TTL值的前两位来进行传输隐藏数据。
所以加密的方法就是把一个ASCII码分4截，分到4个TTL里面，有点像是最低位像素的隐写。

TTL隐写解码脚本：

解码步骤

1. 转成2进制，
2. 写个脚本。取出前两位。重新组合。再以8位一组。
3. 转换为16进制字符。再将16进制字符转换为字符

```
import binascii
with open('attachment.txt','r') as fp:
    a=fp.readlines()
    p=[]
    for x in range(len(a)):
       p.append(int(a[x])) 
    s=''
    for i in p:
        if(i==63):
            b='00'
        elif(i==127):
            b='01'
        elif(i==191):
            b='10'
        else:
            b='11'
        s +=b
# print(s)
flag = ''
for i in range(0,len(s),8):
    flag += chr(int(s[i:i+8],2))
flag = binascii.unhexlify(flag)
wp = open('ans.zip','wb')
wp.write(flag)
wp.close()
```

---

## 数据矩阵提取

在线数据提取网站：

https://online-barcode-reader.inliteresearch.com/

https://zxing.org/w/decode

例如：

![](../image/misc学习-14.png)

---

## 汉信码

![](../image/misc学习-15.png)

**扫码工具：使用中国编码app能扫出来**

---

## QRazyBox

QRazyBox 是一个基于 Web 的应用程序（工具包），用于分析和恢复损坏的 QR 码。QRazyBox允许通过使用类似油漆的编辑器重新绘制和重建QR码来恢复QR码。它还提供了几个子工具，可更快、更高效地进行分析和恢复。

网址：https://merri.cx/qrazybox/

---

## hidden-word隐写

在线加解密网站：https://hidden-word.top/

---

## 图片镜像翻转、旋转

支持图片镜像翻转+旋转

在线网站：[https://www.lddgo.net/image/flip](https://godyu.com/?golink=aHR0cHM6Ly93d3cubGRkZ28ubmV0L2ltYWdlL2ZsaXA=)

---

## steghide工具的使用

可以在jpeg、bmp、wmv、au文件中隐写信息的软件

```
# 将隐藏信息从载体中分离出来
steghide extract -sf 待提取信息的图片.jpg -p 123456
# -sf 后面放待提取信息的图片
# -p 后面接密码，也可以不加-p参数，运行后会询问密码
# 若没有密码，则不加-p参数，询问密码直接按enter键跳过

# 将文件隐藏到载体中
steghide embed -cf 隐藏信息的载体.jpg -ef 待隐藏的信息.txt -p 123456
# -cf 后面放隐藏信息的载体
# -ef 待隐藏的信息

# 查询载体有没有隐藏信息
steghide info 可能含有隐藏信息的载体
```

---

## stegdetect和stegbreak工具的使用

**Stegdetect**

`stegdetect` 是一款用于检测图像中**隐写内容**（Steganography）的经典工具，主要用于发现通过JPG等图像文件隐藏的敏感数据（如加密信息、恶意代码）。以下是详细使用指南：

检测单张图片

```
stegdetect -t jpg 可疑图片.jpg
```

批量检测目录下所有jpg

```
stegdetect -t jpg /path/to/images/*.jpg
```

`-t <工具名>`指定检测的隐写工具（如`j`=jsteg, `o`=outguess, `p`=jphide，默认检测全部）

`-s <敏感度>`调整检测敏感度（1-10，默认1），值越高误报率越高

---

**stegbreak**

`stegbreak` 是专为破解 **`jphide`** 和 **`outguess`** 等隐写工具加密文件的密码而设计的暴力破解工具。它通常与 `stegdetect` 配合使用，适用于CTF竞赛、安全审计等合法场景。

使用命令：

```
stegbreak -r /path/to/wordlist.txt -f 可疑图片.jpg
```

- `-r`：指定密码字典文件（如`rockyou.txt`）。
- `-f`：强制尝试破解。

通常的使用流程。

首先用stegdetect检测是否存在隐写，然后stegbreak爆破密码，最后steghide提取隐藏信息

---

## **Cobalt Strike**流量

Cobalt Strike（CS）是一款专业的**红队渗透测试工具**，但常被黑客用于恶意攻击（如APT、勒索软件）。其核心功能是通过**Beacon**（植入的恶意代理）与攻击者的**C2服务器**（Command & Control）进行隐蔽通信，这种通信产生的网络流量称为**Cobalt Strike流量**。

cs流量的流量特征

1.在HTTP流量中特殊的请求特征，例如/submit.php?id=xxx的POST请求。

2.http-beacon通信中，默认使用get方法向 /dpixel、/__utm.gif、/pixel.gif 等地址发起请求，同时请求头存在 cookie 字段并且值为 base64 编码后的非对算算法加密数据。

关于CobalStrike流量分析的题目大部分都会给`.cobaltstrike.beacon_keys`文件

相关资料：

如果没给，就需要从内存镜像中提取Beacon进程的数据以后再解析AES Key和HMAC Key

[通过进程内存提取密钥解密Cobalt Strike流量 - 安全内参 | 决策者的网络安全知识库](https://www.secrss.com/articles/35756)

---

cs流量解密脚本：

```
import hmac
import binascii
import base64
import hexdump
from Crypto.Cipher import AES


def decrypt(encrypted_data, iv_bytes, signature, shared_key, hmac_key):
    if hmac.new(hmac_key, encrypted_data, digestmod="sha256").digest()[:16] != signature:
        print("message authentication failed")
        return
    cipher = AES.new(shared_key, AES.MODE_CBC, iv_bytes)
    return cipher.decrypt(encrypted_data)


if __name__ == "__main__":
    SHARED_KEY = binascii.unhexlify("a6f4a04f8a6aa5ff27a5bcdd5ef3b9a7")
    HMAC_KEY = binascii.unhexlify("35d34ac8778482751682514436d71e09")
    encrypt_datas = [      "000009e09fa046ed18d2de0f0607376d06bab360ababedb5a077fb2c4ff66······"]
    for encrypt_data in encrypt_datas:
        # encrypt_data = base64.b64decode(encrypt_data)
        encrypt_data = bytes.fromhex(encrypt_data)
        encrypt_data_length = int.from_bytes(encrypt_data[:4], byteorder='big', signed=False)
        encrypt_data_l = encrypt_data[4:]
        data1 = encrypt_data_l[:encrypt_data_length - 16]
        signature = encrypt_data_l[encrypt_data_length - 16:]
        iv_bytes = b"abcdefghijklmnop"

        dec = decrypt(data1, iv_bytes, signature, SHARED_KEY, HMAC_KEY)
        print(f"{'=' * 80}")
        print("[+] counter: {}".format(int.from_bytes(dec[:4], byteorder='big', signed=False)))
        print("[+] 任务返回长度: {}".format(int.from_bytes(dec[4:8], byteorder='big', signed=False)))
        print("[+] 任务输出类型: {}".format(int.from_bytes(dec[8:12], byteorder='big', signed=False)))
        output = dec[12:int.from_bytes(dec[4:8], byteorder='big', signed=False)].decode('gbk', errors='ignore')
        print(hexdump.hexdump(dec))
        print(output)

```

---

## 乱码修复

**乱码的本质是编码与解码方式不匹配**：当文本以某种编码（如UTF-8）存储，却用另一种编码（如GBK）解读时，二进制数据被错误解析成无意义的字符。例如中文字符用UTF-8编码后，若用GBK解码会变成"锟斤拷"等乱码，因为两种编码的字节规则不同。**核心原因就是"存码"和"读码"的标准不统一**。

**修复乱码的关键是逆向还原错误的编码过程**：先用错误的解码方式（如GBK）把乱码文本重新编码成二进制数据，再用正确的编码（如UTF-8）重新解码。例如"锟斤拷"这样的典型乱码，先用GBK编码得到原始字节，再用UTF-8解码就能恢复原始中文。如果是双重编码导致的乱码，则需要连续两次反向操作：先用UTF-8编码再用latin1解码，重复一次即可还原。当不确定编码时，可以用chardet库自动检测，或尝试常见的编码组合（GBK/UTF-8/BIG5等）。注意处理时要保留原始二进制数据，避免二次损坏。****

**乱码修复工具网站**

https://wrtools.top/coderepair.php

---

## 全角字符与半角字符转换

全角字符（Full-width Characters）和半角字符（Half-width Characters）是计算机编码和显示中常见的两种字符形式，主要区别在于**字符宽度**和**编码方式**。

**全角字符（如中文、全角字母`Ａ`）宽度较宽，占2个字节；半角字符（如英文`A`、数字`1`）宽度较窄，占1个字节。**

**工具网站：**https://www.iamwawa.cn/quanjiaobanjiao.html

---

## Brainfuck/Ook! 解密

解密工具网站：https://www.splitbrain.org/services/ook

---

## ZIP已知明文攻击

ZIP的加密算法大致分为两种ZipCrypto和AES-256,各自又分Deflate和Store。

- ZipCrypto Deflate
- ZipCrypto Store
- AES-256 Deflate
- AES-256 Store

ZipCrypto算是传统的zip加密方式。只有使用ZipCrypto Deflate /Store才可以使用 ZIP已知明文攻击进行破解。
 传统的ZIP已知明文攻击利用，windows下可以使用AZPR，linux下可以使用bkcrack。

并不需要知道压缩文件中完整的明文，只需在已知加密压缩包中的少部分明文字节时即可进行攻击破解。而各类文件都有其自身固定的文件格式，结合这类格式，极大扩展了ZIP明文攻击的攻击面。
具体要求如下：

    至少已知明文的12个字节及偏移，其中至少8字节需要连续。
    明文对应的文件加密方式为ZipCrypto Store

该方法对于ZIP加密的算法有要求，明文对应的文件加密方式需要为ZipCrypto Store。经测试，Winrar（v5.80）、7zip（v19.00）默认状态下加密使用的就是AES256算法，直接排除。360压缩（v4.0.0.1220）、好压（v6.2）使用的是ZipCrypto，不固定使用Store或Deflate（如果要固定使用ZipCrypto Store算法加密，可以在压缩的时候指定压缩方式为“存储”)。
工具：**bkcrack**

```
bkcrack常用参数：
-c 提取的密文部分
-p 提取的明文部分  可以有多个-p参数
-x 压缩包内目标文件的偏移地址  部分已知明文值
-C 加密压缩包
-o offset  -p参数指定的明文在压缩包内目标文件的偏移量  可以有多个-o参数配合-p参数
```

例如：

```
检查加密算法
bkcrack -L flag.zip


用明文字符爆破
bkcrack -C flag.zip -c "明文.exe" -p test -o 64

用明文文件爆破
bkcrack -c flag.zip -p known.bin
```

参数解释：

- **`time`**：测量命令执行时间
- **`bkcrack`**：已知明文攻击工具
- **`-C flag.zip`**：目标加密ZIP文件
- **`-c "明文.exe"`**：加密ZIP中的加密文件（已知其明文内容）
- **`-p test`**：已知的明文文件（用于攻击）
- **`-o 64`**：从偏移量64字节开始匹配

**test明文部分的构造**

这里有一个知识点，exe文件的16进制中都会有`This program cannot be run in DOS mode.`这句话，通常偏移量都为64，所以可以构造一个压缩包。

```
echo -n "0E1FBA0E00B409CD21B8014CCD21546869732070726F6772616D2063616E6E6F742062652072756E20696E20444F53206D6F64652E0D0D0A2400000000000000" | xxd -r -ps > test


# 方法1：echo + printf
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR' > PNGHEAD

# 方法2：Python
python -c "open('PNGHEAD','wb').write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR')"

# 方法3：十六进制转换
echo "89504E470D0A1A0A0000000D49484452" | xxd -r -p > PNGHEAD
```

爆破之后得到三段密钥，然后修改密码

```
bkcrack -C flag.zip  -k eec878a3 6808e48f 3aa41bd8 -U decrypt.zip 123456
```

将加密的压缩包解压为decyrpt.zip，密码为123456。然后用123456解压decrypt.zip，打开flag.txt即可

---

## 垃圾邮件解密

解密网站：

https://www.spammimic.com/

SpamMimic 是一种利用垃圾邮件格式隐藏信息的隐写术工具，通过将信息编码为看似正常的邮件内容实现信息隐藏。 ‌

**功能：**

SpamMimic  通过特定编码方式将消息隐藏在邮件正文中，接收方需使用相同工具解码。例如，输入“Hide a message in  Spam”后生成的邮件内容会包含大量无关字符（如“This mail is being sent in compliance with  Senate bill 1626, Title 4; Section 309”），这些内容实际是加密后的隐藏信息。 ‌

例如：

```
Dear Professional ; Especially for you - this cutting-edge 
intelligence ! If you no longer wish to receive our 
publications simply reply with a Subject: of "REMOVE" 
and you will immediately be removed from our club . 
This mail is being sent in compliance with Senate bill 
2216 ; Title 9 ; Section 303 ! This is not multi-level 
marketing ! Why work for somebody else when you can 
become rich in 66 days ! Have you ever noticed more 
people than ever are surfing the web and most everyone 
has a cellphone . Well, now is your chance to capitalize 
on this . WE will help YOU process your orders within 
seconds and sell more ! You are guaranteed to succeed 
because we take all the risk ! But don't believe us 
. Mrs Anderson of Indiana tried us and says "I was 
skeptical but it worked for me" . We assure you that 
we operate within all applicable laws . You will blame 
yourself forever if you don't order now . Sign up a 
friend and you'll get a discount of 10% ! Thank-you 
for your serious consideration of our offer ! 
```

解密之后

```
flag{123}
```

---

## 加密pdf密码爆破-pdfcrack

一般是在kali使用pdfcrack工具来进行爆破

使用方法：

```
# 基础语法
pdfcrack -f 文件名.pdf

# 使用字典攻击
pdfcrack -f 文件.pdf -w 字典文件.txt

# 指定字符集进行暴力破解
pdfcrack -f 文件.pdf -c "abcdefghijklmnopqrstuvwxyz"

# 设置最小最大密码长度
pdfcrack -f 文件.pdf -n 4 -x 8

# 组合使用
pdfcrack -f 文件.pdf -w 字典.txt -n 6


支持明文攻击
pdfcrack -f 文件 -p 已知明文 -o 偏移量
# 或者，如果你知道文件头，通常不需要指定偏移量，因为工具知道标准位置
pdfcrack -f 文件 -p 已知明文
```

---

## git信息泄露与git文件恢复

Git是分布式版本控制系统，在项目目录中生成`.git`文件夹，包含完整的版本历史、分支、提交记录等元数据。如果此文件夹被意外部署到生产环境，攻击者可以利用它恢复敏感信息。

信息收集

```
# 查看所有提交历史
git log --oneline --all

# 查看所有分支
git branch -a
```

---

搜索flag

```
# 搜索所有历史中的flag{
git grep "flag{" $(git rev-list --all)

# 搜索flag关键词
git grep -n "flag" $(git rev-list --all)

# 按内容搜索提交
git log -S "flag{" --oneline
```

---

文件恢复

```
# 查看flag.txt文件历史
git log --oneline -- flag.txt

# 恢复文件到最新版本
git checkout HEAD -- flag.txt

# 从特定提交恢复文件
git checkout <commit_hash> -- flag.txt

# 查看文件在某个提交中的内容
git show <commit_hash>:flag.txt
```

---

深度搜索

```
# 查看所有被删除的文件
git log --diff-filter=D --summary

# 显示提交的详细修改内容
git show <commit_hash>

# 查看某次提交的所有文件
git show --name-only <commit_hash>
```

---

实战一条龙

```
# 1. 看历史
git log --oneline --all

# 2. 搜flag
git grep "flag{" $(git rev-list --all)

# 3. 找文件
git log --oneline --all --name-only | grep flag

# 4. 恢复文件
git show <commit_hash>:flag.txt
```

---

## **vc容器加密卷分析**Volume Analysis****

当题目文件出现以下特征时，考虑加密卷挂载：

- **.vhd**、**.vmdk**、**.img**、**.dmg** 等虚拟磁盘文件
- **bitlocker**、**Veracrypt**、**LUKS** 加密容器
- 文件头包含加密卷特征签名

先得到密码，然后利用VeraCrypt工具挂载，最后输入密码，即可得到加密卷中的内容

---

## windows内存取证-volatility 

内存取证是指在计算机或其他数字设备运行时，通过对其随时存储的内存数据进行采集、分析和提取，以获取有关设备状态、操作过程和可能存在的安全事件的信息。内存取证是数字取证的一个重要分支，用于从计算机的RAM（随机存取存储器）或其他设备的内存中提取关键信息，以便了解设备在特定时间点的状态和活动

这里用volatility 工具操作

常见流程：

### **确定系统：**

```
./volatility -f hellohacker.raw imageinfo

假设得到
# Suggested Profile(s) : Win7SP1x64, Win7SP0x64, Win2008R2SP0x64, Win2008R2SP1x64‘

也可以使用
./volatility -f hellohacker.raw kdbgscan
```

确定正确的 Profile ，通常选择**第一个建议的 Profile**（`Win7SP1x64`）

---

### 判断恶意进程：

```
查找异常连接
./volatility -f hellohacker.raw --profile=Win7SP1x64 netscan
恶意指标：
    ✅ 连接到已知恶意IP（如你的 125.216.248.74:11451）
    ✅ 使用非标准端口（11451 不是常见服务端口）
    ✅ 大量外联连接（僵尸网络特征）
    ✅ 连接到TOR节点、VPS服务商
    ✅ 本地端口与进程不匹配（如 word.exe 监听端口）
```

各种连接状态的含义

| **ESTABLISHED** | **活跃连接** | **正在通信，可能正在传输数据或接收指令** |
| --------------- | ------------ | ---------------------------------------- |
| LISTEN          | 监听端口     | 可能开启后门，等待连接                   |
| CLOSE_WAIT      | 等待关闭     | 连接即将结束                             |
| TIME_WAIT       | 等待超时     | 连接刚结束                               |
| SYN_SENT        | 连接尝试中   | 正在尝试建立连                           |

#### **其他检测恶意进程的方法：**

```
检查DNS缓存
./volatility -f hellohacker.raw --profile=Win7SP1x64 dns_cache
恶意软件通常会查询C2服务器的域名。




查看进程列表
./volatility -f hellohacker.raw --profile=Win7SP1x64 pslist
恶意进程特征：
    名称伪装：svch0st.exe、csrsss.exe、explorer.exe（多一个s）
    随机名称：fhe83j.exe、xqwe91.dll
    位于异常路径：C:\Temp\、C:\Windows\Fonts\、C:\Users\Public\
    无公司信息：虽然需其他工具验证，但可以怀疑
    
    
    
查看进程树
./volatility -f hellohacker.raw --profile=Win7SP1x64 pstree
```

#### **检测到恶意进程后的下一步**

这里需要先了解PID

**PID（Process IDentifier，进程标识符）** 是操作系统给每个运行中的进程分配的**唯一数字编号**。

```
# 1. 找到是哪个进程建立了这个连接
./volatility -f hellohacker.raw --profile=Win7SP1x64 netscan | grep "125.216.248.74:11451"

# 2. 检查该进程的详细信息
./volatility -f hellohacker.raw --profile=Win7SP1x64 cmdline -p [发现的PID]
./volatility -f hellohacker.raw --profile=Win7SP1x64 dlllist -p [发现的PID]

# 3. 提取该进程进行深入分析
./volatility -f hellohacker.raw --profile=Win7SP1x64 procdump -p [发现的PID] -D ./
```

---

### **获取主机名称**

**使用 envars 环境变量（推荐）**

```
./volatility -f hellohacker.raw --profile=Win7SP1x64 envars -p 4
    -p 4 指定系统进程（通常是 csrss.exe 或 system），这些进程包含系统环境变量
    查找 COMPUTERNAME 或 USERNAME 变量
    
./volatility -f hellohacker.raw --profile=Win7SP1x64 envars | findstr "COMPUTERNAME"

# 只查看系统关键进程的环境变量
./volatility -f hellohacker.raw --profile=Win7SP1x64 envars -p 4,284,788 | findstr "COMPUTERNAME"
```

**使用注册表方法（备选）**

```
./volatility -f hellohacker.raw --profile=Win7SP1x64 printkey -K "ControlSet001\Control\ComputerName\ComputerName"
```

---

### 获取用户登录密码

```
./volatility -f hellohacker.raw --profile=Win7SP1x64 hashdump > hash.txt

    hashdump：提取 Windows SAM 数据库中的用户密码哈希
    > hash.txt：将输出重定向到 hash.txt 文件，便于后续分析
    
预期输出格式：
Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
John:1001:aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c:::
哈希格式解释
用户名:RID:LM哈希:NTLM哈希:::
```

#### 密码破解

```
# 使用 john the ripper 破解哈希
john --format=NT hash.txt

# 使用 hashcat 破解
hashcat -m 1000 -a 0 hash.txt wordlist.txt

或者直接上在线网站解密
例如：
cmd5.com
https://www.sojson.com/hash.html#google_vignette
```

---

## snow隐写

Snow隐写是隐写术中的一种技术，通过在文本文件的末尾嵌入空格和制表位的方式来嵌入隐藏信息。

Snow隐写，也被称为HTML隐写，其原理是在文本文件的末尾通过特定模式的空格和制表位来嵌入隐藏信息。不同的空格与制表位组合可以代表不同的嵌入信息。

Snow隐写通常使用特定的工具来实现信息的隐藏和提取，比如`snow.exe`。该工具允许用户通过命令行参数来操作隐藏和提取过程。

**使用方法：**

**隐藏信息**

```
snow.exe -C -m "被隐藏的信息" -p "密码" 文件名
```

例如：

```
snow.exe -C -m "I am lying" -p "hello world" infile outfile
```

---

**提取信息：**

```
snow.exe -C -p "密码" outfile
```

例如：

```
snow.exe -C -p "brainfuckisgooooood" 1.txt
```

- `-C`：开启加密功能，确保隐藏信息的安全性。
- `-m "message"`：指定要隐藏的秘密信息（需用引号包裹）。
- `-p "password"`：设置加密密码（需用引号包裹）。
- `<input>`：原始载体文件路径（如 `original_text.txt`）。
- `<output>`：输出文件路径（如 `output_text.txt`）。

```
snow.exe -C -m "Secret message" -p "123456" original_text.txt output_text.txt
```

---

## sstv隐写

慢扫描电视（SSTV）是一种业余无线电通信技术，用于通过音频传输静态图像。图像被编码为音频信号，接收端需使用解码软件还原为图像

**常用工具：RX-SSTV、qsstv**

qsstv使用方法：

1. **配置音频输入**‌：启动 QSSTV，进入 `Options -> Configuration -> Sound`，选择 `From file` 作为音频输入源。‌25
2. ‌**解码音频文件**‌：点击软件中的播放按钮，选择提供的音频文件（如 `attachment.wav`），软件会自动解码并生成图像。‌23

---

## SMTP流量

SMTP（简单邮件传输协议）是用于发送电子邮件的核心协议。在流量层面，SMTP通信通常涉及特定的端口、握手过程和数据模式，即使在加密（如SMTPS或STARTTLS）后，仍可通过一些特征进行识别和分析。‌

---

## RTP流量

RTP（实时传输协议）是用于传输音频和视频等实时数据的核心协议，通常与RTCP（实时控制协议）配合使用，以实现流媒体的传输和质量监控是一种语音通话技术

wireshark中有电话的选项，可以选中分析rtp流，并且播放

一般flag都在音频里

---

## clocked-pixel隐写(带密码的lsb图片隐写)

可以看做是带密码的lsb图片隐写，直接用zsteg或者stegsolve无法得到隐写的数据。

可以使用puzzler中的clocked-pixel隐写爆破工具和解密工具

---

## 文本隐水印

文本隐水印是一种信息隐藏技术，它将机密信息（如文本、标识符或数字标记）秘密嵌入到文本文件中，使得这些信息在正常阅读或使用时不可见或难以察觉，但可以通过特定算法或工具进行检测和提取。‌

在线解密网站： **https://www.guofei.site/pictures_for_blog/app/text_watermark/v1.html**

---

## gaps和montage工具使用

例子：

用montage命令将120张图片拼接成一张图片，通过分析查看所有图片的分辨率都为200*100；

```
montage  -tile 10x12 -geometry 200x100+0+0 *jpg flag.jpg

-tile 10x12：指定拼接后的图片布局为 10 列 x 12 行，即总共 120 张图片
-geometry 200x100+0+0：每张小图的宽度为200像素，高度为100像素，图片之间的水平和垂直间距为0像素。
```

然后用gaps工具重新组合

```
python3 -m gaps.cli run flag.jpg solution.jpg --generations=90 --population=120 --size=100

flag.jpg：原图片
solution.jpg：重新组合后的图片
--generations=90：指定遗传算法的迭代次数为90代
--population=120：指定120张图片
--size=100：指定拼图块的大小为100x100像素
```

---

```
关于gasp
–image 指向拼图的路径
–size 拼图块的像素尺寸
–generations 遗传算法的代的数量
–population 个体数量
–verbose 每一代训练结束后展示最佳结果
–save 将拼图还原为图像

size比较重要，这里影响着图片数量，图片数量要和本来的图片数相等
 



在这个命令下

“–generations” 设置的参数多少都可以，最好就等于原始图片的数量，也就是piece的数量

“–size” 这个参数是最关键的，程序会根据这个选项设置的参数来判断piece的数量

size如何确定？

这道题的图片有一个特点，那就是宽是长的两倍，所以我们可以将一张子图片视为两张拼图（每张拼图是正方形的）

于是有，拼图的宽度，也就是size为200/2=100

关于montage
resize后是最终合成图片的长x宽

在这个命令下



-geometry +0+0的用处是让图片之间没有间隙

tile后是从左往右张数x从上往下张数（宽的图片数x长的图片数）

*.jpg指目标为目录下所有的jpg格式图片

拼图碎片的大小越大，最后解出来的图片越精准。（但图片太大的话，gaps进程会被kill掉，所以合理的大就行了）

所以我们这里把原来的图片长度200，宽度100，我们就统一放大2倍，所以-geometry 400x200
```

---

## office2john.py+hashcat与Accent OFFICE Password Recovery（Office和WPS文档破解密码）

Office和WPS文档破解密码

方法1：使用office2john.py+hashcat

```
获取文件的hash值 office2john.py

python office2john.py filename.xx
```

Hashcat是一款强大的密码p解工具，可以通过不同的攻击模式来p解各种加密算法（如MD5、SHA1\SHA256、MYSQL、PDF等）的密码。

例如：

```
hashcat -a 3 -m 9500 --force hash.txt --increment --increment-min 1 --increment-max 6 ?d?d?d?d?d?d

然后
hashcat -m [哈希模式编号] [你的哈希文件] --show

hashcat -m 9500 hash.txt --show
```

方法2：

使用Accent OFFICE Password Recovery工具爆破

---

## 钥匙信号(PT224X)

**钥匙信号(PT224X) = 同步引导码(8bit) + 地址位(20bit) + 数据位(4bit) + 停止码(1bit).**

---

## windows取证之evtx文件分析

`.evtx` 文件是 **Windows 系统的事件日志文件格式**，用于记录操作系统中各种事件（如用户登录、程序崩溃、安全操作、系统错误等），是应急响应、运维监控、取证分析中非常重要的证据来源。

**使用系统自带事件查看器**

- 打开方式：按 `Win + R` → 输入 `eventvwr.msc`
- 或直接双击 `.evtx` 文件，默认会用“事件查看器”打开

**应急响应中常用的 Windows 安全事件 ID 一览**

| 事件 ID              | 含义                                                         | 用途                                                         |
| :------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| 4776                 | 表示系统正在进行一次账户凭据（通常是 NTLM）验证              | 它用于审计认证行为并排查爆破、口令错误和可疑登录来源。       |
| **4624**             | 成功登录                                                     | 查看登录行为（Logon Type 很关键）                            |
| **4625**             | 登录失败                                                     | 密码爆破、非法尝试登录                                       |
| **4648**             | 使用凭证尝试登录（凭据传递）                                 | 黑客 lateral movement（横向移动）关键痕迹                    |
| **4663**             | 尝试访问对象                                                 | 说明某个进程、账户尝试访问了一个文件、注册表或对象，并触发了对象访问审核 |
| **4672**             | 特权账户登录                                                 | 域管、管理员登录，非常敏感，要重点关注                       |
| **4688**             | 创建新进程                                                   | 查看恶意程序或脚本是怎么启动的                               |
| **4689**             | 进程退出                                                     | 与 4688 配套，分析程序生命周期                               |
| **4697**             | 安装新服务                                                   | 后门、远控软件可能以服务形式安装                             |
| **7045**（系统日志） | 服务已安装                                                   | 同上，用于分析服务型恶意行为                                 |
| **1102**             | 清除安全日志                                                 | 黑客常做的反取证行为，高危！                                 |
| **1074**             | 某个进程（如 explorer.exe、svchost.exe）代表某个用户，发起了系统的 **重启 / 关机 / 注销** | 黑客使用修改后的用户重启系统                                 |
| **4720**             | 创建新用户账户                                               | 黑客添加后门账户                                             |
| **4722**             | 启用用户账户                                                 | 恢复禁用账户，也可能是绕过                                   |
| **4723**             | 用户尝试修改密码（自己）                                     | 用户被钓鱼、密码猜测                                         |
| **4724**             | 管理员重置其他用户密码                                       | 域控内 lateral movement 常见操作                             |
| **4725**             | 禁用账户                                                     | 尝试锁死某个账户，或清理痕迹                                 |
| **4728**             | 用户加入到安全组                                             | 黑客将账户加入 administrators                                |
| **4732**             | 用户加入到本地组                                             | 可能赋予了权限                                               |
| **4738**             | 用户账户被更改                                               | 黑客修改登录用户，包括但不限于用户名的更改                   |
| **4740**             | 账户被锁定                                                   | 爆破迹象（多次登录失败）                                     |

---

## SMB流量&NTLM认证解密

- **是什么：SMB（Server Message Block）是一种主要用于文件共享、打印机共享以及访问网络中其他资源（如命名管道）的协议。**

- **SMB协议流量主要分为以下几个阶段**

  1、 tcp 三次握手

  2、会话建立(Negotiate Protocol)：

  客户端发送Negotiate Protocol Request ，其中包含客户端支持的smb协议版本列表以及SMB Header信息

  服务端发送Negotiate Protocol Response，包含服务器选择的协议版本、会话密钥 等

  3、会话设置（Session Setup）

---

**NTLMSSP 是使用 NTLM 协议进行身份验证的 Microsoft 协议。**

**客户端向服务器发送一个请求**
**服务器接收到请求后，生成一个8位的Challenge，发送回客户端**
**客户端接收到Challenge后，使用登录用户的密码hash对Challenge加密，作为response发送给服务器**
**服务器校验response**

服务端返回DNS 计算机名、DNS域名、支持的密钥协议，

还有 NTLM Server Challenge = 3dfaefbce47bc2db

客户端发送主机名、用户名，session key ，NTLM Response进行传输

NTLM Response: 6142a67953e5b519cb3c95d7f2f7520b630acbab2a8978de

账户admin的密码 + NTLM Server Challenge 生成NTLM Response，进行传输验证

返回STATUS_SUCCESS 表示成功

返回NT Status: STATUS_LOGON_FAILURE (0xc000006d)，表示登入失败	

---

SMB2常使用了ntlm v2加密协议进行身份认证

这时可以得到Net-NTLMhash后可进行爆破获取密码

### 需要手动组装 net-ntlm hash

例如强网杯2024谍影重重5.0

先从开头的SMB2建立会话入手，可知进行过一次成功的连接，并有加密流量传输。从包121、122中可提取出相关信息进行爆破：

```
Domain name: .
User name: tom
NTLM Server Challenge: c1dec53240124487
NTProofStr: ca32f9b5b48c04ccfa96f35213d63d75
Session Key: 5643a37f253b00b2f52df1afd48c1514
modifiedntlmv2response(去除 NTProofStr 后的一整个 NTLM Response 流): 010100000000000040d0731fb92adb01221434d6e24970170000000002001e004400450053004b0054004f0050002d004a0030004500450039004d00520001001e004400450053004b0054004f0050002d004a0030004500450039004d00520004001e004400450053004b0054004f0050002d004a0030004500450039004d00520003001e004400450053004b0054004f0050002d004a0030004500450039004d0052000700080040d0731fb92adb0106000400020000000800300030000000000000000100000000200000bd69d88e01f6425e6c1d7f796d55f11bd4bdcb27c845c6ebfac35b8a3acc42c20a001000000000000000000000000000000000000900260063006900660073002f003100370032002e00310036002e003100300035002e003100320039000000000000000000

# 组合方式：username::domain:ServerChallenge:NTproofstring:modifiedntlmv2response
tom::.:c1dec53240124487:ca32f9b5b48c04ccfa96f35213d63d75:010100000000000040d0731fb92adb01221434d6e24970170000000002001e004400450053004b0054004f0050002d004a0030004500450039004d00520001001e004400450053004b0054004f0050002d004a0030004500450039004d00520004001e004400450053004b0054004f0050002d004a0030004500450039004d00520003001e004400450053004b0054004f0050002d004a0030004500450039004d0052000700080040d0731fb92adb0106000400020000000800300030000000000000000100000000200000bd69d88e01f6425e6c1d7f796d55f11bd4bdcb27c845c6ebfac35b8a3acc42c20a001000000000000000000000000000000000000900260063006900660073002f003100370032002e00310036002e003100300035002e003100320039000000000000000000





hashcat -m 5600 administrator:::9d92b46171a87637:4103e8d84572fa74f220ecc20be704c1:010100000000000048bac1a9bc72dc01447637675159784300000000010004004400430002000a004400450031004100590003001800440043002e00640065003100610079002e0063006f006d0004001200640065003100610079002e0063006f006d0005001200640065003100610079002e0063006f006d000700080048bac1a9bc72dc0109000e0063006900660073002f00440043000000000000000000

hashcat -m 5600 admin:::b3526269d4453b24:7368589eef94d340237823caa7835c29:01010000000000000df2dfd2bc72dc016447555468675a780000000002000a0044004500310041005900010004004400430004001200640065003100610079002e0063006f006d0003001800440043002e00640065003100610079002e0063006f006d0005001200640065003100610079002e0063006f006d00070008000df2dfd2bc72dc0109000e0063006900660073002f00440043000000000000000000 rockyou.txt


hashcat -m 5600 administrator::10.10.10.201:1bc5fc0895e43776:dbd99d0c694af38fde25d4e7332e3828:0101000000000000506f2734bc72dc0100000000000000000000000002000a0044004500310041005900010004005000430004001200640065003100610079002e0063006f006d0003001800500043002e00640065003100610079002e0063006f006d0005001200640065003100610079002e0063006f006d0007000800560aaa24bc72dc010000000000000000


```

这里可以使用tshark提取

```
# username domain ntproofstr ntresponse
tshark -n -r dy.pcapng -Y 'ntlmssp.messagetype == 0x00000003' -T fields -e ntlmssp.auth.username -e ntlmssp.auth.domain -e ntlmssp.ntlmv2_response.ntproofstr -e ntlmssp.auth.ntresponse



# ntlmserverchallenge
tshark -n -r traffic.pcapng -Y 'ntlmssp.messagetype == 0x00000002' -T fields -e ntlmssp.ntlmserverchallenge
```

使用组合后的hash在hashcat中爆破。这

得到Net-NTLMhash后可进行爆破获取密码

```
hashcat -m 5600 tom::.:c1dec53240124487:ca32f9b5b48c04ccfa96f35213d63d75:010100000000000040d0731fb92adb01221434d6e24970170000000002001e004400450053004b0054004f0050002d004a0030004500450039004d00520001001e004400450053004b0054004f0050002d004a0030004500450039004d00520004001e004400450053004b0054004f0050002d004a0030004500450039004d00520003001e004400450053004b0054004f0050002d004a0030004500450039004d0052000700080040d0731fb92adb0106000400020000000800300030000000000000000100000000200000bd69d88e01f6425e6c1d7f796d55f11bd4bdcb27c845c6ebfac35b8a3acc42c20a001000000000000000000000000000000000000900260063006900660073002f003100370032002e00310036002e003100300035002e003100320039000000000000000000 ./rockyou.txt --force --show
```

得到明文密码：`tom:babygirl233`

使用下面的脚本得到解密用的session key

```
from Crypto.Cipher import ARC4
from Crypto.Hash import MD4, MD5, HMAC

password = 'babygirl233'

# 计算 NTLM Hash（明文密码 -> MD4(UTF-16-LE)）
passwordHash = MD4.new(password.encode('utf-16-le')).hexdigest()

# 从抓包中提取的值
username = 'tom'
domain = '.'
ntProofStr = 'ca32f9b5b48c04ccfa96f35213d63d75'   # 从 NTLMv2 Response 中提取
serverChallenge = 'c1dec53240124487'              # 从 NTLM Challenge 中提取
sessionKey = '5643a37f253b00b2f52df1afd48c1514'   # 加密的 Session Key（抓包中获取）

# 步骤1：计算 Response Key
# HMAC-MD5(NTLM Hash, (Username+Domain).encode('utf-16-le'))
responseKey = HMAC.new(
    bytes.fromhex(passwordHash), 
    (username.upper() + domain.upper()).encode('utf-16-le'), 
    MD5
).digest()

# 步骤2：计算 Key Exchange Key
# HMAC-MD5(ResponseKey, NTProofStr)
keyExchangeKey = HMAC.new(
    responseKey, 
    bytes.fromhex(ntProofStr), 
    MD5
).digest()

# 步骤3：解密 Session Key
# RC4(KeyExchangeKey, EncryptedSessionKey)
decryptedSessionKey = ARC4.new(keyExchangeKey).decrypt(bytes.fromhex(sessionKey))

print('Decrypted SMB Session Key is: {}'.format(decryptedSessionKey.hex()))
```

**得到Session Key为a3abe4d64394909a641062342ffe291b，和Session ID0900000000100000组合起来，放入Wireshark中的SMB2解密。（这里的Session ID要转换为小端序） Wireshark提取SMB文件，得到flag压缩包和某个机器的某证书**

在wireshark中 点击编辑–>首选项–>protocols–>smb2

将session key和session id输入进入

点击确定就可以解密smb流量了

**也可以直接在首选项-NTLMSSP输入NT Password，wireshark会自动解密**

在文件导出对象–>smb对象中，可以导出一些文件

---

## RDP协议&使用Wireshark解密Windows远程桌面

RDP是微软开发的远程桌面协议，让用户能通过网络远程操作另一台电脑的图形化桌面。一个RDP会话的流量中包含多种数据类型：

| 数据类型       | 具体内容                  |
| :------------- | :------------------------ |
| **图形界面**   | 屏幕图像、窗口绘制指令    |
| **输入设备**   | 键盘按键、鼠标移动/点击   |
| **剪贴板**     | 复制粘贴的文本、文件      |
| **设备重定向** | 本地打印机、磁盘、USB设备 |
| **认证数据**   | 登录凭证、证书交换        |

RDP流量默认是**加密传输**的，在Wireshark中直接查看只能看到乱码。解密RDP流量的主要目的包括：

- **安全分析**：调查可疑的远程登录行为、横向移动攻击
- **协议调试**：开发RDP客户端或分析协议细节
- **CTF解题**：从RDP会话中提取隐藏信息或密码

### 解密RDP流量的核心方法

RDP通常使用**TLS/SSL加密**，解密的关键是获取RDP服务器的**私钥**。一旦拥有私钥，Wireshark就能像服务器一样解密所有使用该密钥建立的会话。

### 操作流程总览

| 步骤 | 操作                         | 目的                       |
| :--- | :--------------------------- | :------------------------- |
| 1    | 客户端组策略禁用前向保密套件 | 确保会话可用服务器私钥解密 |
| 2    | 从RDP服务端提取证书和私钥    | 获取解密所需的关键文件     |
| 3    | 抓取RDP通信流量              | 获得待解密的pcap文件       |
| 4    | Wireshark载入私钥            | 配置解密                   |
| 5    | 验证并分析明文RDP数据        | 获取所需信息               |

### 步骤一 从RDP服务端提取私钥

#### 方法一：使用Jailbreak工具（推荐）

1. 从GitHub下载Jailbreak二进制文件

2. 以**管理员权限**运行命令：

   text

   ```
   jailbreak64.exe %WINDIR%\system32\mmc.exe %WINDIR%\system32\certlm.msc -64
   ```

   

3. 在打开的证书管理器中，展开`远程桌面` → `证书`

4. 右键点击RDP证书 → **所有任务** → **导出**

5. 选择**是，导出私钥** → 格式选**个人信息交换(PFX)** → 设置密码

#### 方法二：使用Mimikatz

Mimikatz也可以提取RDP服务端证书，适用于某些场景。

---

### 步骤二 转换证书格式（获取私钥）

将导出的`.pfx`文件拷贝到Linux系统（或WSL），用OpenSSL提取私钥

```
# 提取私钥（PEM格式）
openssl pkcs12 -in server_certificate.pfx -nocerts -out server_key.pem -nodes

# 移除密码保护
openssl rsa -in server_key.pem -out server.key
```

得到的`server.key`就是Wireshark需要的私钥文件。

---

### 步骤三  Wireshark中配置解密

1. 打开抓包文件
2. **编辑** → **首选项** → **Protocols** → **TLS**（或**SSL**）
3. 点击**RSA Keys List**旁边的**Edit**按钮
4. 添加一行：
   - **IP Address**：RDP服务器的IP地址
   - **Port**：`3389`
   - **Protocol**：`tpkt`（RDP over TLS使用此标识）
   - **Key File**：选择步骤3生成的`server.key`文件
5. 点击**OK**保存

---

这里依然以谍影重重5.0举例

前面我们已经解密了SMB流量

解密后直接导出SMB对象得到一些文件，发现了证书和flag.7z

```
flag.7z
LOCAL_MACHINE_Remote Desktop_0_DESKTOP-J0EE9MR.der
LOCAL_MACHINE_Remote Desktop_0_DESKTOP-J0EE9MR.pfx
```

提示了下是本地RDP的证书

我们这里利用openssl

将证书通过密码`mimikatz`解密后将TLS解密

```
# 第一步：从PFX提取私钥（PEM格式）
openssl pkcs12 -in 证书文件.pfx -nocerts -out server_key.pem -nodes -passin pass:mimikatz

# 第二步：移除密码保护，生成Wireshark可用的.key文件
openssl rsa -in server_key.pem -out server.key
```

在wireshark中 点击编辑–>首选项–>protocols–>TLS–>RSA etitor

将证书导入

解密后进行PDU导出，得到一份新的pcap流量

然后通过

### pyrdp-convert

```
pyrdp-convert -o output qwe.pcap
```

转换为pyrdp可读的文件，然后加载pyrdp的GUI来看RDP的操作，发现在下述找到提示

```markup
<Return pressed>
<Return released>the
<Shift pressed>
<Shift released>
<Space pressed>
<Space released>7z
<Space pressed>
<Space released>password
<Space pressed>
<Space released>is
<Space pressed>
<Space released>f'
<Shift pressed>{
<Shift released>windows
<Shift pressed>_
<Shift released>password
<Shift pressed>}
<Shift released>9347013182'
<Control pressed>s
<Control released>

# the 7z password is f'{windows_password}9347013182'
```

拼起来后猜测这里的`windows_password`就是Tom的密码，于是替换Tom的密码后拼接为`babygirl2339347013182`成功解压出flag.txt

---

### wireshark筛选

也可以不用pyrdp-convert使用wireshar筛选

wireshark 添加筛选

```
rdp.fastpath.scancode.keycode
```

在wireshar中 点击文件–>导出分组解析结果–>json  ，导出后的内容如下

## scancode

**Scancode**（扫描码）是键盘硬件为每个按键生成的唯一标识符。当您按下或释放一个键时，键盘会通过 USB/PS2 接口向计算机发送一个数字，这个数字就是 Scancode。

scancode的值是16进制的数据，用下面脚本，映射出键盘的按键

```
import json

scancode_map = {
    0x01: 'Esc', 0x02: '1', 0x03: '2', 0x04: '3', 0x05: '4',
    0x06: '5', 0x07: '6', 0x08: '7', 0x09: '8', 0x0A: '9',
    0x0B: '0', 0x0C: '-', 0x0D: '=', 0x0E: 'B', 0x0F: '    ',
    0x10: 'Q', 0x11: 'W', 0x12: 'E', 0x13: 'R', 0x14: 'T',
    0x15: 'Y', 0x16: 'U', 0x17: 'I', 0x18: 'O', 0x19: 'P',
    0x1A: '[', 0x1B: ']', 0x1C: '\n', 0x1D: 'Ctrl', 0x1E: 'A',
    0x1F: 'S', 0x20: 'D', 0x21: 'F', 0x22: 'G', 0x23: 'H',
    0x24: 'J', 0x25: 'K', 0x26: 'L', 0x27: ';', 0x28: "'",
    0x29: '`', 0x2A: ' Shift ', 0x2B: '\\', 0x2C: 'Z', 0x2D: 'X',
    0x2E: 'C', 0x2F: 'V', 0x30: 'B', 0x31: 'N', 0x32: 'M',
    0x33: ',', 0x34: '.', 0x35: '/', 0x36: ' Shift ', 0x37: '*',
    0x38: ' Alt ', 0x39: ' ', 0x3A: ' Caps ', 0x3B: 'F1', 0x3C: 'F2',
    0x3D: 'F3', 0x3E: 'F4', 0x3F: 'F5', 0x40: 'F6', 0x41: 'F7',
    0x42: 'F8', 0x43: 'F9', 0x44: 'F10', 0x45: ' Num ', 0x46: ' Scr ',
    0x47: ' Home', 0x48: ' Up ', 0x49: ' PgUp', 0x4A: 'K-', 0x4B: ' Left',
    0x4C: 'K5', 0x4D: ' Right', 0x4E: 'K+', 0x4F: ' End', 0x50: ' Down',
    0x51: ' PgDn', 0x52: ' Ins', 0x53: ' Del', 0x57: 'F11', 0x58: 'F12'
}

with open("1.txt", "r", encoding="utf-8") as file:
    data = json.load(file)

keycodes = []
for packet in data:
    def find_keycodes(obj):
        results = []
        if isinstance(obj, dict):
            for k, v in obj.items():
                if 'keycode' in k.lower() and isinstance(v, str) and v.startswith('0x'):
                    results.append(int(v, 16))
                else:
                    results.extend(find_keycodes(v))
        elif isinstance(obj, list):
            for item in obj:
                results.extend(find_keycodes(item))
        return results
    keycodes.extend(find_keycodes(packet))

filtered_keycodes = []
for kc in keycodes:
    if not filtered_keycodes or kc != filtered_keycodes[-1]:
        filtered_keycodes.append(kc)

print(''.join(scancode_map.get(kc, '?') for kc in filtered_keycodes))
```

还有一个专用的json脚本

```
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RDP 键盘流量解密脚本
用于解析从 Wireshark 导出的 JSON 格式 RDP 流量中的键盘事件
"""

import json
import sys
from typing import List, Dict, Optional

# 标准 PS/2 扫描码到 ASCII 字符的映射表
# 基于 PS/2 扫描码 Set 1
SCANCODE_MAP = {
    # 基本按键
    0x01: 'ESC',
    0x02: '1', 0x03: '2', 0x04: '3', 0x05: '4', 0x06: '5',
    0x07: '6', 0x08: '7', 0x09: '8', 0x0a: '9', 0x0b: '0',
    0x0c: '-', 0x0d: '=', 0x0e: 'BACKSPACE',
    0x0f: 'TAB',
    0x10: 'q', 0x11: 'w', 0x12: 'e', 0x13: 'r', 0x14: 't',
    0x15: 'y', 0x16: 'u', 0x17: 'i', 0x18: 'o', 0x19: 'p',
    0x1a: '[', 0x1b: ']', 0x1c: 'ENTER',
    0x1d: 'LCTRL',
    0x1e: 'a', 0x1f: 's', 0x20: 'd', 0x21: 'f', 0x22: 'g',
    0x23: 'h', 0x24: 'j', 0x25: 'k', 0x26: 'l', 0x27: ';',
    0x28: "'", 0x29: '`',
    0x2a: 'LSHIFT',
    0x2b: '\\', 0x2c: 'z', 0x2d: 'x', 0x2e: 'c', 0x2f: 'v',
    0x30: 'b', 0x31: 'n', 0x32: 'm', 0x33: ',', 0x34: '.',
    0x35: '/', 0x36: 'RSHIFT',
    0x37: '*', 0x38: 'LALT',
    0x39: 'SPACE',
    0x3a: 'CAPSLOCK',
    0x3b: 'F1', 0x3c: 'F2', 0x3d: 'F3', 0x3e: 'F4', 0x3f: 'F5',
    0x40: 'F6', 0x41: 'F7', 0x42: 'F8', 0x43: 'F9', 0x44: 'F10',
    0x45: 'NUMLOCK', 0x46: 'SCROLLLOCK',
    0x47: 'HOME', 0x48: 'UP', 0x49: 'PGUP',
    0x4a: '-', 0x4b: 'LEFT', 0x4c: 'CENTER', 0x4d: 'RIGHT',
    0x4e: '+', 0x4f: 'END', 0x50: 'DOWN', 0x51: 'PGDN',
    0x52: 'INS', 0x53: 'DEL',
    0x57: 'F11', 0x58: 'F12',
    # 扩展扫描码 (extended = 1)
    0x1c: 'ENTER',      # 小键盘 Enter
    0x1d: 'RCTRL',      # 右 Ctrl
    0x35: '/',          # 小键盘 /
    0x37: 'PRINTSCREEN', # Print Screen
    0x38: 'RALT',       # 右 Alt (AltGr)
    0x47: 'HOME',       # 小键盘 7
    0x48: 'UP',         # 小键盘 8
    0x49: 'PGUP',       # 小键盘 9
    0x4b: 'LEFT',       # 小键盘 4
    0x4d: 'RIGHT',      # 小键盘 6
    0x4f: 'END',        # 小键盘 1
    0x50: 'DOWN',       # 小键盘 2
    0x51: 'PGDN',       # 小键盘 3
    0x52: 'INS',        # 小键盘 0
    0x53: 'DEL',        # 小键盘 .
}

class RDPKeyboardParser:
    def __init__(self, json_file: str):
        """
        初始化 RDP 键盘解析器

        Args:
            json_file: Wireshark 导出的 JSON 文件路径
        """
        self.json_file = json_file
        self.packets = []
        self.key_events = []
        self.shift_pressed = False
        self.caps_lock_on = False

    def load_packets(self) -> None:
        """加载 JSON 文件中的数据包"""
        try:
            with open(self.json_file, 'r', encoding='utf-8') as f:
                self.packets = json.load(f)
            print(f"成功加载 {len(self.packets)} 个数据包")
        except Exception as e:
            print(f"加载 JSON 文件失败: {e}")
            sys.exit(1)

    def extract_scancode_events(self) -> None:
        """从数据包中提取 RDP Scancode 事件"""
        for packet in self.packets:
            try:
                # 获取 layers 部分
                layers = packet.get('_source', {}).get('layers', {})

                # 检查是否有 RDP 层
                if 'rdp' not in layers:
                    continue

                rdp_layer = layers['rdp']

                # 查找 Scancode 事件
                if 'Scancode' in rdp_layer and isinstance(rdp_layer['Scancode'], dict):
                    self._process_scancode(rdp_layer['Scancode'], layers)

            except Exception as e:
                # 跳过解析错误的数据包
                print(f"Error processing packet: {e}")
                continue

    def _process_scancode(self, scancode_data: dict, layers: dict) -> None:
        """
        处理单个 Scancode 事件

        Args:
            scancode_data: Scancode 数据字典
            layers: 完整的 layers 字典，用于获取时间戳
        """
        try:
            # eventheader 是字符串，eventheader_tree 是字典
            eventheader_tree = scancode_data.get('rdp.fastpath.eventheader_tree', {})

            # 获取事件标志
            is_release = eventheader_tree.get('rdp.fastpath.scancode.release', 0) == 1
            is_extended = eventheader_tree.get('rdp.fastpath.scancode.extended', 0) == 1

            # 获取按键码
            keycode = scancode_data.get('rdp.fastpath.scancode.keycode', '')
            if isinstance(keycode, str) and keycode.startswith('0x'):
                keycode_int = int(keycode, 16)
            else:
                keycode_int = int(keycode) if keycode else 0

            # 获取时间戳
            frame = layers.get('frame', {})
            timestamp = frame.get('frame.time', '')
            frame_number = frame.get('frame.number', '')

            # 只记录按键按下事件（不记录释放事件）
            if not is_release:
                key_event = {
                    'timestamp': timestamp,
                    'frame_number': frame_number,
                    'keycode': keycode_int,
                    'extended': is_extended,
                    'raw_keycode': keycode
                }
                self.key_events.append(key_event)

        except Exception as e:
            # 跳过解析错误的事件
            print(f"Error processing scancode event: {e}")
            pass

    def scancode_to_key(self, keycode: int, extended: bool = False) -> str:
        """
        将扫描码转换为按键名称

        Args:
            keycode: 扫描码 (十进制整数)
            extended: 是否为扩展扫描码

        Returns:
            按键名称
        """
        # 基础按键映射
        key = SCANCODE_MAP.get(keycode, f'UNKNOWN(0x{keycode:02x})')

        # 处理 Shift 修饰键
        if key == 'LSHIFT' or key == 'RSHIFT':
            self.shift_pressed = True
            return key
        elif key == 'CAPSLOCK':
            self.caps_lock_on = not self.caps_lock_on
            return key

        # 处理字母大小写
        if len(key) == 1 and key.isalpha():
            if self.shift_pressed != self.caps_lock_on:
                key = key.upper()
            else:
                key = key.lower()

        # 处理 Shift + 数字/符号
        elif len(key) == 1 and self.shift_pressed:
            shift_map = {
                '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
                '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
                '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|',
                ';': ':', "'": '"', '`': '~', ',': '<', '.': '>',
                '/': '?'
            }
            key = shift_map.get(key, key)

        return key

    def reconstruct_keystrokes(self) -> str:
        """
        重建击键序列

        Returns:
            重构的击键字符串
        """
        result = []

        for event in self.key_events:
            keycode = event['keycode']
            extended = event['extended']

            # 重置修饰键状态（在下一个按键之前）
            if keycode not in [0x2a, 0x36, 0x1d, 0x38, 0x3a]:  # Shift, Ctrl, Alt, CapsLock
                self.shift_pressed = False

            key = self.scancode_to_key(keycode, extended)
            result.append(key)

        return ' '.join(result)

    def parse(self) -> None:
        """执行完整的解析流程"""
        print("=" * 60)
        print("RDP 键盘流量解密工具")
        print("=" * 60)

        # 1. 加载数据包
        print("\n[1/3] 加载数据包...")
        self.load_packets()

        # 2. 提取 Scancode 事件
        print("\n[2/3] 提取键盘事件...")
        self.extract_scancode_events()
        print(f"找到 {len(self.key_events)} 个按键事件")

        # 3. 重建击键序列
        print("\n[3/3] 重建击键序列...")
        keystrokes = self.reconstruct_keystrokes()

        # 输出结果
        print("\n" + "=" * 60)
        print("解析结果:")
        print("=" * 60)
        print(f"\n按键总数: {len(self.key_events)}")
        print(f"\n击键序列:\n{keystrokes}")

        # 详细信息（前 50 个按键）
        print(f"\n前 50 个按键详情:")
        print("-" * 60)
        for i, event in enumerate(self.key_events[:50]):
            keycode = event['keycode']
            extended = event['extended']
            timestamp = event['timestamp']

            key = self.scancode_to_key(keycode, extended)

            print(f"[{i+1:3d}] {timestamp} | Code: 0x{keycode:02x}({keycode:3d}) | Key: {key}")

            # 重置修饰键状态
            if keycode not in [0x2a, 0x36, 0x1d, 0x38, 0x3a]:
                self.shift_pressed = False

        if len(self.key_events) > 50:
            print(f"... 还有 {len(self.key_events) - 50} 个按键事件")

        return keystrokes


def main():
    if len(sys.argv) != 2:
        print("用法: python rdp_keyboard_decrypt.py <json_file>")
        print("示例: python rdp_keyboard_decrypt.py 1.json")
        sys.exit(1)

    json_file = sys.argv[1]

    # 检查文件是否存在
    try:
        with open(json_file, 'r') as f:
            pass
    except FileNotFoundError:
        print(f"错误: 文件 '{json_file}' 不存在")
        sys.exit(1)
    except Exception as e:
        print(f"错误: 无法读取文件 '{json_file}': {e}")
        sys.exit(1)

    # 创建解析器并执行解析
    parser = RDPKeyboardParser(json_file)
    keystrokes = parser.parse()

    # 保存结果到文件
    output_file = json_file.replace('.json', '_keystrokes.txt')
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"RDP 键盘流量解密结果\n")
            f.write(f"=" * 60 + "\n\n")
            f.write(f"按键总数: {len(parser.key_events)}\n\n")
            f.write(f"击键序列:\n")
            f.write(keystrokes + "\n\n")
            f.write(f"详细按键事件:\n")
            f.write("-" * 60 + "\n")

            # 重新处理以获取详细列表
            parser.shift_pressed = False
            parser.caps_lock_on = False
            for i, event in enumerate(parser.key_events):
                keycode = event['keycode']
                extended = event['extended']
                timestamp = event['timestamp']
                frame_num = event['frame_number']

                key = parser.scancode_to_key(keycode, extended)

                f.write(f"[{i+1:4d}] Frame {frame_num} | {timestamp} | Code: 0x{keycode:02x}({keycode:3d}) | Key: {key}\n")

                if keycode not in [0x2a, 0x36, 0x1d, 0x38, 0x3a]:
                    parser.shift_pressed = False

        print(f"\n结果已保存到: {output_file}")
    except Exception as e:
        print(f"保存结果文件失败: {e}")


if __name__ == '__main__':
    main()
```

---

## winrm流量

**WinRM流量**，简单来说，就是当管理员使用Windows远程管理服务去操控另一台电脑时，在网络上产生的所有通信数据。

WinRM流量最核心的特征是：**基于HTTP/SOAP的标准化远程管理协议，使用固定的HTTP端口（5985/5986），以XML格式承载管理指令。**

### 特征

这是最直接、最基础的识别特征，适合在防火墙或流量监控设备上设置初步过滤。

| 特征项       | 特征值                           | 说明                                                         |
| :----------- | :------------------------------- | :----------------------------------------------------------- |
| **传输协议** | **HTTP** 或 **HTTPS**            | WinRM是基于Web服务管理规范（WS-Management）实现的，因此使用HTTP作为传输协议。 |
| **默认端口** | **5985 (HTTP)** **5986 (HTTPS)** | 这是WinRM的专用端口，区别于传统的WMI/DCOM通信。              |
| **URI路径**  | **`/wsman`**                     | 所有WinRM请求都会指向这个特定的端点（Endpoint）。            |
| **HTTP方法** | 主要为 **`POST`**                | 用于执行命令和获取数据。                                     |

**流量过滤示例**：

- 你可以通过 `tcp.port == 5985 or tcp.port == 5986` 快速筛选出WinRM流量。
- 或者使用 `http.request.uri contains "/wsman"` 来精准定位WinRM的HTTP请求。

如果你正在分析一个具体的流量包，可以直接在Wireshark中使用 `tcp.port == 5985 or http.request.uri contains "/wsman"` 这样的过滤器，就能快速定位到WinRM通信。







