# Fix: nest-cli.json entryFile en company-service

**Fecha:** 2026-02-25

## Problema

`company-service` no arrancaba con `start:dev` porque `nest-cli.json` tenía `entryFile: "company-service/src/main"` pero el build genera `dist/main.js`.

## Solución

Cambiar `entryFile` a `"main"` en `nest-cli.json`.

## Archivos modificados

- `company-service/nest-cli.json` — corregir entryFile
