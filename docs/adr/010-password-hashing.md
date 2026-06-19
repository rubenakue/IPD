# ADR-010: Hash de contraseñas y sesiones HTTP

**Fecha:** 2026-06-18
**Estado:** Aceptado

## Contexto

ADR-004 eligió autenticación con sesiones en servidor y dejó pendiente cerrar el algoritmo de hash de contraseñas. S07 ya sembró usuarios de demo con hashes `argon2`; S09 consume esos hashes en el login real y añade sesiones PostgreSQL con cookie `httpOnly`.

## Opciones consideradas

- **Argon2 (elegido):** algoritmo moderno de hashing de contraseñas, resistente a ataques por GPU por su coste de memoria. Ya está instalado y usado por el seed, así que S09 puede verificar contraseñas sin re-sembrar ni migrar datos.
- **bcrypt:** opción madura y muy extendida. Es válida, pero menos alineada con la decisión ya aplicada en S07 y obligaría a cambiar hashes existentes o soportar dos formatos sin necesidad.
- **Hash manual / SHA:** descartado. No es adecuado para contraseñas porque es demasiado rápido y no incorpora los costes adaptativos que se necesitan para resistir fuerza bruta.

## Decisión

Usar **argon2** para generar y verificar hashes de contraseña. Las contraseñas nunca se guardan en claro ni se devuelven por la API. Las sesiones se almacenan en PostgreSQL con `express-session` + `connect-pg-simple`, en la tabla versionada `session`, y se exponen al navegador mediante cookie `ipd.sid` con `httpOnly`, `sameSite: 'lax'`, `secure` solo en producción y duración de 8 horas.

## Consecuencias

- **Positivas:** login real sin credenciales hardcodeadas; sesiones revocables en servidor; el seed de demo existente funciona sin cambios.
- **Negativas:** `argon2` tiene build nativo y las sesiones añaden una tabla de infraestructura que debe migrarse en cada entorno.
- **Pendiente:** S10 añadirá permisos por rol y RLS; S09 solo autentica y devuelve identidad/proyectos activos.