# TODO: Make the Distributed API Orchestration Platform Proper

## Information Gathered
- **backend/server.js**: Basic Express server with a single POST endpoint `/api/workflows/execute` that logs the received workflow JSON and responds with a static message. No actual execution of API steps.
- **backend/package.json**: Minimal setup with Express dependency.
- **frontend/index.html**: Simple HTML page with a textarea for workflow JSON, a button to trigger execution, and a Chart.js canvas for a static doughnut chart.
- **frontend/script.js**: Contains a function to POST the workflow JSON to the backend, shows an alert, and initializes a static chart with hardcoded data.
- **frontend/style.css**: Basic CSS for styling the page.
- The platform currently lacks actual workflow execution, error handling, dynamic UI updates, and proper orchestration of API calls.

## Plan
- **Backend Improvements**:
  - Update `server.js` to parse the workflow JSON, execute API steps sequentially, collect results, and return a detailed response including success/failure counts.
  - Add error handling for invalid JSON, failed API calls, and timeouts.
- **Frontend Improvements**:
  - Update `script.js` to handle the backend response, update the chart dynamically with execution results, display logs or status messages.
  - Enhance `index.html` to include areas for displaying execution results and logs.
  - Improve `style.css` for better layout and responsiveness.
- **Overall**:
  - Ensure the workflow execution is asynchronous and handles multiple steps.
  - Add validation for workflow JSON structure.

## Dependent Files to be Edited
- `backend/server.js`: Core logic for workflow execution.
- `frontend/script.js`: Client-side logic for triggering and displaying results.
- `frontend/index.html`: UI structure for results display.
- `frontend/style.css`: Styling improvements.

## Followup Steps
- Install dependencies if needed (e.g., run `npm install` in backend).
- Test the application by starting the backend server and opening the frontend in a browser.
- Verify workflow execution with sample data.
- Handle any runtime errors or improvements based on testing.

## Progress
- [x] Updated backend/server.js to execute workflows sequentially and return results.
- [x] Enhanced frontend/index.html to include a results display area.
- [x] Improved frontend/style.css for better layout and styling.
- [x] Updated frontend/script.js to handle responses, display results, and update chart dynamically.
- [x] Added node-fetch dependency to backend/package.json and imported in server.js.
- [x] Installed backend dependencies.
- [x] Started the backend server.

## Pending Tasks
- [x] Integrate Database (MySQL)
  - [x] Add mysql2 dependency to package.json
  - [x] Set up database connection in server.js
  - [x] Create tables for workflows, executions, results
  - [x] Modify workflow execution to store and retrieve from DB
- [x] Add Async Task Queue (Redis / BullMQ)
  - [x] Install redis and bull dependencies
  - [x] Set up BullMQ queue in server.js
  - [x] Modify /api/workflows/execute to add jobs to queue
  - [x] Implement job processor for executing workflows asynchronously
- [x] Implement Retry Manager
  - [x] Add retry logic for failed API calls in job processor
  - [x] Configure retry attempts and backoff
- [x] Add Logger & Metrics
  - [x] Install winston for logging
  - [x] Implement logging for workflow executions, errors
  - [x] Add basic metrics collection (e.g., execution counts, success rates)
  - [x] Expose metrics endpoint
- [ ] Update Frontend Dashboard
  - [ ] Add section to display logs and metrics
  - [ ] Implement workflow history view (fetch from DB)
  - [ ] Add features to create/edit workflows
  - [ ] Update script.js to handle new data
- [ ] Test and Validate
  - [ ] Run backend with new components
  - [ ] Test workflow execution with queue, retries, logging
  - [ ] Update frontend to interact with enhanced backend
