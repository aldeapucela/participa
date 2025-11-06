const https = require('https');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// URL pública del JSON generado por n8n
const CAMPAIGNS_JSON_URL = 'https://proyectos.aldeapucela.org/exports/participa/campaigns.json';

// Función para descargar el JSON
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Función principal
async function generate() {
  console.log('🚀 Starting campaign generation...');
  
  // 1. Descargar campaigns.json
  console.log('📥 Fetching campaigns data...');
  const campaigns = await fetchJSON(CAMPAIGNS_JSON_URL);
  console.log(`✅ Found ${campaigns.length} campaigns`);
  
  // 2. Filtrar solo activas
  const activeCampaigns = campaigns.filter(c => c.active);
  console.log(`✅ ${activeCampaigns.length} active campaigns`);
  
  // 3. Ordenar por order
  activeCampaigns.sort((a, b) => a.order - b.order);
  
  // Por ahora solo generamos un index.html simple
  // TODO: Generar páginas individuales de campañas
  
  console.log('📝 Generating index.html...');
  generateIndexPage(activeCampaigns);
  
  console.log('✅ Generation complete!');
}

function generateIndexPage(campaigns) {
  // Template simple por ahora
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Participación vecinal - Aldea Pucela</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/lucide@0.482.0/dist/umd/lucide.min.js"></script>
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="bg-gray-100 min-h-screen sm:p-8 p-2">
    <div class="max-w-2xl mx-auto space-y-2">
        <a href="https://aldeapucela.org/" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <i data-lucide="arrow-left" class="h-4 w-4"></i>
            aldeapucela.org
        </a>
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
            <div class="flex items-center gap-2 mb-4">
                <i data-lucide="users" class="h-6 w-6 text-aldeapucela"></i>
                <h1 class="text-xl font-semibold text-aldeapucela">Participación vecinal</h1>
            </div>

            <p class="text-gray-600 text-sm bg-aldeapucela-light p-6 rounded-lg">
                Aquí se listan todas las campañas de participación vecinal de Aldea Pucela y organizaciones afines.
                <br /><br />
                Estas iniciativas buscan fomentar la implicación de la ciudadanía en la toma de decisiones y mejorar la transparencia en la gestión pública.
                <br /><br />
                <strong>🚧 Página generada automáticamente desde NocoDB</strong>
            </p>
            
            <div class="space-y-4">
                ${campaigns.map(campaign => `
                <div class="border border-gray-200 rounded-lg p-4 hover:bg-aldeapucela-light transition-colors">
                    <a href="/${campaign.slug}/" class="flex items-center gap-3">
                        <i data-lucide="${campaign.icon}" class="h-16 w-16 text-aldeapucela"></i>
                        <div>
                            <h2 class="font-medium text-aldeapucela">${campaign.title}</h2>
                            <p class="text-sm text-gray-600">${campaign.description}</p>
                        </div>
                    </a>
                </div>
                `).join('')}
            </div>
        </div>
    </div>

    <script>
        lucide.createIcons();
    </script>
</body>
</html>`;

  // Escribir archivo
  const indexPath = path.join(__dirname, '..', 'index.html');
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`✅ Generated: index.html`);
}

// Ejecutar
generate().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
