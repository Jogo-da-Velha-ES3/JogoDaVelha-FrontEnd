import React, { useState } from 'react'
import { VitaoSlot, type VitaoReacao } from '../../features/vitao/VitaoSlot'

const VitaoSlotComProps = VitaoSlot as unknown as React.ComponentType<{
  reacao: VitaoReacao
  fala: string
}>

const REACOES_DISPONIVEIS: VitaoReacao[] = [
  'normal',
  'comemorar',
  'susto',
  'debochar',
  'dormir',
  'bravo',
  'diabo',
]

export function VitaoShowcase() {
  const [reacao, setReacao] = useState<VitaoReacao>('normal')
  const [fala, setFala] = useState<string>('Testando as reações na Vitrine!')

  return (
    <section className="flex flex-col gap-4 p-6 border border-slate-800 bg-slate-900/40 rounded-xl">
      <h3 className="text-lg font-semibold text-cyan-400">Vitão — Reações e Balão (FE-42)</h3>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        {/* Slot de Exibição */}
        <div className="p-8 border border-slate-800 bg-slate-950/70 rounded-xl flex items-center justify-center min-w-[240px] min-h-[200px]">
          <VitaoSlotComProps reacao={reacao} fala={fala} />
        </div>

        {/* Controlo de Estados */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Reação:
            <select
              value={reacao}
              onChange={(e) => setReacao(e.target.value as VitaoReacao)}
              className="p-2 bg-slate-800 border border-slate-700 rounded-md text-white font-medium capitalize outline-none focus:border-cyan-500"
            >
              {REACOES_DISPONIVEIS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Texto da Fala:
            <input
              type="text"
              value={fala}
              onChange={(e) => setFala(e.target.value)}
              placeholder="Digite uma fala..."
              className="p-2 bg-slate-800 border border-slate-700 rounded-md text-white outline-none focus:border-cyan-500"
            />
          </label>
        </div>
      </div>
    </section>
  )
}
