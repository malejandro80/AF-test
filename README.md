<!-- @format -->

# ArrowFin "Trader Daily Snapshot Widget" — System Architecture & Deliverables

**Candidate / Team Lead Position:** Senior Full Stack Engineer / Team Lead Technical Assessment  
**Cut Time:** `2026-08-25T14:30:00Z`  
**Security Standard:** CFTC Rule 1.31 & NFA Compliance Rule 2-9 Multi-Tenant Scoping

---

## ⏱️ Execution Time & LLM Usage / Tiempo de Ejecución y Uso de LLM

- **Tiempo Total de Ejecución / How long it actually took:** ~2 horas y 45 minutos (completado dentro del margen límite estipulado de 3 horas).
- **Uso de LLM / What I used an LLM for:**
  - **Desarrollo y Código Base:** Generación acelerada del código para el backend (NestJS/Express + Prisma), componentes frontend (Next.js 15 App Router en Tailwind CSS), hooks de WebSockets y suite de pruebas unitarias (`snapshotService.spec.ts`).
  - **Especificaciones de PRs y Documentación:** Redacción de los borradores técnicos para los Pull Requests divididos por dominio ([`docs/PR-01.md`](file:///Users/miguel/Desktop/programacion/AF-test/docs/PR-01.md), [`docs/PR-02.md`](file:///Users/miguel/Desktop/programacion/AF-test/docs/PR-02.md), [`docs/PR-03.md`](file:///Users/miguel/Desktop/programacion/AF-test/docs/PR-03.md)).
  - **Resumen y Comprensión:** Análisis inicial del dataset CSV y síntesis rápida de especificaciones.
  - **Orquestación y Control Humano (Mi Rol):** Configuración de la arquitectura agentica en paralelo (LangChain / Agents.md), diseño del aislamiento de datos multi-tenant (`broker_id`), creación de interceptores Regex de sanitización de PII, revisión de código y redacción personal de las reflexiones de arquitectura y seguridad.

---

## 🧑‍💻 Antecedentes

Autoevaluación del stack (1–5: 1 = nunca lo usé, 2 = nivel tutorial, 3 = he
desarrollado código con ello, 4 = cómodo en producción, 5 = podría enseñarlo).
Los valores marcados con `[1-5]` son placeholders pendientes de completar:

- TypeScript: 4
- Next.js: 5
- NestJS: 4
- Prisma: 4
- PostgreSQL: 5
- WebSockets: 3
- Tailwind: 5
- JWT/auth: 3
- Aislamiento de datos multi-tenant: 5

Extra del stack del proyecto:

- React: 5
- SQLite: 5
- LangChain / LangGraph (pipelines multi-agente): 3

---

## 🚀 Quick Start & Run Commands / Proceso de Ejecución Local

> [!IMPORTANT]
> **Estrategia de Seguridad y Protección de PII:**  
> Como medida estricta de seguridad de la información y cumplimiento de privacidad (PII Compliance), **la carpeta `dataset/` (que contiene archivos CSV con datos de clientes y soporte) y el archivo de base de datos (`data.db`) están excluidos del control de versiones en `.gitignore`**.  
> Para ejecutar el proyecto localmente, debes **agregar la carpeta `dataset/` de manera manual** en la raíz del repositorio (`/AF-test/dataset/*.csv`) antes de iniciar los servidores.

### 1. Preparación del Dataset e Instalación

```bash
# 1. Asegurar que la carpeta dataset/ esté ubicada manualmente en la raíz del proyecto:
# /AF-test/dataset/
#   ├── brokers.csv
#   ├── traders.csv
#   ├── accounts.csv
#   ├── instruments.csv
#   ├── market_prices.csv
#   └── fills.csv

# 2. Instalar dependencias del monorepo
npm install
```

_*Nota: Al iniciar el servidor por primera vez, el backend detectará automáticamente la carpeta `dataset/` cargada manualmente y poblará la base de datos `data.db` de forma automática e idempotente._

### 2. Iniciar Backend y Gateway de WebSockets

```bash
npm run dev -w backend
```

- **REST API:** `http://localhost:4000/api/v1/snapshot`
- **WebSocket Stream:** `ws://localhost:4000/ws/snapshot`

### 3. Iniciar Frontend (Next.js 15 Dark-Mode Trading UI)

```bash
npm run dev -w frontend
```

Abre `http://localhost:5173` para interactuar con el **Trader Daily Snapshot Widget** y el simulador de ejecuciones en vivo.

### 4. Ejecutar Suite de Tests Unitarios y Aislamiento Multi-Tenant

```bash
npx tsx --test backend/src/snapshot/snapshotService.spec.ts
```

---

## 📑 Parallel LangChain Pull Requests (PRs)

The multi-agent execution pipeline outputs three domain-isolated PRs ready for human code review:

1. 📂 [PR-01: Backend Snapshot Service & Database Schema](file:///Users/miguel/Desktop/programacion/AF-test/docs/PR-01.md)
2. 📂 [PR-02: UI Component, WebSocket Client & Risk Visualizer](file:///Users/miguel/Desktop/programacion/AF-test/docs/PR-02.md)
3. 📂 [PR-03: Security Layers, PII Redaction & SECURITY.md](file:///Users/miguel/Desktop/programacion/AF-test/docs/PR-03.md)
4. 🛡️ [SECURITY.md Documentation](file:///Users/miguel/Desktop/programacion/AF-test/SECURITY.md)

---

## 🏛️ Task 5: Architecture & Handoff Reflection

### 1. Multi-Tenant Isolation Architecture

**Question:** _How does your implementation guarantee zero cross-broker data leakage across shared infrastructure?_  
**Answer:**

Se abordaron 3 frentes: base de datos, backend y WebSockets:

- **Base de datos:** Se agregó un índice compuesto en todas las tablas utilizando `broker_id`. De esta manera, siempre será requerido para extraer información de un tenant.
- **Backend:** Se creó un Guard para asegurar que el `broker_id` siempre venga en la petición HTTP. En caso de no incluir un `broker_id`, retorna un error 403.
- **WebSockets:** La conexión al WebSocket requiere de forma obligatoria el uso de JWT, donde el `broker_id` está incrustado en este token.

---

### 2. Contract Point Values & P&L Calculation Engine

**Question:** _How were different futures contract sizes and daily session boundaries handled?_  
**Answer:**  
Futures contracts track different index multipliers (`point_value_usd`):

- `ES` ($50/pt) vs `MES` ($5/pt)
- `NQ` ($20/pt) vs `MNQ` ($2/pt)
- `CL` ($1000/pt) vs `MCL` ($100/pt)
- `GC` ($100/pt) vs `6E` ($125,000/pt)

**Calculation Formulas:**

Esta respuesta fue generada; debido al límite de tiempo no podré explicarla en detalle, pero con gusto podré ahondar un poco más en ella teniendo un poco más de tiempo.

---

### 3. PII Protection & Regulatory Log Redaction

**Question:** _How are sensitive customer details in support and audit notes handled?_  
**Answer:**

En el archivo `dataset/traders.csv` venían notas de soporte sin ningún tipo de filtro: números de ruta ACH, SSNs, teléfonos personales y enlaces directos a pasaportes en buckets de S3.

Para frenar esto de raíz y no arriesgar datos en producción, implementé `PiiRedactionInterceptor` junto con `PiiRedactor`. Lo que hacen es pasar expresiones regulares (RegEx) de alto rendimiento sobre los logs del sistema para limpiar automáticamente cualquier cadena sensible antes de que salga (`[REDACTED_SSN]`, `[REDACTED_BANK_INFO]`, `[REDACTED_PHONE]`, `[REDACTED_EMAIL]`, `[REDACTED_KYC_S3_URI]`).

Con esto garantizo que la PII cruda jamás toque la consola (stdout) ni termine expuesta en herramientas de monitoreo o servicios de logs en la nube.

---

# Architecture Handoff Reflection

- Para atacar efectivamente esta aplicación y cumplir con el tiempo de entrega, necesariamente se debió proceder con el uso de inteligencia artificial. En este sentido, yo fui más un orquestador de un equipo de agentes que un desarrollador de software. Este fue mi proceder:

1. **Creación del boilerplate:**
   Se requirió crear un proyecto separando el frontend y el backend, con la implementación de LangChain y `AGENTS.md` para el manejo del código.

2. **Creación de arquitectura agéntica:**
   Se usó una arquitectura paralela de agentes usando LangChain, con los siguientes roles: frontend, backend y especialista en seguridad. Según mi experiencia, esta es la mejor alineación para el manejo del tiempo.

3. **Identificación de los puntos críticos de la aplicación:**
   Entendimiento correcto de las especificaciones. Para esto recurrí al resumen generado por IA, reforzado por la lectura detallada de los documentos provistos. Resumir me ayudó a entender rápidamente los puntos críticos, y leer detalladamente me ayudó a entender la profundidad del proyecto.

4. **Implementación:**
   Se generó un prompt específico y detallado para realizar la aplicación. Revisando en detalle los puntos clave, hay 2 frentes en esta tarea que tomé en cuenta para su realización: lo que puedo delegar y lo que debo hacer personalmente, tomando en cuenta el cumplimiento del deadline estipulado (3 horas).

### Lo que puedo delegar:
- Escritura de código principalmente.
- Creación de documentación técnica.

### Lo que debo hacer personalmente:
- Configuración correcta de los agentes.
- Revisión de los puntos clave de la tarea.
- Revisión de los procesos y PRs que realizan los agentes.
- Redacción específica de documentos destinados a la explicación de qué hice y cómo lo hice (como este en particular).

5. **Puntos de mejora:**
- La arquitectura agéntica solo es un borrador; definitivamente puede ser optimizada para mejorar costos, tiempo y definición del trabajo de los agentes.
- Para fines prácticos se creó una base de datos local usando SQLite, pero considerando la importancia de la seguridad de los datos, recomiendo FUERTEMENTE el uso de un servicio especializado en la nube como AWS RDS.
- Implementación de herramientas de monitoreo como DataDog para monitorear los procesos críticos.
- Definición más precisa de los agentes: mientras más contexto tengan del trabajo (ejemplos, etc.), mejor será el resultado obtenido, asegurando no inyectar datos sensibles.
- Campañas de educación para el equipo en cuestión: es necesario que TODOS sepan diferenciar qué datos son sensibles y cuáles no, para limitar los errores de exposición de datos.

---

## 13. The decision you're most proud of, and the tradeoff it cost you.

- Estar consciente del límite de tiempo (me di cuenta a la mitad), para saber a qué debo dedicar mi tiempo y a qué no.
- Me siento orgulloso de poder delegar, dejando el trabajo repetitivo a herramientas para enfocarme en lo que sí es de mi prioridad.

## 14. The one thing you'd change with a second day.

- Todos los puntos de la sección de mejora.

## 15. If you handed this repo to two engineers tomorrow, what would you tell them first, and what would you not let them change?

- Todo es reemplazable en la medida de la evolución del negocio. Hoy algo puede estar fuertemente sustentado, pero si el negocio cambia en el futuro, toca pivotar. Así que:
- Recomendaría que el equipo se enfocara en los puntos de mejora.
- No recomendaría (al menos en este momento) cambiar la arquitectura propuesta, la estructura de carpetas, la repetición ni el uso de otras herramientas para la misma tarea (ej. implementar otro lenguaje fuera del stack tecnológico como Java).

---

# Code Review

```typescript
@Get('positions/:accountId')
async getPositions(@Param('accountId') accountId: string, @Req() req) {
  const positions = await this.prisma.position.findMany({
    where: { accountId },
  });
  this.logger.log(
    `positions for ${accountId}: ${JSON.stringify(positions)}`,
  );
  return positions.map(p => ({
    ...p,
    pnl: (p.markPrice - p.avgPrice) * p.qty,
  }));
}
```

---

- **Punto crítico:** Se está registrando (logging) información crítica que puede ser sensible. Primero se debe asegurar que no haya información sensible en los logs.

### Puntos de mejora:
- Crear un servicio para cada acción; el controlador solo debería invocar y administrar.
- No hacer cálculos en la respuesta del controlador; crear un servicio específico para esto.

### Código sugerido:

```typescript
@Get('positions/:accountId')
async getPositions(
  @Param('accountId') accountId: string,
  @Req() req: AuthenticatedRequest,
): Promise<PositionResponseDto[]> {
  // Enforce tenant scoping and delegate data retrieval & calculation to the service
  return this.positionsService.getAccountPositionsWithPnl(
    accountId,
    req.user.brokerId,
  );
}
```

## Resultado:
- Basado en los puntos críticos, no lo aprobaría.
