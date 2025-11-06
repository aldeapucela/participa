# Configuración del Workflow "Register Participation"

## Paso 1: Importar el workflow

1. Abre n8n
2. Click en **"+"** → **Import from File**
3. Selecciona el archivo `n8n-register-participation.json`

## Paso 2: Configurar los Table IDs

Necesitas reemplazar los placeholders con los IDs reales de tus tablas de NocoDB:

### En el nodo "Get Campaign":
- Busca: `"table": "TABLA_ID_CAMPAIGNS"`
- Reemplaza `TABLA_ID_CAMPAIGNS` con el ID real de tu tabla `campaigns`

### En el nodo "Check Recent Participation":
- Busca: `"table": "TABLA_ID_PARTICIPATIONS"`
- Reemplaza `TABLA_ID_PARTICIPATIONS` con el ID real de tu tabla `participations`

### En el nodo "Insert Participation":
- Busca: `"table": "TABLA_ID_PARTICIPATIONS"`
- Reemplaza `TABLA_ID_PARTICIPATIONS` con el ID real de tu tabla `participations`

## Paso 3: Obtener los Table IDs

Los Table IDs los puedes encontrar en la URL de NocoDB cuando estás viendo una tabla:

```
https://nocodb.../nc/p3amiucxfm0jzoc/AQUI_ESTA_EL_TABLE_ID
```

O también puedes verlos en la API de NocoDB:
```
GET /api/v1/db/meta/projects/p3amiucxfm0jzoc/tables
```

## Paso 4: Activar el webhook

1. Guarda el workflow
2. Click en el nodo "Webhook"
3. Activa el modo "Production"
4. Copia la URL del webhook, debería ser algo como:
   ```
   https://tu-n8n.com/webhook/participation
   ```

## Paso 5: Verificar la URL en el frontend

La URL del webhook debe coincidir con la que está en `js/campaign.js`:

```javascript
const response = await fetch('https://proyectos.aldeapucela.org/webhook/participation', {
```

Si tu webhook está en otra URL, actualiza el código.

## Flujo del Workflow

```
1. Webhook recibe POST con:
   - campaign_slug
   - barrio
   - fingerprint
   - timestamp

2. Process Data:
   - Extrae IP del request
   - Genera hash de IP + fingerprint + campaign
   - Prepara datos

3. Get Campaign:
   - Busca la campaña por slug en NocoDB
   - Si no existe → 404

4. Check Recent Participation:
   - Busca participaciones con mismo ip_hash en últimas 24h
   - Si existe → 429 (Rate Limited)

5. Insert Participation:
   - Inserta nueva participación en NocoDB
   - Retorna success 200

6. Response:
   - Success: { "success": true, "message": "Participación registrada", "id": 123 }
   - Rate Limited: { "success": false, "error": "Ya has participado recientemente" }
   - Not Found: { "success": false, "error": "Campaña no encontrada" }
```

## Testing

Puedes probar el webhook con curl:

```bash
curl -X POST https://tu-n8n.com/webhook/participation \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_slug": "test-campaign",
    "barrio": "Parquesol",
    "fingerprint": "abc123def456",
    "timestamp": "2025-01-06T12:00:00Z"
  }'
```

Deberías recibir:
```json
{
  "success": true,
  "message": "Participación registrada",
  "id": 1
}
```

Si intentas de nuevo en menos de 24 horas:
```json
{
  "success": false,
  "error": "Ya has participado recientemente"
}
```
