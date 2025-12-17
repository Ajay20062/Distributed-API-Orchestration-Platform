let chart;

async function executeWorkflow() {
  const input = document.getElementById("workflowInput").value;
  const log = document.getElementById("logOutput");

  try {
    const workflow = JSON.parse(input);

    const res = await fetch("http://localhost:5000/api/workflows/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow)
    });

    const data = await res.json();

    log.textContent = JSON.stringify(data.results, null, 2);
    updateChart(data.summary);
  } catch (err) {
    log.textContent = "Error: " + err.message;
  }
}

function updateChart(summary) {
  const ctx = document.getElementById("resultChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Success", "Failed"],
      datasets: [
        {
          data: [summary.success, summary.failed]
        }
      ]
    }
  });
}
