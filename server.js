import express from "express";
import expressWs from "express-ws";

const server = express();
expressWs(server);

const port = 3005;

let clients = {};
let global_id = 0;

let carrots = []; // now stores ALL plants + messages

server.ws("/", (client) => {
  let id = global_id++;

  console.log(`${id} connected`);

  send(client, {
    type: "welcome",
    id,
    carrots,
  });

  clients[id] = client;

  client.on("message", (dataString) => {
    const event = JSON.parse(dataString);

    if (event.type === "plant") {
      const veggie = {
        x: event.x,
        y: event.y,
        src: event.src,
        message: event.message,
        sender: id,
      };

      carrots.push(veggie);

      broadcast({
        type: "planted",
        carrot: veggie,
      });
    }
  });

  client.on("close", () => {
    console.log(`${id} disconnected`);
    delete clients[id];
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`WebSocket server running at ws://localhost:${port}`);
});

function send(client, message) {
  client.send(JSON.stringify(message));
}

function broadcast(message) {
  for (let client of Object.values(clients)) {
    send(client, message);
  }
}

