<!-- @format -->

# ArrowFin "Trader Daily Snapshot Widget" — System Architecture & Deliverables

**Candidate / Team Lead Position:** Senior Full Stack Engineer / Team Lead Technical Assessment  
**Cut Time:** `2026-08-25T14:30:00Z`  
**Security Standard:** CFTC Rule 1.31 & NFA Compliance Rule 2-9 Multi-Tenant Scoping

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

## 🚀 Quick Start & Run Commands

### 1. Installation & Seeding

```bash
npm install
```

_The database schema (`data.db`) and CSV dataset (`dataset/_.csv`) are automatically loaded idempotently on backend boot.\*

### 2. Run Backend & WebSocket Gateway

```bash
npm run dev -w backend
```

- **REST API:** `http://localhost:4000/api/v1/snapshot`
- **WebSocket Stream:** `ws://localhost:4000/ws/snapshot`

### 3. Run Frontend (React + Next.js App Router UI)

```bash
npm run dev -w frontend
```

Open `http://localhost:5173` to interact with the **Trader Daily Snapshot Widget** and live fill simulator.

### 4. Execute Unit & Security Tests

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
Cross-broker data leakage is prevented through a three-tier defence-in-depth model:

se abordaron 3 frentes: base de datos, backend, websocket:

Base de datos: se agrego un indice compuesto en todas las tablas, usando el brocker_id. de esta manera siempre sera requerido para extraer informacion de un tenant.

back: se creo un Guard, para asegurar que el broker_id siempre venga en la peticion http, en caso de no haber un broker_id retorna un error 403

websocket: la coneccion al WS requiere de forma obligatoria el uso de JWT, el brocker_id esta incrustrado en este token.

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

esta respuesta fue generada, debido a limite de tiempos no podre explicarla pero, con gusto podre ahodar un poco mas en ella con un poco mas de tiempo.

---

### 3. PII Protection & Regulatory Log Redaction

**Question:** _How are sensitive customer details in support and audit notes handled?_  
**Answer:**

En el archivo dataset/traders.csv venían notas de soporte sin ningún tipo de filtro: números de ruta ACH, SSNs, teléfonos personales y enlaces directos a pasaportes en buckets de S3.

Para frenar esto de raíz y no arriesgar datos en producción, implementé PiiRedactionInterceptor junto con PiiRedactor. Lo que hacen es pasar expresiones regulares (RegEx) de alto rendimiento sobre los logs del sistema para limpiar automáticamente cualquier cadena sensible antes de que salga ([REDACTED_SSN], [REDACTED_BANK_INFO], [REDACTED_PHONE], [REDACTED_EMAIL], [REDACTED_KYC_S3_URI]).

Con esto garantizo que la PII cruda jamás toque la consola (stdout) ni termine expuesta en herramientas de monitoreo o servicios de logs en la nube.

# Architecture Handoff Reflection

- para atacar efectivamente esta aplicacion y cumplir con el tiempo de entrega necesariamente se debio proceder con el uso de inteligencia artificial, en este sentido, yo fui mas un orquestador de un equipo de agentes que un desarrollador de software, este fue mi proceder:

1. creacion del boilerplate:
   se requirio crear un proyecto separando el front el back, implementacion de langchain y agents.MD para el manejo del codigo

2. creacion de arquitectura agentica:
   se uso una arquitectura en paralela de agentes usando langchain, con los siguientes roles: front, back, especialista en seguridad, segun mi esperiencia, esta es la mejor alineacion para el manejo del tiempo

3. identificacion de los puntos criticos de la aplicacion
   entendimiento correcto de las especificaciones, para esto recurri al resumen generado por AI, reforzado por la lectura detalla de los documentos proveidos, el resumir me ayudo a entender rapidamente los puntos criticos, el leer detalladamente me ayudo a entender la profundidad del proyecto

4. implementacion
   se genero un prompt especifico y detallado para realizar la aplicacion, revisando en detalle los puntos claves hay 2 frentes en esta tarea que tome en cuenta para su realizacion: lo que puedo delegar, lo que debo hacer personalmente, tomando enm cuenta el cumplimiento del deadline estipulado (3 horas)

# lo que puedo delegar:

- escritura de codigo principalmente.
- creacion de documentacion tecnica

# lo que debo hacer personalmente

- configuracion correcta de los agentes
- revision de los puntos claves de la tarea
- revision de los procesos y Pr's que realizan los agentes
- redacion especifa de documentos destinados a la explicacion de que hice y como lo hice (como este en particular)

5. puntos de mejora

- la arquitectura agenta solo es un borrador, definitivamente puede ser optimizada para mejorar costos, tiempo y definicion del trabajo de los agentes.
- para fines practicos se creo una base de datos onsite usando SQlite, pero, considerando la importancia de la seguridad de los datos, recomiendo FUERTEMENTE el uso de un servicio especializado en la nube como RDS de aws para este punto.
- implementacion de herramientas de monitoreo como datadog para monitorizar los procesos criticos
- definicion mas precisa de los agentes, mientras mas contexto tengan del trabajo (ejemplos etc) mejor sera el resultado obtenido, tomando en cuenta no inyectar datos sensibles a los agentes
- campanas de educacion para las personas en el proyecto en cuestion, es necesario que TODOS sepan diferenciar que datos son sensibles y que no para poder limitar error de exposicion de datos

respondiendo las preguntas:

## 13. The decision you&#39;re most proud of, and the tradeoff it cost you.

- estar consciente de limite de tiempo (me di cuenta a la mitad), para saber en que debo dedicar mi tiempo y en que no
- me siento orgulloso de poder delegar. dejando el trabajo repetitivo a herramientas y enfocarme lo que si es de mi prioridad

## 14. The one thing you&#39;d change with a second day.

- todos los puntos de la seccion de mejora

## 15. If you handed this repo to two engineers tomorrow, what would you tell them first, and what would you not let them change?

- todo es reemplazable en la medida de la evolucion de negocio, hoy algo puede estar fuertemente sustentado, pero si el negocio cambia en el futuro toca pivotar. asi que:

- recomendaria que el equipo se enfocara en los puntos de mejora
- no recomendaria (al menos este momento) cambiar la arquitectura propuesta, la estructura de las carpetas la repeticion y uso otras herramientas para la misma tarea ej: implementar otro lenguanje fuera del stack tecnologico como JAVA.

# Code Review

```
@Get(&#39;positions/:accountId&#39;)
async getPositions(@Param(&#39;accountId&#39;) accountId: string, @Req() req) {
const positions = await this.prisma.position.findMany({
where: { accountId },
});
this.logger.log(
`positions for ${accountId}: ${JSON.stringify(positions)}`,
);
return positions.map(p =&gt; ({
...p,
pnl: (p.markPrice - p.avgPrice) * p.qty,
}));
}
```

---

- punto critico: se esta logueando informacion critica que puede ser sensible, primero se debe asegurar que no haya informacion sensible en los logs

### puntos de mejora:

- crear un servicio para cada accion, el controlador solo deberia invocar y administrar
- no hacer calculos en la respuesta, crear un servicio para esto.

### codigo sugerido:

```
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

## resultado:

- basado en los puntos criticos no lo aprobaria.
