// Configuración de la app.
//
// Estos dos valores salen de Supabase: Project Settings -> API Keys.
//
// La clave publicable (antes llamada "anon") es pública por diseño y va en el
// navegador de cualquiera que abra la app: por eso está aquí, en el repositorio,
// sin ningún problema. Lo que protege los datos son las políticas RLS de
// app/db/02_rls.sql, no esconder la clave.
//
// La que NUNCA debe salir de Supabase es la secreta ("service_role"): esa se
// salta todas las políticas.

export const SUPABASE_URL = 'https://bydhuvuwbjqsdrygyxup.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_sQmBJA5bicJSXjawFHYY0Q_44Cjbwk9';

// Días de antelación con los que la app avisa de un documento que va a caducar.
export const DIAS_AVISO_CADUCIDAD = 30;

export const estaConfigurado = () =>
  SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 30;
