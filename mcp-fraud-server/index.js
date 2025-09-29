import { createTransportApp } from "./transport.js";

const app = createTransportApp();

app.listen(4000, () => {
  console.log("Started-Server: MCP Fraud Detection Server running at http://localhost:4000/mcp");
});
