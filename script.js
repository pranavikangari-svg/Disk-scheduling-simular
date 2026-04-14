/**
 * DiskSim — script.js
 * ============================================================
 * Disk Scheduling Simulator
 * Algorithms: FCFS, SSTF, SCAN, LOOK
 *
 * Sections:
 *  1. DOM References
 *  2. State
 *  3. Utility Helpers
 *  4. Input Validation
 *  5. Scheduling Algorithms
 *  6. UI Rendering (pills, stats, canvas)
 *  7. Comparison Modal
 *  8. Event Listeners
 * ============================================================
 */

/* ============================================================
   1. DOM References
   ============================================================ */
const $diskQueue      = document.getElementById('diskQueue');
const $headPosition   = document.getElementById('headPosition');
const $queueError     = document.getElementById('queueError');
const $headError      = document.getElementById('headError');
const $directionGroup = document.getElementById('directionGroup');
const $dirLeft        = document.getElementById('dirLeft');
const $dirRight       = document.getElementById('dirRight');
const $runBtn         = document.getElementById('runBtn');
const $compareBtn     = document.getElementById('compareBtn');
const $resetBtn       = document.getElementById('resetBtn');
const $randomBtn      = document.getElementById('randomBtn');
const $placeholder    = document.getElementById('placeholder');
const $resultsContent = document.getElementById('resultsContent');
const $statAlgo       = document.getElementById('statAlgo');
const $statSeek       = document.getElementById('statSeek');
const $statCount      = document.getElementById('statCount');
const $execTrack      = document.getElementById('execTrack');
const $diskCanvas     = document.getElementById('diskCanvas');
const $compareModal   = document.getElementById('compareModal');
const $modalClose     = document.getElementById('modalClose');
const $compareBody    = document.getElementById('compareBody');
const $compareChart   = document.getElementById('compareChart');

// All algorithm selector buttons
const $algoButtons = document.querySelectorAll('.btn--algo');

/* ============================================================
   2. State
   ============================================================ */
const state = {
  selectedAlgo: 'FCFS',   // active algorithm key
  direction: 'left',      // scan direction: 'left' | 'right'
  lastResult: null,        // result from the last simulation run
  compChart: null,         // Chart.js instance for compare modal
};

// Disk limits
const DISK_MIN = 0;
const DISK_MAX = 199;

/* ============================================================
   3. Utility Helpers
   ============================================================ */

/**
 * Generate N unique random cylinder positions within DISK range.
 * @param {number} count
 * @returns {number[]}
 */
function randomQueue(count = 8) {
  const set = new Set();
  while (set.size < count) {
    set.add(Math.floor(Math.random() * (DISK_MAX - DISK_MIN + 1)) + DISK_MIN);
  }
  return [...set];
}

/**
 * Clamp a value between min and max.
 */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Show or hide an error element.
 * @param {HTMLElement} el
 * @param {boolean} show
 */
function showError(el, show) {
  show ? el.classList.remove('hidden') : el.classList.add('hidden');
}

/* ============================================================
   4. Input Validation
   ============================================================ */

/**
 * Parse and validate the disk queue input.
 * Returns { valid, queue } where queue is an array of integers.
 */
function parseQueue() {
  const raw = $diskQueue.value.trim();
  if (!raw) return { valid: false, queue: [] };

  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  const nums  = parts.map(Number);

  const allValid = nums.every(n =>
    Number.isInteger(n) && n >= DISK_MIN && n <= DISK_MAX
  );

  if (!allValid || nums.length === 0) return { valid: false, queue: [] };
  return { valid: true, queue: nums };
}

/**
 * Parse and validate the head position input.
 * Returns { valid, head }.
 */
function parseHead() {
  const val = parseInt($headPosition.value, 10);
  if (isNaN(val) || val < DISK_MIN || val > DISK_MAX) {
    return { valid: false, head: null };
  }
  return { valid: true, head: val };
}

/**
 * Run all validations and show/hide error messages.
 * Returns true if all inputs are valid.
 */
function validateAll() {
  const { valid: qv } = parseQueue();
  const { valid: hv } = parseHead();
  showError($queueError, !qv);
  showError($headError,  !hv);
  return qv && hv;
}

/* ============================================================
   5. Scheduling Algorithms
   ============================================================ */

/**
 * FCFS — First Come First Served
 * Serve requests in the order they arrive.
 *
 * @param {number[]} queue   - array of cylinder requests
 * @param {number}   head    - starting head position
 * @returns {{ order: number[], seekTime: number }}
 */
function fcfs(queue, head) {
  const order = [head, ...queue];
  let seekTime = 0;
  for (let i = 1; i < order.length; i++) {
    seekTime += Math.abs(order[i] - order[i - 1]);
  }
  return { order, seekTime };
}

/**
 * SSTF — Shortest Seek Time First
 * Greedily serve the closest unvisited request.
 *
 * @param {number[]} queue
 * @param {number}   head
 * @returns {{ order: number[], seekTime: number }}
 */
function sstf(queue, head) {
  const remaining = [...queue];
  const order     = [head];
  let   current   = head;
  let   seekTime  = 0;

  while (remaining.length > 0) {
    // Find index of closest cylinder
    let closest = 0;
    let minDist = Math.abs(remaining[0] - current);

    for (let i = 1; i < remaining.length; i++) {
      const dist = Math.abs(remaining[i] - current);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }

    seekTime += minDist;
    current   = remaining[closest];
    order.push(current);
    remaining.splice(closest, 1);
  }

  return { order, seekTime };
}

/**
 * SCAN — Elevator Algorithm
 * Head moves in one direction servicing requests until it reaches
 * the disk boundary (DISK_MIN or DISK_MAX), then reverses.
 *
 * @param {number[]} queue
 * @param {number}   head
 * @param {string}   direction  - 'left' | 'right'
 * @returns {{ order: number[], seekTime: number }}
 */
function scan(queue, head, direction) {
  const sorted = [...queue].sort((a, b) => a - b);
  const left   = sorted.filter(c => c <= head).reverse();  // descending
  const right  = sorted.filter(c => c >  head);            // ascending

  let order    = [head];
  let seekTime = 0;

  if (direction === 'left') {
    // Service left side, touch boundary at DISK_MIN, then service right
    const leftPath = [...left, DISK_MIN];
    leftPath.forEach(c => { seekTime += Math.abs(c - order[order.length - 1]); order.push(c); });
    right.forEach(c => { seekTime += Math.abs(c - order[order.length - 1]); order.push(c); });
  } else {
    // Service right side, touch boundary at DISK_MAX, then service left
    const rightPath = [...right, DISK_MAX];
    rightPath.forEach(c => { seekTime += Math.abs(c - order[order.length - 1]); order.push(c); });
    left.reverse().forEach(c => { seekTime += Math.abs(c - order[order.length - 1]); order.push(c); });
  }

  return { order, seekTime };
}

/**
 * LOOK — Optimized SCAN
 * Same as SCAN but the head only goes as far as the last request
 * in each direction (no wasted travel to disk boundary).
 *
 * @param {number[]} queue
 * @param {number}   head
 * @param {string}   direction  - 'left' | 'right'
 * @returns {{ order: number[], seekTime: number }}
 */
function look(queue, head, direction) {
  const sorted = [...queue].sort((a, b) => a - b);
  const left   = sorted.filter(c => c <= head).reverse();
  const right  = sorted.filter(c => c >  head);

  let order    = [head];
  let seekTime = 0;

  if (direction === 'left') {
    left.forEach(c => { seekTime += Math.abs(c - order[order.length - 1]); order.push(c); });
    right.forEach(c => { seekTime += Math.abs(c - order[order.length - 1]); order.push(c); });
  } else {
    right.forEach(c => { seekTime += Math.abs(c - order[order.length - 1]); order.push(c); });
    left.reverse().forEach(c => { seekTime += Math.abs(c - order[order.length - 1]); order.push(c); });
  }

  return { order, seekTime };
}

/**
 * Run the currently selected algorithm.
 * @param {string}   algo
 * @param {number[]} queue
 * @param {number}   head
 * @param {string}   direction
 */
function runAlgorithm(algo, queue, head, direction) {
  switch (algo) {
    case 'FCFS': return fcfs(queue, head);
    case 'SSTF': return sstf(queue, head);
    case 'SCAN': return scan(queue, head, direction);
    case 'LOOK': return look(queue, head, direction);
    default:     return fcfs(queue, head);
  }
}

/* ============================================================
   6. UI Rendering
   ============================================================ */

/**
 * Render execution order pills into the exec track.
 * Each pill appears with a staggered animation.
 * @param {number[]} order
 * @param {number}   head
 */
function renderPills(order, head) {
  $execTrack.innerHTML = '';

  order.forEach((cyl, i) => {
    // Animated delay for staggered appearance
    const delay = `${i * 55}ms`;

    // Head / step distinction
    const isHead = i === 0;
    const cls    = isHead ? 'exec-pill pill--head' : 'exec-pill pill--step';
    const label  = isHead ? `⊙ ${cyl}` : `${cyl}`;

    const pill = document.createElement('span');
    pill.className  = cls;
    pill.textContent = label;
    pill.style.animationDelay = delay;
    $execTrack.appendChild(pill);

    // Arrow separator (not after last pill)
    if (i < order.length - 1) {
      const arrow = document.createElement('span');
      arrow.className  = 'exec-arrow';
      arrow.textContent = '→';
      arrow.style.animationDelay = delay;
      $execTrack.appendChild(arrow);
    }
  });
}

/**
 * Draw the disk arm movement on the canvas using the
 * custom line-chart style visualization.
 *
 * X-axis = cylinder position (0–199)
 * Y-axis = step index (time)
 *
 * @param {number[]} order    - sequence of cylinder positions
 */
function drawCanvas(order) {
  const canvas  = $diskCanvas;
  const ctx     = canvas.getContext('2d');
  const DPR     = window.devicePixelRatio || 1;

  // Set canvas dimensions based on container width
  const containerW = canvas.parentElement.clientWidth - 32; // padding
  const W          = Math.max(containerW, 300);
  const H          = Math.max(order.length * 42, 260);

  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width  = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.scale(DPR, DPR);

  // ── Layout constants
  const PAD_L  = 52;   // left padding (for Y-axis labels)
  const PAD_R  = 20;
  const PAD_T  = 24;
  const PAD_B  = 36;
  const plotW  = W - PAD_L - PAD_R;
  const plotH  = H - PAD_T - PAD_B;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // ── Background
  ctx.fillStyle = '#0b0f1a';
  ctx.fillRect(0, 0, W, H);

  // ── Grid lines (vertical, for cylinder positions)
  const gridCount = 10;
  ctx.strokeStyle = 'rgba(26, 37, 64, 0.8)';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= gridCount; i++) {
    const x = PAD_L + (i / gridCount) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, PAD_T);
    ctx.lineTo(x, PAD_T + plotH);
    ctx.stroke();
  }

  // ── X-axis labels (cylinder positions 0–199)
  ctx.font      = '10px Share Tech Mono, monospace';
  ctx.fillStyle = 'rgba(90, 112, 128, 0.8)';
  ctx.textAlign = 'center';
  for (let i = 0; i <= gridCount; i++) {
    const x    = PAD_L + (i / gridCount) * plotW;
    const cyl  = Math.round((i / gridCount) * DISK_MAX);
    ctx.fillText(cyl, x, PAD_T + plotH + 18);
  }

  // ── Y-axis step labels
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(90, 112, 128, 0.7)';
  order.forEach((_, i) => {
    const y = PAD_T + (i / (order.length - 1)) * plotH;
    ctx.fillText(i, PAD_L - 8, y + 4);
  });

  // ── Coordinate mapper
  function mapX(cyl)  { return PAD_L + (cyl / DISK_MAX) * plotW; }
  function mapY(step) {
    if (order.length === 1) return PAD_T + plotH / 2;
    return PAD_T + (step / (order.length - 1)) * plotH;
  }

  // ── Shadow glow for the path
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur  = 10;

  // ── Draw path segments
  for (let i = 0; i < order.length - 1; i++) {
    const x1 = mapX(order[i]);     const y1 = mapY(i);
    const x2 = mapX(order[i + 1]); const y2 = mapY(i + 1);

    // Gradient per segment: cyan → green
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, '#00e5ff');
    grad.addColorStop(1, '#00ff9d');

    ctx.strokeStyle = grad;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Reset shadow
  ctx.shadowBlur = 0;

  // ── Draw dots at each stop
  order.forEach((cyl, i) => {
    const x = mapX(cyl);
    const y = mapY(i);

    // Glow ring
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.fill();

    // Dot
    ctx.beginPath();
    ctx.arc(x, y, i === 0 ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#ffb700' : '#00e5ff';
    ctx.shadowColor = i === 0 ? '#ffb700' : '#00e5ff';
    ctx.shadowBlur  = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cylinder number label
    ctx.font      = '9px Share Tech Mono, monospace';
    ctx.fillStyle = '#c8d8e8';
    ctx.textAlign = 'center';
    const labelY  = y - 10;
    // Alternate label up/down to reduce overlap
    ctx.fillText(cyl, x, i % 2 === 0 ? labelY : y + 18);
  });
}

/**
 * Show the results section and populate all widgets.
 * @param {string}   algo
 * @param {number[]} order
 * @param {number}   seekTime
 */
function showResults(algo, order, seekTime) {
  // Update stat cards
  $statAlgo.textContent  = algo;
  $statSeek.textContent  = `${seekTime} cylinders`;
  $statCount.textContent = `${order.length - 1} requests`;

  // Render pills
  renderPills(order, order[0]);

  // Toggle visibility
  $placeholder.classList.add('hidden');
  $resultsContent.classList.remove('hidden');

  // Draw canvas (after layout reflow so dimensions are correct)
  requestAnimationFrame(() => drawCanvas(order));
}

/* ============================================================
   7. Comparison Modal
   ============================================================ */

/**
 * Run all 4 algorithms on the given input and display a
 * comparison table + bar chart.
 * @param {number[]} queue
 * @param {number}   head
 * @param {string}   direction
 */
function showComparison(queue, head, direction) {
  const algorithms = ['FCFS', 'SSTF', 'SCAN', 'LOOK'];

  // Compute seek times for all algorithms
  const results = algorithms.map(algo => ({
    algo,
    seekTime: runAlgorithm(algo, queue, head, direction).seekTime,
  }));

  // Sort by seek time (ascending) to find best
  const sorted  = [...results].sort((a, b) => a.seekTime - b.seekTime);
  const best    = sorted[0].seekTime;
  const worst   = sorted[sorted.length - 1].seekTime;
  const range   = worst - best || 1;

  // ── Render table
  $compareBody.innerHTML = '';
  results.forEach(r => {
    const isBest  = r.seekTime === best;
    const perfPct = Math.round(100 - ((r.seekTime - best) / range) * 100);
    const barW    = Math.round((perfPct / 100) * 120);

    const tr = document.createElement('tr');
    if (isBest) tr.classList.add('best');

    tr.innerHTML = `
      <td>${r.algo}</td>
      <td>${r.seekTime} cyl</td>
      <td>
        <div class="perf-bar-wrap">
          <div class="perf-bar" style="width:${barW}px"></div>
          <span class="perf-label">${perfPct}%</span>
        </div>
      </td>
    `;
    $compareBody.appendChild(tr);
  });

  // ── Chart.js bar chart
  // Destroy previous chart instance if any
  if (state.compChart) {
    state.compChart.destroy();
    state.compChart = null;
  }

  const COLORS = {
    FCFS: 'rgba(0, 229, 255, 0.8)',
    SSTF: 'rgba(0, 255, 157, 0.8)',
    SCAN: 'rgba(255, 183, 0, 0.8)',
    LOOK: 'rgba(157, 78, 221, 0.8)',
  };

  state.compChart = new Chart($compareChart, {
    type: 'bar',
    data: {
      labels:   results.map(r => r.algo),
      datasets: [{
        label: 'Total Seek Time (cylinders)',
        data:  results.map(r => r.seekTime),
        backgroundColor: results.map(r => COLORS[r.algo]),
        borderColor:     results.map(r => COLORS[r.algo].replace('0.8', '1')),
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#5a7080',
            font: { family: 'Share Tech Mono', size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#0b0f1a',
          borderColor:     '#1a2540',
          borderWidth: 1,
          titleColor: '#00e5ff',
          bodyColor:  '#c8d8e8',
          titleFont: { family: 'Orbitron', size: 11 },
          bodyFont:  { family: 'Share Tech Mono', size: 12 },
        },
      },
      scales: {
        x: {
          ticks: { color: '#5a7080', font: { family: 'Orbitron', size: 10 } },
          grid:  { color: 'rgba(26, 37, 64, 0.8)' },
        },
        y: {
          ticks: { color: '#5a7080', font: { family: 'Share Tech Mono', size: 10 } },
          grid:  { color: 'rgba(26, 37, 64, 0.8)' },
        },
      },
    },
  });

  // Show modal
  $compareModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/** Close the comparison modal. */
function closeModal() {
  $compareModal.classList.add('hidden');
  document.body.style.overflow = '';
}

/* ============================================================
   8. Event Listeners
   ============================================================ */

// ── Algorithm selector buttons
$algoButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    $algoButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedAlgo = btn.dataset.algo;

    // Show direction picker only for SCAN and LOOK
    const needsDir = ['SCAN', 'LOOK'].includes(state.selectedAlgo);
    $directionGroup.style.display = needsDir ? 'flex' : 'none';
    $directionGroup.style.flexDirection = 'column';
  });
});

// ── Direction toggle
[$dirLeft, $dirRight].forEach(btn => {
  btn.addEventListener('click', () => {
    [$dirLeft, $dirRight].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.direction = btn.dataset.dir;
  });
});

// ── Random queue generator
$randomBtn.addEventListener('click', () => {
  const q = randomQueue(Math.floor(Math.random() * 5) + 6); // 6–10 items
  $diskQueue.value = q.join(', ');
  showError($queueError, false);
});

// ── Live validation on input change
$diskQueue.addEventListener('input', () => {
  const { valid } = parseQueue();
  showError($queueError, !valid && $diskQueue.value.trim() !== '');
});

$headPosition.addEventListener('input', () => {
  const { valid } = parseHead();
  showError($headError, !valid && $headPosition.value !== '');
});

// ── Run Simulation
$runBtn.addEventListener('click', () => {
  if (!validateAll()) return;

  const { queue } = parseQueue();
  const { head  } = parseHead();
  const algo       = state.selectedAlgo;
  const dir        = state.direction;

  const result = runAlgorithm(algo, queue, head, dir);
  state.lastResult = { algo, ...result };

  showResults(algo, result.order, result.seekTime);
});

// ── Compare All
$compareBtn.addEventListener('click', () => {
  if (!validateAll()) return;

  const { queue } = parseQueue();
  const { head  } = parseHead();

  showComparison(queue, head, state.direction);
});

// ── Reset
$resetBtn.addEventListener('click', () => {
  $diskQueue.value   = '';
  $headPosition.value = '';
  showError($queueError, false);
  showError($headError,  false);

  // Reset algorithm selection to FCFS
  $algoButtons.forEach(b => b.classList.remove('active'));
  document.querySelector('[data-algo="FCFS"]').classList.add('active');
  state.selectedAlgo = 'FCFS';
  $directionGroup.style.display = 'none';

  // Hide results, show placeholder
  $resultsContent.classList.add('hidden');
  $placeholder.classList.remove('hidden');

  // Clear canvas
  const ctx = $diskCanvas.getContext('2d');
  ctx.clearRect(0, 0, $diskCanvas.width, $diskCanvas.height);

  state.lastResult = null;
});

// ── Modal close (button + backdrop click + Escape key)
$modalClose.addEventListener('click', closeModal);

$compareModal.addEventListener('click', e => {
  if (e.target === $compareModal) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$compareModal.classList.contains('hidden')) {
    closeModal();
  }
});

// ── Redraw canvas on window resize
window.addEventListener('resize', () => {
  if (state.lastResult && !$resultsContent.classList.contains('hidden')) {
    requestAnimationFrame(() => drawCanvas(state.lastResult.order));
  }
});

/* ============================================================
   Init: pre-fill example values for first-time visitors
   ============================================================ */
(function init() {
  $diskQueue.value    = '98, 183, 37, 122, 14, 124, 65, 67';
  $headPosition.value = '53';
})();
