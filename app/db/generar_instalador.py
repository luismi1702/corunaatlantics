# Junta los ficheros numerados en uno solo, para pegarlo de una vez en Supabase.
# Se regenera con: python generar_instalador.py  (desde app/db)
import io

ORDEN = ['01_schema.sql', '02_rls.sql', '04_tesoreria.sql',
         '05_calendario.sql', '06_jugador.sql', '07_registro.sql']

CABECERA = """-- Coruña Atlantics — Instalación completa
--
-- GENERADO. No editar a mano: es la unión de los ficheros numerados de esta
-- misma carpeta, en el orden en que hay que ejecutarlos. Si hay que cambiar
-- algo, se cambia el fichero suelto y se vuelve a generar.
--
-- Cómo usarlo: Supabase -> SQL Editor -> New query -> pegar todo -> Run.
-- Después, ejecutar 03_arranque.sql con tu email para crear la temporada y
-- nombrarte administrador.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.

"""

partes = [CABECERA]
for f in ORDEN:
    texto = io.open(f, encoding='utf-8').read()
    partes.append('-- ' + '=' * 74 + '\n-- %s\n-- ' % f + '=' * 74 + '\n\n' + texto.strip() + '\n\n')

io.open('00_instalar.sql', 'w', encoding='utf-8').write('\n'.join(partes))
print('00_instalar.sql generado desde:', ', '.join(ORDEN))
