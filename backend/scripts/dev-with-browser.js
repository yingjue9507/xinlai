const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动开发服务器并自动打开预览界面...');

// 启动nodemon开发服务器
const nodemon = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
});

// 等待2秒后打开浏览器，确保服务器已启动
setTimeout(() => {
    const { exec } = require('child_process');
    // 使用HTTP地址打开前端页面（前端服务应该在8080端口运行）
    const frontendUrl = 'http://localhost:8080/P-LOGIN.html';
    
    console.log('🌐 正在打开预览界面...');
    
    if (process.platform === 'win32') {
        exec(`start "" "${frontendUrl}"`, (error) => {
            if (error) {
                console.error('❌ 打开浏览器失败:', error.message);
                console.log('💡 提示: 请确保前端服务已启动 (http-server -p 8080)');
            } else {
                console.log('✅ 预览界面已在浏览器中打开');
            }
        });
    } else if (process.platform === 'darwin') {
        exec(`open "${frontendUrl}"`, (error) => {
            if (error) {
                console.error('❌ 打开浏览器失败:', error.message);
                console.log('💡 提示: 请确保前端服务已启动 (http-server -p 8080)');
            } else {
                console.log('✅ 预览界面已在浏览器中打开');
            }
        });
    } else {
        exec(`xdg-open "${frontendUrl}"`, (error) => {
            if (error) {
                console.error('❌ 打开浏览器失败:', error.message);
                console.log('💡 提示: 请确保前端服务已启动 (http-server -p 8080)');
            } else {
                console.log('✅ 预览界面已在浏览器中打开');
            }
        });
    }
}, 2000);

// 处理进程退出
nodemon.on('close', (code) => {
    console.log(`开发服务器已退出，代码: ${code}`);
    process.exit(code);
});

// 处理Ctrl+C
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭开发服务器...');
    nodemon.kill('SIGINT');
});