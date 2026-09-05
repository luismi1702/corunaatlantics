# Junta los ficheros numerados en uno solo, para pegarlo de una vez en Supabase.
# Se regenera con: python generar_instalador.py  (desde app/db)
import io

ORDEN = ['01_schema.sql', '02_rls.sql', '04_tesoreria.sql',
         '05_calendario.sql', '06_jugador.sql', '07_registro.sql',
         '08_dorsales.sql', '09_avisos.sql', '10_material.sql',
         '11_importe_cuota.sql', '12_arranque_automatico.sql',
         '13_permisos_funciones.sql', '14_tienda.sql', '15_competiciones.sql', '16_estadisticas_visibles.sql', '17_permisos.sql', '18_capitanes.sql', '19_tienda_cierre.sql', '20_cobro_directo.sql', '21_companeros_aprobados.sql']

CABECERA = """-- Coruña Atlantics — Instalación completa
--
-- GENERADO. No editar a mano: es la unión de los ficheros numerados de esta
-- misma carpeta, en el orden en que hay que ejecutarlos. Si hay que cambiar
-- algo, se cambia el fichero suelto y se vuelve a generar.
--
-- Cómo usarlo: Supabase -> SQL Editor -> New query -> pegar todo -> Run.
--
-- Con esto queda todo montado, incluida una temporada para empezar. No hace
-- falta nada más: la PRIMERA persona que entre en la app será la
-- administradora, así que entra tú antes de repartir el enlace.
--
-- 03_arranque.sql queda como alternativa manual por si hace falta nombrar
-- administradora a otra persona.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.

"""

partes = [CABECERA]
for f in ORDEN:
    texto = io.open(f, encoding='utf-8').read()
    partes.append('-- ' + '=' * 74 + '\n-- %s\n-- ' % f + '=' * 74 + '\n\n' + texto.strip() + '\n\n')

io.open('00_instalar.sql', 'w', encoding='utf-8').write('\n'.join(partes))
print('00_instalar.sql generado desde:', ', '.join(ORDEN))
