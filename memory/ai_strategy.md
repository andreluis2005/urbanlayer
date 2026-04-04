# 🧠 UrbanLayer — Estratégia de IA

## Estado Atual
- **Replicate** é o único provider de IA utilizado
- **Gemini** está instalado (`@google/genai`) mas NÃO é usado em nenhum lugar
- Sem camada de abstração — chamadas diretas ao SDK Replicate

## Modelos em Uso

### Geração de Texto (Graffiti Lettering)
| Modelo | Uso | Custo |
|---|---|---|
| `black-forest-labs/flux-schnell` | Geração rápida de letras graffiti | ~$0.003/run |

### Retratos (img2img)
| Modelo | Estilo | Custo |
|---|---|---|
| `stability-ai/sdxl:7762fd07...` | Urban Realism (SDXL padrão) | ~$0.025/run |
| `hunterkamerman/sdxl-clonesy:fcd19e61...` | Banksy / Stencil | ~$0.025/run |
| `hunterkamerman/sdxl-murals:6e5a86aa...` | Large Scale Murals | ~$0.025/run |
| `georgedavila/sdxl-basquiat:5b823d78...` | Basquiat Expressionism | ~$0.025/run |

### Pós-processamento
| Modelo | Uso | Custo |
|---|---|---|
| `recraft-ai/recraft-remove-background` | Remoção de fundo da foto do usuário | ~$0.005/run |

## Quando Usar Cada Provider (Estratégia Alvo)

### Replicate (Manter)
- ✅ Geração de imagens (SDXL, Flux)
- ✅ Remoção de fundo
- ✅ Qualquer tarefa que envolva pixels
- **Motivo**: Modelos especializados, qualidade superior para imagens

### Gemini (Integrar)
- 🔲 Análise de contexto da parede (sugerir estilo ideal)
- 🔲 Geração de descrições para NFT metadata
- 🔲 Chat assistente para ajudar o usuário a criar
- 🔲 Moderação de conteúdo (filtrar texto ofensivo)
- 🔲 Sugestão de cores baseada na paleta da parede
- **Motivo**: Multimodal, barato, rápido, bom para texto/análise

## Arquitetura Alvo: AI Router

```typescript
// src/services/ai/AIRouter.ts
class AIRouter {
  // Decisão automática baseada no tipo de tarefa
  async route(task: AITask): Promise<AIResult> {
    switch (task.type) {
      case 'generate_graffiti_text':   return this.replicate.generateText(task);
      case 'generate_portrait':         return this.replicate.generatePortrait(task);
      case 'remove_background':         return this.replicate.removeBackground(task);
      case 'analyze_wall':              return this.gemini.analyzeWall(task);
      case 'generate_nft_description':  return this.gemini.generateDescription(task);
      case 'suggest_style':             return this.gemini.suggestStyle(task);
      case 'moderate_content':          return this.gemini.moderate(task);
    }
  }
}
```

## Prompts Padronizados (Templates)
Todos os prompts devem estar centralizados em `PromptTemplates.ts`, nunca hardcoded nos componentes.

### Template: Graffiti Texto
```
Professional urban graffiti art on a PURE WHITE background.
The graffiti text spells the word EXACTLY "{text}".
Style: {styleDescription}.
Colors: {colors}.
{fillDescription}, {outlineDescription}.
{depthDescription}.
{lightingDescription}, {shadowDescription}.
{sprayDescription}, {drippingDescription}, {detailsDescription}.
Realistic spray paint texture, authentic street art feel.
ONLY the graffiti artwork on the white background.
```

### Template: Retrato
```
{stylePrefix} on a PURE WHITE background, featuring a spray-painted
portrait based on the provided reference image.
The portrait must maintain strong facial resemblance while being
adapted into authentic street art style...
```

## Regras de Ouro
1. **SEMPRE usar URLs públicas** para enviar imagens — nunca base64 direto
2. **SEMPRE usar Canvas 2D** para composição — nunca CSS blend modes sobre WebGL
3. **Prompts em inglês** — modelos treinados em inglês performam melhor
4. **Negative prompts são obrigatórios** — evitar texto indesejado nas imagens
5. **4 inference steps para Flux**, **35 para SDXL** — balanceia qualidade/custo
