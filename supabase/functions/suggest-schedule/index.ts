import Anthropic from 'npm:@anthropic-ai/sdk@0.24.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EpisodeInput {
  name: string;
  company: string;
  guest: string;
  recordingDate: string;   // YYYY-MM-DD
  publishDate?: string;    // YYYY-MM-DD
  status: string;
  notes?: string;
  cutCount: number;
  topics: string[];
}

interface SuggestedCut {
  cutNumber: number;
  topic: string;
  suggestedDate: string;   // YYYY-MM-DD
  rationale: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { episode }: { episode: EpisodeInput } = await req.json();

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada nos secrets do Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const client = new Anthropic({ apiKey });

    const today = new Date().toISOString().split('T')[0];

    const topicsList = episode.topics
      .map((t, i) => `  Recorte ${i + 1}: ${t || '(sem tópico definido)'}`)
      .join('\n');

    const publishInfo = episode.publishDate
      ? `Data de publicação do episódio completo: ${episode.publishDate}`
      : 'Data de publicação do episódio completo: não definida ainda';

    const prompt = `Você é um especialista em estratégia de conteúdo para redes sociais no agronegócio brasileiro.

Dados do episódio de podcast:
- Nome: ${episode.name}
- Empresa parceira: ${episode.company}
- Convidado: ${episode.guest}
- Status: ${episode.status}
- Data de gravação: ${episode.recordingDate}
- ${publishInfo}
- Observações: ${episode.notes || 'Nenhuma'}
- Quantidade de recortes planejados: ${episode.cutCount}
- Tópicos dos recortes:
${topicsList}

Hoje é ${today}.

Crie um calendário de publicação estratégico para os ${episode.cutCount} recortes do episódio. Siga estas regras obrigatórias:

1. Os recortes SÓ podem ser publicados APÓS a data de gravação (${episode.recordingDate})
2. ${episode.publishDate ? `Distribua os recortes em torno da data de publicação do episódio (${episode.publishDate}): alguns antes para gerar expectativa, outros depois para manter engajamento` : 'Como não há data de publicação do episódio, comece a publicar 5-7 dias após a gravação'}
3. Espaçe os recortes com mínimo de 2 dias entre cada um
4. Prefira dias úteis (segunda a sexta-feira)
5. Distribua de forma equilibrada — evite concentração em poucos dias
6. Considere que conteúdo agrícola performa melhor no início e meio da semana

Responda APENAS com JSON válido, sem markdown, no formato exato:
{"cuts":[{"cutNumber":1,"topic":"tópico exato","suggestedDate":"YYYY-MM-DD","rationale":"motivo estratégico em 1 frase"}]}`;

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Extrai JSON mesmo que venha com texto extra
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'Resposta da IA em formato inválido.', raw: responseText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const result: { cuts: SuggestedCut[] } = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
