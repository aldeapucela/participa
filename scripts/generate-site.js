const https = require('https');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// URLs públicas de los JSON generados por n8n
const CAMPAIGNS_JSON_URL = 'https://proyectos.aldeapucela.org/exports/participa/campaigns.json';
const STATS_BASE_URL = 'https://proyectos.aldeapucela.org/exports/participa/stats/';

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
  
  // 4. Generar index.html
  console.log('📝 Generating index.html...');
  generateIndexPage(activeCampaigns);
  
  // 5. Generar páginas individuales de cada campaña
  console.log('📝 Generating campaign pages...');
  for (const campaign of activeCampaigns) {
    await generateCampaignPage(campaign);
  }
  
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

async function generateCampaignPage(campaign) {
  const slug = campaign.slug;
  
  // 1. Descargar stats de esta campaña
  let stats = {
    totales: { total_reclamaciones: 0, total_barrios: 0, barrios: {} },
    historico_diario: {},
    historico_semanal: []
  };
  
  try {
    const statsUrl = `${STATS_BASE_URL}stats-${slug}.json`;
    stats = await fetchJSON(statsUrl);
    console.log(`  ✅ Loaded stats for ${slug}`);
  } catch (err) {
    console.log(`  ⚠️  No stats found for ${slug}, using defaults`);
  }
  
  // 2. Generar HTML (por ahora simple)
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${campaign.title} - Aldea Pucela</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/lucide@0.482.0/dist/umd/lucide.min.js"></script>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body class="bg-gray-100 min-h-screen sm:p-8 p-2">
    <div class="max-w-2xl mx-auto space-y-2">
        <a href="/" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <i data-lucide="arrow-left" class="h-4 w-4"></i>
            volver a campañas
        </a>
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
            <div class="flex items-center gap-2 mb-4">
                <i data-lucide="${campaign.icon}" class="h-12 w-12 lg:h-6 lg:w-6 text-aldeapucela"></i>
                <h1 class="text-xl font-semibold text-aldeapucela">${campaign.title}</h1>
            </div>

            <div class="flex justify-center gap-8 pt-2">
                <div class="flex items-center gap-2">
                    <i data-lucide="users" class="h-5 w-5 text-aldeapucela"></i>
                    <span class="font-bold text-aldeapucela">${stats.totales.total_reclamaciones}</span> reclamaciones
                </div>
                <div class="flex items-center gap-2">
                    <i data-lucide="building-2" class="h-5 w-5 text-aldeapucela"></i>
                    <span class="font-bold text-aldeapucela">${stats.totales.total_barrios}</span> barrios
                </div>
            </div>

            <p class="text-gray-600 text-sm bg-aldeapucela-light p-6 rounded-lg">
                ${campaign.description}
                <br /><br />
                <strong>🚧 Página generada automáticamente desde NocoDB</strong>
            </p>
            
            <div class="bg-gray-50 p-4 rounded-lg">
                <h2 class="font-semibold mb-3 text-aldeapucela">Estadísticas por barrio</h2>
                <ul class="divide-y divide-gray-200">
                    ${Object.entries(stats.totales.barrios)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 10)
                      .map(([barrio, count]) => `
                        <li class="py-2 flex justify-between items-center">
                            <span class="text-gray-700">${barrio || '(sin especificar)'}</span>
                            <span class="bg-aldeapucela-light px-2 py-1 rounded text-sm">${count}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    </div>

    <script>
        lucide.createIcons();
    </script>
</body>
</html>`;

  // 3. Crear carpeta si no existe
  const campaignDir = path.join(__dirname, '..', slug);
  if (!fs.existsSync(campaignDir)) {
    fs.mkdirSync(campaignDir, { recursive: true });
  }
  
  // 4. Escribir archivo
  const campaignPath = path.join(campaignDir, 'index.html');
  fs.writeFileSync(campaignPath, html, 'utf8');
  console.log(`  ✅ Generated: ${slug}/index.html`);
}

// Ejecutar
generate().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
