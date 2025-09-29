# Agent AI - Fraud Detection

## Overview

This Kong plugin integrates with any **MCP server**. It accepts natural language (NL) input, translates it into structured queries using **LLM-based agents**, and invokes the MCP server through a client. The plugin then processes the server response and makes it available for downstream consumption or delivery to recipients.

It exposes multiple tools over **Streamable HTTP transport**, which can be consumed by MCP-compatible clients and inspectors.

When applied to a **Kong service or route**, if fraud is detected in the request, the request will not go upstream — instead, it is blocked and reversed at the route level.

Currently, the plugin supports-

* **Fraud MCP Server**
* **Gmail MCP Server** (for reporting via email)

This enables developers to easily handle fraud detection and reporting requirements. The plugin has the intelligence to automatically generate queries from natural language prompts and deliver results via email, significantly reducing manual effort.

---

## Tested in Kong Release

* Kong Enterprise **3.11**



---

## Plugin Installation

### 1. Copy Plugin File

```bash
git clone https://github.com/AkashAcharya03/Fraud-Detection-Plugin.git
cd Plugin
cp agentic-ai-fraud-detection.py /usr/local/kong/python-plugins
```

### 2. Copy Requirements File

```bash
cp requirements.txt /usr/local/kong/python-plugins
```

### 3. Setup Kong PDK

```bash
git clone https://github.com/Kong/kong-python-pdk.git
cp kong-python-pdk /usr/local/src/
```

### 4. Add OpenAI API Key (.env)

```bash
vi /usr/local/kong/python-plugins/.env

OPENAI_API_KEY="your_open_api_key_here"
```

### 5. Update Kong Configuration

```bash
plugins = bundled,agentic-ai-fraud-detection
custom_plugins_enabled = on
pluginserver_names = agentic-ai-fraud-detection
pluginserver_agentic_ai_fraud_detection_socket = /usr/local/kong/python_pluginserver.sock
pluginserver_agentic_ai_fraud_detection_start_cmd = python3 /usr/local/src/kong-python-pdk/kong-pluginserver.py -d /usr/local/kong/python-plugins
pluginserver_agentic_ai_fraud_detection_query_cmd = python3 /usr/local/src/kong-python-pdk/kong-pluginserver.py -d /usr/local/kong/python-plugins --dump-all-plugins
```

### 6. Install Dependencies

```bash
dnf install python3.11
alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 10
alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 20
alternatives --config python3
python3 --version
python3 -m pip --version
```

### 7. Install Plugin Dependencies

```bash
python3 -m pip install -r /usr/local/kong/python-plugins/requirements.txt
```

### 8. Restart Kong

```bash
kong restart
```

---

## Configuration Reference

### Enable the Plugin on a Consumer

```bash
curl -i -X POST http://localhost:8001/plugins --data "name=agentic-ai-fraud-detection" --data "config.instructions=You are a fraud detection assistant with access to the tools. For each request: 1. Decide which tool(s) to use. 2. Generate valid input JSON and run them via the MCP server. 3. Always return the final response strictly in this JSON format: { \"fraud_detected\": true/false, \"reason\": \"Short reason string\", \"summary\": \"Detailed fraud analysis summary\" } 4. Remember to send an email alert if fraud_detected is true." --data "config.message=Check for the fraud behaviour from the payload given and send the response to <mail-id>" --data "config.mcp_servers=Fraud MCP Server,Gmail MCP Server" --data "config.urls=http://host.docker.internal:4000/mcp,http://host.docker.internal:30000/mcp" --data "config.authorization=Bearer <access-token>"
```

| Parameter             | Type   | Description                                 |
| --------------------- | ------ | ------------------------------------------- |
| `name`                | string | Plugin name (`agentic-ai-fraud-detection`).       |
| `config.instructions` | string | System prompt for the Agent.                |
| `config.message`      | string | Natural language request / reporting query. |
| `config.mcp_servers`  | string | Name of the MCP Servers.                     |
| `config.urls`         | string | URL of the MCP Servers.                      |
| `config.authorization`         | string | Authorization token for Gmail MCP Server.                      |

---

## Fraud MCP Server Installation

Clone the repo:

```bash
cd Fraud-Detection-Plugin/mcp-fraud-server
npm install
```

Run the server:

```bash
node index.js
```

Expected output:

```
Started-Server: MCP Fraud Detection Server running at http://localhost:4000/mcp
```

---

## Gmail MCP Integration (Optional)

For sending fraud alerts via Gmail:

```bash
npx -y @gongrzhe/server-gmail-mcp --transport http
```


Expected output:

```
Stateless Gmail MCP Server listening on port 30000
```

Authenticate:

**Note:** Requires OAuth setup in Google Cloud Console.
```bash
npx @gongrzhe/server-gmail-autoauth-mcp auth
```

This generates OAuth credentials. Use the access token in your plugin headers:

```
Authorization: Bearer <access_token>
```

---
## Flowchart

<img width="1011" height="566" alt="image" src="https://github.com/user-attachments/assets/13f5d80e-b24a-49bf-8ddc-6ff2dc6b9469" />

---

## Tools

* ####  IP Velocity Check: Detects bursts of requests from the same IP.

```json
{ "ip": "192.168.1.10" }
```

* #### Geo Device Check: Flags or blocks devices logging in from multiple countries or risky geographies.

```json
{ "deviceId": "D123", "ip": "10.0.0.1", "country": "FR" }
```


* #### User Behavior Check: Detects repeated failed login attempts or multiple password attempts for the same user.

```json
{
  "userId": "U123",
  "passwordAttempt": "pass123",
  "successfulLogin": false}
```


* #### Session Anomaly Check: Detects when the same session ID is used from multiple IPs (possible hijacking).

```json
{ "sessionId": "S456", "ip": "203.0.113.42" }
```


* #### Transaction Amount Analyzer: Flags unusually large or inconsistent transaction amounts compared to history.

```json
{ "userId": "U123", "amount": 5000, "averageAmount": 200, "currency": "USD" }
```

---

## Contributors

* **Developed By:** [AshalP@verifone.com](mailto:AshalP@verifone.com), [AkashA@verifone.com](mailto:AkashA@verifone.com)
* **Designed By:** [SatyajitS3@verifone.com](mailto:SatyajitS3@verifone.com), [Prema.Namasivayam@verifone.com](mailto:Prema.Namasivayam@verifone.com), [RitikB1@verifone.com](mailto:RitikB1@verifone.com)
