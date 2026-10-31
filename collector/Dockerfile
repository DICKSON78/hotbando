# HotBando Router Collector — deployed on customer LAN (near MikroTik router)
# Connects outbound to the HotBando cloud via reverse WebSocket tunnel.
FROM node:18-alpine

WORKDIR /app

# node-routeros needs build tools for some native deps; keep lean.
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --production

COPY server.js ./

# Health: collector reports itself to cloud; this port is local-only.
EXPOSE 3001

ENV CLOUD_WS_URL="wss://hotbandowifi.online/api/collector/ws"
ENV COLLECTOR_KEY=""
ENV COLLECTOR_NAME="site-collector"

CMD ["node", "server.js"]
