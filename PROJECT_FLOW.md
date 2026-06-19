# Flujo del proyecto (resumen)

## 1) Backend (server)
- **Arquitectura**: modular por casos de uso.
- **Por modulo**:
  - **DTO**: define la forma de entrada/salida.
  - **Controller**: expone rutas HTTP.
  - **Service**: contiene la logica de negocio.
  - **Main del modulo**: orquesta Controller + Service siguiendo Clean Architecture.
- **Main general**: registra y expone todas las APIs de los modulos.

## 2) Frontend mobile (Expo/React)
- **Servicios**: funciones que hacen `fetch`/`axios` hacia el backend.
- **Pantallas**: consumen servicios y manejan estado en hooks.
- **Flujo tipico**:
  1. La pantalla llama al servicio.
  2. El servicio llama al backend.
  3. La respuesta actualiza el estado.
  4. La UI se renderiza con el estado actualizado.

## 3) Hosting (web estatico)
- **Objetivo**: paginas publicas (landing, terms, privacy).
- **Sin logica de negocio**: solo archivos HTML.

## Mejora rapida sugerida
- Unificar el manejo de errores y estados de carga en frontend (hook compartido).
- Crear contratos claros por modulo (DTOs por caso de uso).
- Documentar rutas por modulo en un unico indice.
