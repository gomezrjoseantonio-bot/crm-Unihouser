document.addEventListener('DOMContentLoaded', () => {
setupMoneyFormatting();
setupMoneyLive();

const form = document.getElementById('cfgForm');

// Cargar valores guardados
const cfg = Store.cfg || {};
[...form.elements].forEach(el => {
if (el.name && cfg[el.name] !== undefined) {
el.value = cfg[el.name];
}
});

// Guardar
form.addEventListener('submit', e => {
e.preventDefault();
const data = {};
[...form.elements].forEach(el => {
if (el.name) data[el.name] = el.value;
});
Store.cfg = data;
showToast("Nueva configuración guardada con éxito");
});
});

function showToast(msg){
const t = document.getElementById("toast");
t.textContent = msg;
t.className = "show";
setTimeout(()=>{ t.className = t.className.replace("show", ""); }, 3000);
}
