const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const express = require('express');
const http = require('http');
const app = express();
app.use(express.static(__dirname));

let clients = [];

// dati raccolti per round
let recordings = {
  A: [],
  B: []
};

let isRecording = false;

wss.on('connection', (ws) => {
  console.log("Client connesso");

  clients.push(ws);

  ws.on('message', (message) => {
    let msg;

    try {
      msg = JSON.parse(message.toString());
    } catch (e) {
      console.log("Messaggio non valido");
      return;
    }

    // ricezione dati dai telefoni
    if(msg.type === "data"){
      console.log("Dati ricevuti da team", msg.team);

      if(msg.team === "A"){
        recordings.A.push(msg.payload);
      } else if(msg.team === "B"){
        recordings.B.push(msg.payload);
      }
    }
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
  });
});

server.listen(PORT, () => {
  console.log("Server attivo su porta", PORT);
});

// ----------------------
// CONTROLLO ROUND
// ----------------------

function startRound(){
  console.log("START ROUND");

  recordings = { A: [], B: [] };
  isRecording = true;

  broadcast({
    type: "start"
  });

  setTimeout(() => {
    stopRound();
  }, 5000);
}

function stopRound(){
  console.log("STOP ROUND");

  isRecording = false;

  broadcast({
    type: "stop"
  });

  // dopo stop → confronto
  setTimeout(() => {
    processResults();
  }, 1000);
}

// ----------------------
// CONFRONTO DATI
// ----------------------

function processResults(){
  console.log("PROCESSO RISULTATI");

  let scoreA = calculateSync(recordings.A);
  let scoreB = calculateSync(recordings.B);

  console.log("Score A:", scoreA);
  console.log("Score B:", scoreB);

  broadcast({
    type: "result",
    scoreA,
    scoreB
  });
}

// funzione semplificata di sincronia
function calculateSync(playersData){
  if(playersData.length < 2) return 0;

  let a = playersData[0];
  let b = playersData[1];

  let len = Math.min(a.length, b.length);
  let diff = 0;

  for(let i = 0; i < len; i++){
    diff += Math.abs(a[i].x - b[i].x);
    diff += Math.abs(a[i].y - b[i].y);
    diff += Math.abs(a[i].z - b[i].z);
  }

  let avg = diff / len;

  // trasformo in punteggio (più basso = meglio)
  let score = Math.max(0, 100 - avg);

  return Math.round(score);
}

// ----------------------
// UTILITY
// ----------------------

function broadcast(data){
  let msg = JSON.stringify(data);

  clients.forEach(client => {
    if(client.readyState === WebSocket.OPEN){
      client.send(msg);
    }
  });
}

// ----------------------
// AVVIO MANUALE (per test)
// ----------------------

setTimeout(() => {
  startRound();
}, 5000);
