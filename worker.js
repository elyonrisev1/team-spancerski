
const ALLOWED_ORIGIN = "https://elyonrisev1.github.io";
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin),
  });
}

function parseModelResponse(result) {
  const raw = result?.response ?? result?.result ?? result;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch (_) { return { texto: raw }; }
  }
  return raw || {};
}

async function runAI(env, options) {
  return env.AI.run(VISION_MODEL, options);
}

const EXERCISE_SCHEMA = {
  type: "object",
  properties: {
    nome: { type: "string" },
    series: { type: "integer" },
    repeticoes: { type: "string" },
    descanso: { type: "integer" },
    carga: { type: ["number", "null"] },
    tecnicas: { type: "array", items: { type: "string" } },
    notas: { type: "string" },
  },
  required: ["nome", "series", "repeticoes", "descanso", "carga", "tecnicas", "notas"],
};

const PROTOCOLO_SCHEMA = {
  type: "object",
  properties: {
    dias: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dia: { type: "string" },
          exercicios: { type: "array", items: EXERCISE_SCHEMA },
        },
        required: ["dia", "exercicios"],
      },
    },
  },
  required: ["dias"],
};

const OBS_SCHEMA = {
  type: "object",
  properties: {
    observacao: { type: "string" },
  },
  required: ["observacao"],
};

const RESUMO_SCHEMA = {
  type: "object",
  properties: {
    texto: { type: "string" },
  },
  required: ["texto"],
};

async function analisarUmaComparacao(env, item, aluno, temAntes) {
  const prompt = `
Você é um assistente de avaliação VISUAL de evolução física para um personal trainer.
A imagem é uma comparação lado a lado da posição "${item.posicao}", com a foto da esquerda sendo ${temAntes ? "ANTES" : "a linha de base ATUAL"} e a da direita sendo ${temAntes ? "DEPOIS" : "ATUAL"}.

Analise somente o que estiver visualmente aparente.
Não faça diagnóstico médico, não estime percentual de gordura pela foto, não invente medidas, não identifique a pessoa e não trate a imagem como prova clínica de hipertrofia.
Observe postura, contorno corporal e aparência geral dos grupamentos que realmente estejam visíveis.
Use linguagem prudente: "aparenta", "visivelmente", "não é possível avaliar".

Aluno: ${JSON.stringify(aluno || {})}

Entregue um pequeno parágrafo em português do Brasil dizendo:
- o que aparenta ter evoluído;
- o que permaneceu semelhante ou não pode ser avaliado;
- uma prioridade de melhoria relacionada ao treino/consistência, sem prescrever tratamento médico.
  `.trim();

  const result = await runAI(env, {
    messages: [
      { role: "system", content: "Você é objetivo, técnico e prudente." },
      { role: "user", content: prompt },
    ],
    image: item.imagem,
    max_tokens: 350,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: OBS_SCHEMA,
    },
  });

  return parseModelResponse(result).observacao || "";
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return json({ error: "Método não permitido." }, 405, origin);
    }

    try {
      const url = new URL(request.url);
      const body = await request.json();

      if (url.pathname === "/analisar-evolucao") {
        const comparacoes = Array.isArray(body.comparacoes) ? body.comparacoes.slice(0, 4) : [];
        if (!comparacoes.length) {
          return json({ error: "Nenhuma comparação foi enviada." }, 400, origin);
        }

        const observacoes = [];
        for (const item of comparacoes) {
          const observacao = await analisarUmaComparacao(
            env,
            item,
            body.aluno,
            Boolean(body.loteAnterior)
          );
          if (observacao) observacoes.push(`${item.posicao}: ${observacao}`);
        }

        const resumoPrompt = `
Você é o assistente de um personal trainer.
Com base nas observações visuais por posição abaixo, escreva um pequeno relatório final em português do Brasil.

REGRAS:
- Não faça diagnóstico médico.
- Não estime percentual de gordura pela foto.
- Não diga que houve hipertrofia com certeza; use "aparenta" ou "há sinais visuais".
- Separe claramente evolução visível e pontos de melhoria.
- Cite somente grupamentos realmente sustentados pelas observações.
- Termine com 3 a 5 prioridades práticas para o próximo ciclo de treino.
- Se esta for a primeira avaliação, deixe claro que é uma linha de base e que ainda não existe comparação temporal.

Estruture assim:
EVOLUÇÃO VISÍVEL
- ...
PONTOS A MELHORAR
- ...
PRIORIDADES PARA O PRÓXIMO CICLO
1. ...
2. ...
3. ...
CONCLUSÃO
...

Aluno: ${JSON.stringify(body.aluno || {})}
Existe lote anterior: ${Boolean(body.loteAnterior)}

Observações por posição:
${observacoes.join("\n")}
        `.trim();

        const finalResult = await runAI(env, {
          messages: [
            { role: "system", content: "Responda em português do Brasil, de forma curta e técnica." },
            { role: "user", content: resumoPrompt },
          ],
          max_tokens: 700,
          temperature: 0.25,
          response_format: {
            type: "json_schema",
            json_schema: RESUMO_SCHEMA,
          },
        });

        const parsed = parseModelResponse(finalResult);
        const texto = String(parsed.texto || observacoes.join("\n")).trim();

        return json({
          texto,
          modelo: "Cloudflare Workers AI — Llama 3.2 11B Vision",
        }, 200, origin);
      }

      if (url.pathname === "/parse-protocolo") {
        const texto = String(body.texto || "").slice(0, 50000);
        if (!texto.trim()) {
          return json({ error: "O arquivo não contém texto legível." }, 400, origin);
        }

        const prompt = `
Extraia o protocolo de treino abaixo e transforme em JSON estruturado.
Não invente exercícios, séries, repetições, cargas ou descansos que não estejam no texto.
Quando um campo não estiver informado, use:
- descanso: 60
- carga: null
- tecnicas: []
- notas: ""
Mapeie os dias para português quando possível:
Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira, Sábado, Domingo.
Interprete formatos como "4x12", "3 séries de 8-10", "60s", "1min", "3x8-12".
Se o documento tiver blocos A/B/C em vez de dias, preserve A/B/C como o nome do bloco.

PROTOCOLO:
${texto}
        `.trim();

        const result = await runAI(env, {
          messages: [
            { role: "system", content: "Você extrai dados estruturados de documentos de treino." },
            { role: "user", content: prompt },
          ],
          max_tokens: 5000,
          temperature: 0.1,
          response_format: {
            type: "json_schema",
            json_schema: PROTOCOLO_SCHEMA,
          },
        });

        const parsed = parseModelResponse(result);
        if (!parsed?.dias) {
          return json({ error: "A IA não conseguiu estruturar o protocolo." }, 502, origin);
        }

        return json(parsed, 200, origin);
      }

      return json({ error: "Rota não encontrada." }, 404, origin);
    } catch (error) {
      return json({
        error: error?.message || "Erro interno no Worker de IA.",
      }, 500, origin);
    }
  },
};
