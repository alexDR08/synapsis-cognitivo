# Synapsis Cognitivo · Memorama Calma

App web para bajar el estrés en el entorno estudiantil, con el diseño y el logo de Synapsis.

**En línea:** https://synapsis-cognitivo.vercel.app

## Qué incluye

- **Inicio de sesión** con correo institucional (`@uvp.mx` / `@uvp.edu.mx`), nombre de usuario o Google, y cuentas recordadas ("Continuar como").
- **Check-in de estrés** que recomienda juego, dificultad y modo según cómo te sientes.
- **Memorama:** 3 dificultades, 5 s para memorizar al inicio, tiempo por turno y modo Reto contra reloj.
- **Secuencia de patrones:** objetos que se encienden en orden, 4 intentos y secuencia nueva al reiniciar.
- **Respiración guiada** 4 · 4 · 6.
- **Para hoy:** frase del día, tip de estudio y diario de gratitud.
- **Progreso:** racha, gráficas de actividad y de estrés antes/después, y 12 logros.
- **Perfil:** niveles con XP, calendario de actividad, historial, mejores marcas y preferencias (tema y sonido).

## Cómo correrlo

Son archivos estáticos (HTML, CSS y JavaScript), sin dependencias:

1. Copia la carpeta a `C:\laragon\www\memorama-calma`.
2. Abre `http://localhost/memorama-calma/`.

El inicio con Google necesita que el origen (por ejemplo `http://localhost`) esté autorizado en el Client ID de `config.js`.

## Nota

Las cuentas y el progreso se guardan en el navegador de cada dispositivo (`localStorage`); no hay servidor. Para compartir datos entre dispositivos habría que conectarlo al backend del equipo.
