const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Создаем папку для загрузок, если её нет
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

let currentElements = [];

// Загрузка картинок/гифок с ПК
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// WebSocket связь для мгновенной синхронизации оверлея и редактора
wss.on('connection', (ws) => {
    // Отправляем текущее состояние при подключении
    ws.send(JSON.stringify({ type: 'SYNC', elements: currentElements }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'UPDATE_ALL') {
                currentElements = data.elements;
                // Рассылаем обновление всем открытым клиентам (и редактору, и OBS)
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'SYNC', elements: currentElements }));
                    }
                });
            }
        } catch (e) {
            console.error('Ошибка обработки WebSocket сообщения:', e);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен! Откройте редактор: http://localhost:${PORT}/control.html`);
});