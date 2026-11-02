# File Service Local - Seed

Servicio local de archivos para Seed (Node.js + Express):
- `src/`: Controladores para `/api/files/upload` y `/api/files/download/:id`, con verificación de token Bearer de Supabase y hashing SHA-256.
- `storage/`: Carpeta física en el equipo institucional donde se guardan los archivos PDF y DOCX subidos.
