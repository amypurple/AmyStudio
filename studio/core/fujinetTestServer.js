const ACK = 0x06;
const DEVICE_NETWORK = 0x71;
const COMMAND_OPEN = 0x4F;
const COMMAND_CLOSE = 0x43;
const COMMAND_READ = 0x52;
const COMMAND_STATUS = 0x53;
const COMMAND_WRITE = 0x57;

function bytes(value) {
  return value instanceof Uint8Array ? value : Uint8Array.from(value || []);
}

function wordParameter(payload, offset = 0) {
  return payload[offset] === 2 ? payload[offset + 1] | (payload[offset + 2] << 8) : 0;
}

function packet(op, a = 0, b = 0, c = 0, d = 0, e = 0, f = 0) {
  return Uint8Array.from([65, op.charCodeAt(0), a, b, c, d, e, f]);
}

function movePacket(sequence, from, to, promotion = 0) {
  return packet("M", sequence, from, to, promotion, 0, 0);
}

export class FujiNetTestServer {
  constructor({ profile = "presence", room = 1234, maxTrace = 256, script = null } = {}) {
    this.profile = profile;
    this.room = room;
    this.maxTrace = maxTrace;
    this.connected = false;
    this.incoming = [];
    this.trace = [];
    this.localColor = 0;
    this.peerSequence = 0;
    this.peerMove = 0;
    this.script = script;
    this.scriptStep = 0;
    this.peerMoves = {
      white: [[52, 36], [62, 45], [61, 34]],
      black: [[12, 28], [6, 21], [5, 26]],
    };
  }

  reset() {
    this.connected = false;
    this.incoming.length = 0;
    this.trace.length = 0;
    this.localColor = 0;
    this.peerSequence = 0;
    this.peerMove = 0;
    this.scriptStep = 0;
  }

  record(direction, request, payload = request.payload) {
    this.trace.push({
      direction,
      device: request.device,
      command: request.command,
      sequence: request.sequence,
      payload: Array.from(payload || []),
    });
    if (this.trace.length > this.maxTrace) this.trace.splice(0, this.trace.length - this.maxTrace);
  }

  queue(packetBytes) {
    this.incoming.push(...packetBytes);
  }

  queuePeerMove() {
    const moves = this.localColor === 0 ? this.peerMoves.black : this.peerMoves.white;
    if (this.peerMove >= moves.length) return;
    const [from, to, promotion = 0] = moves[this.peerMove++];
    this.peerSequence = (this.peerSequence + 1) & 0xFF;
    this.queue(movePacket(this.peerSequence, from, to, promotion));
  }

  handleAmyChessWrite(payload) {
    if (payload.length !== 8 || payload[0] !== 65) return;
    const op = String.fromCharCode(payload[1]);
    if (op === "C") {
      this.localColor = 0;
      this.queue(packet("A", 0, this.room >> 8, this.room & 0xFF));
      this.queue(packet("S"));
      return;
    }
    if (op === "J") {
      this.localColor = 1;
      this.room = (payload[2] << 8) | payload[3];
      this.queue(packet("A", 1, this.room >> 8, this.room & 0xFF));
      this.queue(packet("S"));
      this.queuePeerMove();
      return;
    }
    if (op === "M") this.queuePeerMove();
    if (op === "O") this.queue(packet("D", 1));
  }

  handleScript(request, payload) {
    const steps = Array.isArray(this.script?.steps) ? this.script.steps : [];
    const step = steps[this.scriptStep];
    if (!step) return { error: 0x7E, replyCommand: 0x15, reply: new Uint8Array(0) };
    const expected = step.expect || {};
    const prefix = bytes(expected.payloadPrefix);
    const matches = (expected.device === undefined || expected.device === request.device)
      && (expected.command === undefined || expected.command === request.command)
      && prefix.every((value, index) => payload[index] === value);
    if (!matches) return { error: 0x7D, replyCommand: 0x15, reply: new Uint8Array(0) };
    this.scriptStep += 1;
    const response = step.response || {};
    if (Array.isArray(response.queue)) this.queue(bytes(response.queue));
    if (typeof response.connected === "boolean") this.connected = response.connected;
    return {
      error: response.error ?? 0,
      replyCommand: response.replyCommand ?? ACK,
      reply: bytes(response.reply),
    };
  }

  handle(request) {
    const payload = bytes(request.payload);
    this.record("tx", request, payload);
    if (this.profile === "scripted") return this.handleScript(request, payload);
    if (request.device !== DEVICE_NETWORK || this.profile === "presence") {
      return { error: 1, replyCommand: 0x15, reply: new Uint8Array(0) };
    }
    if (request.command === COMMAND_OPEN) {
      this.connected = true;
      return { error: 0, replyCommand: ACK, reply: new Uint8Array(0) };
    }
    if (request.command === COMMAND_CLOSE) {
      this.connected = false;
      this.incoming.length = 0;
      return { error: 0, replyCommand: ACK, reply: new Uint8Array(0) };
    }
    if (!this.connected) return { error: 1, replyCommand: 0x15, reply: new Uint8Array(0) };
    if (request.command === COMMAND_STATUS) {
      const length = Math.min(0xFFFF, this.incoming.length);
      return { error: 0, replyCommand: ACK, reply: Uint8Array.from([length & 0xFF, length >> 8, 1, 0]) };
    }
    if (request.command === COMMAND_WRITE) {
      const length = wordParameter(payload);
      const data = payload.slice(3, 3 + length);
      if (this.profile === "loopback") this.queue(data);
      if (this.profile === "amy-chess") this.handleAmyChessWrite(data);
      return { error: 0, replyCommand: ACK, reply: new Uint8Array(0) };
    }
    if (request.command === COMMAND_READ) {
      const length = wordParameter(payload);
      const reply = Uint8Array.from(this.incoming.splice(0, length));
      const response = { error: 0, replyCommand: ACK, reply };
      this.record("rx", request, reply);
      return response;
    }
    return { error: 1, replyCommand: 0x15, reply: new Uint8Array(0) };
  }

  disconnect() {
    this.connected = false;
    this.incoming.length = 0;
  }

  getTrace() {
    return this.trace.map((entry) => ({ ...entry, payload: [...entry.payload] }));
  }
}

