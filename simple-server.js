const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 8000;
const frontendDir = 'D:/Work/Projects/RANovaX/learnSwe/frontend';

const server = http.createServer((req, res) => {
    let filePath = path.join(frontendDir, req.url === '/' ? 'index.html' : req.url);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        const ext = path.extname(filePath);
        let contentType = 'text/html';
        
        if (ext === '.js') contentType = 'text/javascript';
        if (ext === '.css') contentType = 'text/css';
        if (ext === '.json') contentType = 'application/json';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});