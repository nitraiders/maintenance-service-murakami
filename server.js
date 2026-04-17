const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// 静的ファイルの配信設定
const publicPath = path.join(__dirname, 'public');

app.use(express.static(publicPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (path.extname(filePath).toLowerCase() === '.css') {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        }
    }
}));

// SPA対応：すべてのリクエストで index.html を返す
app.get('*', (req, res) => {
    const ext = path.extname(req.path);
    if (ext && ext !== '.html') {
        res.status(404).send('Asset not found');
    } else {
        // キャッシュを物理的に無効化
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(publicPath, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`Maintenance Service Murakami server is running on port ${PORT}`);
    console.log(`Serving from: ${publicPath}`);
});
