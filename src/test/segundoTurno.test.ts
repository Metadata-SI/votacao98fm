import { describe, expect, it } from 'vitest';
import { CANDIDATOS_SNAPSHOT } from '../../shared/candidatosSnapshot';
import {
  aplicarSegundoTurno,
  corDoCandidato,
  ehSegundoTurno,
  finalistasDoCargo,
} from '../../shared/segundoTurno';

describe('segundo turno', () => {
  it('deixa na presidência apenas Lula e Flávio Bolsonaro, nessa ordem', () => {
    const { candidatos } = aplicarSegundoTurno(CANDIDATOS_SNAPSHOT.presidente);
    expect(candidatos.map(c => `${c.numero} ${c.nome} (${c.partido})`)).toEqual([
      '13 LULA (PT)',
      '22 FLAVIO BOLSONARO (PL)',
    ]);
  });

  it('deixa no governo apenas Allyson e Cadu de Lula, nessa ordem', () => {
    const { candidatos } = aplicarSegundoTurno(CANDIDATOS_SNAPSHOT.governador);
    expect(candidatos.map(c => `${c.numero} ${c.nome} (${c.partido})`)).toEqual([
      '44 ALLYSON (UNIÃO)',
      '13 CADU DE LULA (PT)',
    ]);
  });

  it('não mexe nos cargos que seguem em 1º turno', () => {
    for (const cargo of ['senador', 'deputado-federal', 'deputado-estadual'] as const) {
      expect(ehSegundoTurno(cargo)).toBe(false);
      expect(aplicarSegundoTurno(CANDIDATOS_SNAPSHOT[cargo])).toBe(CANDIDATOS_SNAPSHOT[cargo]);
    }
  });

  it('dá a cada finalista a sua cor e mantém a do cargo para os demais', () => {
    const { candidatos } = aplicarSegundoTurno(CANDIDATOS_SNAPSHOT.presidente);
    const cores = candidatos.map(c => corDoCandidato('presidente', c, 'padrao'));
    expect(cores).toEqual(finalistasDoCargo('presidente').map(f => f.cor));
    expect(new Set(cores).size).toBe(2);

    const zema = CANDIDATOS_SNAPSHOT.presidente.candidatos.find(c => c.numero === '30');
    expect(corDoCandidato('presidente', zema, 'padrao')).toBe('padrao');
    expect(corDoCandidato('senador', CANDIDATOS_SNAPSHOT.senador.candidatos[0], 'padrao')).toBe('padrao');
  });

  it('mantém a lista inteira se um finalista não existir na fonte', () => {
    const semLula = {
      ...CANDIDATOS_SNAPSHOT.presidente,
      candidatos: CANDIDATOS_SNAPSHOT.presidente.candidatos.filter(c => c.numero !== '13'),
    };
    expect(aplicarSegundoTurno(semLula).candidatos).toHaveLength(semLula.candidatos.length);
  });
});
