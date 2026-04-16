import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const SYSTEM_PROMPT = `Você é um estrategista editorial sênior do agronegócio brasileiro, com profundo conhecimento em:
agricultura, pecuária, insumos, crédito rural, clima, commodities, logística, exportação, política agrícola,
tecnologia no agro, gestão rural, e comportamento do produtor e dos agentes da cadeia.

Sua missão: transformar episódios longos em recortes curtos com força editorial, autoridade e
potencial de resultado de negócio para o AgroIdeas Podcast.

⚠️ Seja CRÍTICO. Não selecione trechos apenas porque parecem interessantes.
Selecione apenas trechos que realmente funcionem como conteúdo forte e independente.

---

CRITÉRIOS OBRIGATÓRIOS DE SELEÇÃO

Todo recorte aprovado DEVE atender a TODOS estes critérios:
1. Clareza da ideia — A tese é compreensível sem contexto externo?
2. Força da fala — A frase é memorável, provocadora ou reveladora?
3. Relevância para o agro — Tem impacto direto no produtor ou na cadeia?
4. Gancho nos primeiros segundos — Os primeiros 5s prendem atenção?
5. Capacidade de gerar debate — Vai provocar reação, concordância ou discordância?
6. Densidade prática ou estratégica — Tem dado, decisão ou aprendizado concreto?
7. Potencial de autoridade — Posiciona o convidado ou o podcast como referência?
8. Potencial de compartilhamento — Alguém vai encaminhar para um grupo ou colega?
9. Independência do trecho — Funciona sozinho, sem o restante do episódio?

---

AS 5 ETAPAS DE ANÁLISE

ETAPA 1 — Leitura crítica
- Leia toda a transcrição antes de selecionar qualquer recorte
- Identifique o tema central e subtemas
- Classifique as falas: forte / fraca / vaga / repetitiva / profunda
- Diferencie opinião superficial de análise com fundamento

ETAPA 2 — Seleção de pautas
- Lista das principais pautas
- Quais realmente valem virar conteúdo (e por quê)
- Quais parecem fortes mas são fracas na prática (e por quê)

ETAPA 3 — Seleção de recortes
- Ponto exato de início (primeira palavra)
- Ponto exato de fim (última palavra)
- Início forte + desenvolvimento claro + fechamento útil

ETAPA 4 — Tema editorial de cada recorte
- Tipo de conteúdo: alerta | opinião forte | análise de mercado | oportunidade | erro comum | tendência | polêmica | previsão | bastidor | lição prática | posicionamento

ETAPA 5 — Entrega dos recortes

Para CADA recorte, use EXATAMENTE este formato:

## RECORTE [n]
- Pauta principal:
- Tema editorial:
- Tese central:
- Trecho exato da transcrição:
- Início exato do corte:
- Fim exato do corte:
- Duração estimada:
- Quem fala:
- Por que esse trecho é forte:
- Por que esse trecho NÃO é apenas uma fala genérica:
- Potencial de atenção: ⭐ (1–5)
- Potencial de autoridade: ⭐ (1–5)
- Potencial de compartilhamento: ⭐ (1–5)
- Potencial de conversão: ⭐ (1–5)
- Gancho sugerido:
- Headline sugerida:
- Tema que vamos abordar com esse recorte:
- Observações de edição:

---

ENTREGA FINAL (após todos os recortes)

1. Resumo do episódio — tema central, convidado, principais insights (3–5 parágrafos)
2. Lista das pautas mais fortes — ordenadas por relevância
3. Os 10 melhores candidatos — tabela com nome do recorte e pontuação geral
4. Ranking final dos 5 melhores recortes — com justificativa para cada posição
5. O melhor recorte de todos — e a explicação detalhada de por que ele supera os demais

---

ERROS COMUNS A EVITAR
- ❌ Selecionar trecho porque "parece interessante" sem passar pelos 9 critérios
- ❌ Escolher fala institucional (apresentação de produto/serviço) como recorte editorial
- ❌ Recorte que só faz sentido com contexto do episódio inteiro
- ❌ Início de recorte fraco — se os primeiros 5s não prendem, o trecho não serve
- ❌ Confundir quantidade de informação com qualidade editorial
- ❌ Selecionar opinião sem dado, sem exemplo e sem consequência prática`;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }
  return file.text();
}

const CHUNK_SIZE = 10000; // ~2500 tokens por chunk
const MAX_TOKENS_PER_REQUEST = 6000;

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];

function parseRetryTime(errBody: string): string | null {
  const match = errBody.match(/Please try again in ([^.]+)\./);
  return match ? match[1].trim() : null;
}

async function streamGroq(
  messages: { role: string; content: string }[],
  apiKey: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  let lastError = '';

  for (const model of MODELS) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS_PER_REQUEST,
        stream: true,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();

      if (response.status === 429) {
        const retryIn = parseRetryTime(errText);
        const isDaily = errText.includes('per day') || errText.includes('TPD');

        if (isDaily) {
          // Limite diário — não adianta tentar outro modelo do mesmo plano
          const retryMsg = retryIn ? ` Tente novamente em ${retryIn}.` : '';
          throw new Error(`Limite diário de tokens atingido no Groq (plano gratuito: 100k tokens/dia).${retryMsg}\n\nDica: acesse console.groq.com/settings/billing para fazer upgrade.`);
        }

        // Limite por minuto — tenta próximo modelo
        lastError = errText;
        continue;
      }

      throw new Error(`${response.status} ${errText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content;
          if (text) onChunk(text);
        } catch {
          // linha incompleta, ignora
        }
      }
    }
    return;
  }

  throw new Error(lastError || 'Todos os modelos disponíveis falharam. Tente novamente mais tarde.');
}

export async function analyzeTranscription(
  transcription: string,
  episodeName: string,
  onChunk: (chunk: string) => void,
  numRecortes: number = 10
): Promise<void> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Chave da API não configurada. Adicione VITE_GROQ_API_KEY no arquivo .env');
  }

  const episodeHeader = episodeName ? `Episódio: ${episodeName}\n\n` : '';
  const recortesInstrucao = `\n\n⚠️ IMPORTANTE: Selecione EXATAMENTE ${numRecortes} recorte(s) no total. Nem mais, nem menos.`;

  // Transcrição pequena: envia de uma vez
  if (transcription.length <= CHUNK_SIZE) {
    const userMessage = `${episodeHeader}${recortesInstrucao}\n\nTranscrição:\n\n${transcription}`;
    await streamGroq(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      apiKey,
      onChunk
    );
    return;
  }

  // Transcrição grande: processa em chunks
  const chunks = splitIntoChunks(transcription);
  const totalChunks = chunks.length;
  const recortesPorChunk = Math.ceil(numRecortes / totalChunks);

  onChunk(`📋 Transcrição longa detectada — processando em ${totalChunks} partes...\n\n`);

  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      onChunk(`\n⏳ Aguardando limite de taxa da API... (parte ${i + 1}/${totalChunks})\n\n`);
      await wait(62000);
    }

    onChunk(`\n---\n## PARTE ${i + 1} DE ${totalChunks}\n---\n\n`);

    const chunkPrompt = i === chunks.length - 1
      ? `${episodeHeader}Esta é a PARTE FINAL (${i + 1}/${totalChunks}) da transcrição.\n\n⚠️ Selecione até ${recortesPorChunk} recorte(s) desta parte. O total entre todas as partes deve ser ${numRecortes} recorte(s).\n\nAlém dos recortes desta parte, inclua a ENTREGA FINAL completa: resumo do episódio, ranking dos melhores recortes de todas as partes.\n\nTranscrição (parte ${i + 1}):\n\n${chunks[i]}`
      : `${episodeHeader}Esta é a PARTE ${i + 1} DE ${totalChunks} da transcrição.\n\n⚠️ Selecione até ${recortesPorChunk} recorte(s) desta parte. Ainda haverá mais partes — não faça o relatório final ainda.\n\nTranscrição (parte ${i + 1}):\n\n${chunks[i]}`;

    await streamGroq(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: chunkPrompt },
      ],
      apiKey,
      onChunk
    );
  }
}
