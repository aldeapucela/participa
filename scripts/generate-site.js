const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Handlebars = require('handlebars');

// URLs públicas de los JSON generados por n8n (configurables mediante variables de entorno)
const CAMPAIGNS_JSON_URL = process.env.CAMPAIGNS_JSON_URL || 'https://proyectos.aldeapucela.org/exports/participa/campaigns.json';

// Función para generar hash de archivo para cache busting
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
  } catch (e) {
    return Date.now().toString();
  }
}

// Función para extraer URL de social preview desde NocoDB
function getSocialPreviewUrl(campaign) {
  // Si tiene social_preview_img y es un array con elementos
  if (campaign.social_preview_img && Array.isArray(campaign.social_preview_img) && campaign.social_preview_img.length > 0) {
    const img = campaign.social_preview_img[0];
    if (img.path) {
      return `https://proyectos.aldeapucela.org/${img.path}`;
    }
  }
  // Fallback a imagen por defecto
  return 'https://participa.aldeapucela.org/img/social-preview.png';
}

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
  
  // 0. Calcular hashes de CSS y JS para cache busting
  const rootDir = path.join(__dirname, '..');
  const cssHash = getFileHash(path.join(rootDir, 'css', 'style.css'));
  const jsHash = getFileHash(path.join(rootDir, 'js', 'campaign.js'));
  const assetVersions = { css: cssHash, js: jsHash };
  console.log(`🔑 Asset versions: CSS=${cssHash}, JS=${jsHash}`);
  
  // 1. Descargar campaigns.json
  console.log('📥 Fetching campaigns data...');
  const campaigns = await fetchJSON(CAMPAIGNS_JSON_URL);
  console.log(`✅ Found ${campaigns.length} campaigns`);
  
  // 2. Filtrar solo activas
  const activeCampaigns = campaigns.filter(c => c.active);
  console.log(`✅ ${activeCampaigns.length} active campaigns`);
  
  // 3. Procesar social preview URLs y cargar stats
  for (const campaign of activeCampaigns) {
    campaign.social_preview_url = getSocialPreviewUrl(campaign);
    
    // Cargar stats si no es externa
    if (!campaign.external_url) {
      try {
        const statsUrl = `https://proyectos.aldeapucela.org/exports/participa/stats/stats-${campaign.slug}.json`;
        const stats = await fetchJSON(statsUrl);
        campaign.stats = {
          total_reclamaciones: stats.totales?.total_reclamaciones || 0,
          total_barrios: stats.totales?.total_barrios || 0
        };
      } catch (e) {
        console.log(`  ⚠️  Could not load stats for ${campaign.slug}`);
        campaign.stats = { total_reclamaciones: 0, total_barrios: 0 };
      }
    }
  }
  
  // 4. Ordenar por order
  activeCampaigns.sort((a, b) => a.order - b.order);
  
  // 4. Generar index.html
  console.log('📝 Generating index.html...');
  generateIndexPage(activeCampaigns, assetVersions);
  
  // 5. Generar páginas individuales de cada campaña (excepto las externas)
  console.log('📝 Generating campaign pages...');
  for (const campaign of activeCampaigns) {
    if (!campaign.external_url) {
      await generateCampaignPage(campaign, assetVersions);
    } else {
      console.log(`  ⏭️  Skipping external campaign: ${campaign.slug}`);
    }
  }
  
  // 6. Limpiar carpetas de campañas que ya no existen
  console.log('🧹 Cleaning up old campaign folders...');
  cleanupOldCampaigns(activeCampaigns);
  
  console.log('✅ Generation complete!');
}

function generateIndexPage(campaigns, assetVersions) {
  // Template simple por ahora
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Participación vecinal - Aldea Pucela</title>
    <meta name="description" content="Campañas de participación ciudadana de Aldea Pucela y organizaciones afines para fomentar la implicación en la toma de decisiones">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://participa.aldeapucela.org/">
    <meta property="og:title" content="Participación vecinal - Aldea Pucela">
    <meta property="og:description" content="Campañas de participación ciudadana de Aldea Pucela y organizaciones afines para fomentar la implicación en la toma de decisiones">
    <meta property="og:image" content="https://participa.aldeapucela.org/img/social-preview.png">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://participa.aldeapucela.org/">
    <meta property="twitter:title" content="Participación vecinal - Aldea Pucela">
    <meta property="twitter:description" content="Campañas de participación ciudadana de Aldea Pucela y organizaciones afines para fomentar la implicación en la toma de decisiones">
    <meta property="twitter:image" content="https://participa.aldeapucela.org/img/social-preview.png">
    
    <link rel="icon" type="image/png" href="favicon.png">
    <link rel="apple-touch-icon" href="favicon.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/lucide@0.482.0/dist/umd/lucide.min.js"></script>
    <link rel="stylesheet" href="css/style.css?v=${assetVersions.css}">
</head>
<body class="bg-gray-100 min-h-screen sm:p-8 p-2">
    <div class="max-w-2xl mx-auto space-y-2">
        <a href="https://aldeapucela.org/" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <i data-lucide="arrow-left" class="h-4 w-4"></i>
            aldeapucela.org
        </a>
        
        <!-- Hero Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <!-- Hero con imagen -->
            <div class="relative">
                <img src="img/hero-photo.jpg" alt="Vecinos participando" class="w-full h-64 sm:h-80 object-cover">
                <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70"></div>
                <div class="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                    <i data-lucide="users" class="h-12 w-12 mb-3 opacity-90"></i>
                    <h1 class="text-2xl sm:text-4xl font-bold mb-3 drop-shadow-lg">Tu voz cuenta, juntos podemos cambiar las cosas</h1>
                    <p class="text-base sm:text-lg mb-6 max-w-2xl opacity-95 drop-shadow">
                        Crea campañas de participación vecinal en minutos y haz oír tu voz ante el ayuntamiento
                    </p>
                    <a href="https://proyectos.aldeapucela.org/dashboard/#/nc/form/b10b4ff5-cafd-4a1e-8a14-22390a1e6966" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-aldeapucela font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg">
                        <i data-lucide="lightbulb" class="h-5 w-5"></i>
                        Propón una campaña
                    </a>
                </div>
            </div>
            
            <!-- Stats compactos -->
            <div class="p-6 sm:p-8">
                <p class="text-center text-sm sm:text-base text-gray-700 mb-4">En el último año, <strong class="text-aldeapucela">más de 3.000 vecinos/as de 48 barrios</strong> han hecho oír su voz:</p>
                <div class="bg-aldeapucela-light p-4 rounded-lg max-w-xl mx-auto mb-4">
                    <ul class="text-sm space-y-2 text-gray-700">
                        <li class="flex items-start gap-2">
                            <i data-lucide="megaphone" class="h-4 w-4 text-aldeapucela flex-shrink-0 mt-0.5"></i>
                            <span>Presionando por mejoras en transporte público y frecuencias de AUVASA</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i data-lucide="trending-up" class="h-4 w-4 text-aldeapucela flex-shrink-0 mt-0.5"></i>
                            <span>Logrando récord histórico de 1.400 reclamaciones por integración ferroviaria</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i data-lucide="shield" class="h-4 w-4 text-aldeapucela flex-shrink-0 mt-0.5"></i>
                            <span>Defendiendo presupuestos participativos en 35 barrios</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i data-lucide="alert-circle" class="h-4 w-4 text-aldeapucela flex-shrink-0 mt-0.5"></i>
                            <span>Dando visibilidad al problema de seguridad en el servicio BIKI</span>
                        </li>
                    </ul>
                </div>
                <p class="text-center text-aldeapucela font-semibold">¿Qué problema ves en tu barrio? Sé parte del cambio</p>
            </div>
        </div>

        <!-- Campaigns Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 class="text-xl font-semibold text-aldeapucela mb-2">Campañas activas</h2>
            <p class="text-sm text-gray-600 mb-4">Participa en las siguientes campañas o propón una nueva</p>
            
            <div class="space-y-4">
                ${campaigns.map(campaign => {
                    const href = campaign.external_url || `/${campaign.slug}/`;
                    const target = campaign.external_url ? ' target="_blank" rel="noopener noreferrer"' : '';
                    const statsHtml = campaign.stats ? `
                        <div class="flex items-center gap-3 mt-2 text-xs">
                            <span class="flex items-center gap-1 text-aldeapucela font-semibold">
                                <i data-lucide="users" class="h-3.5 w-3.5"></i>
                                ${campaign.stats.total_reclamaciones} vecinos/as
                            </span>
                            <span class="flex items-center gap-1 text-aldeapucela font-semibold">
                                <i data-lucide="home" class="h-3.5 w-3.5"></i>
                                ${campaign.stats.total_barrios} barrios
                            </span>
                        </div>
                    ` : '';
                    return `
                <div class="border border-gray-200 rounded-lg p-4 hover:bg-aldeapucela-light transition-colors">
                    <a href="${href}"${target} class="block">
                        <div class="flex items-center gap-3">
                            <i data-lucide="${campaign.icon}" class="h-16 w-16 text-aldeapucela flex-shrink-0"></i>
                            <div class="flex-1">
                                <h2 class="font-medium text-aldeapucela">${campaign.title}</h2>
                                <p class="text-sm text-gray-600">${campaign.description}</p>
                                ${statsHtml}
                            </div>
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

async function generateCampaignPage(campaign, assetVersions) {
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
    return context ? JSON.stringify(context) : 'null';
  });
  
  // 3. Compilar template
  const template = Handlebars.compile(templateSource);
  
  // 4. Generar HTML con Handlebars (sin stats, se cargan en frontend)
  const html = template({ campaign, assetVersions });

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
