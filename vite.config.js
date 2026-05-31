import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

console.log("=========================================");
console.log("   JOUL VITE CONFIGURATION IS LOADING   ");
console.log("=========================================");

export default defineConfig({
  plugins: [
    {
      name: 'joul-sync-api',
      configureServer(server) {
        console.log("=== CONFIGURE SERVER HOOK WAS CALLED ===");
        
        server.middlewares.use((req, res, next) => {
          // API Route: Save Journal Entry
          if (req.url.startsWith('/api/save') && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const { date, data } = JSON.parse(body);
                if (!date || !data) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing date or data' }));
                  return;
                }
                
                const syncDir = 'C:\\Code_By_Rudra\\Joul\\JOUL DATA';
                
                // Ensure directory exists
                if (!fs.existsSync(syncDir)) {
                  fs.mkdirSync(syncDir, { recursive: true });
                }
                
                const filePath = path.join(syncDir, `${date}.json`);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, path: filePath }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          }
          // API Route: Load Journal Entry 
          else if (req.url.startsWith('/api/load') && req.method === 'GET') {
            const url = new URL(req.url, 'http://localhost');
            const date = url.searchParams.get('date');
            
            if (!date) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing date' }));
              return;
            }
            
            const syncDir = 'C:\\Code_By_Rudra\\Joul\\JOUL DATA';
            const filePath = path.join(syncDir, `${date}.json`);
            
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, data: JSON.parse(content) }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'File not found' }));
            }
          } 
          // API Route: List saved Journal dates
          else if (req.url.startsWith('/api/list') && req.method === 'GET') {
            const syncDir = 'C:\\Code_By_Rudra\\Joul\\JOUL DATA';
            if (fs.existsSync(syncDir)) {
              try {
                const files = fs.readdirSync(syncDir);
                const dates = files
                  .filter(file => file.endsWith('.json'))
                  .map(file => file.replace('.json', ''));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, dates }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, dates: [] }));
            }
          } else {
            next();
          }
        });
      }
    }
  ]
});
