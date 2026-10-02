# 自动打开浏览器功能说明

## 功能介绍
为了提升开发体验，项目现在支持在重启服务时自动打开内置浏览器并刷新预览界面。

## 使用方法

### 1. 开发模式（推荐）
```bash
npm run dev:auto
```
这个命令会：
- 启动nodemon开发服务器（自动重启）
- 等待2秒确保服务器启动完成
- 自动打开默认浏览器并显示首页预览界面

### 2. 普通开发模式
```bash
npm run dev
```
传统的nodemon模式，不会自动打开浏览器。

### 3. 生产模式
```bash
npm run start:open
```
启动生产服务器并自动打开浏览器。

## 配置说明

### nodemon.json
已配置events事件，在服务器重启时自动触发浏览器打开：
```json
{
  "events": {
    "start": "node scripts/open-browser.js"
  }
}
```

### 浏览器打开脚本
- `scripts/open-browser.js`: 跨平台浏览器打开脚本
- `scripts/dev-with-browser.js`: 开发服务器+自动打开浏览器的组合脚本

## 预览界面
默认打开的页面是：`新版界面/ui_pages_618336854786/P-HOME.html`

## 注意事项
1. 确保系统已安装默认浏览器
2. 如果浏览器没有自动打开，请检查防火墙设置
3. 可以手动在浏览器中访问前端页面进行测试

## 快捷启动
以后每次开发时，只需运行：
```bash
cd backend
npm run dev:auto
```

即可享受自动打开浏览器的便利开发体验！