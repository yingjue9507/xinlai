const { exec } = require('child_process');

// 使用HTTP地址打开前端页面（前端服务应该在8080端口运行）
const frontendUrl = 'http://localhost:8080/P-LOGIN.html';

console.log('正在打开预览界面...');

// Windows系统使用start命令打开默认浏览器
if (process.platform === 'win32') {
    exec(`start "" "${frontendUrl}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('打开浏览器失败:', error);
            console.log('💡 提示: 请确保前端服务已启动 (http-server -p 8080)');
            return;
        }
        console.log('✅ 预览界面已打开');
    });
} 
// macOS使用open命令
else if (process.platform === 'darwin') {
    exec(`open "${frontendPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('打开浏览器失败:', error);
            return;
        }
        console.log('✅ 预览界面已打开');
    });
} 
// Linux使用xdg-open命令
else {
    exec(`xdg-open "${frontendPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('打开浏览器失败:', error);
            return;
        }
        console.log('✅ 预览界面已打开');
    });
}