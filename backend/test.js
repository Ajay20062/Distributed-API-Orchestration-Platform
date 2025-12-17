const fetch = require('node-fetch');

async function testWorkflow() {
  const workflow = {
    workflowName: "SampleWorkflow",
    steps: [
      { stepId: "step1", url: "https://jsonplaceholder.typicode.com/posts/1", method: "GET" },
      { stepId: "step2", url: "https://jsonplaceholder.typicode.com/users/1", method: "GET" }
    ]
  };

  try {
    const response = await fetch('http://localhost:5000/api/workflows/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testWorkflow();
