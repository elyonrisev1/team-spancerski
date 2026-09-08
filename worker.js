const DEFAULT_ORIGIN = "https://elyonrisev1.github.io";
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || DEFAULT_ORIGIN).split(',').map(s=>s.trim()).filter(Boolean);
}
function corsHeaders(origin, env) {
  const allowed = allowedOrigins(env);
  const selected = allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": selected,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8"
  };
}
function json(data,status,origin,env){return new Response(JSON.stringify(data),{status,headers:corsHeaders(origin,env)});}
function parseModelResponse(result){const raw=result?.response??result?.result??result;if(typeof raw==='string'){try{return JSON.parse(raw)}catch(_){return {texto:raw}}}return raw||{}}
async function runAI(env,model,options){if(!env.AI)throw new Error('Binding Workers AI (AI) não configurado.');return env.AI.run(model,options)}
const EX={type:'object',properties:{nome:{type:'string'},series:{type:'integer'},repeticoes:{type:'string'},descanso:{type:'integer'},carga:{type:['number','null']},tecnicas:{type:'array',items:{type:'string'}},notas:{type:'string'}},required:['nome','series','repeticoes','descanso','carga','tecnicas','notas']};
const PROT={type:'object',properties:{dias:{type:'array',items:{type:'object',properties:{dia:{type:'string'},exercicios:{type:'array',items:EX}},required:['dia','exercicios']}}},required:['dias']};
const OBS={type:'object',properties:{observacao:{type:'string'}},required:['observacao']};
const RES={type:'object',properties:{texto:{type:'string'}},required:['texto']};
async function comparar(env,item,aluno,temAntes){const prompt=`Você é um assistente de avaliação VISUAL para personal trainer. Compare a posição "${item.posicao}". A esquerda é ${temAntes?'ANTES':'linha de base'} e a direita é ${temAntes?'DEPOIS':'ATUAL'}. Analise apenas o que é visualmente sustentado. Não diagnostique, não estime percentual de gordura, não invente medidas, não identifique a pessoa e não afirme hipertrofia com certeza. Use linguagem prudente. Escreva um pequeno parágrafo em português do Brasil sobre evolução aparente, aspectos semelhantes/não avaliáveis e uma prioridade de melhoria relacionada ao treino/consistência. Aluno: ${JSON.stringify(aluno||{})}`;const r=await runAI(env,VISION_MODEL,{messages:[{role:'system',content:'Objetivo, técnico e prudente.'},{role:'user',content:prompt}],image:item.imagem,max_tokens:350,temperature:.2,response_format:{type:'json_schema',json_schema:OBS}});return parseModelResponse(r).observacao||''}
export default {async fetch(request,env){const origin=request.headers.get('Origin')||'';if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(origin,env)});const url=new URL(request.url);if(request.method==='GET'&&url.pathname==='/health')return json({ok:true,service:'team-spancerski-ai',model:VISION_MODEL},200,origin,env);if(request.method!=='POST')return json({error:'Método não permitido.'},405,origin,env);try{const body=await request.json();
 if(url.pathname==='/analisar-evolucao'){const comps=Array.isArray(body.comparacoes)?body.comparacoes.slice(0,4):[];if(!comps.length)return json({error:'Nenhuma comparação foi enviada.'},400,origin,env);const obs=[];for(const item of comps){const o=await comparar(env,item,body.aluno,Boolean(body.loteAnterior));if(o)obs.push(`${item.posicao}: ${o}`)}const prompt=`Com base nas observações abaixo, gere um relatório curto em português do Brasil. Não diagnostique, não estime gordura, não invente dados e use "aparenta" quando necessário. Estruture exatamente: EVOLUÇÃO VISÍVEL; PONTOS A MELHORAR; PRIORIDADES PARA O PRÓXIMO CICLO; CONCLUSÃO. Cite somente grupamentos sustentados. Se não houver lote anterior, diga que é linha de base.\n\n${obs.join('\n')}`;const r=await runAI(env,VISION_MODEL,{messages:[{role:'system',content:'Assistente técnico de personal trainer.'},{role:'user',content:prompt}],max_tokens:700,temperature:.25,response_format:{type:'json_schema',json_schema:RES}});const x=parseModelResponse(r);return json({texto:String(x.texto||obs.join('\n')).trim(),modelo:VISION_MODEL},200,origin,env)}
 if(url.pathname==='/parse-protocolo'){const texto=String(body.texto||'').slice(0,50000);if(!texto.trim())return json({error:'O arquivo não contém texto legível.'},400,origin,env);const prompt=`Extraia o protocolo abaixo em JSON. Não invente dados. Interprete 4x12, 3x8-10, 60s, 1min. Preserve blocos A/B/C. Se faltar carga use null, técnicas [] e notas "". Se faltar descanso use 60.\n\n${texto}`;const r=await runAI(env,VISION_MODEL,{messages:[{role:'system',content:'Você extrai dados estruturados de protocolos de treino.'},{role:'user',content:prompt}],max_tokens:5000,temperature:.1,response_format:{type:'json_schema',json_schema:PROT}});const x=parseModelResponse(r);if(!x.dias)return json({error:'A IA não conseguiu estruturar o protocolo.'},502,origin,env);return json(x,200,origin,env)}
 return json({error:'Rota não encontrada.'},404,origin,env);
 }catch(e){return json({error:e?.message||'Erro interno no Worker.'},500,origin,env)}}};
