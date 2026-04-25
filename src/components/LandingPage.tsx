/**
 * LandingPage — Página de entrada premium do UrbanLayer
 * 
 * Seções: Hero, Como Funciona, Tiers, Galeria, Stats, FAQ, CTA Final
 * Design: Dark mode, glassmorphism, gradientes roxo-ciano, animações
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Palette, ShoppingBag, Swords, ChevronDown, Globe2, Sparkles, Shield, Layers, Crown, Diamond, Award, Medal, Zap } from 'lucide-react';
import AuthModal from './AuthModal';
import SocialFeedTicker from './SocialFeedTicker';

interface LandingPageProps {
  onEnter: () => void;
}

const TIERS = [
  { name: 'Bronze', icon: Medal, price: '~$1', example: 'Beco residencial', color: '#CD7F32', glow: 'rgba(205,127,50,0.2)' },
  { name: 'Silver', icon: Award, price: '~$2.50', example: 'Rua comercial', color: '#C0C0C0', glow: 'rgba(192,192,192,0.2)' },
  { name: 'Gold', icon: Zap, price: '~$9', example: 'Av. Paulista', color: '#FFD700', glow: 'rgba(255,215,0,0.2)' },
  { name: 'Diamond', icon: Diamond, price: '~$30', example: 'Copacabana', color: '#B9F2FF', glow: 'rgba(185,242,255,0.3)' },
  { name: 'Legendary', icon: Crown, price: '~$150', example: 'Times Square', color: '#FF6321', glow: 'rgba(255,99,33,0.3)' },
];

const STEPS = [
  { icon: Globe2, title: 'Explore o Mundo', desc: 'Navegue por qualquer cidade num globo 3D e caminhe pelas ruas reais', color: '#8B5CF6' },
  { icon: Palette, title: 'Crie sua Arte', desc: 'A IA transforma suas ideias em grafite autêntico — letras, retratos, murais', color: '#06B6D4' },
  { icon: ShoppingBag, title: 'Compre o Muro', desc: 'Cada localização tem um preço baseado na importância real do local', color: '#FF6321' },
  { icon: Swords, title: 'Defenda ou Conquiste', desc: 'Outros podem pintar por cima pagando o dobro. Você recebe metade', color: '#00FF00' },
];

const FAQS = [
  { q: 'Preciso saber desenhar?', a: 'Não. A inteligência artificial cria a arte para você. Basta escolher o estilo e digitar sua ideia.' },
  { q: 'O que é um NFT nesse contexto?', a: 'É um registro digital que prova que você é dono daquele espaço. Como a escritura de um terreno, mas digital e global.' },
  { q: 'Alguém pode roubar meu muro?', a: 'Não roubar, mas "pintar por cima" pagando o dobro. Nesse caso, você recebe metade do pagamento. É parte do jogo.' },
  { q: 'Preciso de MetaMask?', a: 'Não necessariamente. Você pode entrar com Google ou email. Mas para comprar muros como NFTs, uma wallet é necessária.' },
  { q: 'Quanto custa para começar?', a: 'A partir de ~$1 (menos de um café). Muros em bairros residenciais são muito acessíveis.' },
  { q: 'Em qual blockchain funciona?', a: 'Ink Network (Layer 2 da Kraken). Rápida e com taxas muito baixas (~$0.01 por transação).' },
];

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
      <button onClick={() => setOpen(!open)} className="w-full px-6 py-5 flex justify-between items-center text-left hover:bg-white/[0.05] transition-colors">
        <span className="font-semibold text-sm md:text-base font-display">{q}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="px-6 pb-5 text-sm text-gray-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
};

export default function LandingPage({ onEnter }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-white overflow-y-auto overflow-x-hidden font-sans">
      <div className="fixed inset-0 z-50 pointer-events-none bg-noise" />
      
      {/* Toast Notifications FOMO Engine */}
      <SocialFeedTicker />

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black/40 backdrop-blur-2xl border-b border-white/10 shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-400" />
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              UrbanLayer
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#how" className="hover:text-white transition-colors">Como Funciona</a>
            <a href="#pricing" className="hover:text-white transition-colors">Preços</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <button
            onClick={() => setShowAuth(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Entrar
          </button>
        </div>
      </nav>

      {/* --- HERO --- */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[128px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/5 rounded-full blur-[128px]" />
        </div>

        {/* Spray paint particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${3 + Math.random() * 4}s`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 text-sm text-gray-400">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Powered by AI + Blockchain
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold font-display leading-[0.95] tracking-tight mb-8"
          >
            <span className="block">Cada muro do</span>
            <span className="block bg-gradient-to-r from-purple-500 via-cyan-400 to-orange-500 bg-clip-text text-transparent drop-shadow-sm">
              mundo é seu canvas.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Crie arte urbana com IA, compre localizações reais como NFTs e 
            <span className="text-white font-medium"> domine territórios</span> ao redor do planeta.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => setShowAuth(true)}
              className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-bold text-lg hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Comece a Explorar
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <a
              href="#how"
              className="px-8 py-4 border border-white/20 rounded-2xl font-bold text-lg hover:bg-white/5 transition-all text-center"
            >
              Como Funciona
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-white/40 rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* --- COMO FUNCIONA --- */}
      <section id="how" className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Como Funciona</h2>
            <p className="text-gray-400 text-lg">4 passos para dominar o mundo — literalmente.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative group"
              >
                <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.05] transition-all hover:border-white/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] h-full">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner" style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}>
                    <step.icon className="w-6 h-6" style={{ color: step.color }} />
                  </div>
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Passo {i + 1}</span>
                  <h3 className="text-lg font-bold mt-2 mb-3">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PRICING TIERS --- */}
      <section id="pricing" className="py-24 md:py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Cada Localização Tem um Valor</h2>
            <p className="text-gray-400 text-lg">De becos silenciosos ao Times Square — o preço reflete a demanda real.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`p-6 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl text-center hover:scale-105 transition-all cursor-default relative overflow-hidden group ${i === 4 ? 'col-span-2 md:col-span-1 border-orange-500/50 bg-orange-500/[0.05]' : ''}`}
                style={{ boxShadow: i === 4 ? `0 0 40px ${tier.glow}, inset 0 0 20px ${tier.glow}` : 'inset 0 1px 1px rgba(255,255,255,0.05)' }}
              >
                {i === 4 && <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/0 via-orange-500/20 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />}
                <div className="relative z-10">
                  <tier.icon className="w-8 h-8 mx-auto mb-3 drop-shadow-md" style={{ color: tier.color }} />
                  <h3 className="font-bold text-sm mb-1 uppercase tracking-wider" style={{ color: tier.color }}>{tier.name}</h3>
                  <p className="text-2xl font-bold font-display shadow-black drop-shadow-sm mb-2">{tier.price}</p>
                  <p className="text-xs text-gray-400">{tier.example}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12 text-xl md:text-2xl font-bold"
          >
            O Times Square só tem <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">um dono</span>. Vai ser você?
          </motion.p>
        </div>
      </section>

      {/* --- STATS --- */}
      <section className="py-16 px-6 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Cobertura', value: 'Global', sub: 'Qualquer cidade do mundo' },
            { label: 'Estilos', value: '9+', sub: 'Wildstyle, Stencil, Mural...' },
            { label: 'Blockchain', value: 'Ink', sub: 'Layer 2 da Kraken' },
            { label: 'NFTs', value: 'Únicos', sub: 'Cada muro é one-of-a-kind' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{stat.value}</p>
              <p className="text-sm font-semibold mt-1">{stat.label}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-24 md:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Perguntas Frequentes</h2>
          </motion.div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <FAQItem q={faq.q} a={faq.a} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-24 md:py-32 px-6 relative">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[128px]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-bold font-display mb-6"
          >
            Os muros da sua cidade{' '}
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              estão esperando.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-400 mb-10"
          >
            Crie, compre e domine antes que alguém faça isso primeiro.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowAuth(true)}
            className="px-10 py-5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-bold text-xl hover:shadow-[0_0_60px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Entrar na Plataforma →
          </motion.button>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span className="font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">UrbanLayer</span>
          </div>
          <p className="text-xs text-gray-600">
            UrbanLayer não possui afiliação com locais físicos reais. Propriedade digital apenas. © 2026
          </p>
        </div>
      </footer>

      {/* --- AUTH MODAL --- */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={onEnter} />
    </div>
  );
}
