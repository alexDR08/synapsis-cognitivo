# Synapsis Cognitivo

Aplicación web de pausas activas para estudiantes: retos cortos de memoria (secuencias de patrones) para entrenar la atención entre clases. Acceso con correo institucional (`@uvp.edu.mx` o `@uvp.mx`) o con Google.

- **Frontend:** React + Vite (carpeta `src/`)
- **Backend:** Node.js + Express + MongoDB (archivo `index.js`)

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

## Estructura

```
synapsis-cognitivo/
├── index.js            Backend: API, usuarios, sesión y juego
├── index.html          Entrada del frontend (Vite)
├── vite.config.mjs     Configuración de Vite (el proxy envía /api al puerto 5000)
├── legacy/             Versión anterior en un solo HTML, solo como respaldo
├── public/             Archivos estáticos (favicon)
└── src/
    ├── views/          Pantallas: Login, Inicio, Juego y Perfil
    ├── components/     Piezas reutilizables (botones, tablero, barra de navegación…)
    ├── api/            Llamadas al backend
    ├── context/        Sesión del usuario (AuthProvider, useAuth)
    ├── hooks/          Lógica del juego (useSequenceGame)
    ├── lib/            Utilidades
    └── styles/         Colores y estilos base
```

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
| `Repository not found` al hacer push | El repositorio no existe o tu cuenta no tiene acceso. Revisa la URL con `git remote -v` |
