# Participa - Sistema de Campañas Ciudadanas

Sistema de gestión de campañas de participación ciudadana con generación estática de páginas web, stats dinámicas y registro de participaciones.

## 🏗️ Arquitectura

```
┌─────────────┐     ┌──────────┐     ┌────────────┐     ┌──────────────┐
│   NocoDB    │────▶│   n8n    │────▶│   GitHub   │────▶│ GitHub Pages │
│ (Campaigns) │     │(Generate)│     │   Action   │     │  (Static)    │
└─────────────┘     └──────────┘     └────────────┘     └──────────────┘
                          │                                      │
                          ▼                                      │
                    ┌──────────┐                                 │
                    │   n8n    │◀────────────────────────────────┘
                    │(Register)│         (Load stats)
                    └──────────┘
                          │
                          ▼
                    ┌──────────────┐
                    │   NocoDB     │
                    │(Participation│
                    │    Stats)    │
                    └──────────────┘
```

## 📋 Componentes

### 1. NocoDB - Base de datos
- **Tabla `campaigns`**: Campañas configurables con toda la info
- **Tabla `participations`**: Registro de participaciones con anti-spam

### 2. n8n - Automatización
- **Generate Campaigns JSON**: Exporta campañas activas
- **Generate Campaign Stats**: Calcula estadísticas por campaña
- **Register Participation**: Webhook para registrar participaciones

### 3. GitHub Action - CI/CD
- Ejecuta cada 5 minutos
- Detecta cambios en `campaigns.json`
- Regenera sitio estático si hay cambios

### 4. Frontend Estático
- **Campañas**: HTML generado con Handlebars
- **Stats**: Cargadas dinámicamente via fetch
- **Participaciones**: Registradas via webhook

## 🚀 Instalación

### Requisitos
- Node.js 20+
- NocoDB instancia
- n8n instancia
- GitHub repository

### 1. Configurar NocoDB

Crea dos tablas:

**Tabla `campaigns`:**
```
- id (AutoNumber)
- slug (SingleLineText, unique)
- title (SingleLineText)
- description (LongText)
- icon (SingleLineText)
- active (Checkbox)
- order (Number)
- date (DateTime)
- complaint_template (LongText)
- whatsapp_number (SingleLineText)
- forum_topic_id (Number)
- color (SingleLineText)
- subtitle (LongText)
- about_organization_text (LongText)
- about_organization_logo (URL)
- about_organization_url (URL)
- share_text (LongText)
- external_url (URL, opcional)
```

**Tabla `participations`:**
```
- id (AutoNumber)
- timestamp (DateTime)
- campaign_id (LinkToAnotherRecord → campaigns)
- barrio (SingleLineText)
- ip_hash (SingleLineText)
- user_agent_hash (SingleLineText)
- fingerprint (SingleLineText)
- is_spam (Checkbox)
```

### 2. Configurar n8n

Importa los workflows de `_docs/`:
1. Generate Campaigns JSON
2. Generate Campaign Stats  
3. Register Participation (ver `_docs/README-n8n-participation.md`)

Configura las credenciales de NocoDB en n8n.

### 3. Configurar GitHub

1. Clona el repositorio
2. Instala dependencias: `cd scripts && npm install`
3. Configura el GitHub Action (ya incluido en `.github/workflows/`)

### 4. Variables de entorno (opcional)

Puedes personalizar la URL del JSON de campañas mediante variable de entorno:

```bash
export CAMPAIGNS_JSON_URL="https://tu-servidor.com/campaigns.json"
```

Las stats se cargan dinámicamente en el frontend desde la URL configurada en el template (`_templates/campaign.html`).

## 🔧 Uso

### Generar sitio localmente

```bash
cd scripts
node generate-site.js
```

Esto generará:
- `index.html` - Listado de campañas
- `/{slug}/index.html` - Página de cada campaña

### Desarrollo local

```bash
# Desde la raíz del proyecto
python3 -m http.server 8000
# Visita: http://localhost:8000
```

### Crear nueva campaña

#### Campaña interna (formulario propio)
1. Ve a tu instancia de NocoDB
2. Añade un registro en la tabla `campaigns`
3. Marca `active = true`
4. Deja `external_url` vacío
5. Espera 5 minutos (GitHub Action)
6. La página se generará automáticamente

#### Campaña externa (enlace a web externa)
1. Ve a tu instancia de NocoDB
2. Añade un registro en la tabla `campaigns`
3. Marca `active = true`
4. Rellena el campo `external_url` con la URL completa (ej: `https://vallabus.com/reclama/?mtm_campaign=aldeapucela`)
5. Espera 5 minutos (GitHub Action)
6. Aparecerá en el listado como enlace directo (no genera página interna)

## 📊 Sistema de Participaciones

### Anti-spam
- **IP + Fingerprint**: Identifica dispositivos únicos
- **24h rate limit**: Solo 1 participación por dispositivo/campaña cada 24h
- **Hash en servidor**: El timestamp se genera en el servidor para evitar manipulación

### Fingerprinting
El sistema genera una huella digital del navegador basada en:
- Dimensiones de pantalla
- Profundidad de color
- Timezone
- Idioma
- Plataforma
- CPUs
- Canvas fingerprint

## 📁 Estructura del proyecto

```
participa/
├── _data/                    # Datos generados (gitignored)
├── _docs/                    # Documentación adicional
├── _templates/               # Templates Handlebars
│   ├── campaign.html
│   └── partials/
│       └── barrios-options.html
├── scripts/                  # Generador del sitio
│   ├── generate-site.js
│   └── package.json
├── js/                       # JavaScript del frontend
│   └── campaign.js
├── css/                      # Estilos
│   └── style.css
├── .github/workflows/        # GitHub Actions
│   └── generate-campaigns.yml
├── {slug}/                   # Páginas generadas
│   └── index.html
└── index.html                # Homepage generada
```

## 🔐 Seguridad

- **Content Security Policy** configurado
- **Hashes en servidor** para evitar manipulación
- **HTTPS** para todas las comunicaciones
- **Rate limiting** en participaciones
- **Fingerprinting** para detectar duplicados

## 📝 Licencia

GNU Affero General Public License v3.0 (AGPL-3.0)

Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -am 'Añade nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crea un Pull Request

## 📧 Soporte

- Foro: https://foro.aldeapucela.org
- Telegram: https://t.me/aldeapucela
- Issues: https://github.com/aldeapucela/participa/issues
