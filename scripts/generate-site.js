const https = require('https');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// URLs públicas de los JSON generados por n8n (configurables mediante variables de entorno)
const CAMPAIGNS_JSON_URL = process.env.CAMPAIGNS_JSON_URL || 'https://proyectos.aldeapucela.org/exports/participa/campaigns.json';

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
  
  // 5. Generar páginas individuales de cada campaña (excepto las externas)
  console.log('📝 Generating campaign pages...');
  for (const campaign of activeCampaigns) {
    if (!campaign.external_url) {
      await generateCampaignPage(campaign);
    } else {
      console.log(`  ⏭️  Skipping external campaign: ${campaign.slug}`);
    }
  }
  
  // 6. Limpiar carpetas de campañas que ya no existen
  console.log('🧹 Cleaning up old campaign folders...');
  cleanupOldCampaigns(activeCampaigns);
  
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
    <link rel="icon" type="image/png" href="favicon.png">
    <link rel="apple-touch-icon" href="favicon.png">
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
            </p>
            
            <div class="space-y-4">
                ${campaigns.map(campaign => {
                    const href = campaign.external_url || `/${campaign.slug}/`;
                    const target = campaign.external_url ? ' target="_blank" rel="noopener noreferrer"' : '';
                    return `
                <div class="border border-gray-200 rounded-lg p-4 hover:bg-aldeapucela-light transition-colors">
                    <a href="${href}"${target} class="flex items-center gap-3">
                        <i data-lucide="${campaign.icon}" class="h-16 w-16 text-aldeapucela"></i>
                        <div>
                            <h2 class="font-medium text-aldeapucela">${campaign.title}</h2>
                            <p class="text-sm text-gray-600">${campaign.description}</p>
                        </div>
                    </a>
                </div>
                `;
                }).join('')}
            </div>
        </div>

        <!-- Footer -->
        <div class="bg-white sm:p-6 p-4 rounded-lg shadow-sm border border-gray-100 mt-4">
            <div class="text-center max-w-2xl mx-auto">
                <h2 class="text-xl font-semibold text-primary mb-4">Síguenos para más novedades</h2>
                <p class="text-primary text-sm mb-6">Mantente al día de iniciativas, debates y más</p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <a href="https://t.me/aldeapucela" target="_blank" class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <i data-lucide="send" class="h-8 w-8 sm:h-12 sm:w-12 text-blue-500"></i>
                        <span class="text-sm font-medium">Telegram</span>
                    </a>
                    <a href="https://foro.aldeapucela.org" target="_blank" class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <i data-lucide="message-square" class="h-8 w-8 sm:h-12 sm:w-12 text-green-600"></i>
                        <span class="text-sm font-medium">Foro</span>
                    </a>
                    <a href="https://creators.spotify.com/pod/show/aldea-pucela" target="_blank" class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <i data-lucide="podcast" class="h-8 w-8 sm:h-12 sm:w-12 text-purple-600"></i>
                        <span class="text-sm font-medium">Podcasts</span>
                    </a>
                    <a href="https://bsky.app/profile/pucelobot.aldeapucela.org" target="_blank" class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div id="bluesky-icon" class="h-8 w-8 sm:h-12 sm:w-12"></div>
                        <span class="text-sm font-medium">BlueSky</span>
                    </a>
                </div>
            </div>
        </div>

        <!-- Bloque de licencia -->
        <div class="bg-white sm:p-6 p-4 rounded-lg shadow-sm border border-gray-100">
            <div class="flex items-center gap-3 text-sm text-gray-600">
                <i data-lucide="copyright" class="h-12 w-12"></i>
                <p>
                    El contenido está bajo licencia 
                    <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank">
                        Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
                    </a>
                </p>
                <p>
                    <a href="https://github.com/aldeapucela/participa" target="_blank">
                        Código
                    </a>
                </p>
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

function cleanupOldCampaigns(activeCampaigns) {
  const rootDir = path.join(__dirname, '..');
  // Solo considerar campañas internas (sin external_url) para el cleanup
  const activeSlugs = new Set(activeCampaigns.filter(c => !c.external_url).map(c => c.slug));
  
  // Leer todos los directorios en la raíz
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const dirName = entry.name;
    
    // Ignorar directorios especiales
    const ignoredDirs = ['.git', '.github', 'node_modules', 'scripts', '_templates', 'js', 'css', 'img', 'video'];
    if (ignoredDirs.includes(dirName) || dirName.startsWith('.')) continue;
    
    // Si el directorio no está en las campañas activas, eliminarlo
    if (!activeSlugs.has(dirName)) {
      const dirPath = path.join(rootDir, dirName);
      console.log(`  🗑️  Removing old campaign folder: ${dirName}`);
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }
}

async function generateCampaignPage(campaign) {
  const slug = campaign.slug;
  
  // Las stats se cargan dinámicamente en el frontend, no necesitamos descargarlas aquí
  console.log(`  📝 Generating page for ${slug}...`);
  
  // 1. Cargar template
  const templatePath = path.join(__dirname, '..', '_templates', 'campaign.html');
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  
  // 2. Registrar partial de barrios
  const barriosPartialPath = path.join(__dirname, '..', '_templates', 'partials', 'barrios-options.html');
  const barriosPartial = fs.readFileSync(barriosPartialPath, 'utf8');
  Handlebars.registerPartial('barrios-options', barriosPartial);
  
  // 2.1. Registrar helper json
  Handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context);
  });
  
  // 3. Compilar template
  const template = Handlebars.compile(templateSource);
  
  // 4. Generar HTML con Handlebars (sin stats, se cargan en frontend)
  const html = template({ campaign });

  // 5. Crear carpeta si no existe
  const campaignDir = path.join(__dirname, '..', slug);
  if (!fs.existsSync(campaignDir)) {
    fs.mkdirSync(campaignDir, { recursive: true });
  }
  
  // 6. Escribir archivo
  const campaignPath = path.join(campaignDir, 'index.html');
  fs.writeFileSync(campaignPath, html, 'utf8');
  console.log(`  ✅ Generated: ${slug}/index.html`);
}

// Ejecutar
generate().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
