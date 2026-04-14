/* ============================================================
   DISK SCHEDULING SIMULATOR — script.js
   
   NOTE: All algorithm logic below is equivalent to the C
   implementation in disk.c. Same formulas, same steps — just
   written in JavaScript so they can run in the browser.
   ============================================================ */

"use strict";

/* ── State ──────────────────────────────────────────────────── */
let lastResults = [];

/* ════════════════════════════════════════════════════════════ */
/*  INPUT PARSING                                              */
/* ════════════════════════════════════════════════════════════ */

/**
 * Reads and validates all inputs from the UI.
 * Returns { diskSize, head, requests } or null on error.
 */
function getInputs() {
  const diskSize  = parseInt(document.getElementById('diskSize').value, 10);
  const head      = parseInt(document.getElementById('headPos').value, 10);
  const rawReqs   = document.getElementById('requests').value;

  /* Parse request queue — accept commas or spaces as delimiters */
  const requests = rawReqs
    .split(/[\s,]+/)
    .filter(s => s.trim() !== '')
    .map(Number);

  /* Validation */
  if (isNaN(diskSize) || diskSize < 2) {
    alert('Disk size must be at least 2.'); return null;
  }
  if (isNaN(head) || head < 0 || head >= diskSize) {
    alert(`Head position must be between 0 and ${diskSize - 1}.`); return null;
  }
  if (requests.length === 0) {
    alert('Please enter at least one disk request.'); return null;
  }
  if (requests.some(r => isNaN(r) || r < 0 || r >= diskSize)) {
    alert(`All requests must be valid cylinder numbers (0 to ${diskSize - 1}).`); return null;
  }

  return { diskSize, head, requests };
}

/* ════════════════════════════════════════════════════════════ */
/*  ALGORITHM 1: FCFS                                          */
/*  Equivalent to fcfs() in disk.c                            */
/*                                                            */
/*  Logic: Service each request exactly in the order given.   */
/*  Seek = sum of |next - current| for each step.             */
/* ════════════════════════════════════════════════════════════ */
function fcfs(requests, head) {
  /*
   * This logic is equivalent to the C implementation:
   *   for (int i = 0; i < n; i++) {
   *       total_seek += abs(requests[i] - head);
   *       head = requests[i];
   *   }
   */
  const sequence  = [head];
  let   totalSeek = 0;
  let   current   = head;

  for (const req of requests) {
    totalSeek += Math.abs(req - current);
    current    = req;
    sequence.push(current);
  }

  return { name: 'FCFS', fullName: 'First Come First Serve', sequence, totalSeek };
}

/* ════════════════════════════════════════════════════════════ */
/*  ALGORITHM 2: SSTF                                          */
/*  Equivalent to sstf() in disk.c                            */
/*                                                            */
/*  Logic: At each step, find the closest unvisited request   */
/*  and service it. Uses a boolean visited[] array.           */
/* ════════════════════════════════════════════════════════════ */
function sstf(requests, head) {
  /*
   * This logic is equivalent to the C implementation:
   *   int min_idx = find_min_index(requests, visited, n, head);
   *   total_seek += abs(requests[min_idx] - head);
   *   head = requests[min_idx];
   *   visited[min_idx] = 1;
   */
  const sequence  = [head];
  let   totalSeek = 0;
  let   current   = head;
  const visited   = new Array(requests.length).fill(false);

  for (let step = 0; step < requests.length; step++) {
    /* Find index of nearest unvisited cylinder */
    let minDist = Infinity;
    let minIdx  = -1;

    for (let i = 0; i < requests.length; i++) {
      if (!visited[i]) {
        const dist = Math.abs(requests[i] - current);
        if (dist < minDist) { minDist = dist; minIdx = i; }
      }
    }

    visited[minIdx] = true;
    totalSeek      += minDist;
    current         = requests[minIdx];
    sequence.push(current);
  }

  return { name: 'SSTF', fullName: 'Shortest Seek Time First', sequence, totalSeek };
}

/* ════════════════════════════════════════════════════════════ */
/*  ALGORITHM 3: SCAN (Elevator)                               */
/*  Equivalent to scan() in disk.c                            */
/*                                                            */
/*  Logic:                                                    */
/*   1. Sort requests.                                        */
/*   2. Move RIGHT, serve all requests >= head.               */
/*   3. Go to the last cylinder (disk_size - 1).              */
/*   4. Move LEFT, serve remaining requests.                  */
/* ════════════════════════════════════════════════════════════ */
function scan(requests, head, diskSize) {
  /*
   * This logic is equivalent to the C implementation:
   *   bubble_sort(sorted, n);
   *   // Right pass
   *   for (i = split; i < n; i++) { ... }
   *   // Touch end
   *   head = disk_size - 1;
   *   // Left pass
   *   for (i = split - 1; i >= 0; i--) { ... }
   */
  const sequence  = [head];
  let   totalSeek = 0;
  let   current   = head;

  const sorted = [...requests].sort((a, b) => a - b);

  /* Find split point: index of first request >= head */
  let split = 0;
  while (split < sorted.length && sorted[split] < head) split++;

  /* RIGHT pass — service requests >= head */
  for (let i = split; i < sorted.length; i++) {
    totalSeek += Math.abs(sorted[i] - current);
    current    = sorted[i];
    sequence.push(current);
  }

  /* Go to end of disk */
  if (current !== diskSize - 1) {
    totalSeek += Math.abs((diskSize - 1) - current);
    current    = diskSize - 1;
    sequence.push(current);
  }

  /* LEFT pass — service requests < original head */
  for (let i = split - 1; i >= 0; i--) {
    totalSeek += Math.abs(sorted[i] - current);
    current    = sorted[i];
    sequence.push(current);
  }

  return { name: 'SCAN', fullName: 'Elevator Algorithm', sequence, totalSeek };
}

/* ════════════════════════════════════════════════════════════ */
/*  ALGORITHM 4: LOOK                                          */
/*  Equivalent to look() in disk.c                            */
/*                                                            */
/*  Like SCAN but the head does NOT travel to the disk ends.  */
/*  It reverses at the last actual request in each direction. */
/* ════════════════════════════════════════════════════════════ */
function look(requests, head) {
  /*
   * This logic is equivalent to the C implementation:
   *   // Right pass (no end-of-disk stop)
   *   for (i = split; i < n; i++) { ... }
   *   // Left pass (no start-of-disk stop)
   *   for (i = split - 1; i >= 0; i--) { ... }
   */
  const sequence  = [head];
  let   totalSeek = 0;
  let   current   = head;

  const sorted = [...requests].sort((a, b) => a - b);

  let split = 0;
  while (split < sorted.length && sorted[split] < head) split++;

  /* RIGHT pass */
  for (let i = split; i < sorted.length; i++) {
    totalSeek += Math.abs(sorted[i] - current);
    current    = sorted[i];
    sequence.push(current);
  }

  /* LEFT pass — reverse only at last request (not disk end) */
  for (let i = split - 1; i >= 0; i--) {
    totalSeek += Math.abs(sorted[i] - current);
    current    = sorted[i];
    sequence.push(current);
  }

  return { name: 'LOOK', fullName: 'Optimized SCAN', sequence, totalSeek };
}

/* ════════════════════════════════════════════════════════════ */
/*  UI: Run a single algorithm                                 */
/* ════════════════════════════════════════════════════════════ */
function runAlgorithm(algoKey) {
  const inputs = getInputs();
  if (!inputs) return;

  const { diskSize, head, requests } = inputs;

  /* Highlight active button */
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-algo="${algoKey}"]`)?.classList.add('active');

  let result;
  switch (algoKey) {
    case 'fcfs': result = fcfs(requests, head); break;
    case 'sstf': result = sstf(requests, head); break;
    case 'scan': result = scan(requests, head, diskSize); break;
    case 'look': result = look(requests, head); break;
  }

  lastResults = [result];
  displayResults([result], requests);
  drawVisualization([result], diskSize);
}

/* ════════════════════════════════════════════════════════════ */
/*  UI: Run all algorithms and compare                         */
/* ════════════════════════════════════════════════════════════ */
function runAll() {
  const inputs = getInputs();
  if (!inputs) return;

  const { diskSize, head, requests } = inputs;

  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));

  const results = [
    fcfs(requests, head),
    sstf(requests, head),
    scan(requests, head, diskSize),
    look(requests, head),
  ];

  /* Sort by totalSeek ascending to find best */
  const maxSeek = Math.max(...results.map(r => r.totalSeek));

  lastResults = results;
  displayResults(results, requests, maxSeek);
  drawVisualization([results[0]], diskSize); /* Visualize FCFS by default */
}

/* ════════════════════════════════════════════════════════════ */
/*  UI: Render result cards                                     */
/* ════════════════════════════════════════════════════════════ */
function displayResults(results, requests, maxSeek) {
  const panel     = document.getElementById('resultsPanel');
  const container = document.getElementById('resultsContainer');

  if (!maxSeek) maxSeek = results[0].totalSeek || 1;

  container.innerHTML = '';

  for (const r of results) {
    const barWidth = maxSeek > 0
      ? Math.round((r.totalSeek / maxSeek) * 100)
      : 100;

    /* Build sequence HTML */
    const seqHTML = r.sequence
      .map((val, idx) => {
        const cls = idx === 0 ? 'first'
                  : idx === r.sequence.length - 1 ? 'last' : '';
        return `<span class="seq-item ${cls}">${val}</span>
                ${idx < r.sequence.length - 1
                  ? '<span class="seq-arrow">→</span>' : ''}`;
      })
      .join('');

    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-header">
        <span class="result-algo-name">${r.name}</span>
        <span class="result-seek-badge">
          Total Seek: <strong>${r.totalSeek}</strong> cylinders
        </span>
      </div>
      <div class="result-label">EXECUTION ORDER (SEEK SEQUENCE)</div>
      <div class="sequence-flow">${seqHTML}</div>

      <div class="seek-bar-container">
        <div class="seek-bar-label">
          <span>${r.fullName}</span>
          <span>${r.totalSeek} / ${maxSeek} cylinders</span>
        </div>
        <div class="seek-bar-track">
          <div class="seek-bar-fill" style="width: 0%"
               data-width="${barWidth}%"></div>
        </div>
      </div>
    `;
    container.appendChild(card);

    /* Animate bar after insertion */
    requestAnimationFrame(() => {
      setTimeout(() => {
        card.querySelector('.seek-bar-fill').style.width =
          card.querySelector('.seek-bar-fill').dataset.width;
      }, 50);
    });
  }

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ════════════════════════════════════════════════════════════ */
/*  VISUALIZATION: Draw seek path on canvas                    */
/* ════════════════════════════════════════════════════════════ */
function drawVisualization(results, diskSize) {
  const vizPanel = document.getElementById('vizPanel');
  const canvas   = document.getElementById('seekCanvas');
  const ctx      = canvas.getContext('2d');

  /* Canvas dimensions */
  const W     = 900;
  const TRACK = 56;  /* Vertical space per step */
  const PAD_L = 60;
  const PAD_R = 30;
  const PAD_T = 30;

  const result  = results[0];
  const seq     = result.sequence;
  const H       = PAD_T * 2 + seq.length * TRACK;

  canvas.width  = W;
  canvas.height = H;
  canvas.style.height = H + 'px';

  /* ── Clear ── */
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0e1318';
  ctx.fillRect(0, 0, W, H);

  const drawW = W - PAD_L - PAD_R;

  /* ── Grid lines ── */
  ctx.strokeStyle = '#1e2d3d';
  ctx.lineWidth   = 1;
  for (let cyl = 0; cyl <= diskSize; cyl += Math.ceil(diskSize / 10)) {
    const x = PAD_L + (cyl / diskSize) * drawW;
    ctx.beginPath();
    ctx.moveTo(x, PAD_T);
    ctx.lineTo(x, H - PAD_T);
    ctx.stroke();

    ctx.fillStyle = '#3a5570';
    ctx.font      = '9px Share Tech Mono';
    ctx.textAlign = 'center';
    ctx.fillText(cyl, x, H - 8);
  }

  /* ── Axis label ── */
  ctx.fillStyle = '#5a7a94';
  ctx.font      = '10px Share Tech Mono';
  ctx.textAlign = 'center';
  ctx.fillText('CYLINDER NUMBER →', W / 2, H - 2);

  /* ── Colors for dots ── */
  const colors = {
    first: '#00b4ff',
    mid:   '#00e5a0',
    last:  '#ff6b35',
  };

  /* ── Draw path ── */
  for (let i = 0; i < seq.length - 1; i++) {
    const x1 = PAD_L + (seq[i]     / diskSize) * drawW;
    const y1 = PAD_T + i       * TRACK + TRACK / 2;
    const x2 = PAD_L + (seq[i + 1] / diskSize) * drawW;
    const y2 = PAD_T + (i + 1) * TRACK + TRACK / 2;

    ctx.strokeStyle = '#00e5a0';
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  /* ── Draw dots + labels ── */
  for (let i = 0; i < seq.length; i++) {
    const x = PAD_L + (seq[i] / diskSize) * drawW;
    const y = PAD_T + i * TRACK + TRACK / 2;

    const color = i === 0 ? colors.first
                : i === seq.length - 1 ? colors.last
                : colors.mid;

    /* Glow circle */
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 12);
    grad.addColorStop(0, color + '44');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    /* Solid dot */
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    /* Horizontal tick */
    ctx.strokeStyle = color + '33';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, y);
    ctx.lineTo(x, y);
    ctx.stroke();

    /* Step label */
    ctx.fillStyle = '#5a7a94';
    ctx.font      = '9px Share Tech Mono';
    ctx.textAlign = 'right';
    ctx.fillText(`#${i}`, PAD_L - 6, y + 4);

    /* Cylinder label */
    ctx.fillStyle = color;
    ctx.font      = 'bold 11px Share Tech Mono';
    ctx.textAlign = 'center';
    ctx.fillText(seq[i], x, y - 10);
  }

  vizPanel.style.display = 'block';
}