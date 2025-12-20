# 📊 Documentación de Base de Datos - Sistema de Reforestación

## 📋 Descripción General del Proyecto

Sistema de gestión y seguimiento de viveros forestales que permite:
- Registro de recolecciones de material vegetal (semillas, estacas, etc.)
- Gestión de lotes de plantación con seguimiento de estados
- Control de viveros y ubicaciones geográficas
- Trazabilidad completa desde la recolección hasta la plantación
- Gestión de usuarios con roles y autenticación

**Base de Datos:** PostgreSQL (Supabase)

---

## 🗂️ Tablas del Sistema

### 1. 👤 `usuario`
Almacena información de los usuarios del sistema.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | `bigint` | PK, AUTO | Identificador único |
| `nombre` | `text` | NOT NULL | Nombre completo del usuario |
| `doc_identidad` | `text` | UNIQUE | Documento de identidad |
| `wallet_address` | `text` | UNIQUE, formato 0x... | Dirección de wallet blockchain |
| `organizacion` | `text` | - | Organización a la que pertenece |
| `contacto` | `text` | formato +número | Teléfono (formato internacional) |
| `rol` | `rol_usuario` | NOT NULL, DEFAULT 'GENERAL' | Rol del usuario |
| `username` | `text` | UNIQUE, DEFAULT '' | Usuario para login |
| `auth_id` | `text` | DEFAULT '' | ID de autenticación externa |
| `correo` | `text` | UNIQUE, DEFAULT '' | Email del usuario |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT now() | Fecha de registro |

**Relaciones:**
- Un usuario puede tener múltiples recolecciones
- Un usuario puede ser responsable de múltiples lotes
- Un usuario puede registrar cambios en historial
- **Un usuario puede tener múltiples credenciales WebAuthn** → `usuario_credencial(usuario_id)` (1:N)

**Validaciones:**
- `wallet_address`: Debe seguir formato Ethereum `^0x[0-9a-fA-F]{40}$`
- `contacto`: Formato internacional `^\+\d{7,15}$`

---

### 2. 🔐 `usuario_credencial`
Almacena las credenciales de WebAuthn (passkeys) para autenticación biométrica sin contraseña.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | `bigint` | PK, AUTO | Identificador único |
| `usuario_id` | `bigint` | NOT NULL, FK | Usuario propietario de la credencial |
| `credential_id` | `text` | NOT NULL, UNIQUE | ID único de la credencial generado por WebAuthn |
| `public_key` | `text` | NOT NULL | Clave pública en formato base64 |
| `algorithm` | `text` | NOT NULL, DEFAULT 'ES256' | Algoritmo criptográfico usado |
| `counter` | `integer` | NOT NULL, DEFAULT 0 | Contador anti-replay, incrementa con cada uso |
| `transports` | `text[]` | - | Métodos de transporte: internal, usb, nfc, ble, hybrid |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT now() | Fecha de creación de la credencial |
| `last_used_at` | `timestamp with time zone` | - | Fecha del último uso de la credencial |

**Relaciones:**
- **usuario_id** → `usuario(id)` ON DELETE CASCADE - Si se elimina el usuario, se eliminan sus credenciales

**Propósito:**
- Permite autenticación sin contraseña usando passkeys
- Soporta múltiples dispositivos por usuario (teléfono, laptop, USB, etc.)
- Mayor seguridad que contraseñas tradicionales
- Resistente a phishing y ataques de replay

**Índices:**
```sql
CREATE INDEX idx_usuario_credencial_usuario_id ON usuario_credencial(usuario_id);
CREATE INDEX idx_usuario_credencial_credential_id ON usuario_credencial(credential_id);
```

**Ejemplo de uso:**
```
Un usuario puede tener:
- Credencial 1: Huella digital en iPhone (transport: internal)
- Credencial 2: Windows Hello en laptop (transport: internal)  
- Credencial 3: YubiKey USB (transport: usb)
```

---

### 3. 📍 `ubicacion`
Almacena coordenadas geográficas y detalles de ubicación.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | `bigint` | PK, AUTO | Identificador único |
| `pais` | `text` | - | País |
| `departamento` | `text` | - | Departamento/Estado |
| `provincia` | `text` | - | Provincia/Municipio |
| `comunidad` | `text` | - | Comunidad |
| `zona` | `text` | - | Zona específica |
| `latitud` | `numeric` | NOT NULL, -90 a 90 | Coordenada latitud |
| `longitud` | `numeric` | NOT NULL, -180 a 180 | Coordenada longitud |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT now() | Fecha de registro |

**Relaciones:**
- Una ubicación puede tener un vivero (1:1)
- Una ubicación puede tener múltiples recolecciones

**Validaciones:**
- `latitud`: Rango válido -90° a 90°
- `longitud`: Rango válido -180° a 180°

---

### 4. 🏡 `vivero`
Registra los viveros forestales.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | `bigint` | PK, AUTO | Identificador único |
| `codigo` | `text` | NOT NULL, UNIQUE | Código único del vivero |
| `nombre` | `nombre_vivero` | NOT NULL | Nombre del vivero (ENUM) |
| `ubicacion_id` | `bigint` | NOT NULL, UNIQUE, FK | Referencia a ubicación |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT now() | Fecha de creación |

**Relaciones:**
- **ubicacion_id** → `ubicacion(id)` (1:1)
- Un vivero puede tener múltiples lotes de plantación
- Un vivero puede recibir múltiples recolecciones

---

### 5. 🌱 `planta`
Catálogo de especies vegetales.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | `bigint` | PK, AUTO | Identificador único |
| `especie` | `text` | NOT NULL | Nombre de la especie |
| `nombre_cientifico` | `text` | NOT NULL | Nombre científico (género + especie) |
| `variedad` | `text` | NOT NULL | Variedad de la planta |
| `tipo_planta` | `text` | - | Tipo de planta (árbol, arbusto, etc.) |
| `tipo_planta_otro` | `text` | - | Otro tipo no catalogado |
| `fuente` | `fuente_planta` | NOT NULL | Origen (NATIVA, INTRODUCIDA, etc.) |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT now() | Fecha de registro |

**Relaciones:**
- Una planta puede tener múltiples lotes de plantación
- Una planta puede estar en múltiples recolecciones

---

### 6. 🔄 `metodo_recoleccion`
Catálogo de métodos de recolección.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | `bigint` | PK, AUTO | Identificador único |
| `nombre` | `metodo_recoleccion_tipo` | NOT NULL, UNIQUE | Nombre del método (ENUM) |
| `descripcion` | `text` | - | Descripción del método |

**Ejemplos de métodos:**
- Directa del árbol
- Del suelo
- Compra
- Donación

---

### 7. 📦 `recoleccion`
Registra las recolecciones de material vegetal (semillas, estacas, etc.).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | `bigint` | PK, AUTO | Identificador único |
| `fecha` | `date` | NOT NULL, últimos 45 días | Fecha de recolección |
| `nombre_cientifico` | `text` | - | Nombre científico |
| `nombre_comercial` | `text` | - | Nombre común |
| `cantidad` | `numeric` | NOT NULL, > 0 | Cantidad recolectada |
| `unidad` | `text` | NOT NULL | Unidad de medida (kg, unidades, etc.) |
| `tipo_material` | `tipo_material` | NOT NULL | SEMILLA, ESTACA, PLANTULA, etc. |
| `estado` | `estado_recoleccion` | NOT NULL, DEFAULT 'ALMACENADO' | Estado actual |
| `especie_nueva` | `boolean` | NOT NULL, DEFAULT false | ¿Es nueva especie? |
| `observaciones` | `text` | max 1000 chars | Notas adicionales |
| `usuario_id` | `bigint` | NOT NULL, FK | Usuario que registró |
| `ubicacion_id` | `bigint` | NOT NULL, FK | Ubicación de recolección |
| `vivero_id` | `bigint` | FK | Vivero de destino |
| `metodo_id` | `bigint` | NOT NULL, FK | Método de recolección |
| `planta_id` | `bigint` | FK | Planta asociada |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT now() | Fecha de registro |

**Relaciones:**
- **usuario_id** → `usuario(id)` - Quién recolectó
- **ubicacion_id** → `ubicacion(id)` - Dónde se recolectó
- **vivero_id** → `vivero(id)` - A dónde se envió
- **metodo_id** → `metodo_recoleccion(id)` - Cómo se recolectó
- **planta_id** → `planta(id)` - Qué especie es

**Validaciones:**
- `fecha`: Solo permite fechas entre hoy y 45 días atrás
- `cantidad`: Debe ser mayor a 0
- `observaciones`: Máximo 1000 caracteres

---

### 8. 📸 `recoleccion_foto`
Almacena fotos asociadas a recolecciones.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | `bigint` | PK, AUTO | Identificador único |
| `recoleccion_id` | `bigint` | NOT NULL, FK | Recolección asociada |
| `url` | `text` | NOT NULL | URL de la imagen |
| `peso_bytes` | `integer` | max 5MB | Tamaño del archivo |
| `formato` | `text` | JPG, JPEG, PNG | Formato de imagen |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT now() | Fecha de subida |

**Relaciones:**
- **recoleccion_id** → `recoleccion(id)`

**Validaciones:**
- `peso_bytes`: Máximo 5,242,880 bytes (5MB)
- `formato`: Solo JPG, JPEG o PNG

---

### 9. 🌳 `lote_plantacion`
Gestiona lotes de plantas en proceso de crecimiento.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | `bigint` | PK, AUTO | Identificador único |
| `planta_id` | `bigint` | NOT NULL, FK | Especie del lote |
| `vivero_id` | `bigint` | NOT NULL, FK | Vivero donde está |
| `responsable_id` | `bigint` | NOT NULL, FK | Responsable del lote |
| `fecha_inicio` | `date` | NOT NULL | Fecha de inicio del lote |
| `cantidad_inicio` | `integer` | NOT NULL | Cantidad inicial |
| `cantidad_embolsadas` | `integer` | NOT NULL, DEFAULT 0 | Plantas embolsadas |
| `cantidad_sombra` | `integer` | NOT NULL, DEFAULT 0 | Plantas en sombra |
| `cantidad_lista_plantar` | `integer` | NOT NULL, DEFAULT 0 | Listas para plantar |
| `fecha_embolsado` | `date` | - | Fecha de embolsado |
| `fecha_sombra` | `date` | - | Fecha ingreso a sombra |
| `fecha_salida` | `date` | - | Fecha de salida del vivero |
| `altura_prom_sombra` | `numeric` | - | Altura promedio al entrar a sombra |
| `altura_prom_salida` | `numeric` | - | Altura promedio al salir |
| `estado` | `lote_estado` | NOT NULL, DEFAULT 'INICIO' | Estado actual del lote |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT now() | Fecha de creación |
| `updated_at` | `timestamp with time zone` | - | Última actualización |
| `updated_by` | `bigint` | FK | Usuario que actualizó |

**Relaciones:**
- **planta_id** → `planta(id)` - Especie
- **vivero_id** → `vivero(id)` - Ubicación
- **responsable_id** → `usuario(id)` - Responsable
- **updated_by** → `usuario(id)` - Quién actualizó

**Estados del lote:**
- `INICIO`: Recién iniciado
- `EMBOLSADO`: Plantas embolsadas
- `SOMBRA`: En área de sombra
- `LISTO`: Listo para plantar
- `PLANTADO`: Ya plantado en campo

---

### 10. 📋 `lote_plantacion_historial`
Registra todos los cambios realizados en un lote.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | `bigint` | PK, AUTO | Identificador único |
| `lote_id` | `bigint` | NOT NULL, FK | Lote al que pertenece |
| `nro_cambio` | `integer` | NOT NULL | Número secuencial del cambio |
| `fecha_cambio` | `timestamp with time zone` | NOT NULL, DEFAULT now() | Cuándo se hizo el cambio |
| `responsable_id` | `bigint` | NOT NULL, FK | Quién hizo el cambio |
| `accion` | `accion_historial` | NOT NULL | Tipo de acción (CREAR, ACTUALIZAR, etc.) |
| `estado` | `lote_estado` | NOT NULL | Estado después del cambio |
| `cantidad_inicio` | `integer` | - | Snapshot: cantidad inicial |
| `cantidad_embolsadas` | `integer` | - | Snapshot: embolsadas |
| `cantidad_sombra` | `integer` | - | Snapshot: en sombra |
| `cantidad_lista_plantar` | `integer` | - | Snapshot: listas |
| `fecha_inicio` | `date` | - | Snapshot: fecha inicio |
| `fecha_embolsado` | `date` | - | Snapshot: fecha embolsado |
| `fecha_sombra` | `date` | - | Snapshot: fecha sombra |
| `fecha_salida` | `date` | - | Snapshot: fecha salida |
| `altura_prom_sombra` | `numeric` | - | Snapshot: altura sombra |
| `altura_prom_salida` | `numeric` | - | Snapshot: altura salida |
| `notas` | `text` | max 2000 chars | Observaciones del cambio |

**Relaciones:**
- **lote_id** → `lote_plantacion(id)`
- **responsable_id** → `usuario(id)`

**Propósito:**
- Auditoría completa de cambios
- Trazabilidad de modificaciones
- Historial de responsables

---

### 11. 🔗 `lote_plantacion_recoleccion`
Tabla de relación muchos a muchos entre lotes y recolecciones.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `lote_id` | `bigint` | PK, FK | Lote de plantación |
| `recoleccion_id` | `bigint` | PK, FK | Recolección de origen |

**Relaciones:**
- **lote_id** → `lote_plantacion(id)`
- **recoleccion_id** → `recoleccion(id)`

**Propósito:**
- Relacionar qué recolecciones alimentaron qué lotes
- Trazabilidad desde semilla hasta planta

---

## 🎯 Tipos de Datos Personalizados (ENUMs)

### `rol_usuario`
```sql
'ADMIN'       -- Administrador del sistema
'TECNICO'     -- Técnico de campo
'GENERAL'     -- Usuario general
'CONSULTOR'   -- Solo lectura
```

### `fuente_planta`
```sql
'NATIVA'      -- Especie nativa
'INTRODUCIDA' -- Especie introducida
'ENDEMICA'    -- Endémica de la región
```

### `tipo_material`
```sql
'SEMILLA'     -- Material: semilla
'ESTACA'      -- Material: estaca
'PLANTULA'    -- Material: plántula
'INJERTO'     -- Material: injerto
```

### `estado_recoleccion`
```sql
'ALMACENADO'  -- En almacén
'EN_PROCESO'  -- En proceso de siembra/propagación
'UTILIZADO'   -- Ya utilizado completamente
'DESCARTADO'  -- Descartado por mala calidad
```

### `lote_estado`
```sql
'INICIO'      -- Recién iniciado
'EMBOLSADO'   -- Embolsadas las plantas
'SOMBRA'      -- En área de sombra
'LISTO'       -- Listo para plantar
'PLANTADO'    -- Plantado en campo definitivo
```

### `accion_historial`
```sql
'CREAR'       -- Creación del registro
'ACTUALIZAR'  -- Actualización de datos
'ELIMINAR'    -- Eliminación (lógica)
'CAMBIO_ESTADO' -- Cambio de estado
```

---

## 🔄 Diagrama de Relaciones Principales

```
┌─────────────┐
│   usuario   │
└──────┬──────┘
       │
       ├─── recolecta ──→ ┌──────────────┐
       │                  │ recoleccion  │
       │                  └──────┬───────┘
       │                         │
       │                         ├──→ ubicacion
       │                         ├──→ vivero
       │                         ├──→ planta
       │                         ├──→ metodo_recoleccion
       │                         └──→ recoleccion_foto (1:N)
       │
       └─── responsable ──→ ┌────────────────────┐
                            │ lote_plantacion    │
                            └─────────┬──────────┘
                                      │
                                      ├──→ planta
                                      ├──→ vivero
                                      ├──→ lote_plantacion_recoleccion (N:M)
                                      └──→ lote_plantacion_historial (1:N)
```

---

## 📊 Flujo de Trabajo del Sistema

### 1️⃣ Recolección de Material
```
Usuario → Recolecta material → Registra ubicación → Asigna vivero destino
```

### 2️⃣ Creación de Lote
```
Material recolectado → Crea lote → Asigna responsable → Estado: INICIO
```

### 3️⃣ Proceso de Crecimiento
```
INICIO → EMBOLSADO → SOMBRA → LISTO → PLANTADO
  ↓         ↓          ↓        ↓         ↓
 (se registra fecha y cantidad en cada transición)
```

### 4️⃣ Auditoría
```
Cada cambio → Se registra en historial → Con responsable y notas
```

---

## 🔐 Integración con WebAuthn

El sistema implementa autenticación biométrica sin contraseña usando passkeys.

### ✅ Tablas Implementadas

**Tabla `usuario_credencial`:**
- Almacena las credenciales WebAuthn de cada usuario
- Relación 1:N con `usuario` (un usuario puede tener múltiples passkeys)
- Cada credencial contiene:
  - `credential_id`: Identificador único de la passkey
  - `public_key`: Clave pública para verificar firmas
  - `counter`: Contador anti-replay que incrementa en cada uso
  - `transports`: Tipo de autenticador (huella, Face ID, USB, etc.)

**Campos en `usuario` relacionados:**
- `username`: Usuario para login con passkey
- `auth_id`: ID generado automáticamente para la credencial
- `correo`: Email para recuperación y notificaciones

### 🔄 Flujo de Autenticación

#### Registro (Sign Up)
```
1. Usuario solicita challenge → Backend genera challenge aleatorio
2. Frontend activa WebAuthn → Navegador muestra prompt biométrico
3. Usuario autentica (huella, Face ID) → Dispositivo genera par de claves
4. Frontend envía credencial pública → Backend valida y guarda en usuario_credencial
5. Backend crea registro en usuario → Retorna JWT token
```

#### Login
```
1. Usuario solicita challenge → Backend genera challenge
2. Frontend envía username → Backend busca credenciales del usuario
3. WebAuthn solicita autenticación → Usuario confirma con biométrica
4. Dispositivo firma challenge → Backend verifica con public_key
5. Backend actualiza counter y last_used_at → Retorna JWT token
```

### 🎯 Ventajas del Sistema

- ✅ **Sin contraseñas**: Mayor seguridad, no hay credenciales que robar
- ✅ **Resistente a phishing**: Las credenciales están vinculadas al dominio
- ✅ **Multi-dispositivo**: Un usuario puede usar múltiples passkeys
- ✅ **Auditoría**: Se registra `last_used_at` en cada autenticación
- ✅ **Counter anti-replay**: Previene ataques de repetición

### 📊 Endpoints Implementados

```
GET  /api/auth/challenge           → Obtener challenge para autenticación
POST /api/auth/register            → Registrar nueva credencial y usuario
POST /api/auth/login               → Autenticar con credencial existente
GET  /api/auth/test-supabase       → Verificar conexión a base de datos
```

---

## 📈 Métricas y Reportes Posibles

### Por Usuario
- Total de recolecciones realizadas
- Lotes bajo su responsabilidad
- Historial de acciones
- **Credenciales activas y último uso** 🆕

### Por Autenticación 🆕
- Total de logins por método (passkey vs tradicional)
- Dispositivos más utilizados por usuario
- Auditoría de accesos con timestamp
- Credenciales inactivas (sin usar en X días)

### Por Vivero
- Cantidad de lotes activos por estado
- Especies en proceso
- Capacidad utilizada vs disponible

### Por Especie (Planta)
- Total de recolecciones
- Lotes activos
- Tasa de éxito (cantidad plantada / cantidad inicial)

### Por Recolección
- Trazabilidad completa hasta lote plantado
- Rendimiento (plantas producidas vs material recolectado)

---

## 🛠️ Consideraciones Técnicas

### Índices Recomendados
```sql
-- Búsquedas frecuentes en recolecciones y lotes
CREATE INDEX idx_recoleccion_usuario ON recoleccion(usuario_id);
CREATE INDEX idx_recoleccion_fecha ON recoleccion(fecha);
CREATE INDEX idx_lote_estado ON lote_plantacion(estado);
CREATE INDEX idx_lote_vivero ON lote_plantacion(vivero_id);
CREATE INDEX idx_historial_lote ON lote_plantacion_historial(lote_id);

-- Índices para autenticación WebAuthn 🆕
CREATE INDEX idx_usuario_credencial_usuario_id ON usuario_credencial(usuario_id);
CREATE INDEX idx_usuario_credencial_credential_id ON usuario_credencial(credential_id);
CREATE INDEX idx_usuario_username ON usuario(username);
```

### Triggers Sugeridos
```sql
-- Actualizar updated_at automáticamente
-- Validar transiciones de estado
-- Registrar automáticamente en historial
-- Actualizar counter de materiales al crear lote
```

### Políticas de Seguridad (RLS - Supabase)
- Usuarios solo ven sus propias recolecciones
- Admins ven todo
- Técnicos ven lotes de su vivero
- Consultores solo lectura
- **Usuarios solo acceden a sus propias credenciales WebAuthn** 🆕

---

## 📝 Notas Finales

Este sistema permite:
- ✅ Trazabilidad completa desde recolección hasta plantación
- ✅ Control de calidad en cada etapa
- ✅ Auditoría de cambios
- ✅ Geolocalización precisa
- ✅ Gestión de múltiples viveros
- ✅ Reportes y estadísticas
- ✅ **Autenticación biométrica sin contraseña (WebAuthn)** 🆕
- ✅ **Soporte multi-dispositivo para passkeys** 🆕

**Base de Datos:** PostgreSQL en Supabase  
**Total de Tablas:** 11 (10 del sistema + 1 de autenticación)  
**Última actualización:** 20 de diciembre de 2025
