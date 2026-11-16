const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Файл для постоянного сохранения оверлея
const SAVE_FILE = path.join(__dirname, 'overlay_state.json');
let currentElements = [];

// Загружаем сохраненные элементы при старте
if (fs.existsSync(SAVE_FILE)) {
    try {
        currentElements = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    } catch (e) {
        console.error('Ошибка чтения файла сохранения:', e);
    }
}

app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'SYNC', elements: currentElements }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'UPDATE_ALL') {
                currentElements = data.elements;
                // Сохраняем на диск при каждом изменении
                fs.writeFileSync(SAVE_FILE, JSON.stringify(currentElements, null, 2), 'utf8');

                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'SYNC', elements: currentElements }));
                    }
                });
            }
        } catch (e) {
            console.error('Ошибка обработки WebSocket:', e);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}/control.html`);
});
