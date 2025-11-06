# Participa - Plataforma de Campañas Ciudadanas

Sistema web para gestionar campañas de participación ciudadana que facilita a los vecinos enviar reclamaciones al ayuntamiento de forma rápida y sencilla.

## 🎯 ¿Qué hace?

- **Campañas de reclamación**: Genera formularios que automatizan el envío de reclamaciones al WhatsApp del ayuntamiento
- **Estadísticas en tiempo real**: Muestra cuántas personas han participado por barrio
- **Gestión centralizada**: Todas las campañas se gestionan desde NocoDB, sin tocar código
- **Anti-spam integrado**: Previene participaciones duplicadas con fingerprinting

## 🚀 Inicio rápido

### Crear una campaña

1. Ve a tu instancia de NocoDB
2. Añade un registro en la tabla `campaigns`
3. Marca `active = true`
4. Espera 5 minutos → La página se generará automáticamente

### Desarrollo local

```bash
# Instalar dependencias
cd scripts && npm install

# Generar sitio
node generate-site.js

# Ver en el navegador
python3 -m http.server 8000
```

Visita: http://localhost:8000

## 🔗 Tipos de campañas

### Campaña interna (con formulario)
Genera una página completa con formulario, estadísticas y comentarios.

**Campos obligatorios en NocoDB:**
- `slug`, `title`, `description`, `icon`, `active`, `order`
- `complaint_template`, `whatsapp_number`

### Campaña externa (enlace directo)
Aparece en el listado pero redirige a una web externa (ej: VallaBus).

**Añadir campo:**
- `external_url`: URL completa (ej: `https://vallabus.com/reclama/`)

### Campaña personalizada
Usa `custom_config` (JSON) para personalizar título, organización, enlaces sociales, etc.

**Ejemplo:**
```json
{
  "title": "Asistente de reclamaciones personalizado",
  "org_name": "Tu Organización",
  "newsletter_url": "https://tu-org.org/boletin/",
  "social": {
    "web": "https://tu-org.org",
    "telegram": "https://t.me/tu-canal",
    "bluesky": "https://bsky.app/profile/tu-org"
  }
}
```

## 📖 Documentación

- **[TECHNICAL.md](TECHNICAL.md)**: Arquitectura, instalación completa, seguridad
- **[LICENSE](LICENSE)**: GNU AGPL-3.0

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Haz commit: `git commit -am 'Añade nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crea un Pull Request

## 📧 Soporte

- **Foro**: https://foro.aldeapucela.org
- **Telegram**: https://t.me/aldeapucela
- **Issues**: https://github.com/aldeapucela/participa/issues

## 📝 Licencia

GNU Affero General Public License v3.0 (AGPL-3.0)
