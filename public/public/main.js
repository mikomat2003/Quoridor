const socket = io(); // connect to signaling server

const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomInput');
const statusDiv = document.getElementById('status');
const boardDiv = document.getElementById('board');

let localConnection;
let dataChannel;
let roomId;

joinBtn.onclick = () => {
  roomId = roomInput.value.trim();
  if (!roomId) return alert("Enter a room name");
  socket.emit('join-room', roomId);
  statusDiv.textContent = `Joined room: ${roomId}`;
  initPeerConnection();
};

// Simple board rendering
for (let i = 0; i < 81; i++) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  boardDiv.appendChild(cell);
}

// WebRTC setup
function initPeerConnection() {
  localConnection = new RTCPeerConnection();

  dataChannel = localConnection.createDataChannel("game");
  dataChannel.onmessage = (event) => console.log("Data received:", event.data);

  localConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', { candidate: event.candidate, target: roomId });
    }
  };

  socket.on('offer', async (data) => {
    await localConnection.setRemoteDescription(data.sdp);
    const answer = await localConnection.createAnswer();
    await localConnection.setLocalDescription(answer);
    socket.emit('answer', { sdp: answer, target: data.from });
  });

  socket.on('answer', async (data) => {
    await localConnection.setRemoteDescription(data.sdp);
  });

  socket.on('ice-candidate', async (data) => {
    try {
      await localConnection.addIceCandidate(data.candidate);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('new-user', async (id) => {
    const offer = await localConnection.createOffer();
    await localConnection.setLocalDescription(offer);
    socket.emit('offer', { sdp: offer, target: id });
  });
}
