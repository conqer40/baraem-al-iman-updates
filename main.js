const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

let mainWindow = null;
let whatsappWindow = null;
let whatsappQueue = [];
let whatsappSending = false;
let whatsappStopped = false;
const WHATSAPP_PARTITION = 'persist:whatsapp';
const WHATSAPP_SEND_DELAY_MS = 3000;

function getAppDataDir() {
    try {
        const exeDir = path.dirname(app.getPath('exe'));
        const portableDir = path.join(exeDir, 'nursery-data');
        if (!fs.existsSync(portableDir)) {
            fs.mkdirSync(portableDir, { recursive: true });
        }
        const testFile = path.join(portableDir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return portableDir;
    } catch (_) {
        const fallbackDir = path.join(app.getPath('userData'));
        fs.mkdirSync(fallbackDir, { recursive: true });
        return fallbackDir;
    }
}

function getStateFilePath() {
    const primaryDir = getAppDataDir();
    const primaryFile = path.join(primaryDir, 'nursery-state.json');
    if (fs.existsSync(primaryFile)) return primaryFile;

    try {
        const fallbackFile = path.join(app.getPath('userData'), 'nursery-state.json');
        if (fs.existsSync(fallbackFile)) return fallbackFile;
    } catch (_) {}

    return primaryFile;
}

ipcMain.on('nursery-state:load', (event) => {
    try {
        const file = getStateFilePath();
        event.returnValue = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    } catch (error) {
        console.error('Unable to read nursery state:', error);
        event.returnValue = '';
    }
});

ipcMain.on('nursery-state:save', (event, serializedState) => {
    try {
        const file = getStateFilePath();
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, String(serializedState), 'utf8');
        event.returnValue = { ok: true };
    } catch (error) {
        console.error('Unable to save nursery state:', error);
        event.returnValue = { ok: false, error: error.message };
    }
});

const https = require('https');
const http = require('http');

function fetchRemoteFile(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, { headers: { 'User-Agent': 'Baraem-Al-Iman-Updater/1.0', 'Cache-Control': 'no-cache' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchRemoteFile(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP Error ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', chunk => { chunks.push(chunk); });
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

ipcMain.handle('app:update-files', async (event, { baseUrl, files = ['app.js', 'styles.css', 'index.html', 'ai-logic.js', 'version.json', 'logo.png', 'hero_bg.png'] }) => {
    try {
        const appDir = __dirname;
        const results = [];
        for (const filename of files) {
            const rawUrl = `${baseUrl.replace(/\/+$/, '')}/${filename}?t=${Date.now()}`;
            try {
                const buf = await fetchRemoteFile(rawUrl);
                if (buf && buf.length > 20) {
                    const targetPath = path.join(appDir, filename);
                    fs.writeFileSync(targetPath, buf);
                    results.push({ file: filename, success: true });
                } else {
                    results.push({ file: filename, success: false, error: 'Empty file' });
                }
            } catch (err) {
                results.push({ file: filename, success: false, error: err.message });
            }
        }
        return { ok: true, results };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('app:reload', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            await mainWindow.webContents.session.clearCache();
        } catch (_) {}
        mainWindow.webContents.loadFile(path.join(__dirname, 'index.html'));
        return { ok: true };
    }
    return { ok: false };
});

function sendWhatsappStatus(status) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('whatsapp:status', status);
    }
}

function ensureWhatsappWindow() {
    if (whatsappWindow && !whatsappWindow.isDestroyed()) return whatsappWindow;
    const chromeVersion = process.versions.chrome || '140.0.0.0';
    const chromeMajor = chromeVersion.split('.')[0];
    const chromeUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    whatsappWindow = new BrowserWindow({
        width: 1100,
        height: 760,
        title: 'واتساب — براعم الإيمان',
        parent: mainWindow || undefined,
        webPreferences: {
            partition: WHATSAPP_PARTITION,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
        show: false
    });
    // WhatsApp Web rejects Electron's default user-agent even though the
    // bundled Chromium version is modern. Present the actual Chromium engine
    // as regular Chrome, including its client-hint headers.
    whatsappWindow.webContents.session.setUserAgent(chromeUserAgent);
    whatsappWindow.webContents.setUserAgent(chromeUserAgent);
    whatsappWindow.webContents.session.clearCache().catch(() => {});
    whatsappWindow.webContents.session.webRequest.onBeforeSendHeaders(
        { urls: ['https://web.whatsapp.com/*'] },
        (details, callback) => {
            details.requestHeaders['User-Agent'] = chromeUserAgent;
            details.requestHeaders['sec-ch-ua'] = `"Google Chrome";v="${chromeMajor}", "Chromium";v="${chromeMajor}", "Not_A Brand";v="24"`;
            details.requestHeaders['sec-ch-ua-mobile'] = '?0';
            details.requestHeaders['sec-ch-ua-platform'] = '"Windows"';
            callback({ requestHeaders: details.requestHeaders });
        }
    );
    whatsappWindow.setMenuBarVisibility(false);
    whatsappWindow.on('closed', () => {
        whatsappWindow = null;
        if (whatsappSending) {
            whatsappStopped = true;
            whatsappQueue = [];
            whatsappSending = false;
            sendWhatsappStatus({ state: 'stopped', message: 'تم إيقاف الإرسال وإغلاق نافذة واتساب.' });
        }
    });
    return whatsappWindow;
}

async function waitAndClickWhatsappSend(win) {
    const timeoutAt = Date.now() + 5 * 60 * 1000;
    while (Date.now() < timeoutAt && !win.isDestroyed() && !whatsappStopped) {
        const result = await win.webContents.executeJavaScript(`
            (() => {
                const sendIcon = document.querySelector('[data-icon="send"]');
                const sendButton = sendIcon && sendIcon.closest('button, [role="button"]');
                if (sendButton) {
                    sendButton.click();
                    return 'sent';
                }
                const footer = document.querySelector('footer');
                const composer = footer && footer.querySelector('[contenteditable="true"]');
                if (composer) {
                    composer.focus();
                    document.execCommand('insertText', false, '');
                    return 'ready';
                }
                const qr = document.querySelector('canvas, [data-ref]');
                return qr ? 'login' : 'loading';
            })()
        `, true).catch(() => 'loading');
        if (result === 'sent') return true;
        if (result === 'login') {
            sendWhatsappStatus({
                state: 'login',
                message: 'امسح رمز QR بالموبايل مرة واحدة، وسيكمل البرنامج الإرسال تلقائيًا.'
            });
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    return false;
}

async function processWhatsappQueue() {
    if (whatsappSending || !whatsappQueue.length) return;
    whatsappSending = true;
    whatsappStopped = false;
    while (whatsappQueue.length && !whatsappStopped) {
        const item = whatsappQueue[0];
        const remaining = whatsappQueue.length;
        sendWhatsappStatus({
            state: 'sending',
            message: `جارٍ إرسال الرسالة إلى ${item.name || item.phone} عبر تطبيق واتساب — متبقي ${remaining}`,
            remaining
        });
        const url = `whatsapp://send?phone=${encodeURIComponent(item.phone)}&text=${encodeURIComponent(item.message)}`;
        try {
            await openInWhatsappDesktop(url);
            whatsappQueue.shift();
            sendWhatsappStatus({
                state: 'sent',
                message: `تم إرسال الرسالة إلى ${item.name || item.phone} عبر تطبيق واتساب`,
                remaining: whatsappQueue.length
            });
            if (whatsappQueue.length) {
                await new Promise((resolve) => setTimeout(resolve, WHATSAPP_SEND_DELAY_MS));
            }
        } catch (error) {
            whatsappQueue.shift();
            sendWhatsappStatus({
                state: 'error',
                message: `تعذر الإرسال إلى ${item.name || item.phone}: ${error.message}`,
                remaining: whatsappQueue.length
            });
            if (whatsappQueue.length) {
                await new Promise((resolve) => setTimeout(resolve, WHATSAPP_SEND_DELAY_MS));
            }
        }
    }
    whatsappSending = false;
    if (!whatsappStopped) {
        sendWhatsappStatus({ state: 'complete', message: 'اكتمل إرسال رسائل واتساب.', remaining: 0 });
    }
}

function findGoogleChrome() {
    const candidates = [
        path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
    ];
    return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || '';
}

function openInGoogleChrome(url) {
    return new Promise((resolve, reject) => {
        const chromePath = findGoogleChrome();
        if (!chromePath) {
            shell.openExternal(url).then(resolve).catch(reject);
            return;
        }
        const chrome = spawn(chromePath, ['--new-tab', url], {
            detached: true,
            stdio: 'ignore',
            windowsHide: false
        });
        chrome.once('error', reject);
        chrome.once('spawn', () => {
            chrome.unref();
            resolve();
        });
    });
}

async function openInWhatsappDesktop(url) {
    await shell.openExternal(url);
    await new Promise((resolve) => setTimeout(resolve, 3500));
    const sendEnterScript = [
        '$deadline = (Get-Date).AddSeconds(12)',
        '$keyboard = New-Object -ComObject WScript.Shell',
        'do {',
        '  $target = Get-Process WhatsApp -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1',
        '  if ($target -and $keyboard.AppActivate($target.Id)) {',
        '    Start-Sleep -Milliseconds 900',
        "    $keyboard.SendKeys('{ENTER}')",
        '    exit 0',
        '  }',
        '  Start-Sleep -Milliseconds 500',
        '} while ((Get-Date) -lt $deadline)',
        'exit 1'
    ].join('; ');
    await new Promise((resolve, reject) => {
        const automation = spawn(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', sendEnterScript],
            { windowsHide: true, stdio: 'ignore' }
        );
        automation.once('error', reject);
        automation.once('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error('لم يتمكن البرنامج من تنشيط نافذة واتساب والضغط على إرسال'));
        });
    });
}

ipcMain.on('whatsapp:enqueue', (_event, item) => {
    if (!item || !item.phone || !item.message) return;
    whatsappQueue.push({
        phone: String(item.phone).replace(/\D/g, ''),
        message: String(item.message),
        name: String(item.name || '')
    });
    sendWhatsappStatus({
        state: 'queued',
        message: `تمت إضافة الرسالة للطابور — الإجمالي ${whatsappQueue.length}`,
        remaining: whatsappQueue.length
    });
    processWhatsappQueue();
});

ipcMain.on('whatsapp:open', () => {
    shell.openExternal('whatsapp://').catch((error) => {
        sendWhatsappStatus({ state: 'error', message: `تعذر فتح تطبيق واتساب: ${error.message}` });
    });
});

ipcMain.on('whatsapp:stop', () => {
    whatsappStopped = true;
    whatsappQueue = [];
    whatsappSending = false;
    sendWhatsappStatus({ state: 'stopped', message: 'تم إيقاف طابور الإرسال.', remaining: 0 });
});

ipcMain.on('whatsapp:reset', async () => {
    whatsappStopped = true;
    whatsappQueue = [];
    whatsappSending = false;
    if (whatsappWindow && !whatsappWindow.isDestroyed()) {
        whatsappWindow.destroy();
        whatsappWindow = null;
    }
    try {
        const whatsappSession = session.fromPartition(WHATSAPP_PARTITION);
        await whatsappSession.clearCache();
        await whatsappSession.clearStorageData({
            storages: [
                'cookies',
                'filesystem',
                'indexdb',
                'localstorage',
                'serviceworkers',
                'cachestorage'
            ]
        });
        sendWhatsappStatus({
            state: 'idle',
            message: 'تمت إعادة تهيئة واتساب. افتح نافذة الربط وامسح QR الجديد.',
            remaining: 0
        });
    } catch (error) {
        sendWhatsappStatus({
            state: 'error',
            message: `تعذر تنظيف بيانات واتساب: ${error.message}`,
            remaining: 0
        });
    }
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'logo.png'),
        show: false
    });

    win.maximize();
    win.show();
    win.loadFile('index.html');
    mainWindow = win;
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
