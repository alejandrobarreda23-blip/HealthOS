# HealthOS Multiuser V1 patch

Patch incremental sobre HealthOS 1.11.5.

## Qué añade
- SubjectScope/SubjectProvider separado de Auth.
- Rol admin con pestaña Usuarios.
- Selector de subject para admins.
- Apertura de perfiles de otros usuarios en modo lectura.
- Auditoría `open_subject` mediante `admin_access_log`.
- Today, Trends, Health Brief, Dashboard y Acquisition leen el subject activo.
- Escrituras sensibles (check-in, eventos y sync) bloqueadas cuando un admin visualiza otro subject.

## Requisitos Supabase ya aplicados
Este patch presupone que ya existen:
- profiles
- subjects
- subject_access
- admin_access_log
- RPC list_accessible_subjects
- políticas admin read en tablas con user_id

## Instalación
Copiar el contenido de este ZIP sobre la raíz del repositorio, conservando rutas y permitiendo reemplazar los archivos existentes.

No hay archivos que eliminar.
