const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const invoke=(cmd,args={})=>window.__TAURI__.core.invoke(cmd,args);
const state={mode:"generate",source:null,mask:null,current:null,history:[],models:[],settings:null};

function escapeHtml(value=""){return String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function error(message=""){const box=$("#error");box.hidden=!message;box.textContent=message}
function setMode(mode){state.mode=mode;$$('.mode-tab').forEach(x=>x.classList.toggle('active',x.dataset.mode===mode));$("#editInputs").hidden=mode!=="edit";$("#generate span").textContent=mode==="edit"?"生成修改图片":"生成图片";error()}
function fileData(file){return new Promise((resolve,reject)=>{if(file.size>25*1024*1024)return reject(new Error("单张图片不能超过 25MB"));const reader=new FileReader();reader.onload=()=>resolve({name:file.name,data:reader.result});reader.onerror=()=>reject(new Error("读取图片失败"));reader.readAsDataURL(file)})}
function optionHtml(models,selected){return models.length?models.map(m=>`<option value="${escapeHtml(m)}" ${m===selected?'selected':''}>${escapeHtml(m)}</option>`).join(''):'<option value="">请先获取可用模型</option>'}
function renderModels(models,selected){state.models=models||[];$("#modelSelect").innerHTML=optionHtml(state.models,selected);$("#settingsModel").innerHTML=optionHtml(state.models,selected)}
async function refreshStatus(){
  const s=await invoke("get_status");state.settings=s;renderModels(s.availableModels||[],s.selectedModel||"");$("#baseUrl").value=s.baseUrl||"";$("#outputDir").value=s.outputDir||"";$("#responseFormat").value=s.responseFormat||"url";
  const c=$("#connection");c.classList.toggle("ok",s.connected);c.querySelector('b').textContent=s.connected?(s.selectedModel?`已连接 · ${s.selectedModel}`:"已连接 · 请获取模型"):"尚未配置";$("#generateHint").textContent=(s.responseFormat||"url")==="url"?"URL 返回 · 速度优先":"Base64 返回 · 兼容优先";
}
async function fetchModels(){
  const button=$("#fetchModels"),status=$("#fetchStatus");button.disabled=true;button.textContent="正在获取…";status.textContent="正在连接 /models";
  try{const result=await invoke("fetch_models",{baseUrl:$("#baseUrl").value,apiKey:$("#apiKey").value});renderModels(result.models,result.selectedModel);$("#baseUrl").value=result.baseUrl;status.textContent=`已获取 ${result.models.length} 个模型，用时 ${(result.elapsedMs/1000).toFixed(2)} 秒`;await refreshStatus()}catch(e){status.textContent=String(e)}finally{button.disabled=false;button.textContent="获取并保存可用模型"}
}
async function loadHistory(){state.history=await invoke("get_history");renderHistory()}
async function imageFor(item){return invoke("read_image",{path:item.path})}
function showImage(data,item){state.current=item;$("#resultImage").src=data;$("#canvas").classList.add("has-image");$("#canvasActions").hidden=false;$("#download").href=data;$("#download").download=item.filename;$("#resultMeta").textContent=`${item.model} · ${item.size} · ${item.quality} · ${Number(item.elapsedSeconds||0).toFixed(1)} 秒`}
function renderHistory(){
  const filter=$("#historyFilter").value;const items=filter==="all"?state.history:state.history.filter(x=>x.mode===filter);$("#history").innerHTML=items.length?items.map(x=>`<article class="history-item" data-id="${x.id}"><img data-path="${escapeHtml(x.path)}" alt=""><div class="history-info"><strong>${escapeHtml(x.prompt)}</strong><div><span>${x.mode==="edit"?"图生图":"文生图"} · ${escapeHtml(x.model||"")}</span><span>${Number(x.elapsedSeconds||0).toFixed(0)}秒</span></div></div></article>`).join(''):'<div class="history-empty">暂无生成记录</div>';
  $$('.history-item img').forEach(async img=>{try{img.src=await invoke("read_image",{path:img.dataset.path})}catch{}});$$('.history-item').forEach(card=>card.onclick=async()=>{const item=state.history.find(x=>x.id===card.dataset.id);showImage(await imageFor(item),item)})
}

$$('.mode-tab').forEach(x=>x.onclick=()=>setMode(x.dataset.mode));
$("#sourceInput").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{state.source=await fileData(file);$("#sourceName").textContent=file.name}catch(err){error(String(err))}};
$("#maskInput").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{state.mask=await fileData(file);$("#maskName").textContent=file.name}catch(err){error(String(err))}};
$("#modelSelect").onchange=async e=>{await invoke("save_selected_model",{model:e.target.value});$("#settingsModel").value=e.target.value;await refreshStatus()};
$("#settingsModel").onchange=e=>$("#modelSelect").value=e.target.value;
$("#refreshModels").onclick=()=>{$("#settingsDialog").showModal();fetchModels()};
$("#fetchModels").onclick=fetchModels;
$("#historyFilter").onchange=renderHistory;
$("#generate").onclick=async()=>{
  const prompt=$("#prompt").value.trim(),model=$("#modelSelect").value;if(!prompt)return error("请填写图片描述");if(!model)return error("请先在设置中获取并选择模型");if(state.mode==="edit"&&!state.source)return error("图生图需要先上传原图");
  const button=$("#generate");button.disabled=true;button.querySelector('span').textContent="正在生成…";button.querySelector('small').textContent="模型处理中，请保持软件开启";error();const input={prompt,model,size:$("#size").value,quality:$("#quality").value,filename:$("#filename").value.trim()||"created-image.png"};if(state.mode==="edit")Object.assign(input,{imageData:state.source.data,imageName:state.source.name,maskData:state.mask?.data||null,maskName:state.mask?.name||null});
  try{const item=await invoke(state.mode==="edit"?"edit_image":"generate_image",{input});showImage(await imageFor(item),item);await loadHistory()}catch(e){error(String(e))}finally{button.disabled=false;button.querySelector('span').textContent=state.mode==="edit"?"生成修改图片":"生成图片";button.querySelector('small').textContent=(state.settings?.responseFormat||"url")==="url"?"URL 返回 · 速度优先":"Base64 返回 · 兼容优先"}
};
$("#reuse").onclick=async()=>{if(!state.current)return;state.source={name:state.current.filename,data:await imageFor(state.current)};$("#sourceName").textContent=state.current.filename;setMode("edit")};
$("#resultImage").onclick=()=>{if(!state.current)return;$("#previewImage").src=$("#resultImage").src;$("#previewCaption").textContent=`${state.current.filename} · ${state.current.model} · ${Number(state.current.elapsedSeconds||0).toFixed(1)} 秒`;$("#previewDialog").showModal()};
$("#openSettings").onclick=()=>{$("#apiKey").value="";$("#fetchStatus").textContent="图片模型会排在列表前面";$("#settingsDialog").showModal()};
$("#closeSettings").onclick=$("#cancelSettings").onclick=()=>$("#settingsDialog").close();
$("#closePreview").onclick=()=>$("#previewDialog").close();
$("#settingsForm").onsubmit=async e=>{e.preventDefault();const button=$("#saveSettings");button.disabled=true;button.textContent="正在保存…";try{await invoke("save_settings",{apiKey:$("#apiKey").value,baseUrl:$("#baseUrl").value,selectedModel:$("#settingsModel").value,responseFormat:$("#responseFormat").value,outputDir:$("#outputDir").value});$("#apiKey").value="";$("#settingsDialog").close();await refreshStatus()}catch(err){$("#fetchStatus").textContent=String(err)}finally{button.disabled=false;button.textContent="保存设置"}};

Promise.all([refreshStatus(),loadHistory()]).catch(e=>error(String(e)));
