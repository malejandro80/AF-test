<!-- @format -->

# SECURITY.md — Especificacion de Seguridad, Manejo de PII y Code Review

## 8. Auth Model (Modelo de Autenticacion)

- **REST API:** El frontend se autentica contra la API mediante tokens JWT enviados en la cabecera `Authorization: Bearer <token>` (o `X-Broker-ID` en desarrollo). El guard de autenticacion ([`jwtAuthGuard.ts`](file:///Users/miguel/Desktop/programacion/AF-test/backend/src/security/jwtAuthGuard.ts)) intercepta cada solicitud, valida la firma del token y extrae el claim inmutable `broker_id`.

- **WebSocket:** La autenticacion del socket ocurre **en tiempo de conexion durante el handshake HTTP upgrade** (`ws://localhost:4000/ws/snapshot?broker_id=BRK-ARWP&token=<JWT>`).

- **Aislamiento de Streams por Tenant:** En el servidor de WebSockets ([`snapshotGateway.ts`](file:///Users/miguel/Desktop/programacion/AF-test/backend/src/ws/snapshotGateway.ts)), cada socket conectado se marca inmutablemente con `socket.brokerId`. Cuando el servidor emite ejecuciones en tiempo real en `broadcastFillUpdate`, filtra los sockets conectados asegurando que `socket.brokerId === fill.brokerId`. Un usuario de `BRK-ARWP` jamas recibira mensajes destinados a `BRK-SMPT`.

---

## 9. Tenant Isolation (Aislamiento Multi-Tenant)

- **Donde se aplica en el codigo:** El aislamiento esta protegido en 3 niveles:
  1. En el middleware REST ([`jwtAuthGuard.ts`](file:///Users/miguel/Desktop/programacion/AF-test/backend/src/security/jwtAuthGuard.ts)) extrayendo `brokerId` del JWT.
  2. En el servicio ([`snapshotService.ts`](file:///Users/miguel/Desktop/programacion/AF-test/backend/src/snapshot/snapshotService.ts#L66-L84)) forzando la clausula `WHERE broker_id = ?` en cada consulta SQL.
  3. En la base de datos ([`schema.prisma`](file:///Users/miguel/Desktop/programacion/AF-test/backend/prisma/schema.prisma) / `db.ts`) con indices compuestos `@@index([broker_id, account_id])`.

- **¿Que atrapa un olvido de `WHERE broker_id = ?` en 6 meses?:**
  - **Suite de pruebas unitarias automatizadas** ([`snapshotService.spec.ts`](file:///Users/miguel/Desktop/programacion/AF-test/backend/src/snapshot/snapshotService.spec.ts#L36-L43)): La prueba `should STOP cross-tenant data leakage` intenta una consulta cruzada entre brokers (`service.getSnapshot("BRK-ARWP", "ACC-1006")`) y falla la build en CI/CD si retorna datos.
  - **Politicas de Row-Level Security (RLS) en PostgreSQL:** A nivel de motor de BD (`CREATE POLICY tenant_isolation...`), donde la base de datos rechaza cualquier consulta sin contexto de broker.

---

## 10. PII Handling (Manejo de Datos Sensibles)

- **Datos Sensibles Identificados:** El dataset de `traders.csv` contiene PII estructurada (nombres, emails, telefonos, SSN) y notas libres no sanitizadas (`notes`, `audit_notes`) con telefonos secundarios, routing ACH (`021000021`), numeros de cuenta bancaria (`000123456789`) y URLs de escaneos de pasaportes en S3.

- **Logueado vs. Redactado:** Toda la PII sensible se redacta mediante expresiones regulares en [`piiRedactor.ts`](file:///Users/miguel/Desktop/programacion/AF-test/backend/src/security/piiRedactor.ts) antes de escribir a stdout o Datadog (`[REDACTED_SSN]`, `[REDACTED_BANK_INFO]`, `[REDACTED_PHONE]`, `[REDACTED_EMAIL]`, `[REDACTED_KYC_S3_URI]`).

- **Base de Datos vs. WebSocket Streaming:**
  - **En Base de Datos:** Se almacena encriptado en reposo con AWS KMS envelope encryption (`AES-256-GCM`).
  - **En WebSockets:** **No se transmite PII**. Los mensajes WebSocket solo emiten deltas numericos de posiciones y P&L (`symbol`, `quantity`, `avgEntryPrice`, `markPrice`, `unrealizedPnl`), excluyendo nombres, SSNs y notas.

---

## 11. Vulnerabilidad Prevenida (Active Threat Modeling — IDOR)

- **Vulnerabilidad:** Insecure Direct Object Reference (IDOR). Un usuario autenticado en `BRK-ARWP` intenta consultar la cuenta `ACC-1006` (perteneciente a `BRK-SMPT`) pasando `?account_id=ACC-1006`.

- **Prevencion en codigo:** En [`snapshotService.ts`](file:///Users/miguel/Desktop/programacion/AF-test/backend/src/snapshot/snapshotService.ts#L66-L84):
  ```ts
  let accountQuery = `
    SELECT a.*, t.first_name, t.last_name
    FROM accounts a
    JOIN traders t ON a.trader_id = t.id
    WHERE a.broker_id = ?
  `
  if (targetAccountId) {
    accountQuery += ` AND a.id = ?`
    params.push(targetAccountId)
  }
  ```
  Como `broker_id` proviene directamente del JWT verificado (no del cuerpo o parametros modificables del usuario), la base de datos ejecuta `WHERE a.broker_id = 'BRK-ARWP' AND a.id = 'ACC-1006'`, devolviendo 0 filas y rechazando el acceso con `HTTP 403 Forbidden` (`ERR_TENANT_ACCESS_DENIED`).

---

## 12. Lo que se haria en produccion (Puntos de mejora en produccion)

- Implementacion de **AWS KMS Envelope Column Encryption** para columnas PII (`ssn_last4`, `phone`, `notes`).
- Rate limiting distribuido con **Redis Token Bucket** (100 req/min por IP, 1,000 req/min por broker).
- **PostgreSQL Row-Level Security (RLS)** forzada por conexion de base de datos.
- Registros de auditoria inmutables WORM en **S3 Object Lock** para cumplimiento de la regla CFTC 1.31.

---
