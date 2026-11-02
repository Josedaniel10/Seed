import type { Plugin } from 'vite';
import { saveFileLocally, readFileLocally, STORAGE_DIR } from './fileService.ts';
import path from 'path';

export function fileServicePlugin(): Plugin {
  return {
    name: 'seed-file-service-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Endpoint: POST /api/files/upload
        if (url.startsWith('/api/files/upload') && req.method === 'POST') {
          try {
            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            req.on('end', () => {
              const fullBuffer = Buffer.concat(chunks);
              
              // Parse basic JSON payload { fileName, fileBase64, mimeType }
              try {
                const body = JSON.parse(fullBuffer.toString('utf8'));
                const fileBuffer = Buffer.from(body.fileBase64, 'base64');
                const result = saveFileLocally(body.fileName, fileBuffer, body.mimeType);

                if (!result.success) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: result.error }));
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify(result.metadata));
              } catch {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Payload JSON inválido para subida de archivo' }));
              }
            });
            return;
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            const msg = err instanceof Error ? err.message : 'Error interno';
            return res.end(JSON.stringify({ error: msg }));
          }
        }

        // Endpoint: GET /api/files/download/:name
        if (url.startsWith('/api/files/download/') && req.method === 'GET') {
          const fileName = decodeURIComponent(url.replace('/api/files/download/', ''));
          const readResult = readFileLocally(fileName);

          if (!readResult.success || !readResult.buffer) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: readResult.error || 'Archivo no encontrado' }));
          }

          res.statusCode = 200;
          res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fileName)}"`);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('X-Seed-Sha256', readResult.hashSha256 || '');
          return res.end(readResult.buffer);
        }

        next();
      });
    },
  };
}
