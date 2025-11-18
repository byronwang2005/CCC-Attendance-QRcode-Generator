# UNNC中国文化课签到二维码生成器

> 一键生成中国文化课（CCC）签到二维码，无需安装 Python，开箱即用！

---
## ⚠️ 因CCC课程系统升级，本程序或已经失效

- 本repo将被标记为archived
- 事实上，你可以忽略本repo所有内容

---

## 特别声明

- 本程序作为开源娱乐项目，严禁用于中国文化课代签！
- 作者保留对非法使用本程序者追责的权利！

---

## 如何使用？

1. **前往 [Releases 页面](https://github.com/byronwang2005/CCC-Attendance-QRcode-Generator/releases)**  

2. 根据你的电脑系统，下载对应文件：
   - **Windows 用户** → 下载 `CCC_Attendance_Windows_x64.zip`
   - **Mac 用户** → 下载 `CCC_Attendance_macOS.zip`

3. 解压 ZIP 文件，双击运行程序：
   - Windows：运行 `CCC Attendance.exe`
   - Mac：双击 `CCC Attendance.app`（首次打开若提示“无法验证开发者”，请右键 → “打开”）

4. 按照程序内指引操作：
   - 粘贴课程链接（从手机浏览器“查看详情”复制）
   - 选择 **自动模式**（推荐）
   - 扫描生成的二维码即可签到！

二维码会自动保存为 `qrcode.png`（在程序同目录下）

---

## 如何获取课程链接？

1. 在 **手机浏览器**（如 Safari / Chrome）中打开：  
   [https://ccc.nottingham.edu.cn/study/](https://ccc.nottingham.edu.cn/study/)
2. 找到你要签到的课程，**长按“查看详情”按钮**
3. 选择 **“复制链接地址”**
4. 链接格式应为：  
   `https://ccc.nottingham.edu.cn/study/home/details?scheduleId=xxxx`

> 请勿修改链接，直接粘贴到程序中即可。

---

## 常见问题

**Q：Mac 打不开 `.app`，提示“已损坏”或“无法验证开发者”？**  
A：这是 macOS 的安全限制。请**右键点击应用 → 选择“打开”**，即可绕过。

**Q：签到失败？**  
A：请确认：
   - 你处于 **eduroam/UNNC-Living等校园网** 或 **IT-Service提供的VPN**
   - 课程正在进行中（非提前/过期签到）
   - 链接复制完整

**Q：未来能用于SPDPO课程吗？**  
A：不能。SPDPO签到已经被BAN，本工具**仅支持 CCC 课程**。

---

> **提示**：99% 的情况请使用 **自动模式**，无需手动输入时间！

---

**Made with ❤️ for UNNC students**  
By Byron | [GitHub](https://github.com/byronwang2005/CCC-Attendance-QRcode-Generator)
