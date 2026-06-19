# Flujo del modulo SUNAT (resumen)

## 1) Backend (server)
- **DTO**: define el contrato de respuesta.
  - [server/src/sunat/dto/ruc-consultation.dto.ts](server/src/sunat/dto/ruc-consultation.dto.ts)
- **Controller**: expone la ruta HTTP y valida el RUC (11 digitos).
  - Ruta: `GET /sunat/ruc/:ruc`
  - [server/src/sunat/sunat.controller.ts](server/src/sunat/sunat.controller.ts)
- **Service**: consulta Graph Peru, normaliza y mapea la respuesta al DTO.
  - [server/src/sunat/sunat.service.ts](server/src/sunat/sunat.service.ts)
- **Main del modulo**: registra controller y service en Nest.
  - [server/src/sunat/sunat.module.ts](server/src/sunat/sunat.module.ts)
- **Main general (server)**:
  - Registro del modulo en `AppModule`.
    - [server/src/app.module.ts](server/src/app.module.ts)
  - Bootstrap del servidor.
    - [server/src/main.ts](server/src/main.ts)

## 2) Consumo desde mobile (fetch/api)
- **Cliente HTTP**: usa `fetch` con base URL.
  - [mobile/services/api.ts](mobile/services/api.ts)
- **Servicio SUNAT**: llama a `GET /sunat/ruc/:ruc`.
  - [mobile/services/sunat.ts](mobile/services/sunat.ts)

## 3) Donde se usa en UI
- **Pantalla**: consulta SUNAT cuando cambia el RUC y actualiza estado.
  - [mobile/app/(tabs)/scanner-form.tsx](mobile/app/(tabs)/scanner-form.tsx)

## Flujo end-to-end (corto)
1. UI en [mobile/app/(tabs)/scanner-form.tsx](mobile/app/(tabs)/scanner-form.tsx) detecta RUC valido.
2. Llama a `getRucConsultation()` en [mobile/services/sunat.ts](mobile/services/sunat.ts).
3. `api.get()` en [mobile/services/api.ts](mobile/services/api.ts) hace `fetch` al backend.
4. Backend responde en `GET /sunat/ruc/:ruc` desde [server/src/sunat/sunat.controller.ts](server/src/sunat/sunat.controller.ts).
5. `SunatService` consulta Graph Peru y devuelve el DTO en [server/src/sunat/sunat.service.ts](server/src/sunat/sunat.service.ts).
6. UI recibe la respuesta y renderiza estado SUNAT.
