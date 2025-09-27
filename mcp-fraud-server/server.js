import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tools } from "./tools/index.js";

export function createMcpServer() {
  const server = new McpServer({
    name: "fraud-detection-server",
    version: "1.0.0",
  });

  tools.forEach(({ name, config, execute }) => {
    server.registerTool(name, config, execute);
  });

  return server;
}
