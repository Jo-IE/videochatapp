"use strict";
var debug = require("debug")("webrtc");
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;

var localVideo = document.querySelector("#localVideo");
var remoteVideo = document.querySelector("#remoteVideo");
var startCall = document.querySelector("#callButton");
var endCall = document.querySelector("#hangupButton");
var form = document.querySelector("#message-form");
var input = document.querySelector("#m");
var messages = document.querySelector("#messages");
var pcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var room = prompt("Enter Room name");
// Could prompt for room name:
// room = prompt('Enter room name:');

var socket = io.connect();

if (room !== "") {
  socket.emit("create or join", room);
  debug("Attempted to create or  join room", room);
}

socket.on("created", function(room) {
  debug("Created room " + room);
  isInitiator = true;
});

socket.on("full", function(room) {
  debug("Room " + room + " is full");
});

socket.on("join", function(room) {
  debug("Another peer made a request to join room " + room);
  debug("This peer is the initiator of room " + room + "!");
  isChannelReady = true;
});

socket.on("joined", function(room) {
  debug("joined: " + room);
  isChannelReady = true;
});

socket.on("log", function(array) {
  debug.apply(console, array);
});

socket.on("chat message", function(msg) {
  var listItem = document.createElement("li");
  messages.appendChild(listItem).innerHTML = msg;
});

socket.on("typing", function(user) {
  var p = document.querySelector("#user-typing");
  p.innerHTML = user + " is typing...";
});

////////////////////////////////////////////////

function sendMessage(message) {
  debug("Client sending message: ", message);
  socket.emit("message", message);
}

// This client receives a message
socket.on("message", function(message) {
  debug("Client received message:", message);
  if (message === "got user media") {
    maybeStart();
  } else if (message.type === "offer") {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === "answer" && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === "candidate" && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === "bye" && isStarted) {
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////

//chat messages
form.addEventListener("submit", function(e) {
  e.preventDefault();
  socket.emit("chat message", input.value);
  input.value = "";
  return false;
});
function toggleVisibility(element) {
  if (element.style.display === "none") {
    element.style.display = "block";
  } else {
    element.style.display = "none";
  }
}
navigator.mediaDevices
  .getUserMedia({
    audio: false,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    alert("getUserMedia() error: " + e.name);
  });

function gotStream(stream) {
  debug("Adding local stream.");
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage("got user media");
  if (isInitiator) {
    maybeStart();
  }
}

var constraints = {
  video: true
};

debug("Getting user media with constraints", constraints);

if (location.hostname !== "localhost") {
  requestTurn(
    "https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913"
  );
}

function maybeStart() {
  debug(">>>>>>> maybeStart() ", isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== "undefined" && isChannelReady) {
    debug(">>>>>> creating peer connection");
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    debug("isInitiator", isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage("bye");
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    debug("Created RTCPeerConnnection");
  } catch (e) {
    debug("Failed to create PeerConnection, exception: " + e.message);
    alert("Cannot create RTCPeerConnection object.");
    return;
  }
}

function handleIceCandidate(event) {
  debug("icecandidate event: ", event);
  if (event.candidate) {
    sendMessage({
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    debug("End of candidates.");
  }
}

function handleCreateOfferError(event) {
  debug("createOffer() error: ", event);
}

function doCall() {
  debug("Sending offer to peer");
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  debug("Sending answer to peer.");
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  debug("setLocalAndSendMessage sending message", sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace("Failed to create session description: " + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === "turn:") {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    debug("Getting TURN server from ", turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        debug("Got TURN server: ", turnServer);
        pcConfig.iceServers.push({
          urls: "turn:" + turnServer.username + "@" + turnServer.turn,
          credential: turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open("GET", turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  debug("Remote stream added.");
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  debug("Remote stream removed. Event: ", event);
}

function hangup() {
  debug("Hanging up.");
  stop();
  sendMessage("bye");
  toggleVisibility(remoteVideo);
}

function handleRemoteHangup() {
  debug("Session terminated.");
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}

endCall.addEventListener("click", hangup);
