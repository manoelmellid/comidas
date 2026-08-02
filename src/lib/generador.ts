import { addDays, parseISODate, toISODate } from './week';
import { resolveValorNombre } from './reglaDisplay';
import {
  comidaId,
  getAllCategorias,
  getAllIngredientes,
  getAllPlatos,
  getAllReglasDiarias,
  getAllReglasGlobales,
  getComidasEnRango,
  getPreferencias,
  reglaDiariaId,
  setComida,
  type DiaSemana,
  type Ingrediente,
  type Plato,
  type ReglaGlobal,
  type TipoComida,
} from './db';

export interface GeneracionResultado {
  /** Líneas con las reglas globales exacto/mínimo que no llegaron a su cuota, vacío si todo se cumplió. */
  incumplidas: string[];
}

interface Slot {
  fecha: string;
  tipo: TipoComida;
  diaSemana: DiaSemana;
  key: string;
}

const DIAS_SEMANA: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

function fechaToDiaSemana(fecha: string): DiaSemana {
  const dow = parseISODate(fecha).getDay(); // 0=domingo..6=sábado
  return DIAS_SEMANA[dow === 0 ? 6 : dow - 1];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function categoriasDePlato(plato: Plato, ingredienteById: Map<string, Ingrediente>): Set<string> {
  const cats = new Set<string>();
  for (const pi of plato.ingredientes) {
    const ing = ingredienteById.get(pi.ingredienteId);
    if (ing) cats.add(ing.categoriaId);
  }
  return cats;
}

function platoMatchesValor(
  plato: Plato,
  tipo: 'plato' | 'ingrediente' | 'categoria',
  valorId: string,
  ingredienteById: Map<string, Ingrediente>,
): boolean {
  if (tipo === 'plato') return plato.id === valorId;
  if (tipo === 'ingrediente') return plato.ingredientes.some((pi) => pi.ingredienteId === valorId);
  return categoriasDePlato(plato, ingredienteById).has(valorId);
}

/**
 * Genera los próximos 7 días (comida + cena) siguiendo el orden de prioridad documentado en CLAUDE.md:
 * 1) restricciones diarias, 2) restricciones globales, 3) anti-repetición, 4) relleno final al azar,
 * 5) `fallido` si un slot se queda sin candidatos. Solo toca slots vacíos o previamente `fallido`.
 */
export async function generarSemana(): Promise<GeneracionResultado> {
  const hoy = new Date();
  const fechas = Array.from({ length: 7 }, (_, i) => toISODate(addDays(hoy, i)));

  const [platos, ingredientes, reglasDiarias, reglasGlobales, categorias, preferencias, comidasSemana] =
    await Promise.all([
      getAllPlatos(),
      getAllIngredientes(),
      getAllReglasDiarias(),
      getAllReglasGlobales(),
      getAllCategorias(),
      getPreferencias(),
      getComidasEnRango(fechas[0], fechas[6]),
    ]);

  const platoById = new Map(platos.map((p) => [p.id, p]));
  const ingredienteById = new Map(ingredientes.map((i) => [i.id, i]));
  const reglaDiariaById = new Map(reglasDiarias.map((r) => [r.id, r]));
  const comidaByKey = new Map(comidasSemana.map((c) => [c.id, c]));

  let usadosRecientes = new Set<string>();
  if (preferencias.semanasAtras > 0) {
    const desde = toISODate(addDays(hoy, -7 * preferencias.semanasAtras));
    const hasta = toISODate(addDays(hoy, -1));
    const comidasPrevias = await getComidasEnRango(desde, hasta);
    usadosRecientes = new Set(comidasPrevias.map((c) => c.platoId).filter((id): id is string => !!id));
  }

  const TIPOS: TipoComida[] = ['comida', 'cena'];
  const slots: Slot[] = fechas.flatMap((fecha) => {
    const diaSemana = fechaToDiaSemana(fecha);
    return TIPOS.map((tipo) => ({ fecha, tipo, diaSemana, key: comidaId(fecha, tipo) }));
  });

  const usadosEstaSemana = new Set<string>();
  for (const c of comidasSemana) {
    if (c.platoId) usadosEstaSemana.add(c.platoId);
  }

  function esElegible(slot: Slot): boolean {
    const existente = comidaByKey.get(slot.key);
    if (!existente) return true;
    return existente.platoId == null && existente.especial == null && existente.generado !== 'no_elaborar';
  }

  const elegibles = slots.filter(esElegible);
  const resultado = new Map<string, { platoId: string | null; generado?: 'no_elaborar' | 'fallido' }>();
  const candidatos = new Map<string, Set<string>>();

  function basePool(tipoComida: TipoComida): Set<string> {
    return new Set(platos.filter((p) => p.tipo === 'ambas' || p.tipo === tipoComida).map((p) => p.id));
  }

  for (const slot of elegibles) {
    candidatos.set(slot.key, basePool(slot.tipo));
  }

  // Paso 1 — restricciones diarias
  for (const slot of elegibles) {
    const regla = reglaDiariaById.get(reglaDiariaId(slot.diaSemana, slot.tipo));
    if (!regla || regla.tipo === 'ninguna') continue;

    if (regla.tipo === 'no_elaborar') {
      resultado.set(slot.key, { platoId: null, generado: 'no_elaborar' });
      candidatos.delete(slot.key);
      continue;
    }

    if (!regla.valorId) continue;

    if (regla.tipo === 'plato' && regla.modo === 'forzar') {
      resultado.set(slot.key, { platoId: regla.valorId });
      usadosEstaSemana.add(regla.valorId);
      candidatos.delete(slot.key);
      continue;
    }

    const pool = candidatos.get(slot.key);
    if (!pool) continue;

    if (regla.modo === 'prohibir') {
      for (const platoId of pool) {
        const plato = platoById.get(platoId);
        if (plato && platoMatchesValor(plato, regla.tipo, regla.valorId, ingredienteById)) pool.delete(platoId);
      }
    } else if (regla.modo === 'forzar') {
      // aquí solo llegan ingrediente/categoria — plato+forzar ya se resolvió arriba
      for (const platoId of [...pool]) {
        const plato = platoById.get(platoId);
        if (!plato || !platoMatchesValor(plato, regla.tipo, regla.valorId, ingredienteById)) pool.delete(platoId);
      }
    }
  }

  // Paso 2 — restricciones globales
  function platoIdEnSlot(slot: Slot): string | null {
    const res = resultado.get(slot.key);
    if (res) return res.platoId;
    return comidaByKey.get(slot.key)?.platoId ?? null;
  }

  function contarCoincidencias(regla: ReglaGlobal): number {
    let count = 0;
    for (const slot of slots) {
      if (regla.aplica !== 'ambas' && regla.aplica !== slot.tipo) continue;
      const platoId = platoIdEnSlot(slot);
      const plato = platoId ? platoById.get(platoId) : undefined;
      if (plato && platoMatchesValor(plato, regla.tipo, regla.valorId, ingredienteById)) count++;
    }
    return count;
  }

  function quitarDeCandidatos(regla: ReglaGlobal) {
    for (const slot of elegibles) {
      if (resultado.has(slot.key)) continue;
      if (regla.aplica !== 'ambas' && regla.aplica !== slot.tipo) continue;
      const pool = candidatos.get(slot.key);
      if (!pool) continue;
      for (const platoId of [...pool]) {
        const plato = platoById.get(platoId);
        if (plato && platoMatchesValor(plato, regla.tipo, regla.valorId, ingredienteById)) pool.delete(platoId);
      }
    }
  }

  function aplicarTopes() {
    for (const regla of reglasGlobales) {
      if (regla.modo === 'maximo' || regla.dias === 0) {
        const count = contarCoincidencias(regla);
        if (regla.dias === 0 || count >= regla.dias) quitarDeCandidatos(regla);
      }
    }
  }

  aplicarTopes();

  for (const regla of reglasGlobales) {
    if (regla.modo !== 'exacto' && regla.modo !== 'minimo') continue;
    let count = contarCoincidencias(regla);
    while (count < regla.dias) {
      const slotsCandidatos = elegibles.filter((slot) => {
        if (resultado.has(slot.key)) return false;
        if (regla.aplica !== 'ambas' && regla.aplica !== slot.tipo) return false;
        const pool = candidatos.get(slot.key);
        if (!pool) return false;
        for (const platoId of pool) {
          const plato = platoById.get(platoId);
          if (plato && platoMatchesValor(plato, regla.tipo, regla.valorId, ingredienteById)) return true;
        }
        return false;
      });
      if (slotsCandidatos.length === 0) break; // no se puede cumplir, queda para el resumen final

      const slot = pickRandom(slotsCandidatos);
      const pool = candidatos.get(slot.key)!;
      const opciones = [...pool].filter((platoId) => {
        const plato = platoById.get(platoId);
        return !!plato && platoMatchesValor(plato, regla.tipo, regla.valorId, ingredienteById);
      });
      const elegido = pickRandom(opciones);
      resultado.set(slot.key, { platoId: elegido });
      usadosEstaSemana.add(elegido);
      candidatos.delete(slot.key);
      count++;
      aplicarTopes();
    }
  }

  // Paso 3/4 — anti-repetición + relleno final
  function pickConAntiRepeticion(pool: Set<string>): string {
    const arr = [...pool];
    const sinUsoNinguno = arr.filter((id) => !usadosRecientes.has(id) && !usadosEstaSemana.has(id));
    if (sinUsoNinguno.length > 0) return pickRandom(sinUsoNinguno);
    const sinUsoSemana = arr.filter((id) => !usadosEstaSemana.has(id));
    if (sinUsoSemana.length > 0) return pickRandom(sinUsoSemana);
    return pickRandom(arr);
  }

  for (const slot of elegibles) {
    if (resultado.has(slot.key)) continue;
    const pool = candidatos.get(slot.key);
    if (!pool || pool.size === 0) {
      resultado.set(slot.key, { platoId: null, generado: 'fallido' });
      continue;
    }
    const elegido = pickConAntiRepeticion(pool);
    resultado.set(slot.key, { platoId: elegido });
    usadosEstaSemana.add(elegido);
  }

  // Escritura
  for (const slot of elegibles) {
    const res = resultado.get(slot.key);
    if (!res) continue;
    await setComida({
      id: slot.key,
      fecha: slot.fecha,
      tipo: slot.tipo,
      platoId: res.platoId,
      especial: null,
      tags: [],
      generado: res.generado,
    });
  }

  // Resumen de reglas globales no cumplidas
  const incumplidas: string[] = [];
  for (const regla of reglasGlobales) {
    if (regla.modo !== 'exacto' && regla.modo !== 'minimo') continue;
    const count = contarCoincidencias(regla);
    if (count < regla.dias) {
      const nombre = resolveValorNombre(regla.tipo, regla.valorId, { platos, ingredientes, categorias });
      const modoLabel = regla.modo === 'exacto' ? 'exacto' : 'mínimo';
      incumplidas.push(`'${nombre}' (${modoLabel} ${regla.dias} día(s)): solo ${count}`);
    }
  }

  return { incumplidas };
}
