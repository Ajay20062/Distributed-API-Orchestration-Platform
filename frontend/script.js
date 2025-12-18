let chart;
let pollingInterval;
let ws;

// WebSocket connection
function connectWebSocket() {
  ws = new WebSocket('ws://localhost:5000');

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    // Reconnect after 5 seconds
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function handleWebSocketMessage(data) {
  if (data.type === 'workflow_completed' || data.type === 'workflow_failed') {
    // Update results if this execution is currently being displayed
    const resultsDiv = document.getElementById("results");
    if (resultsDiv.innerHTML.includes(data.executionId)) {
      if (data.type === 'workflow_completed') {
        displayExecutionResults({
          id: data.executionId,
          workflow_name: 'Workflow',
          status: data.status,
          results: JSON.stringify(data.results),
          completed_at: new Date().toISOString()
        });
      } else {
        resultsDiv.innerHTML = `<p>Execution failed: ${data.error}</p>`;
      }
      clearInterval(pollingInterval);
    }
    // Update metrics and history
    updateMetrics(data.metrics);
    loadHistory();
  }
}

function updateMetrics(metrics) {
  document.getElementById("metrics").innerHTML = `
    <h3>Metrics</h3>
    <p>Total Executions: ${metrics.totalExecutions}</p>
    <p>Successful: ${metrics.successfulExecutions}</p>
    <p>Failed: ${metrics.failedExecutions}</p>
  `;
}

async function triggerWorkflow() {
  const textarea = document.getElementById("workflowJson");
  const resultsDiv = document.getElementById("results");
  const runBtn = document.getElementById("runBtn");
  const loading = document.getElementById("loading");

  try {
    const workflow = JSON.parse(textarea.value);
    const token = localStorage.getItem('token');

    runBtn.disabled = true;
    loading.classList.remove('hidden');

    const res = await fetch("http://localhost:5000/api/workflows/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(workflow)
    });

    const data = await res.json();

    if (res.ok) {
      resultsDiv.innerHTML = `<p>Workflow queued with ID: ${data.executionId}</p>`;
      pollExecutionStatus(data.executionId);
    } else {
      resultsDiv.innerHTML = `<p>Error: ${data.error}</p>`;
    }
  } catch (err) {
    resultsDiv.innerHTML = `<p>Error: ${err.message}</p>`;
  } finally {
    runBtn.disabled = false;
    loading.classList.add('hidden');
  }
}

async function pollExecutionStatus(executionId) {
  const resultsDiv = document.getElementById("results");
  const token = localStorage.getItem('token');

  pollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/workflows/execution/${executionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        if (data.status === 'completed') {
          clearInterval(pollingInterval);
          displayExecutionResults(data);
        } else if (data.status === 'failed') {
          clearInterval(pollingInterval);
          resultsDiv.innerHTML = `<p>Execution failed: ${data.error}</p>`;
        } else {
          resultsDiv.innerHTML = `<p>Status: ${data.status}</p>`;
        }
      } else {
        clearInterval(pollingInterval);
        resultsDiv.innerHTML = `<p>Error fetching status: ${data.error}</p>`;
      }
    } catch (err) {
      clearInterval(pollingInterval);
      resultsDiv.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  }, 2000);
}

function displayExecutionResults(execution) {
  const resultsDiv = document.getElementById("results");
  const results = JSON.parse(execution.results);
  const summary = results.summary;

  resultsDiv.innerHTML = `
    <h3>Execution Results</h3>
    <p><strong>Workflow:</strong> ${execution.workflow_name}</p>
    <p><strong>Status:</strong> ${execution.status}</p>
    <p><strong>Completed At:</strong> ${execution.completed_at}</p>
    <h4>Summary</h4>
    <p>Successful Steps: ${summary.success}</p>
    <p>Failed Steps: ${summary.failed}</p>
    <h4>Step Details</h4>
    <pre>${JSON.stringify(results.stepResults, null, 2)}</pre>
  `;

  updateChart(summary);
}

function updateChart(summary) {
  const ctx = document.getElementById("chart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Success", "Failed"],
      datasets: [{
        data: [summary.success, summary.failed],
        backgroundColor: ['#4CAF50', '#F44336']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

async function loadMetrics() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch("http://localhost:5000/api/metrics", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const metrics = await res.json();
    document.getElementById("metrics").innerHTML = `
      <h3>Metrics</h3>
      <p>Total Executions: ${metrics.totalExecutions}</p>
      <p>Successful: ${metrics.successfulExecutions}</p>
      <p>Failed: ${metrics.failedExecutions}</p>
    `;
  } catch (err) {
    document.getElementById("metrics").innerHTML = `<p>Error loading metrics: ${err.message}</p>`;
  }
}

async function loadHistory() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch("http://localhost:5000/api/workflows/history", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const history = await res.json();
    const historyDiv = document.getElementById("history");
    historyDiv.innerHTML = `<h3>Workflow History</h3>`;
    if (history.length === 0) {
      historyDiv.innerHTML += `<p>No executions yet.</p>`;
    } else {
      history.forEach(exec => {
        historyDiv.innerHTML += `
          <div class="history-item">
            <p><strong>ID:</strong> ${exec.id}</p>
            <p><strong>Workflow:</strong> ${exec.workflow_name}</p>
            <p><strong>Status:</strong> ${exec.status}</p>
            <p><strong>Completed:</strong> ${exec.completed_at || 'N/A'}</p>
          </div>
        `;
      });
    }
  } catch (err) {
    document.getElementById("history").innerHTML = `<p>Error loading history: ${err.message}</p>`;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  connectWebSocket();
  loadMetrics();
  loadHistory();
});
