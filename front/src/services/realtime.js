import { HubConnectionBuilder, LogLevel, HttpTransportType } from "@microsoft/signalr";

const getApiBase = () => {
  const fromEnv = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ? import.meta.env.VITE_API_BASE_URL : "https://localhost:7036/api";
  // Remove trailing /api to build hub URL
  return fromEnv.replace(/\/api\/?$/, "");
};

const HUB_PATH = "/orderUpdatesHub";

export const createOrderUpdatesConnection = () => {
  const base = getApiBase();
  const hubUrl = `${base}${HUB_PATH}`;
  console.info("SignalR hub URL:", hubUrl);

  const connection = new HubConnectionBuilder()
    .withUrl(hubUrl)
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();

  return connection;
};

export const subscribeToOrderUpdates = async ({ onOrderCreated, onOrderStatusChanged } = {}) => {
  const primaryBase = getApiBase();
  const candidates = [
    `${primaryBase}${HUB_PATH}`,
    // Protocol swap fallback (handle self-signed https issues)
    `${primaryBase.replace(/^https:\/\//, 'http://')}${HUB_PATH}`,
  ];

  // Add common local dev fallbacks if base is localhost
  if (/^https?:\/\/localhost/.test(primaryBase)) {
    candidates.push(
      // IIS Express typical SSL port
      `https://localhost:44345${HUB_PATH}`,
      // Kestrel defaults from launchSettings
      `https://localhost:7036${HUB_PATH}`,
      `http://localhost:5219${HUB_PATH}`
    );
  }

  // Iterate candidates and try to connect using multiple transports
  for (const hubUrl of candidates) {
    try {
      console.info("Trying SignalR WebSockets:", hubUrl);
      const wsConnection = new HubConnectionBuilder()
        .withUrl(hubUrl, { skipNegotiation: true, transport: HttpTransportType.WebSockets })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

      if (onOrderCreated) wsConnection.on("OrderCreated", onOrderCreated);
      if (onOrderStatusChanged) wsConnection.on("OrderStatusChanged", onOrderStatusChanged);

      wsConnection.onreconnecting(err => console.warn("SignalR reconnecting...", err));
      wsConnection.onreconnected(id => console.info("SignalR reconnected", id));
      wsConnection.onclose(err => console.warn("SignalR connection closed", err));

      await wsConnection.start();
      console.info("SignalR connected via WebSockets:", hubUrl);
      return () => wsConnection.stop();
    } catch (e1) {
      console.warn("WebSockets failed:", hubUrl, e1);
    }

    try {
      console.info("Trying SignalR negotiation:", hubUrl);
      const connection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

      if (onOrderCreated) connection.on("OrderCreated", onOrderCreated);
      if (onOrderStatusChanged) connection.on("OrderStatusChanged", onOrderStatusChanged);

      connection.onreconnecting(err => console.warn("SignalR reconnecting...", err));
      connection.onreconnected(id => console.info("SignalR reconnected", id));
      connection.onclose(err => console.warn("SignalR connection closed", err));

      await connection.start();
      console.info("SignalR connected (negotiation):", hubUrl);
      return () => connection.stop();
    } catch (e2) {
      console.warn("Negotiation failed:", hubUrl, e2);
    }

    try {
      console.info("Trying SignalR LongPolling:", hubUrl);
      const lpConnection = new HubConnectionBuilder()
        .withUrl(hubUrl, { transport: HttpTransportType.LongPolling })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

      if (onOrderCreated) lpConnection.on("OrderCreated", onOrderCreated);
      if (onOrderStatusChanged) lpConnection.on("OrderStatusChanged", onOrderStatusChanged);

      await lpConnection.start();
      console.info("SignalR connected via LongPolling:", hubUrl);
      return () => lpConnection.stop();
    } catch (e3) {
      console.warn("LongPolling failed:", hubUrl, e3);
    }
  }

  throw new Error("All SignalR connection attempts failed. Check API base URL and CORS/HTTPS.");
};


