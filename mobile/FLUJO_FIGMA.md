# Fazil - Flujo de la app para prototipo navegable

Este documento resume el flujo completo de la app movil para usarlo como base de un prototipo navegable en Figma.

## 1. Entrada a la app

### Pantalla: `app/index.tsx`
Estado de carga inicial.

Comportamiento:
- La app consulta la sesion guardada.
- Si existe una sesion completa, redirige a `/(tabs)`.
- Si no existe sesion o el perfil no esta completo, redirige a `/(auth)/login`.

## 2. Login con Google

### Pantalla: `app/(auth)/login.tsx`
Primera pantalla real de acceso.

Componentes clave:
- logo Fazil
- titulo de bienvenida
- boton `Continuar con Google`

Flujo:
1. El usuario toca `Continuar con Google`.
2. Se abre el navegador de Google.
3. El usuario elige su cuenta.
4. Google devuelve el acceso a `app/oauthredirect.tsx`.

Estado posible:
- Si el usuario cancela, el boton vuelve a habilitarse.
- Si hay error, se muestra alerta.

## 3. Retorno OAuth

### Pantalla tecnica: `app/oauthredirect.tsx`
Pantalla puente del login.

Flujo interno:
1. Lee `code`, `state` y `error` desde la URL.
2. Recupera la sesion temporal guardada antes de abrir Google.
3. Intercambia el `code` por token.
4. Inicia sesion en Firebase.
5. Envía el token al backend.

Ramas:
- Si el usuario ya tiene empresa y rol: va a `/(tabs)`.
- Si no tiene empresa asignada: va a `/(auth)/company-choice`.
- Si falla el login: muestra error y vuelve a `/(auth)/login`.

## 4. Decision de empresa

### Pantalla: `app/(auth)/company-choice.tsx`
Pantalla de decision despues del login.

Opciones:
- `Crear nueva empresa`
- `Unirse a una empresa existente`

Flujo:
- Si toca `Crear nueva empresa`, va a `/(auth)/register-company`.
- Si toca `Unirse a una empresa existente`, va a `/(auth)/join-company`.

## 5. Crear empresa

### Pantalla: `app/(auth)/register-company.tsx`
Formulario para administrar una nueva empresa.

Campos visibles:
- Tipo de contribuyente
- RUC
- Razon social
- Distrito

Flujo:
1. El usuario elige si es persona natural o empresa.
2. Ingresa el RUC.
3. Ingresa la razon social.
4. Ingresa el distrito.
5. Toca `Crear empresa`.
6. La app crea la empresa y genera un codigo de invitacion.

Resultado:
- Se muestra estado de exito con el codigo de invitacion.
- El usuario puede tocar `Entrar a Fazil`.
- Ese boton entra a `/(tabs)`.

### Reglas de UI para Figma
- Mostrar la tarjeta de tipo de contribuyente arriba del formulario.
- Mantener ayuda visible debajo del selector.
- Mostrar el bloque de exito en una tarjeta separada.

## 6. Unirse a empresa

### Pantalla: `app/(auth)/join-company.tsx`
Formulario para empleados o usuarios invitados.

Campo visible:
- Codigo de invitacion

Flujo:
1. El usuario escribe el codigo.
2. La app valida que tenga 6 caracteres alfanumericos.
3. Si es valido, la app lo une a la empresa.
4. Luego redirige a `/(tabs)`.

Si el codigo es invalido:
- Se muestra alerta de error.

### Reglas de UI para Figma
- La pantalla debe arrancar arriba, no centrada verticalmente.
- El boton principal debe estar debajo del campo.
- El teclado no debe tapar el input.

## 7. Navegacion principal

### Layout: `components/app-tabs.tsx`
Tabs visibles:
- Inicio
- Historial
- Perfil
- Analitica

Comportamiento visual:
- La pestaña activa se marca con color azul fuerte.
- El icono de la pestaña activa cambia a su version llena.
- La barra inferior queda clara y consistente.

## 8. Inicio

### Pantalla: `app/(tabs)/index.tsx`
Vista principal del dashboard.

Contenido:
- saludo con nombre del usuario
- resumen de gastos del mes
- detraccion pendiente
- acciones rapidas:
  - Capturar
  - Subir
- actividades recientes

Ramas de accion:
- `Capturar` va a `/(tabs)/scanner`.
- `Subir` va a `/(tabs)/upload`.

Estado vacio:
- Si no hay actividad, muestra una tarjeta de estado vacio.

## 9. Scanner de factura

### Pantalla: `app/(tabs)/scanner.tsx`
Captura de imagen de la factura.

Flujo:
1. El usuario abre la camara.
2. Toma la foto.
3. La app muestra una vista previa.
4. El usuario confirma si usar la foto o repetir.
5. La foto se manda a extraccion.
6. La app navega a `/(tabs)/scanner-form`.

Estados:
- permiso de camara
- captura
- revison de foto
- procesamiento

## 10. Formulario de revision

### Pantalla: `app/(tabs)/scanner-form.tsx`
Aqui vive toda la informacion principal de la factura.

Bloques visuales:
- Documento
- Datos de compra
- Detraccion
- Resumen
- Items detectados

Campos principales:
- RUC
- Numero de factura
- Fecha
- Sede
- Ubicacion
- Subtotal
- IGV
- Total
- % Detraccion
- Monto de detraccion
- Tipo de detraccion

Validaciones visibles:
- SUNAT
- CONDICION
- FECHA

Flujo:
1. La app precarga lo que detecto el OCR / Document AI.
2. El usuario corrige datos manualmente si hace falta.
3. La app valida el RUC con SUNAT.
4. La app valida fecha y tipo de detraccion.
5. El usuario toca `Siguiente`.

Ramas:
- Si todo esta correcto: va a `/(tabs)/scanner-success`.
- Si hay incidencias: va a `/(tabs)/scanner-error`.

### Reglas de UI para Figma
- Separar visualmente cada bloque.
- Mantener el resumen mas destacado.
- Mostrar el estado SUNAT con feedback visible.

## 11. Exito de validacion

### Pantalla: `app/(tabs)/scanner-success.tsx`
Se muestra cuando la factura pasa validacion.

Contenido:
- monto total
- datos confirmados
- detalles del comprobante
- acciones:
  - Guardar en BigQuery
  - Volver al inicio

Flujo:
1. El usuario revisa el resumen.
2. Toca `Guardar en BigQuery`.
3. Se guarda el comprobante.
4. Vuelve a `/(tabs)`.

## 12. Incidencia / observacion

### Pantalla: `app/(tabs)/scanner-error.tsx`
Se muestra cuando la factura tiene errores o advertencias.

Contenido:
- alerta de incidencia detectada
- datos revisados
- lista de razones de validacion
- acciones:
  - Editar manualmente
  - Guardar con observaciones

Flujo:
1. El usuario revisa los problemas.
2. Puede tocar `Editar Manualmente` para volver a `/(tabs)/scanner-form`.
3. O puede guardar con observaciones.
4. Si guarda, vuelve a `/(tabs)`.

## 13. Subida manual

### Pantalla: `app/(tabs)/upload.tsx`
Ruta secundaria para cargar comprobantes manualmente.

Uso:
- alternativa al scanner
- no es el flujo principal del prototipo, pero puede quedar como pantalla secundaria navegable

## 14. Historial

### Pantalla: `app/(tabs)/history.tsx`
Lista de comprobantes historicos.

Componentes:
- filtros:
  - Todos
  - Validados
  - Observados
- lista de comprobantes

Estado vacio:
- si no hay data, muestra un mensaje de `Sin comprobantes`.

## 15. Analitica

### Pantalla: `app/(tabs)/analytics.tsx`
Resumen visual de la actividad.

Contenido:
- total del mes
- promedio
- flujo de comprobantes
- distribucion
- principales proveedores

Estado vacio:
- si no hay data, muestra un estado limpio de `Sin datos`.

## 16. Perfil

### Pantalla: `app/(tabs)/profile.tsx`
Datos del usuario y de su empresa.

Contenido:
- nombre
- correo
- datos de empresa
- RUC
- razon social
- ubicacion
- rol
- boton cerrar sesion

Flujo:
- `Cerrar sesion` lleva de regreso a `/(auth)/login`.

## 17. Resumen de rutas para Figma

### Pantallas principales para prototipo
1. `Splash / Loading` -> `app/index.tsx`
2. `Login` -> `app/(auth)/login.tsx`
3. `OAuth Redirect` -> `app/oauthredirect.tsx`
4. `Company Choice` -> `app/(auth)/company-choice.tsx`
5. `Register Company` -> `app/(auth)/register-company.tsx`
6. `Join Company` -> `app/(auth)/join-company.tsx`
7. `Tabs Home` -> `app/(tabs)/index.tsx`
8. `Scanner` -> `app/(tabs)/scanner.tsx`
9. `Scanner Form` -> `app/(tabs)/scanner-form.tsx`
10. `Scanner Success` -> `app/(tabs)/scanner-success.tsx`
11. `Scanner Error` -> `app/(tabs)/scanner-error.tsx`
12. `History` -> `app/(tabs)/history.tsx`
13. `Analytics` -> `app/(tabs)/analytics.tsx`
14. `Profile` -> `app/(tabs)/profile.tsx`

## 18. Ramas principales del prototipo

### Flujo A: usuario nuevo con empresa nueva
`Splash` -> `Login` -> `OAuth Redirect` -> `Company Choice` -> `Register Company` -> `Tabs Home`

### Flujo B: usuario nuevo que entra a empresa existente
`Splash` -> `Login` -> `OAuth Redirect` -> `Company Choice` -> `Join Company` -> `Tabs Home`

### Flujo C: captura de factura correcta
`Tabs Home` -> `Scanner` -> `Scanner Form` -> `Scanner Success` -> `Tabs Home`

### Flujo D: captura con observaciones
`Tabs Home` -> `Scanner` -> `Scanner Form` -> `Scanner Error` -> `Scanner Form` o `Tabs Home`

### Flujo E: salida de sesion
`Tabs/Profile` -> `Cerrar sesion` -> `Login`

## 19. Recomendacion para Figma

Para armar el prototipo navegable, conecta estos botones:
- `Continuar con Google` -> `OAuth Redirect`
- `Crear nueva empresa` -> `Register Company`
- `Unirse a una empresa existente` -> `Join Company`
- `Entrar a Fazil` -> `Tabs Home`
- `Permitir camara` -> `Scanner`
- `Usar esta foto` -> `Scanner Form`
- `Siguiente` -> `Scanner Success` o `Scanner Error`
- `Editar Manualmente` -> `Scanner Form`
- `Guardar` -> `Tabs Home`

## 20. Nota importante

Este flujo esta basado en el frontend actual y sus rutas reales. No requiere cambiar backend para hacer el prototipo navegable en Figma.
