const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess = null;

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  const isPackaged = app.isPackaged;
  const indexPath = isPackaged
    ? path.join(process.resourcesPath, 'app/frontend/dist/index.html')
    : path.join(__dirname, '../frontend/dist/index.html');
  console.log('加载前端页面路径:', indexPath);
  win.loadFile(indexPath).catch(err => {
    console.error('前端页面加载失败:', err);
  });
}

const isPackaged = app.isPackaged;
const backendPath = isPackaged
  ? path.join(process.resourcesPath, 'usbipd-backend.exe')
  : path.join(__dirname, '../backend/usbipd-backend.exe');

app.whenReady().then(() => {
  console.log('启动后端路径:', backendPath);
  try {
    backendProcess = spawn(backendPath, [], {
      stdio: 'ignore',
      detached: true,
      windowsHide: true // 关键：隐藏 cmd 黑框
    });
    backendProcess.on('error', (err) => {
      console.error('后端启动失败:', err);
    });
    backendProcess.on('exit', (code, signal) => {
      console.log('后端进程退出，code:', code, 'signal:', signal);
    });
  } catch (err) {
    console.error('后端启动异常:', err);
  }
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 关闭时杀掉后端进程
app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
}); 