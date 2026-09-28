# AI English Coach

Profesor personal de inglés con IA. La función central es **hablar por voz con el profesor y recibir correcciones útiles mientras aprendes**: el resto de la app (writing, reading, listening, grammar, vocabulary, progreso) se construye alrededor de ese flujo.

Hecho con **Next.js 15 + TypeScript + Tailwind CSS 4** y **Gemini** como motor de IA. Preparado para desplegar en Vercel.

---

## Qué hace

### Conversación por voz (lo principal)

Dos motores, ambos reales:

| Modo | Cómo funciona | Cuándo usarlo |
|---|---|---|
| **Por turnos** (por defecto) | Grabas → el audio va a Gemini → transcribe lo que dijiste, te corrige y responde → la respuesta se convierte en voz | Funciona en cualquier teléfono y gasta menos API |
| **En vivo** | WebSocket directo a **Gemini Live** con audio bidireccional continuo, puedes interrumpir y te interrumpe | Conversación más natural, necesita buena conexión |

El ciclo completo funciona de principio a fin: entras → pulsas *Start Conversation* → el profesor te habla → respondes por micrófono → te entiende → responde con voz → te corrige → te hace repetir → continúa → terminas → se guardan tus errores → se actualiza tu progreso → te recomienda qué estudiar.

La grabación por turnos **se envía sola al detectar silencio**, así la conversación fluye sin tocar botones.

### Correcciones honestas

Cada turno devuelve correcciones estructuradas que distinguen entre:

- **Inglés incorrecto** → se corrige.
- **Entendible pero poco natural** → se ofrece como alternativa, no como error.
- **Inglés natural** → no se toca.

Cada corrección guarda: categoría, tema, explicación en inglés y en español, gravedad, y cuántas veces has repetido ese error.

### Reglas de honestidad (importantes)

La app está diseñada para **no inventar datos**:

- Nunca se genera una puntuación de pronunciación. Si el audio no permite evaluar un sonido, lo dice.
- Nunca se afirma que dijiste algo que no está en el audio: si no se entendió, te pide repetir.
- Los porcentajes de progreso salen de respuestas reales tuyas. Sin datos, la barra dice *"Aún sin datos"* en vez de mostrar un número inventado.
- El nivel CEFR cambia por rendimiento acumulado (5 puntos), nunca por una sola respuesta.

### Resto de secciones

- **Pronunciation** — escucha, repite, feedback sobre lo que realmente se oyó.
- **Writing** — corrección, explicación y versión natural.
- **Reading** — textos a tu nivel, preguntas, vocabulario y lectura en voz alta evaluada.
- **Listening** — audio generado con TTS y preguntas de comprensión.
- **Grammar** — 16 temas con explicación, ejemplos y ejercicios.
- **Vocabulary** — tus palabras, con repaso local gratis y práctica de uso en frases.
- **Today's Lesson** — clase de ~20 min generada a partir de tus puntos flojos reales.
- **Mis errores** — base de datos de errores con repeticiones y áreas débiles.
- **Progreso** — métricas por habilidad calculadas con datos reales.

---

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y pega tu API key
npm run dev
```

Abre http://localhost:3000

### Variables de entorno

Solo una es obligatoria:

```
GEMINI_API_KEY=tu_clave_de_google_ai_studio
```

Se consigue gratis en https://aistudio.google.com/apikey

Las demás son opcionales y están documentadas en [`.env.example`](.env.example): modelos, límite de peticiones y duración del token de voz.

---

## Desplegar en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel: **Add New → Project** e importa el repo.
3. Framework: *Next.js* (se detecta solo). No hay que tocar build ni output.
4. En **Settings → Environment Variables** añade `GEMINI_API_KEY` con tu clave, para *Production*, *Preview* y *Development*.
5. **Deploy**.

> El micrófono exige HTTPS. Vercel ya sirve todo por HTTPS, así que funciona sin configuración extra. En local funciona por `localhost`; si pruebas desde el móvil contra tu PC por IP, necesitarás HTTPS o un túnel.

---

## Seguridad de la API key

- La clave vive **solo en el servidor**. Los route handlers de `src/app/api/` son lo único que la usa.
- El navegador nunca la ve: para la conversación en vivo, el servidor emite un **token efímero** de un solo uso que caduca en minutos y trae el system prompt y la configuración ya fijados, así que no se puede manipular desde el cliente.
- `.env.local` está en `.gitignore`.

## Control de consumo

El plan gratuito de Gemini es generoso en texto (1.000 peticiones al día en flash-lite) pero **muy justo en voz: 3 por minuto y 15 al día**. La app está construida sabiéndolo:

- **Tres modos de voz** en Ajustes: *Gemini* (la más natural), *Dispositivo* (la voz del navegador: gratis, ilimitada e instantánea) y *Sin voz*.
- Si la cuota de Gemini se agota a mitad de una conversación, **la app pasa sola a la voz del dispositivo** y avisa una vez, en lugar de quedarse muda.
- `GEMINI_API_KEY` admite **varias claves separadas por comas**. Al agotarse la cuota de una, rota a la siguiente. Como las cuotas se cuentan por proyecto de Google Cloud, hay que usar claves de proyectos distintos para que sumen.
- Un modelo que devuelve 503 o 429 queda **5 minutos en cuarentena**, para no pagar su espera en cada turno.
- Límite de tiempo por sesión configurable (5–45 min), la conversación se cierra sola al llegar.
- Límite de peticiones por IP en todas las rutas.
- El audio ya generado se repite desde memoria sin volver a llamar a la API.
- El repaso rápido de vocabulario funciona sin API.
- Solo viajan los últimos 14 turnos de la conversación, y el turno pide solo los campos que se muestran en pantalla.

## Privacidad

El audio **no se guarda nunca**: se envía a Gemini para entenderlo y se descarta. En el navegador quedan solo transcripciones, errores, vocabulario y progreso, en `localStorage`. Desde *Ajustes* puedes exportarlo todo en JSON, borrar el historial de conversaciones o borrarlo todo.

---

## Arquitectura

```
src/
  app/
    api/            Route handlers: único punto que habla con Gemini
      chat/         Turno de conversación (audio o texto) → respuesta + correcciones
      live-token/   Token efímero para Gemini Live
      tts/          Voz del profesor
      pronunciation/ Análisis de un intento de pronunciación
      writing/      Corrección de texto escrito
      exercise/     Reading, listening, grammar, vocabulary, lesson, placement
      summary/      Resumen de la conversación y errores detectados
      status/       Comprueba si la API key está configurada
    conversation/   La pantalla protagonista
    ...             Una carpeta por sección
  components/       UI reutilizable (ui.tsx, AppShell, conversation/, practice/)
  lib/
    gemini/         client, prompts, schemas, text, tts   (solo servidor)
    audio/          mic, player, wav                      (solo navegador)
    live/           sesión de Gemini Live                 (solo navegador)
    store.ts        Entidades y persistencia local
    analytics.ts    Métricas derivadas
    types.ts        Modelo de datos
```

La UI no conoce Gemini: habla con `src/lib/api.ts`, que habla con las rutas, que hablan con `src/lib/gemini/`. Cambiar de modelo o de proveedor no toca ni un componente.

### Modelo de datos

`Profile`, `Settings`, `Conversation`, `ConversationMessage`, `Correction`, `Mistake`, `VocabularyWord`, `GrammarTopicProgress`, `ExerciseResult`, `StudySession`, `PronunciationPractice`, `DailyLesson`.

Se guardan en `localStorage` con migración defensiva por versión. `src/lib/store.ts` expone las operaciones de dominio (agrupar errores repetidos, calcular maestría, ajustar nivel) y `src/lib/analytics.ts` las consultas: errores más frecuentes, palabras débiles, temas flojos, racha y progreso por habilidad.

### Modelos de Gemini

Cada uso tiene una **cadena de respaldo**: si el modelo configurado no está disponible o devuelve 503 por saturación, se reintenta con el siguiente y se recuerda cuál funcionó.

| Uso | Por defecto |
|---|---|
| Texto | `gemini-3.5-flash` → `gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.1-flash-lite` |
| Voz en tiempo real | `gemini-3.8-live` → `gemini-2.5-flash-native-audio-preview-12-2025` → `gemini-2.0-flash-live-001` |
| Texto a voz | `gemini-3.8-flash-tts` → `gemini-2.5-flash-preview-tts` → `gemini-2.5-pro-preview-tts` |

---

## Móvil

Pensada para el teléfono, no adaptada a él:

- Botón de micrófono de 96 px con anillos que reaccionan a tu voz.
- Navegación inferior en móvil, sidebar en escritorio, pantalla completa en la conversación.
- `100dvh` para que la barra del navegador no corte la interfaz.
- `env(safe-area-inset-*)` para el notch y el indicador de inicio.
- Inputs a 16 px para que iOS no haga zoom al escribir.
- Sin destello gris al tocar, sin retardo de 300 ms, sin hover pegajoso (solo se aplica con ratón real).
- Sin pull-to-refresh secuestrando el scroll.
- Instalable como PWA, con color de barra de estado por tema.

## Si algo falla

La app nunca deja al usuario atrapado:

- Micrófono denegado o no disponible → mensaje claro y teclado para escribir.
- Gemini Live no disponible → cambia solo al modo por turnos.
- TTS falla → la conversación sigue, se lee el texto en pantalla.
- Sin conexión o error de API → mensaje concreto y opción de reintentar.
- Falta la API key → aviso en el inicio en vez de fallar al primer toque.

---

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run start      # servir el build
npm run typecheck  # comprobar tipos
```
