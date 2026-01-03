import { HubConnectionBuilder, LogLevel, HttpTransportType } from "@microsoft/signalr";
import { STORAGE_KEYS } from "../constants";

const getApiBase = () => {
  const fromEnv = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ? import.meta.env.VITE_API_BASE_URL : "https://psbrand-backend-production.up.railway.app/api";
  // Remove trailing /api to build hub URL
  return fromEnv.replace(/\/api\/?$/, "");
};

// Helper to get auth token (same as api.js)
const getAuthToken = () => {
  try {
    const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
    if (sessionToken) return sessionToken;
    const localToken = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
    return localToken || null;
  } catch {
    return null;
  }
};

const HUB_PATH = "/orderUpdatesHub";

export const createOrderUpdatesConnection = () => {
  const base = getApiBase();
  const hubUrl = `${base}${HUB_PATH}`;

  const connection = new HubConnectionBuilder()
    .withUrl(hubUrl)
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();

  return connection;
};

export const subscribeToOrderUpdates = async ({ 
  onOrderCreated, 
  onOrderStatusChanged, 
  onDeliveryStatusChanged,
  onShipmentStatusUpdated,
  onShipmentNoteAdded,
  onNewNotification,
  onOrderContactedStatusChanged,
  onOrderUpdated,
  onNewMessage
} = {}) => {
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

  // Helper function to register all event handlers
  const registerHandlers = (connection) => {
    if (onOrderCreated) {
      connection.on("OrderCreated", (data) => {
        onOrderCreated(data);
      });
    }
    if (onOrderStatusChanged) {
      connection.on("OrderStatusChanged", (data) => {
        onOrderStatusChanged(data);
      });
    }
    if (onDeliveryStatusChanged) {
      connection.on("DeliveryStatusChanged", (orderId, deliveryStatus) => {
        onDeliveryStatusChanged(orderId, deliveryStatus);
      });
    }
    // Add handlers for shipment status updates from webhook
    if (onShipmentStatusUpdated) {
      connection.on("ShipmentStatusUpdated", (shipmentData) => {
        onShipmentStatusUpdated(shipmentData);
      });
    }
    if (onShipmentNoteAdded) {
      connection.on("ShipmentNoteAdded", (shipmentData) => {
        onShipmentNoteAdded(shipmentData);
      });
    }
    // Add handler for new notifications
    if (onNewNotification) {
      connection.on("NewNotification", (notification) => {
        onNewNotification(notification);
      });
    }
    // Add handler for contacted status changes
    if (onOrderContactedStatusChanged) {
      connection.on("OrderContactedStatusChanged", (orderId, isContacted) => {
        onOrderContactedStatusChanged(orderId, isContacted);
      });
    }
    // Add handler for general order updates
    if (onOrderUpdated) {
      connection.on("OrderUpdated", (orderData) => {
        onOrderUpdated(orderData);
      });
    }
    
    // Only log connection errors, not normal reconnections
    connection.onclose((error) => {
      if (error) {
        console.error("SignalR - Connection closed with error:", error);
      }
    });
  };

  // Get auth token for SignalR connection
  const authToken = getAuthToken();
  
  // Try WebSockets FIRST (most efficient, no polling)
  for (const hubUrl of candidates) {
    try {
      const wsConnection = new HubConnectionBuilder()
        .withUrl(hubUrl, { 
          skipNegotiation: true, 
          transport: HttpTransportType.WebSockets,
          accessTokenFactory: () => authToken || ""
        })
        .withAutomaticReconnect({
          // Optimize reconnection to avoid unnecessary polling and spam
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 0s, 2s, 10s, 30s, 60s (max)
            if (retryContext.previousRetryCount === 0) return 0;
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 10000;
            if (retryContext.previousRetryCount === 3) return 30000;
            return 60000; // Max 60 seconds between retries
          }
        })
        .configureLogging(LogLevel.Warning) // Reduce logging in production
        .build();

      registerHandlers(wsConnection);
      
      // زيادة وقت مهلة الـ client لتجنب انقطاع الاتصال
      // يجب أن يكون أكبر من ClientTimeoutInterval في السيرفر (120 ثانية)
      wsConnection.serverTimeoutInMilliseconds = 120000; // 120 ثانية

      // Only log errors, not normal reconnections
      wsConnection.onreconnecting(err => {
        // Only log if it's not a normal timeout
        if (err && !err.message?.includes('timeout')) {
          console.warn("SignalR reconnecting due to error:", err);
        }
      });
      wsConnection.onreconnected(() => {
        // Silent reconnection - no need to log
      });
      wsConnection.onclose(err => {
        if (err) {
          console.error("SignalR connection closed with error:", err);
        }
      });

      await wsConnection.start();
      
      // Only log initial connection, not reconnections
      if (wsConnection.state === "Connected") {
        console.info("✅ SignalR connected via WebSockets");
      }
      
      return () => {
        wsConnection.stop();
      };
    } catch (e1) {
      // Silent fail, try next candidate
    }
  }

  // Fallback to negotiation (will try WebSockets first, then Server-Sent Events, then LongPolling)
  for (const hubUrl of candidates) {
    try {
      const connection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => authToken || "",
          // Prefer WebSockets, then Server-Sent Events, avoid LongPolling if possible
          transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents
        })
        .withAutomaticReconnect({
          // Optimize reconnection to avoid spam
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount === 0) return 0;
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 10000;
            if (retryContext.previousRetryCount === 3) return 30000;
            return 60000; // Max 60 seconds between retries
          }
        })
        .configureLogging(LogLevel.Warning)
        .build();

      registerHandlers(connection);
      
      // زيادة وقت مهلة الـ client
      connection.serverTimeoutInMilliseconds = 120000; // 120 ثانية

      // Only log errors, not normal reconnections
      connection.onreconnecting(err => {
        if (err && !err.message?.includes('timeout')) {
          console.warn("SignalR reconnecting due to error:", err);
        }
      });
      connection.onreconnected(() => {
        // Silent reconnection
      });
      connection.onclose(err => {
        if (err) {
          console.error("SignalR connection closed with error:", err);
        }
      });

      await connection.start();
      const transportName = connection.connection?.transport?.transport?.name || "unknown";
      
      // Only log initial connection
      if (connection.state === "Connected") {
        console.info(`✅ SignalR connected via ${transportName}`);
        
        // Warn if using LongPolling (less efficient)
        if (transportName === "LongPolling") {
          console.warn("⚠️ Using LongPolling - this will cause XHR requests every ~700ms. Check WebSocket support on server.");
        }
      }
      
      return () => {
        connection.stop();
      };
    } catch (e2) {
      // Silent fail, try next candidate
    }
  }

  // Last resort: LongPolling (but warn user)
  for (const hubUrl of candidates) {
    try {
      const lpConnection = new HubConnectionBuilder()
        .withUrl(hubUrl, { 
          transport: HttpTransportType.LongPolling,
          accessTokenFactory: () => authToken || ""
        })
        .withAutomaticReconnect({
          // Optimize reconnection for LongPolling too
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount === 0) return 0;
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 10000;
            if (retryContext.previousRetryCount === 3) return 30000;
            return 60000;
          }
        })
        .configureLogging(LogLevel.Warning)
        .build();

      registerHandlers(lpConnection);
      
      // زيادة وقت مهلة الـ client
      lpConnection.serverTimeoutInMilliseconds = 120000; // 120 ثانية

      await lpConnection.start();
      if (lpConnection.state === "Connected") {
        console.warn("⚠️ SignalR connected via LongPolling (XHR polling active)");
      }
      return () => lpConnection.stop();
    } catch (e3) {
      // Silent fail, try next candidate
    }
  }

  throw new Error("All SignalR connection attempts failed. Check API base URL and CORS/HTTPS.");
};

// Helper function to create a temporary connection and invoke a method
const invokeSignalRMethod = async (methodName, ...args) => {
  const primaryBase = getApiBase();
  const candidates = [
    `${primaryBase}${HUB_PATH}`,
    `${primaryBase.replace(/^https:\/\//, 'http://')}${HUB_PATH}`,
  ];

  // Add common local dev fallbacks if base is localhost
  if (/^https?:\/\/localhost/.test(primaryBase)) {
    candidates.push(
      `https://localhost:44345${HUB_PATH}`,
      `https://localhost:7036${HUB_PATH}`,
      `http://localhost:5219${HUB_PATH}`
    );
  }

  // Try to connect and invoke method
  for (const hubUrl of candidates) {
    let connection = null;
    try {
      // Try WebSockets first
      try {
        connection = new HubConnectionBuilder()
          .withUrl(hubUrl, { skipNegotiation: true, transport: HttpTransportType.WebSockets })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Warning)
          .build();
        await connection.start();
      } catch (wsError) {
        // Fallback to negotiation
        connection = new HubConnectionBuilder()
          .withUrl(hubUrl)
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Warning)
          .build();
        await connection.start();
      }

      // Invoke the method
      const result = await connection.invoke(methodName, ...args);
      
      // Clean up connection
      await connection.stop();
      
      return result;
    } catch (error) {
      if (connection) {
        try {
          await connection.stop();
        } catch (stopError) {
          // Ignore stop errors
        }
      }
      
      // Try LongPolling as last resort for this candidate
      try {
        const lpConnection = new HubConnectionBuilder()
          .withUrl(hubUrl, { transport: HttpTransportType.LongPolling })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Warning)
          .build();
        
        await lpConnection.start();
        const result = await lpConnection.invoke(methodName, ...args);
        await lpConnection.stop();
        return result;
      } catch (lpError) {
        // Continue to next candidate
        continue;
      }
    }
  }

  throw new Error(`Failed to invoke ${methodName} via SignalR. All connection attempts failed.`);
};

// Get delivery status via SignalR - DEPRECATED: Now using REST API instead
// Keeping this for reference but not exporting it
// export const getDeliveryStatus = async (orderId) => {
//   return await invokeSignalRMethod("GetDeliveryStatus", orderId);
// };


