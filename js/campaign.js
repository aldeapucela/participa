// Initialize Lucide icons
lucide.createIcons();

// Renderizar lista de barrios
function renderList(data, containerId, showAll = false) {
    const sortedData = Object.entries(data)
        .sort(([,a], [,b]) => b - a)
        .slice(0, showAll ? undefined : 10);

    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = sortedData.map(([name, count]) => `
        <li class="py-2 flex justify-between items-center">
            <span class="text-gray-700">${name || '(sin especificar)'}</span>
            <span class="bg-aldeapucela-light px-2 py-1 rounded text-sm">${count}</span>
        </li>
    `).join('');
}

// Toggle lista completa
function toggleFullList(type) {
    if (type === 'barrios') {
        const button = document.getElementById('toggle-barrios');
        if (!button) return;
        
        const showAll = button.textContent.includes('Ver todos');
        renderList(STATS_DATA.totales.barrios, 'barriosList', showAll);
        button.textContent = showAll ? 'Ver menos' : 'Ver todos';
    }
}

// Renderizar gráfico
function renderChart() {
    const canvas = document.getElementById('complaintsChart');
    if (!canvas || !STATS_DATA.historico_semanal || STATS_DATA.historico_semanal.length === 0) {
        return;
    }

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: STATS_DATA.historico_semanal.map(w => w.week_label),
            datasets: [{
                label: 'Reclamaciones totales',
                data: STATS_DATA.historico_semanal.map(w => w.total),
                backgroundColor: 'hsl(273, 48.2%, 32.5%)',
                borderColor: 'hsl(273, 48.2%, 55%)',
                borderWidth: 1
            }]
        },
        options: {
            scales: { 
                y: { 
                    beginAtZero: true,
                    ticks: { precision: 0 }
                } 
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { color: '#333', font: { size: 12 } }
                }
            }
        }
    });
}

// Generar queja
async function generarQueja() {
    const nombreInput = document.getElementById('nombre');
    const errorMessage = document.getElementById('nombre-error');
    
    // Validación
    if (!nombreInput.value.trim()) {
        nombreInput.classList.add('invalid');
        errorMessage.style.display = 'block';
        nombreInput.focus();
        return;
    } else {
        nombreInput.classList.remove('invalid');
        errorMessage.style.display = 'none';
    }

    const barrio = document.getElementById('barrio').value;
    const nombre = nombreInput.value.trim();
    
    // Construir mensaje desde el template
    let mensaje = CAMPAIGN_CONFIG.complaintTemplate
        .replace(/\{\{nombre\}\}/g, nombre)
        .replace(/\{\{barrio\}\}/g, barrio ? `, vivo en ${barrio}` : '');

    let mensajeInit = 'Importante: 1. Manda este mensaje para iniciar. 2. Deja pulsado el cuadro de escritura y elige Pegar 3. Envía tu reclamación';

    try {
        await navigator.clipboard.writeText(mensaje);
        
        // Abrir WhatsApp
        const url = `https://wa.me/${CAMPAIGN_CONFIG.whatsappNumber}?text=${encodeURIComponent(mensajeInit)}`;
        window.open(url, '_blank');
        
        // Mostrar confirmación
        const nombreLimpio = nombre.split(' ')[0].replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\\s]/gi, '');
        showConfirmationDialog(nombreLimpio);

    } catch (err) {
        // Fallback
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.value = mensaje;
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        const url = `https://wa.me/${CAMPAIGN_CONFIG.whatsappNumber}?text=${encodeURIComponent(mensajeInit)}`;
        window.open(url, '_blank');
        
        const nombreLimpio = nombre.split(' ')[0].replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\\s]/gi, '');
        showConfirmationDialog(nombreLimpio);
    }
}

function showConfirmationDialog(nombre) {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    dialog.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md relative">
            <button onclick="this.closest('.fixed').remove()" class="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
                <i data-lucide="x" class="h-6 w-6"></i>
            </button>
            <div class="flex flex-col items-center mb-4 text-center">
                <i data-lucide="check-circle" class="h-10 w-10 text-aldeapucela mb-2"></i>
                <h3 class="text-lg font-semibold">${nombre}, ¡muchas gracias!</h3>
            </div>
            <p class="text-sm mb-3">Verifica que has recibido <strong>un código al finalizar</strong>. Si no, vuelve a WhatsApp y pega el mensaje de nuevo.</p>
            <p class="text-sm mb-4">Y sólo una última cosa...</p>
            <button onclick="sharePage()" class="w-full bg-aldeapucela text-white py-2 px-4 rounded text-sm hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2">
                <i data-lucide="share-2" class="h-4 w-4"></i>
                Comparte este asistente
            </button>
            <p class="text-sm mt-3">En redes sociales y grupos de chat</p>
        </div>
    `;
    document.body.appendChild(dialog);
    lucide.createIcons();
}

function sharePage() {
    const text = `Participa en la campaña: ${CAMPAIGN_CONFIG.slug}\n\n`;
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '?mtm_campaign=share';

    if (navigator.share) {
        navigator.share({
            title: document.title,
            text: text,
            url: url.toString()
        }).catch((error) => console.log('Error compartiendo:', error));
    } else {
        const dummy = document.createElement('textarea');
        document.body.appendChild(dummy);
        dummy.value = text + url.toString();
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
        alert('Texto y URL copiados al portapapeles');
    }
}

function openVideoModal() {
    const modal = document.getElementById('videoModal');
    const videoContainer = document.getElementById('videoContainer');
    if (!modal || !videoContainer) return;
    
    modal.classList.remove('hidden');
    videoContainer.innerHTML = `
        <video src="../video/instrucciones.mp4" controls style="max-height: 70vh; max-width: 100%;" class="mx-auto">
            Tu navegador no soporta el elemento de video.
        </video>
    `;
    lucide.createIcons();
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const videoContainer = document.getElementById('videoContainer');
    if (!modal || !videoContainer) return;
    
    modal.classList.add('hidden');
    videoContainer.innerHTML = '';
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Renderizar stats
    if (STATS_DATA && STATS_DATA.totales) {
        renderList(STATS_DATA.totales.barrios, 'barriosList');
        renderChart();
    }
    
    // Discourse embed si hay forum topic
    if (typeof window.DiscourseEmbed !== 'undefined') {
        const d = document.createElement('script');
        d.type = 'text/javascript';
        d.async = true;
        d.src = window.DiscourseEmbed.discourseUrl + 'javascripts/embed.js';
        
        const head = document.getElementsByTagName('head')[0];
        if (head) head.appendChild(d);
    }
});
