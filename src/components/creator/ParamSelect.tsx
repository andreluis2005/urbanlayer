/**
 * ParamSelect — Componente reutilizável de select para parâmetros avançados
 * Extraído do GraffitiCreator.tsx — sem mudança funcional
 */
import React from 'react';

interface ParamSelectProps {
  label: string;
  value: string;
  options: string[];
  setter: (v: string) => void;
}

const ParamSelect: React.FC<ParamSelectProps> = ({ label, value, options, setter }) => (
  <div className="space-y-2">
    <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">{label}</h4>
    <select value={value} onChange={(e) => setter(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-neon-green appearance-none cursor-pointer hover:bg-white/10 transition-colors">
      {options.map(o => <option key={o} value={o} className="bg-black text-white">{o}</option>)}
    </select>
  </div>
);

export default ParamSelect;
