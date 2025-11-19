// ===== Utilidades UI =====
const $ = (sel) => document.querySelector(sel);
const resultados = $("#resultados");

function setResult(text, cls = "") {
  resultados.textContent = text;
  if (cls) resultados.className = `results ${cls}`;
  else resultados.className = "results";
}

function appendResult(text) {
  resultados.textContent += text;
}

// ===== Carga automática de diccionario =====
let diccionario = null;

// Cargar diccionario automáticamente desde el servidor al iniciar
async function cargarDiccionario() {
  try {
    const resp = await fetch("./diccionario_español_sintilde.txt");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    diccionario = new Set(
      text.split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter(Boolean)
    );
    setResult(`Diccionario cargado automáticamente: ${diccionario.size} palabras.`, "ok");
  } catch (err) {
    diccionario = null;
    setResult(`No se pudo cargar el diccionario automáticamente. ${err}`, "err");
    // El usuario puede seguir usando la parte de cifras, aunque la de letras requerirá el diccionario.
  }
}
cargarDiccionario();

// ===== LETRAS (Scrabble) =====
// formar_palabras: todas las permutaciones de longitud 1..n
function formarPalabras(letras) {
  const res = new Set();
  const arr = letras.split("");
  const n = arr.length;
  const used = Array(n).fill(false);
  const path = [];

  function backtrack(targetLen) {
    if (path.length === targetLen) {
      res.add(path.join(""));
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(arr[i]);
      backtrack(targetLen);
      path.pop();
      used[i] = false;
    }
  }

  for (let len = 1; len <= n; len++) backtrack(len);
  return res;
}

function buscarPalabras(palabrasSet, tamMin, dic) {
  const out = [];
  for (const p of palabrasSet) {
    if (dic.has(p) && p.length >= tamMin) out.push(p);
  }
  out.sort((a, b) => (a.length - b.length) || a.localeCompare(b));
  return out;
}

$("#letras").addEventListener("input", (e) => {
  const v = e.target.value.toLowerCase();
  if (v.length > 10) {
    e.target.value = v.slice(0, 10);
  } else {
    e.target.value = v;
  }
});

$("#buscarLetras").addEventListener("click", () => {
  let letras = ($("#letras").value || "").toLowerCase().trim();

  if (letras.length > 10) {
    $("#letras").value = letras.slice(0, 10);
    setResult("Error: Máximo 10 letras permitidas. Se ha recortado la entrada a 10.", "err");
    return;
  }

  if (!letras) { setResult("Error: La entrada no debe estar vacía.", "err"); return; }
  if (/[0-9]/.test(letras)) {
    setResult("Error: La entrada no debe contener números."); 
    $("#letras").value = "";
    return;
  }

  const tamStr = ($("#tam").value || "").trim();
  if (!tamStr) { setResult("Error: La entrada no debe estar vacía.", "err"); return; }
  if (!/^[0-9]+$/.test(tamStr)) {
    setResult("Error: El tamaño solo debe contener números.", "err");
    $("#tam").value = "";
    return;
  }

  if (!diccionario) { setResult("Error: El diccionario no está cargado. Intenta recargar la página.", "err"); return; }

  const tam = parseInt(tamStr, 10);
  const generadas = formarPalabras(letras);
  const coincidentes = buscarPalabras(generadas, tam, diccionario);

  if (!coincidentes.length) {
    setResult("No se encontraron palabras que coincidan con los criterios.");
  } else {
    const listado = coincidentes.map(p => `(${p.length}) ${p}`).join("\n");
    setResult(listado);
  }
});

$("#borrarLetras").addEventListener("click", () => {
  $("#letras").value = "";
});

// ===== Cifras =====
const OPS = ["+", "-", "*", "/"];

function isInt(x) {
  return Number.isInteger(x);
}

function applyOps(perm, ops) {
  let expr = String(perm[0]);
  let value = perm[0];

  for (let i = 1; i < perm.length; i++) {
    const op = ops[i - 1];
    const next = perm[i];

    if (op === "/") {
      if (next === 0) return { expr: null, value: null };
      if (value % next !== 0) return { expr: null, value: null };
      value = Math.trunc(value / next);
      expr = `(${expr} / ${next})`;
    } else if (op === "+") {
      value = value + next;
      expr = `(${expr} + ${next})`;
    } else if (op === "-") {
      value = value - next;
      expr = `(${expr} - ${next})`;
    } else if (op === "*") {
      value = value * next;
      expr = `(${expr} * ${next})`;
    }
  }
  return { expr, value };
}

function combinations(arr, r) {
  const res = [];
  const n = arr.length;
  const idx = Array.from({ length: r }, (_, i) => i);

  const pushCombo = () => res.push(idx.map(i => arr[i]));

  if (r === 0) return [[]];
  if (r > n) return [];

  pushCombo();
  while (true) {
    let i;
    for (i = r - 1; i >= 0; i--) {
      if (idx[i] !== i + n - r) break;
    }
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < r; j++) idx[j] = idx[j - 1] + 1;
    pushCombo();
  }
  return res;
}

function permutations(arr) {
  const res = [];
  const a = arr.slice();
  const used = Array(a.length).fill(false);
  const path = [];
  function backtrack() {
    if (path.length === a.length) { res.push(path.slice()); return; }
    for (let i = 0; i < a.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(a[i]);
      backtrack();
      path.pop();
      used[i] = false;
    }
  }
  backtrack();
  return res;
}

function opsProduct(k) {
  const res = [];
  const cur = Array(k);
  function backtrack(pos) {
    if (pos === k) { res.push(cur.slice()); return; }
    for (const op of OPS) {
      cur[pos] = op;
      backtrack(pos + 1);
    }
  }
  backtrack(0);
  return res;
}

function findExpression(numbers, target) {
  let closestExpr = null;
  let closestValue = null;
  let closestDiff = Infinity;

  for (let r = 1; r <= numbers.length; r++) {
    const combs = combinations(numbers, r);
    for (const comb of combs) {
      const perms = permutations(comb);
      for (const perm of perms) {
        const opCombos = opsProduct(perm.length - 1);
        for (const ops of opCombos) {
          const { expr, value } = applyOps(perm, ops);
          if (expr == null) continue;

          if (value === target) return { expr, value: target };
          if (isInt(value)) {
            const diff = Math.abs(target - value);
            if (diff < closestDiff) {
              closestDiff = diff;
              closestExpr = expr;
              closestValue = value;
            }
          }
        }
      }
    }
  }
  return { expr: closestExpr, value: closestValue };
}

$("#buscarCifras").addEventListener("click", () => {
  try {
    const nums = [
      parseInt($("#n1").value, 10),
      parseInt($("#n2").value, 10),
      parseInt($("#n3").value, 10),
      parseInt($("#n4").value, 10),
      parseInt($("#n5").value, 10),
      parseInt($("#n6").value, 10),
    ];
    if (nums.some((x) => Number.isNaN(x))) throw new Error("Todos los números deben ser válidos.");

    const target = parseInt($("#objetivo").value, 10);
    if (Number.isNaN(target)) throw new Error("El objetivo debe ser un número.");
    if (!(target >= 100 && target <= 999)) throw new Error("El número objetivo debe estar entre 100 y 999.");

    const { expr, value } = findExpression(nums, target);
    if (value === target) {
      setResult(`Encontrada expresión exacta para el número: ${target}\n${expr}`, "ok");
    } else {
      setResult(`No se encontró ninguna expresión exacta. Expresión más cercana para el número: ${value}\n${expr}`);
    }
  } catch (e) {
    setResult(`Error: ${e.message}`, "err");
  }
});

$("#borrarCifras").addEventListener("click", () => {
  ["#n1","#n2","#n3","#n4","#n5","#n6","#objetivo"].forEach(sel => { $(sel).value = ""; });
});

$("#borrarResultados").addEventListener("click", () => setResult(""));
