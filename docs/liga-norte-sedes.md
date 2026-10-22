# Liga Norte Flag Senior 26-27: propuesta de reparto de sedes

Calendario propuesto por la liga (21/10/2026): 10 equipos, 45 partidos, 10 jornadas (una por sede).
Nuestra propuesta mueve 15 partidos de jornada sin tocar los partidos, quién es local/visitante
ni el número de jornadas. Objetivo: menos kilómetros para toda la liga, sin que ningún equipo
haga más kilómetros ni más viajes que con el calendario original.

## Supuestos
- Ciudades: Atlantics Coruña, Towers Cambre, Ravens Santiago, Norteños y Mariners M/F Gijón,
  MadBulls y Phoenix Oviedo, Pumas Bierzo (Ponferrada), Bisons Cantabria.
- Km por carretera aproximados, ida y vuelta, por equipo y jornada a la que viaja.
- Límites: 3 a 7 partidos por jornada (la de Bisons máximo 4, comparte día con el T3 U13);
  máximo 3 partidos por equipo y día; cada anfitrión juega al menos 2 en su sede.
- Pendiente de confirmar qué significa el asterisco (*Atlantics, *Mariners...) bajo cada sede.

## Resultado
| Equipo | Km antes | Viajes antes | Km después | Viajes después |
|---|---|---|---|---|
| Atlantics | 2134 | 4 | 1064 | 3 |
| Towers | 1260 | 3 | 724 | 3 |
| Ravens | 1574 | 4 | 904 | 3 |
| Norteños | 440 | 2 | 440 | 2 |
| Mariners M | 700 | 3 | 580 | 1 |
| Mariners F | 640 | 2 | 640 | 2 |
| MadBulls | 600 | 4 | 540 | 3 |
| Phoenix | 740 | 4 | 120 | 2 |
| Pumas | 1590 | 3 | 1590 | 3 |
| Bisons | 2510 | 4 | 1800 | 3 |
| **Total** | **12188** | **33** | **8402** | **25** |

## Partidos que cambian de sede (15)
| Partido | De | A |
|---|---|---|
| Phoenix – Towers | Sede 1 Towers | Sede 5 Mariners M |
| Phoenix – Ravens | Sede 1 Towers | Sede 9 Phoenix |
| Norteños – MadBulls | Sede 2 Norteños | Sede 9 Phoenix |
| Mariners F – Ravens | Sede 2 Norteños | Sede 3 Atlantics |
| Mariners M – Ravens | Sede 2 Norteños | Sede 3 Atlantics |
| MadBulls – Atlantics | Sede 4 MadBulls | Sede 8 Pumas |
| Mariners M – Towers | Sede 4 MadBulls | Sede 3 Atlantics |
| Towers – Mariners F | Sede 4 MadBulls | Sede 3 Atlantics |
| MadBulls – Phoenix | Sede 7 Mariners F | Sede 4 MadBulls |
| Pumas – Bisons | Sede 8 Pumas | Sede 10 Bisons |
| Bisons – MadBulls | Sede 8 Pumas | Sede 7 Mariners F |
| Mariners M – Norteños | Sede 9 Phoenix | Sede 2 Norteños |
| Bisons – Phoenix | Sede 9 Phoenix | Sede 2 Norteños |
| Atlantics – Bisons | Sede 10 Bisons | Sede 2 Norteños |
| Atlantics – Pumas | Sede 10 Bisons | Sede 8 Pumas |

## Jornadas resultantes
- Sede 1 Towers (3): Pumas–Towers, Ravens–Pumas, Towers–Atlantics
- Sede 2 Norteños (6): Atlantics–Phoenix, Atlantics–Norteños, Phoenix–Mariners M, Mariners M–Norteños, Bisons–Phoenix, Atlantics–Bisons
- Sede 3 Atlantics (7): Mariners F–Ravens, Mariners M–Ravens, Mariners F–Atlantics, Mariners M–Atlantics, Ravens–Atlantics, Mariners M–Towers, Towers–Mariners F
- Sede 4 MadBulls (3): Mariners F–Phoenix, Mariners F–MadBulls, MadBulls–Phoenix
- Sede 5 Mariners M (7): Phoenix–Towers, Norteños–Towers, Towers–MadBulls, Mariners F–Pumas, Pumas–Mariners M, Mariners M–Mariners F, Phoenix–Pumas
- Sede 6 Ravens (3): Ravens–Towers, Towers–Bisons, Ravens–Bisons
- Sede 7 Mariners F (5): Bisons–Mariners M, MadBulls–Mariners M, Norteños–Mariners F, Bisons–Mariners F, Bisons–MadBulls
- Sede 8 Pumas (3): MadBulls–Atlantics, MadBulls–Pumas, Atlantics–Pumas
- Sede 9 Phoenix (5): Phoenix–Ravens, Norteños–MadBulls, Phoenix–Norteños, MadBulls–Ravens, Norteños–Ravens
- Sede 10 Bisons (3): Pumas–Bisons, Norteños–Bisons, Pumas–Norteños

Calculado con un modelo de optimización (scipy milp) que penaliza cada partido movido; la
versión sin esa penalización ahorraba algo más (8132 km, 22 viajes) pero movía casi todo.

## Propuesta B: cada jornada con los mismos partidos que en el original
Misma idea, pero ninguna sede gana ni pierde partidos (5, 6, 3, 5, 6, 3, 5, 3, 5, 4). Mueve 19
partidos: 12188 → 8828 km (−28 %) y 33 → 25 viajes, sin que ningún equipo empeore. Los Bisons
pasan de 4 viajes a 2. Detalle de cada jornada en `liga-norte-propuesta-2.png`; la propuesta
anterior (la que cambia el tamaño de las jornadas) está en `liga-norte-propuesta-1.png`.
