# Synapsis Cognitivo

Aplicación web de pausas activas para estudiantes: retos cortos de memoria y atención (secuencia de patrones, memorama e intruso visual) para entrenar la atención entre clases. Acceso con correo institucional (`@uvp.edu.mx` o `@uvp.mx`) o con Google.

- **Frontend:** React + Vite (carpeta `src/`)
- **Backend:** Node.js + Express + MongoDB para las cuentas (archivo `index.js`)
- **Actividad:** Firebase Firestore para sesiones, intentos y rachas (carpeta `server/`)

## Requisitos

- [Node.js](https://nodejs.org) 20.19 o superior (o 22.12 o superior). Verifica con `node -v`.
- [MongoDB](https://www.mongodb.com/try/download/community) corriendo en local (con Laragon: *Iniciar todo*).
- [Git](https://git-scm.com).

## Primeros pasos

### 1. Descargar el proyecto y cambiarte a la rama de trabajo

```bash
git clone <URL-DEL-REPOSITORIO>
cd synapsis-cognitivo
git fetch origin
git switch nombre-de-la-rama
```

La URL se copia del botón verde **Code** en GitHub. Si ya tienes el proyecto clonado, salta el `git clone` y entra a la carpeta.

> Trabaja siempre en `nombre-de-la-rama`. **No hagas commits ni push directos a `main`.**

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear tu archivo `.env`

Copia la plantilla y completa los valores (el `.env` no se sube a git):

```bash
copy .env.example .env
```

| Variable | Para qué sirve |
| --- | --- |
| `GOOGLE_CLIENT_ID` | ID de cliente de Google (lo usa el backend para verificar el token) |
| `VITE_GOOGLE_CLIENT_ID` | El mismo ID, para el botón de Google en el frontend (debe llevar el prefijo `VITE_`) |
| `JWT_SECRET` | Texto largo y aleatorio con el que se firman las sesiones. Cada persona usa el suyo |
| `MONGO_URI` | Conexión a MongoDB. Por defecto `mongodb://127.0.0.1:27017/synapsis_db` |
| `PORT` | Puerto del backend. Por defecto `5000` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Ruta al JSON de la cuenta de servicio de Firebase. Por defecto `./firebase-service-account.json` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Alternativa al archivo (hostings): el JSON completo en una línea o en base64 |
| `APP_TIMEZONE` | Zona horaria para contar los días de la racha. Por defecto `America/Mexico_City` |
| `FIRESTORE_EMULATOR_HOST` | Solo para pruebas locales con el emulador, por ejemplo `127.0.0.1:8080` |

Pide el valor del Client ID a quien administra el proyecto en Google Cloud. Para generar un `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Arrancar el proyecto

Se necesitan **dos terminales** abiertas en la carpeta del proyecto:

```bash
# Terminal 1: backend (http://localhost:5000)
npm run server
```

```bash
# Terminal 2: frontend (http://localhost:5173)
npm run dev
```

Abre <http://localhost:5173>.

> El backend y Vite leen el `.env` solo al arrancar. Si cambias el `.env`, detén cada terminal con `Ctrl + C` y vuelve a arrancarla.

## Scripts disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Frontend en modo desarrollo (Vite) |
| `npm run server` | Backend (Express) |
| `npm run build` | Genera el frontend compilado en `dist/` |
| `npm run preview` | Sirve localmente el resultado de `npm run build` |
| `npm test` | Pruebas del backend de actividad (no necesitan internet ni Firebase) |
| `npm run firebase:check` | Comprueba que el servidor puede escribir y leer en tu Firestore |
| `npm run emulator` | Emulador local de Firestore (necesita Java; ver más abajo) |

## Estructura

```
synapsis-cognitivo/
├── index.js            Backend: API, usuarios, sesión y juego
├── index.html          Entrada del frontend (Vite)
├── server/             Actividad en Firestore: firebase.js (conexión), activity.js (API),
│                       activityLogic.js (rachas y validación) y sus pruebas
├── firestore.rules     Reglas de seguridad de Firestore (nadie accede desde el navegador)
├── firebase.json       Configuración de Firebase (reglas y emulador)
├── vite.config.mjs     Configuración de Vite (el proxy envía /api al puerto 5000)
├── legacy/             Versión anterior en un solo HTML, solo como respaldo
├── public/             Archivos estáticos (favicon)
└── src/
    ├── views/          Pantallas: Login, Inicio, Juego (secuencias), Memorama y Perfil
    ├── components/     Piezas reutilizables (botones, tablero, barra de navegación…)
    ├── api/            Llamadas al backend
    ├── context/        Sesión del usuario (AuthProvider, useAuth)
    ├── hooks/          Lógica de los juegos (useSequenceGame, useMemoryGame, useOddGame)
    ├── lib/            Utilidades
    └── styles/         Colores y estilos base
```

## Base de datos de actividad (Firebase Firestore)

Las cuentas siguen en MongoDB. **Firestore guarda lo que el usuario hace en la app**, y solo el backend habla con él (el navegador nunca accede directamente; las reglas lo bloquean).

| Dónde | Qué guarda |
| --- | --- |
| `users/{uid}` | Correo, fechas, contadores (`totals`), racha (`streak`), resumen por juego (`games`) y mejores marcas (`bests`). `uid` es el id del usuario en MongoDB |
| `users/{uid}/sessions/{id}` | Cada visita a la app: inicio, última actividad, cierre, duración, proveedor de login (`password` o `google`) y dispositivo |
| `users/{uid}/attempts/{id}` | Cada intento: juego, nivel, si fue acierto, duración y métricas (movimientos, intrusos, longitud del patrón…) |
| `users/{uid}/events/{id}` | Datos sueltos que surgen sobre la marcha: `level_selected`, `preview_skipped`, `game_abandoned`, `game_exit`… |

**Racha:** cuenta los días seguidos en los que se completó al menos un intento, con la zona horaria `APP_TIMEZONE`. Si pasa un día entero sin jugar, vuelve a 0 (se conserva la mejor racha).

**Qué es un intento:** en *Secuencia de patrones*, cada ronda (con acierto o error); en *Memorama*, cada partida terminada; en *Intruso visual*, cada partida de 45 s.

### Configurar Firebase (una sola vez)

1. Entra a <https://console.firebase.google.com> con tu cuenta de Google y pulsa **Crear un proyecto** (puedes desactivar Google Analytics).
2. En el menú **Compilación > Firestore Database**, pulsa **Crear base de datos**. Elige modo **producción** y una ubicación cercana (por ejemplo `nam5 (us-central)`). **La ubicación no se puede cambiar después.**
3. En **Configuración del proyecto** (engranaje) > **Cuentas de servicio**, pulsa **Generar nueva clave privada**. Se descarga un archivo `.json`.
4. Guarda ese archivo en la raíz del proyecto con el nombre `firebase-service-account.json`. Ya está en `.gitignore`: **nunca lo subas a git ni lo pegues en chats o capturas.**
5. En tu `.env` agrega (están en `.env.example`):

   ```
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
   APP_TIMEZONE=America/Mexico_City
   ```

6. Instala la dependencia nueva y comprueba la conexión:

   ```bash
   npm install
   npm run firebase:check
   ```

   Debe decir `OK: se escribió y se leyó un documento de prueba en Firestore.`
7. Reinicia el backend (`npm run server`). Al arrancar debe aparecer `Firestore listo (Firebase, proyecto "...")`.
8. Publica las reglas de seguridad: en Firestore > **Reglas**, pega el contenido de `firestore.rules` y pulsa **Publicar**.

Juega una ronda y revisa en la consola de Firebase (Firestore Database > Datos) la colección `users`.

> Si Firestore no está configurado, la app funciona igual: simplemente no guarda la actividad ni muestra la racha.

### Compartir el proyecto con colegas

- **Mismo proyecto de Firebase:** pásales el archivo `firebase-service-account.json` por un canal privado (nunca por git). Todos escribirían en la misma base.
- **Sin tocar los datos reales:** usa el emulador local. Necesita [Java](https://adoptium.net) 11 o superior.

  ```bash
  npm run emulator            # terminal 1 (panel en http://localhost:4000)
  ```

  y en el `.env` pon `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` antes de arrancar `npm run server`.

## Login con Google

1. En [Google Cloud Console](https://console.cloud.google.com) > *APIs y servicios* > *Credenciales*, el ID de cliente OAuth (tipo "Aplicación web") debe tener estos **orígenes autorizados de JavaScript**:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
2. Mientras la app esté en modo **Pruebas**, solo pueden entrar los correos agregados en *Pantalla de consentimiento > Usuarios de prueba*.
3. El backend solo acepta correos institucionales (`@uvp.edu.mx` o `@uvp.mx`).

## Flujo de trabajo con Git

`main` es la rama estable. El trabajo se hace en ramas y `main` no se toca.

### Traer los cambios de tus colegas

Estando en la rama de trabajo:

```bash
git pull
npm install
```

Corre `npm install` después de cada `pull` por si se agregaron dependencias.

### Subir tus cambios

```bash
git status                      # revisa qué cambió (el .env no debe aparecer)
git add .
git commit -m "feat: descripción corta del cambio"
git push
```

La primera vez que subes una rama nueva, usa:

```bash
git push -u origin HEAD
```

### Crear una rama nueva a partir de la actual

```bash
git switch -c feature/nombre-corto
git push -u origin HEAD
```

### Mensajes de commit

Un prefijo y una frase corta en presente:

| Prefijo | Cuándo usarlo |
| --- | --- |
| `feat:` | Una función nueva |
| `fix:` | Corrección de un error |
| `style:` | Cambios visuales sin cambiar el comportamiento |
| `docs:` | Documentación |
| `chore:` | Mantenimiento (dependencias, configuración) |

### Reglas del equipo

- No hacer `push` a `main` ni fusionar ramas en `main` sin avisar.
- No subir el `.env` ni claves o secretos.
- Antes de empezar a trabajar, hacer `git pull`.

## Problemas frecuentes

| Mensaje o síntoma | Causa y solución |
| --- | --- |
| `GOOGLE_CLIENT_ID no está configurado en el servidor` | El backend arrancó sin leer el `.env`. Revisa que `GOOGLE_CLIENT_ID` esté en el `.env` y reinicia `npm run server` desde la carpeta del proyecto |
| El botón de Google dice `Falta VITE_GOOGLE_CLIENT_ID` | Falta esa variable en el `.env`. Agrégala y reinicia `npm run dev` |
| Google muestra `origin_mismatch` | El origen no está autorizado. Agrega `http://localhost:5173` en Google Cloud (ver arriba) |
| Google muestra "Acceso bloqueado" | Tu correo no está en *Usuarios de prueba* de la pantalla de consentimiento |
| `EADDRINUSE` al arrancar el backend | El puerto 5000 ya está en uso. Busca el proceso con `netstat -ano \| findstr :5000` y ciérralo con `taskkill /PID NUMERO /F` |
| "No se pudo conectar con el servidor" en la página | El backend no está corriendo. Arráncalo con `npm run server` |
| `Firestore NO configurado` al arrancar el backend | Falta el JSON de la cuenta de servicio o la ruta en `.env` es incorrecta. Revisa los pasos de Firebase y reinicia el backend |
| `npm run firebase:check` falla con `PERMISSION_DENIED` o `NOT_FOUND` | Aún no creaste la base de datos en *Firestore Database*, o la clave JSON es de otro proyecto |
| `Repository not found` al hacer push | El repositorio no existe o tu cuenta no tiene acceso. Revisa la URL con `git remote -v` |
