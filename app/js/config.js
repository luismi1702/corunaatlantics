// Configuración de la app.
//
// Estos dos valores salen de Supabase: Project Settings -> Data API.
// La clave "anon" es pública por diseño y puede estar en el repositorio sin
// problema: lo que protege los datos son las políticas RLS de 02_rls.sql, no
// esconder la clave. La que NUNCA debe salir de Supabase es la "service_role".

export const SUPABASE_URL = 'PON_AQUI_TU_URL';       // https://xxxx.supabase.co
export const SUPABASE_ANON_KEY = 'PON_AQUI_TU_CLAVE';

// Días de antelación con los que la app avisa de un documento que va a caducar.
export const DIAS_AVISO_CADUCIDAD = 30;

export const estaConfigurado = () =>
  SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 40;
