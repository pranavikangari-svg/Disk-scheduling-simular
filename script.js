/* ============================================================
   DISK SCHEDULING SIMULATOR — script.js
   Algorithms: FCFS, SSTF, SCAN, LOOK
   Features: Input validation, execution order, seek time,
             animated canvas graph, step table, comparison bars
   ============================================================ */

/* -------- ALGORITHM COLOR MAP -------- */
const ALGO_COLORS = {
  FCFS: { main: '#ff6b6b', label: 'First Come First Served' },
  SSTF: { main: '#ffd166', label: 'Shortest Seek Time First' },
  SCAN: { main: '#74b9ff', label: 'Elevator Algorithm' },
  LOOK: { main: '#a29bfe', label: 'Optimized SCAN' },
};

/* -------- STORE RESULTS FOR COMPARISON -------- */
// Keeps track of seek times from all algorithms run so far
const allResults = {};

/* ============================================================
   INPUT VALIDATION
   Returns parsed values or throws an error string
   ============================================================ */
function getInputs() {
  const diskSize  = parseInt(document.getElementById('diskSize').value);
  const head      = parseInt(document.getElementById('headPos').value);
  const numReq    = parseInt(document.getElementById('numReq').value);
  const rawReqs   = document.getElementById('requests').value.trim();

  // Check that fields are not empty
  if (isNaN(diskSize) || isNaN(head) || isNaN(numReq) || !rawReqs)
    throw 'Please fill in all fields.';

  if (diskSize < 2)       throw 'Disk size must be at least 2.';
  if (head < 0)           throw 'Head position cannot be negative.';
  if (head >= diskSize)   throw `Head position must be less than disk size (${diskSize}).`;
  if (numReq < 1)         throw 'Number of requests must be at least 1.';
  if (numReq > 20)        throw 'Maximum 20 requests allowed.';

  // Parse the request array — accept space or comma separated
  const requests = rawReqs
    .split(/[\s,]+/)           // split on spaces or commas
    .filter(s => s !== '')     // remove empty strings
    .map(Number);              // convert to numbers

  // Validate parsed length
  if (requests.length !== numReq)
    throw `You entered ${requests.length} request(s) but said ${numReq}. Please match them.`;

  // Validate each request value
  for (let i = 0; i < requests.length; i++) {
    if (isNaN(requests[i]) || !Number.isInteger(requests[i]))
      throw `Request #${i+1} is not a valid integer.`;
    if (requests[i] < 0)
      throw `Request #${i+1} (${requests[i]}) cannot be negative.`;
    if (requests[i] >= diskSize)
      throw `Request #${i+1} (${requests[i]}) must be less than disk size (${diskSize}).`;
  }

  return { diskSize, head, requests };
}

/* ============================================================
   ALGORITHM 1 — FCFS (First Come First Served)

   Serve requests in the exact order they arrived.
   No sorting, no prioritization — purely sequential.
   ============================================================ */
function runFCFS(requests, head) {
  const order = [head]; // start with initial head position
  let total = 0;
  let current = head;
  const steps = [];     // stores each step for the table

  for (let i = 0; i < requests.length; i++) {
    const dist = Math.abs(requests[i] - current); // distance to this request
    steps.push({ from: current, to: requests[i], dist });
    total += dist;
    current = requests[i];
    order.push(current);
  }

  return { order, total, steps };
}

/* ============================================================
   ALGORITHM 2 — SSTF (Shortest Seek Time First)

   At each step, find the closest unserved request and go there.
   Uses a "visited" boolean array to mark served requests.
   ============================================================ */
function runSSTF(requests, head) {
  const n = requests.length;
  const visited = new Array(n).fill(false); // tracks which requests are done
  const order = [head];
  let total = 0;
  let current = head;
  const steps = [];

  for (let count = 0; count < n; count++) {
    let minDist = Infinity;
    let bestIdx = -1;

    // Find the unvisited request closest to current head
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue; // skip already served
      const dist = Math.abs(requests[i] - current);
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }

    // Serve the closest one
    visited[bestIdx] = true;
    steps.push({ from: current, to: requests[bestIdx], dist: minDist });
    total += minDist;
    current = requests[bestIdx];
    order.push(current);
  }

  return { order, total, steps };
}

/* ============================================================
   ALGORITHM 3 — SCAN (Elevator Algorithm)

   Head moves UP (toward higher tracks), serving requests.
   Reaches the physical END of the disk (diskSize-1), then
   reverses and serves remaining requests going DOWN.
   ============================================================ */
function runSCAN(requests, head, diskSize) {
  // Sort a copy of requests so we can easily sweep in order
  const sorted = [...requests].sort((a, b) => a - b);

  const order = [head];
  let total = 0;
  let current = head;
  const steps = [];

  // Phase 1: Move RIGHT — serve all requests >= head
  for (const track of sorted) {
    if (track >= head) {
      const dist = Math.abs(track - current);
      steps.push({ from: current, to: track, dist });
      total += dist;
      current = track;
      order.push(current);
    }
  }

  // Hit the end of the disk before reversing
  if (current !== diskSize - 1) {
    const dist = Math.abs((diskSize - 1) - current);
    steps.push({ from: current, to: diskSize - 1, dist, note: 'end' });
    total += dist;
    current = diskSize - 1;
    order.push(current);
  }

  // Phase 2: Move LEFT — serve all requests < head (in reverse order)
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i] < head) {
      const dist = Math.abs(sorted[i] - current);
      steps.push({ from: current, to: sorted[i], dist });
      total += dist;
      current = sorted[i];
      order.push(current);
    }
  }

  return { order, total, steps };
}

/* ============================================================
   ALGORITHM 4 — LOOK

   Same as SCAN but the head does NOT go all the way to
   the physical end of the disk. It reverses at the
   LAST REQUEST in each direction. More efficient than SCAN.
   ============================================================ */
function runLOOK(requests, head) {
  const sorted = [...requests].sort((a, b) => a - b);

  const order = [head];
  let total = 0;
  let current = head;
  const steps = [];

  // Phase 1: Move RIGHT — serve all requests >= head
  for (const track of sorted) {
    if (track >= head) {
      const dist = Math.abs(track - current);
      steps.push({ from: current, to: track, dist });
      total += dist;
      current = track;
      order.push(current);
    }
  }

  // KEY DIFFERENCE: No extra step to disk edge. Reverse right here.

  // Phase 2: Move LEFT — serve all requests < head
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i] < head) {
      const dist = Math.abs(sorted[i] - current);
      steps.push({ from: current, to: sorted[i], dist });
      total += dist;
      current = sorted[i];
      order.push(current);
    }
  }

  return { order, total, steps };
}

/* ============================================================
   CANVAS DRAWING — Animated Head Movement Graph

   X-axis = track position (0 to diskSize)
   Y-axis = steps in time (top to bottom)
   Each move draws a line with a glowing dot.
   ============================================================ */
function drawGraph(order, diskSize, color) {
  const canvas = document.getElementById('diskCanvas');
  const ctx    = canvas.getContext('2d');

  // Set physical canvas pixels for sharp rendering
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width  = W * window.devicePixelRatio;
  canvas.height = H * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  ctx.clearRect(0, 0, W, H);

  const PAD_L = 48; // left padding for labels
  const PAD_R = 16;
  const PAD_T = 20;
  const PAD_B = 28;

  const graphW = W - PAD_L - PAD_R;
  const graphH = H - PAD_T - PAD_B;

  // Convert track number → X pixel
  const trackToX = t => PAD_L + (t / (diskSize - 1)) * graphW;

  // Convert step index → Y pixel
  const stepToY  = i => PAD_T + (i / (order.length - 1)) * graphH;

  // ---- Draw grid lines ----
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const x = PAD_L + (i / gridCount) * graphW;
    ctx.beginPath();
    ctx.moveTo(x, PAD_T);
    ctx.lineTo(x, PAD_T + graphH);
    ctx.stroke();

    // X-axis labels (track numbers)
    const track = Math.round((i / gridCount) * (diskSize - 1));
    ctx.fillStyle = 'rgba(107,114,144,0.8)';
    ctx.font = `${10 * window.devicePixelRatio / window.devicePixelRatio}px 'Space Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(track, x, H - 10);
  }

  // Y-axis label
  ctx.save();
  ctx.fillStyle = 'rgba(107,114,144,0.6)';
  ctx.font = '10px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.translate(12, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Steps', 0, 0);
  ctx.restore();

  // ---- Animate drawing line segment by segment ----
  let step = 0;
  const totalSteps = order.length - 1;

  // Draw the initial head dot immediately
  function drawDot(x, y, highlight) {
    ctx.beginPath();
    ctx.arc(x, y, highlight ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = highlight ? color : 'rgba(255,255,255,0.4)';
    ctx.fill();
    if (highlight) {
      // Glow effect around current dot
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = color + '30'; // 30 = hex opacity ~19%
      ctx.fill();
    }
  }

  function drawStep(i) {
    if (i >= totalSteps) return;

    const x1 = trackToX(order[i]);
    const y1 = stepToY(i);
    const x2 = trackToX(order[i + 1]);
    const y2 = stepToY(i + 1);

    // Draw the line segment
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw dot at start of this segment
    drawDot(x1, y1, false);

    // Erase old "current" glow by redrawing previous dot as static
    if (i > 0) {
      drawDot(trackToX(order[i]), stepToY(i), false);
    }

    // Draw glowing dot at end (current position)
    drawDot(x2, y2, true);

    step++;
    // Delay between steps — slower for fewer steps, faster for many
    const delay = Math.max(60, 400 / totalSteps);
    setTimeout(() => drawStep(i + 1), delay);
  }

  // Draw initial head position dot
  drawDot(trackToX(order[0]), stepToY(0), true);

  // Start animation after a short pause
  setTimeout(() => drawStep(0), 200);
}

/* ============================================================
   RENDER RESULTS INTO THE DOM
   ============================================================ */
function renderResults(algo, result, diskSize) {
  const color   = ALGO_COLORS[algo].main;
  const label   = ALGO_COLORS[algo].label;
  const { order, total, steps } = result;

  // Show results section, hide placeholder
  document.getElementById('placeholder').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');

  // Update algo name + seek time
  document.getElementById('resAlgoName').textContent = algo;
  document.getElementById('resAlgoFull').textContent = label;
  document.getElementById('resAlgoName').style.color = color;
  document.getElementById('resSeekTime').textContent = total;
  document.getElementById('resSeekTime').style.color = color;
  document.querySelector('.seek-badge').style.borderColor = color + '55';

  // ---- Render execution order pills ----
  const orderDiv = document.getElementById('resOrder');
  orderDiv.innerHTML = '';
  order.forEach((track, i) => {
    // Arrow between pills
    if (i > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'track-arrow';
      arrow.textContent = '→';
      arrow.style.animationDelay = `${i * 0.06}s`;
      orderDiv.appendChild(arrow);
    }
    const pill = document.createElement('span');
    pill.className = 'track-pill' + (i === 0 ? ' start-pill' : '');
    pill.textContent = track;
    pill.style.animationDelay = `${i * 0.06}s`;
    if (i === 0) pill.style.borderColor = color;
    if (i === 0) pill.style.color = color;
    orderDiv.appendChild(pill);
  });

  // ---- Render step-by-step table ----
  const tbody = document.getElementById('stepsTableBody');
  tbody.innerHTML = '';
  steps.forEach((s, i) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 0.05}s`;
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${s.from}</td>
      <td>${s.to}${s.note ? ' <small style="color:var(--muted)">(disk end)</small>' : ''}</td>
      <td class="dist-cell" style="color:${color}">${s.dist}</td>
    `;
    tbody.appendChild(tr);
  });

  // ---- Draw animated canvas graph ----
  drawGraph(order, diskSize, color);
}

/* ============================================================
   COMPARISON BARS
   Shown after at least one result, compares all run algos
   ============================================================ */
function renderComparison() {
  const section = document.getElementById('compareSection');
  const barsDiv = document.getElementById('compareBars');

  if (Object.keys(allResults).length === 0) return;

  section.classList.remove('hidden');
  barsDiv.innerHTML = '';

  const maxSeek = Math.max(...Object.values(allResults));
  const minSeek = Math.min(...Object.values(allResults));

  const algoOrder = ['FCFS', 'SSTF', 'SCAN', 'LOOK'];

  algoOrder.forEach(algo => {
    if (allResults[algo] === undefined) return;

    const seek    = allResults[algo];
    const color   = ALGO_COLORS[algo].main;
    const isWinner = seek === minSeek;
    const pct     = maxSeek === 0 ? 0 : (seek / maxSeek) * 100;

    const row = document.createElement('div');
    row.className = 'compare-row' + (isWinner ? ' compare-winner' : '');
    row.innerHTML = `
      <div class="compare-name" style="color:${color}">${algo}</div>
      <div class="compare-bar-track">
        <div class="compare-bar-fill" style="width:0%; background:${color};"
             data-pct="${pct}"></div>
      </div>
      <div class="compare-seek">${seek}${isWinner ? ' ★' : ''}</div>
    `;
    barsDiv.appendChild(row);
  });

  // Animate bar fills after a tiny delay (so transition plays)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.compare-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.pct + '%';
      });
    });
  });
}

/* ============================================================
   ERROR DISPLAY HELPER
   ============================================================ */
function showError(msg) {
  const box = document.getElementById('errorBox');
  box.textContent = '⚠ ' + msg;
  box.classList.remove('hidden');
}

function clearError() {
  document.getElementById('errorBox').classList.add('hidden');
}

/* ============================================================
   BUTTON CLICK HANDLER — wires everything together
   ============================================================ */
document.querySelectorAll('.btn-algo').forEach(btn => {
  btn.addEventListener('click', () => {
    clearError();

    // Highlight active button
    document.querySelectorAll('.btn-algo').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const algo = btn.dataset.algo;

    // Parse and validate inputs
    let inputs;
    try {
      inputs = getInputs();
    } catch (err) {
      showError(err);
      return;
    }

    const { diskSize, head, requests } = inputs;

    // Run the selected algorithm
    let result;
    switch (algo) {
      case 'FCFS': result = runFCFS(requests, head);                break;
      case 'SSTF': result = runSSTF(requests, head);                break;
      case 'SCAN': result = runSCAN(requests, head, diskSize);      break;
      case 'LOOK': result = runLOOK(requests, head);                break;
    }

    // Store result for comparison
    allResults[algo] = result.total;

    // Render the results panel
    renderResults(algo, result, diskSize);

    // Update comparison bars
    renderComparison();

    // Scroll to results on mobile
    document.getElementById('resultPanel').scrollIntoView({
      behavior: 'smooth', block: 'start'
    });
  });
});

/* ============================================================
   RESET BUTTON — clears everything
   ============================================================ */
document.getElementById('resetBtn').addEventListener('click', () => {
  // Clear inputs
  ['diskSize','headPos','numReq','requests'].forEach(id => {
    document.getElementById(id).value = '';
  });

  clearError();

  // Reset results panel
  document.getElementById('placeholder').classList.remove('hidden');
  document.getElementById('results').classList.add('hidden');

  // Reset comparison
  Object.keys(allResults).forEach(k => delete allResults[k]);
  document.getElementById('compareSection').classList.add('hidden');

  // Remove active button highlight
  document.querySelectorAll('.btn-algo').forEach(b => b.classList.remove('active'));

  // Clear canvas
  const canvas = document.getElementById('diskCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

/* ============================================================
   RE-DRAW CANVAS ON WINDOW RESIZE (keeps graph sharp)
   ============================================================ */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    // Nothing to redraw if results are hidden
    if (document.getElementById('results').classList.contains('hidden')) return;
    // The canvas is cleared on resize — user can re-click an algo to redraw
  }, 250);
});