function getInputs() {
  const diskSize = parseInt(document.getElementById('diskSize').value);
  const head = parseInt(document.getElementById('headPos').value);
  const reqs = document.getElementById('requests').value
    .split(/[\s,]+/)
    .map(Number);

  return { diskSize, head, reqs };
}

// FCFS
function FCFS(reqs, head) {
  let total = 0;
  let order = [head];

  reqs.forEach(r => {
    total += Math.abs(r - head);
    head = r;
    order.push(r);
  });

  return { total, order };
}

// SSTF
function SSTF(reqs, head) {
  let total = 0;
  let order = [head];
  let visited = new Array(reqs.length).fill(false);

  for (let i = 0; i < reqs.length; i++) {
    let min = Infinity, idx = -1;

    for (let j = 0; j < reqs.length; j++) {
      if (!visited[j]) {
        let dist = Math.abs(head - reqs[j]);
        if (dist < min) {
          min = dist;
          idx = j;
        }
      }
    }

    visited[idx] = true;
    total += min;
    head = reqs[idx];
    order.push(head);
  }

  return { total, order };
}

// SCAN
function SCAN(reqs, head, diskSize) {
  let left = reqs.filter(r => r < head).sort((a,b)=>b-a);
  let right = reqs.filter(r => r >= head).sort((a,b)=>a-b);

  let order = [head];
  let total = 0;

  right.forEach(r => {
    total += Math.abs(head - r);
    head = r;
    order.push(r);
  });

  total += Math.abs(head - (diskSize-1));
  head = diskSize-1;
  order.push(head);

  left.forEach(r => {
    total += Math.abs(head - r);
    head = r;
    order.push(r);
  });

  return { total, order };
}

// LOOK
function LOOK(reqs, head) {
  let left = reqs.filter(r => r < head).sort((a,b)=>b-a);
  let right = reqs.filter(r => r >= head).sort((a,b)=>a-b);

  let order = [head];
  let total = 0;

  right.forEach(r => {
    total += Math.abs(head - r);
    head = r;
    order.push(r);
  });

  left.forEach(r => {
    total += Math.abs(head - r);
    head = r;
    order.push(r);
  });

  return { total, order };
}

// Run Algorithm
function runAlgo(type) {
  let { diskSize, head, reqs } = getInputs();
  let result;

  if (type === 'FCFS') result = FCFS(reqs, head);
  if (type === 'SSTF') result = SSTF(reqs, head);
  if (type === 'SCAN') result = SCAN(reqs, head, diskSize);
  if (type === 'LOOK') result = LOOK(reqs, head);

  document.getElementById('algoName').innerText = type;
  document.getElementById('seekTime').innerText = result.total;
  document.getElementById('order').innerText = result.order.join(" → ");
}