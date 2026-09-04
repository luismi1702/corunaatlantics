// Configuración del modo demo. Reemplaza a config.js vía el import map de
// demo.html, para que la app arranque sin proyecto de Supabase.

export const SUPABASE_URL = 'demo';
export const SUPABASE_ANON_KEY = 'demo';
export const DIAS_AVISO_CADUCIDAD = 30;
export const estaConfigurado = () => true;
