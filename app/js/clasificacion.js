// La clasificación según el reglamento de competiciones de Flag-Football de
// FEFAPA (capítulo quinto, arts. 32 a 35). Resumen en docs/liga-norte-reglas.md.
//
// - Cuenta el porcentaje de victorias: en la Liga Norte no todos llevan los
//   mismos partidos en cada jornada, así que las victorias a secas engañan.
// - No hay empates (art. 35): la prórroga decide y el ganador suma un punto al
//   marcador. Si alguno se cuela, no cuenta como victoria para nadie.
// - Incomparecencia (art. 33): derrota 2-0 para el que no fue. Al que ganó así
//   no se le cuenta ese partido para los porcentajes de puntos, y el que no se
//   presentó queda el último de su grupo de empate (art. 34).
// - Desempate (art. 34): 1) entre los empatados, victorias, diferencia y menos
//   puntos recibidos; 2) menos puntos recibidos por partido; 3) más diferencia
//   por partido; 4) expulsados, que la app no lleva; 5) sorteo, que se marca.
//
// Se calcula aquí y no en la base de datos porque el enfrentamiento directo
// depende de quién esté empatado con quién, y eso en SQL es ilegible.

const jugado = (p) => !!p.no_presentado || (p.puntos_local != null && p.puntos_visitante != null);

// Un partido visto desde un equipo.
function desde(p, id) {
  const local = p.local_id === id;
  const pf = local ? p.puntos_local : p.puntos_visitante;
  const pc = local ? p.puntos_visitante : p.puntos_local;
  const rival = local ? p.visitante_id : p.local_id;
  if (p.no_presentado) {
    const noFue = p.no_presentado === id;
    return { rival, pf: noFue ? 0 : 2, pc: noFue ? 2 : 0, gana: !noFue, pierde: noFue,
             noFue, rivalNoFue: !noFue };
  }
  return { rival, pf, pc, gana: pf > pc, pierde: pf < pc, noFue: false, rivalNoFue: false };
}

export function calcularClasificacion(equipos, partidos) {
  const hechos = partidos.filter(jugado);

  const filas = equipos.map(e => {
    const suyos = hechos.filter(p => p.local_id === e.id || p.visitante_id === e.id)
      .map(p => desde(p, e.id));
    // Para los porcentajes de puntos no cuenta lo ganado porque el rival no fue.
    const conPuntos = suyos.filter(m => !m.rivalNoFue);
    const favor = suyos.reduce((s, m) => s + m.pf, 0);
    const contra = suyos.reduce((s, m) => s + m.pc, 0);
    const favorP = conPuntos.reduce((s, m) => s + m.pf, 0);
    const contraP = conPuntos.reduce((s, m) => s + m.pc, 0);
    const ganados = suyos.filter(m => m.gana).length;
    return {
      equipo_id: e.id, equipo: e.nombre, es_nuestro: !!e.es_nuestro,
      jugados: suyos.length, ganados, perdidos: suyos.filter(m => m.pierde).length,
      empatados: suyos.filter(m => !m.gana && !m.pierde).length,
      puntos_favor: favor, puntos_contra: contra, diferencia: favor - contra,
      porcentaje: suyos.length ? ganados / suyos.length : null,
      incomparecencias: suyos.filter(m => m.noFue).length,
      contra_por_partido: conPuntos.length ? contraP / conPuntos.length : 0,
      diferencia_por_partido: conPuntos.length ? (favorP - contraP) / conPuntos.length : 0,
      sorteo: false,
      _partidos: suyos
    };
  });

  // Mismo porcentaje, comparado sin decimales: 1 de 2 y 2 de 4 empatan.
  const mismoPorcentaje = (a, b) => a.ganados * b.jugados === b.ganados * a.jugados;

  const conPartidos = filas.filter(f => f.jugados)
    .sort((a, b) => b.ganados * a.jugados - a.ganados * b.jugados);
  const sinPartidos = filas.filter(f => !f.jugados)
    .sort((a, b) => a.equipo.localeCompare(b.equipo));

  // Grupos de empatados a porcentaje, y cada grupo se ordena con el desempate.
  const orden = [];
  for (let i = 0; i < conPartidos.length;) {
    let j = i + 1;
    while (j < conPartidos.length && mismoPorcentaje(conPartidos[i], conPartidos[j])) j++;
    orden.push(...desempatar(conPartidos.slice(i, j)));
    i = j;
  }

  return [...orden, ...sinPartidos].map(({ _partidos, ...f }) => f);
}

function desempatar(grupo) {
  if (grupo.length < 2) return grupo;
  const ids = new Set(grupo.map(f => f.equipo_id));

  // Lo que se hizo contra los demás del grupo.
  for (const f of grupo) {
    const entre = f._partidos.filter(m => ids.has(m.rival));
    f._h2h = {
      ganados: entre.filter(m => m.gana).length,
      diferencia: entre.reduce((s, m) => s + m.pf - m.pc, 0),
      contra: entre.reduce((s, m) => s + m.pc, 0)
    };
  }

  const criterios = [
    (a, b) => (a.incomparecencias > 0) - (b.incomparecencias > 0),   // el que no fue, al final
    (a, b) => b._h2h.ganados - a._h2h.ganados,
    (a, b) => b._h2h.diferencia - a._h2h.diferencia,
    (a, b) => a._h2h.contra - b._h2h.contra,
    (a, b) => a.contra_por_partido - b.contra_por_partido,
    (a, b) => b.diferencia_por_partido - a.diferencia_por_partido
  ];
  const comparar = (a, b) => {
    for (const c of criterios) { const r = c(a, b); if (r) return r; }
    return 0;
  };

  const orden = [...grupo].sort((a, b) => comparar(a, b) || a.equipo.localeCompare(b.equipo));
  // Si después de todo siguen iguales, lo decide un sorteo de la federación.
  orden.forEach((f, k) => { f.sorteo = orden.some((g, m) => m !== k && comparar(f, g) === 0); });
  orden.forEach(f => { delete f._h2h; });
  return orden;
}

// Para pintar el porcentaje: 1 -> "100", 0,5 -> "50", sin partidos -> "—".
export const pct = (f) => f.porcentaje == null ? '—' : String(Math.round(f.porcentaje * 100));

// Debajo de la tabla: qué significa el asterisco, solo si sale alguno.
export const notaClasificacion = (tabla) => tabla.some(f => f.sorteo)
  ? '<p class="ayuda" style="margin-top:.4rem;line-height:1.5">* Empatados en todo: lo decide un sorteo de FEFAPA.</p>'
  : '';
