// Mi Bot IA: chat 100% en el navegador, sin API de pago.
// La biblioteca y los modelos se descargan desde servidores públicos al inicio.
const LIBRARY_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
const MODELS = {
  small: {
    name: 'SmolLM2 135M',
    id: 'onnx-community/SmolLM2-135M-Instruct-ONNX-MHA',
    help: 'Ligero para una primera prueba. Descarga aprox. 118–137 MB del modelo. Su español puede ser deficiente.'
  },
  spanish: {
    name: 'Qwen2.5 0.5B',
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    help: 'Mejor español; descarga aprox. 483 MB del modelo y requiere WebGPU. Podría quedarse sin memoria en iPhone.'
  }
};
const DEFAULT_PROMPT = 'Eres Mi Bot IA, un asistente cordial. Responde en español con claridad y brevedad. Reconoce incertidumbre. No inventes fuentes ni afirmes tener acceso a internet. No simules ser una persona ni un profesional sanitario.';
const KEY = 'mi-bot-ia-v1';
const $ = id => document.getElementById(id);
const nodes = {
  chat: $('chat'), statusTitle: $('statusTitle'), statusText: $('statusText'),
  signal: $('signal'), load: $('loadButton'), progressWrap: $('progressWrap'),
  progressBar: $('progressBar'), composer: $('composer'), message: $('message'),
  send: $('sendButton'), dialog: $('settingsDialog'),
  modelSelect: $('modelSelect'), modelHelp: $('modelHelp'), personality: $('personality')
};
let store = { model: 'small', personality: DEFAULT_PROMPT, messages: [] };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved && typeof saved === 'object') {
    if (MODELS[saved.model]) store.model = saved.model;
    if (typeof saved.personality === 'string') store.personality = saved.personality.slice(0,1800);
    if (Array.isArray(saved.messages)) store.messages = saved.messages
      .filter(x => x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string')
      .slice(-60).map(x => ({ role:x.role, content:x.content.slice(0,4000) }));
  }
} catch (_) { /* A non-functional local store should not prevent basic chat. */ }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); }
  catch (_) { setStatus('Almacenamiento lleno', 'Puedes continuar, pero el historial podría no guardarse.', 'error'); }
}
let generator = null;
let loadedModel = null;
let busy = false;
let loading = false;
function setStatus(title, details, state='idle') {
  nodes.statusTitle.textContent = title;
  nodes.statusText.textContent = details;
  nodes.signal.className = 'signal' + (state === 'ready' ? ' ready' : state === 'error' ? ' error' : '');
}
function render() {
  nodes.chat.replaceChildren();
  if (!store.messages.length) {
    const welcome = document.createElement('div'); welcome.className='welcome';
    welcome.innerHTML='<div class="welcomeicon">✦</div><h1>Hola, soy Mi Bot IA</h1><p>Tu asistente personal, ejecutado en este dispositivo y sin API de pago.</p><p class="muted">Pulsa «Cargar IA». El modelo ligero es experimental y puede equivocarse, especialmente en español.</p>';
    nodes.chat.append(welcome);
    return;
  }
  for (const m of store.messages) addBubble(m.role, m.content, false);
  scrollChat();
}
function addBubble(role, content, scroll=true) {
  const wrapper = document.createElement('div'); wrapper.className='message ' + role;
  const caption = document.createElement('div'); caption.className='role';
  caption.textContent = role === 'user' ? 'Tú' : 'Mi Bot IA';
  const bubble = document.createElement('div'); bubble.className='bubble';
  bubble.textContent = content; // textContent prevents HTML injection.
  wrapper.append(caption,bubble); nodes.chat.append(wrapper);
  if (scroll) scrollChat();
  return bubble;
}
function scrollChat() { requestAnimationFrame(() => { nodes.chat.scrollTop = nodes.chat.scrollHeight; }); }
function setBusy(flag) {
  busy=flag; nodes.send.disabled=flag || loading; nodes.load.disabled=flag || loading;
  nodes.message.disabled=flag || loading;
}
async function releaseGenerator() {
  if (generator && typeof generator.dispose === 'function') {
    try { await generator.dispose(); } catch (_) {}
  }
  generator=null; loadedModel=null;
}
async function loadAI() {
  if (loading || busy) return;
  loading=true; setBusy(false); nodes.load.disabled=true; nodes.send.disabled=true;
  nodes.progressWrap.hidden=false; nodes.progressBar.style.width='3%';
  const modelKey=store.model;
  const canGPU = typeof navigator.gpu !== 'undefined';
  if (modelKey==='spanish' && !canGPU) {
    loading=false; nodes.progressWrap.hidden=true; setBusy(false);
    setStatus('WebGPU no disponible','En Ajustes elige el modelo ligero, o actualiza iOS si corresponde.','error');
    return;
  }
  try {
    await releaseGenerator();
    setStatus('Preparando el motor','Cargando la biblioteca de IA…');
    const { pipeline, env } = await import(LIBRARY_URL);
    env.allowRemoteModels=true;
    env.useBrowserCache=true;
    const progress_callback = p => {
      if (p.status==='progress' && Number.isFinite(p.progress)) {
        const n=Math.max(0,Math.min(100,Math.round(p.progress)));
        nodes.progressBar.style.width=n+'%';
        setStatus('Descargando modelo', `${p.file || MODELS[modelKey].name} · ${n}%`);
      } else if (p.status==='initiate' || p.status==='download') {
        setStatus('Preparando archivos', p.file || MODELS[modelKey].name);
      }
    };
    let device=canGPU ? 'webgpu' : 'wasm';
    let dtype=canGPU ? 'q4f16' : 'q8';
    try {
      generator = await pipeline('text-generation', MODELS[modelKey].id, { device, dtype, progress_callback });
    } catch (gpuError) {
      // If a smaller model cannot start on GPU, try its CPU variant.
      if (modelKey !== 'small' || device !== 'webgpu') throw gpuError;
      setStatus('Probando modo compatible','WebGPU falló; probando CPU (puede ser lento)…');
      device='wasm'; dtype='q8';
      generator = await pipeline('text-generation', MODELS.small.id, { device, dtype, progress_callback });
    }
    loadedModel=modelKey;
    nodes.progressBar.style.width='100%';
    setStatus('IA lista', `${MODELS[modelKey].name} · ${device.toUpperCase()} · sin API`, 'ready');
  } catch (e) {
    await releaseGenerator();
    setStatus('No se pudo iniciar','Revisa Wi-Fi, espacio libre o prueba el modelo ligero.','error');
    console.error('Error de carga:',e);
    alert('La IA no pudo cargar. Detalle técnico: '+ String(e?.message || e).slice(0,350));
  } finally {
    loading=false; nodes.progressWrap.hidden=true; setBusy(false);
  }
}
async function sendMessage(event) {
  event.preventDefault();
  if (busy || loading) return;
  const input=nodes.message.value.trim();
  if (!input) return;
  if (!generator || loadedModel!==store.model) {
    setStatus('Carga la IA primero','Pulsa «Cargar IA» y espera a que aparezca «IA lista».','error');
    return;
  }
  const prior=store.messages.slice(-8).map(x=>({role:x.role,content:x.content.slice(0,850)}));
  store.messages.push({role:'user',content:input});
  store.messages=store.messages.slice(-60); save(); addBubble('user', input);
  nodes.message.value=''; nodes.message.style.height='auto';
  const placeholder=addBubble('assistant','Generando respuesta…');
  setBusy(true); setStatus('Pensando','Generando dentro del iPhone…');
  try {
    const prompt=[{role:'system',content:store.personality || DEFAULT_PROMPT},...prior,{role:'user',content:input}];
    const output=await generator(prompt,{max_new_tokens:120,do_sample:true,temperature:0.65,top_p:0.9});
    let value=output?.[0]?.generated_text;
    let answer=Array.isArray(value) ? value[value.length-1]?.content : value;
    if (typeof answer!=='string' || !answer.trim()) answer='No pude producir una respuesta. Intenta una pregunta más breve.';
    answer=answer.trim();
    placeholder.textContent=answer;
    store.messages.push({role:'assistant',content:answer}); store.messages=store.messages.slice(-60); save();
    setStatus('IA lista',`${MODELS[store.model].name} · respuestas locales`,'ready');
  } catch(e) {
    console.error('Error de generación:',e);
    placeholder.textContent='No se pudo generar la respuesta. Prueba un mensaje corto o reinicia la app.';
    setStatus('Error de generación','La memoria del dispositivo puede ser insuficiente.','error');
  } finally { setBusy(false); nodes.message.focus(); scrollChat(); }
}
function hydrateSettings() {
  nodes.modelSelect.value=store.model;
  nodes.personality.value=store.personality;
  nodes.modelHelp.textContent=MODELS[store.model].help;
}
$('settingsButton').addEventListener('click',()=>{hydrateSettings(); nodes.dialog.showModal();});
nodes.modelSelect.addEventListener('change',()=>{nodes.modelHelp.textContent=MODELS[nodes.modelSelect.value].help;});
$('saveSettings').addEventListener('click',async()=>{
  if (busy || loading) {alert('Espera a que termine la operación de IA.');return;}
  const nextModel=nodes.modelSelect.value;
  const changeModel=nextModel!==store.model;
  store.model=nextModel;
  store.personality=nodes.personality.value.trim() || DEFAULT_PROMPT;
  save(); nodes.dialog.close();
  if(changeModel) {await releaseGenerator();setStatus('Modelo cambiado','Pulsa «Cargar IA» para descargarlo o iniciarlo.');}
  else if (generator) setStatus('Preferencias guardadas','La personalidad se aplicará a los nuevos mensajes.','ready');
});
$('clearChat').addEventListener('click',()=>{
  if(!confirm('¿Eliminar todas las conversaciones guardadas en este iPhone?'))return;
  store.messages=[];save();render();nodes.dialog.close();
});
$('exportChat').addEventListener('click',()=>{
  const content=['MI BOT IA — conversación exportada','Fecha: '+new Date().toLocaleString('es-MX'),'','Las respuestas son generadas por un modelo experimental.','',
    ...store.messages.map(m=>(m.role==='user'?'TÚ':'MI BOT IA')+'\n'+m.content+'\n')].join('\n');
  const blob=new Blob([content],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='mi-bot-ia-conversacion.txt';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
nodes.load.addEventListener('click',loadAI);
nodes.composer.addEventListener('submit',sendMessage);
nodes.message.addEventListener('input',()=>{nodes.message.style.height='auto';nodes.message.style.height=Math.min(nodes.message.scrollHeight,130)+'px';});
if ('serviceWorker' in navigator) window.addEventListener('load',()=>{
  navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Sin modo PWA sin conexión:',e));
});
render();
setStatus('IA sin cargar',`Modelo: ${MODELS[store.model].name}. Pulsa «Cargar IA».`);
