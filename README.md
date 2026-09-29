## Weather CLI APP

El objetivo de esta aplicación es que creemos una aplicación de consola que pida que ingresemos la ciudad, Al final, generaremos un binario ejecutable.

### Opciones:

- Ingresar el nombre de una ciudad.
- Guardar la ciudad por defecto.
- Registrar varias otras ciudades para buscar el clima en esas otras ciudades.
- Consultar el pronóstico de 7 días y las alertas meteorológicas derivadas.
- Cambiar la unidad de temperatura (°C/°F), que se persiste entre ejecuciones.

## Stack

- Bun.js
- OpenMeteo

## Ejemplo de petición http:

1. Paso 1: Geocoding API.
2. Paso 2: OpenMeteo API.

```
https://geocoding-api.open-meteo.com/v1/search?name=Ottawa&count=1&language=es&format=json
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&current=temperature_2m
```

## Inicializar proyecto

```bash
bun init
```

### Ejemplo del menú

Esta es la apariencia que deseamos crear

```bash
════════════════════════════════════════
         WEATHER CLI
════════════════════════════════════════
  1. Clima de ciudad default
  2. Clima de todas las ciudades (1)
  3. Buscar y agregar ciudad
  4. Eliminar ciudad
  5. Establecer ciudad default
  8. Ajustes (°C)
  0. Salir
════════════════════════════════════════
  Selecciona una opción: 5
```

## Releases

`.github/workflows/release.yml` compila el binario y publica un release de GitHub para
Linux, macOS y Windows (x64 y arm64).

- **Disparo**: automáticamente al hacer push a `main` si cambia `package.json`, o
  manualmente desde la pestaña **Actions**.
- **Build**: `bun run build --target=bun-<os>-<arch>`. El script `build` también ejecuta
  los tests, así que un test rojo impide publicar.
- **Assets**: `weather-<os>-<arch>.tar.gz` (Unix), `weather-windows-x64.zip` y un
  `SHA256SUMS` para verificar las descargas.
- **Etiqueta**: se lee `version` de `package.json` y se usa `v<version>` (`0.1.0` → `v0.1.0`).
  Si el release ya existe, el run termina sin hacer nada.
- **Sin secretos**: no hay que crear un PAT ni añadir nada en *Settings → Secrets*.
  GitHub inyecta un token automático en cada run y el workflow solo necesita
  `permissions: contents: write`. No interviene ningún servicio externo.

Publicar una versión nueva:

```bash
# edita "version" en package.json (0.1.0 -> 0.2.0)
git commit -am "release: v0.2.0" && git push origin main
```

Verificar una descarga:

```bash
sha256sum -c SHA256SUMS   # shasum -a 256 -c SHA256SUMS en macOS
```
