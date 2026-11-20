import assert from "node:assert/strict";
import { FujiNetTestServer } from "../studio/core/fujinetTestServer.js";

const request = (command, payload = [], sequence = 1) => ({
  device: 0x71,
  command,
  sequence,
  payload: Uint8Array.from(payload),
});

const server = new FujiNetTestServer({ profile: "amy-chess", room: 4321 });
assert.equal(server.handle(request(0x4F, [1, 12, 1, 0])).error, 0, "OPEN");
assert.equal(server.connected, true);

const create = [2, 8, 0, 65, 67, 0, 0, 0, 0, 0, 0];
assert.equal(server.handle(request(0x57, create, 2)).error, 0, "CREATE write");
let status = server.handle(request(0x53, [1, 0, 1, 0], 3));
assert.deepEqual([...status.reply], [16, 0, 1, 0], "ACK and START are queued");
let read = server.handle(request(0x52, [2, 8, 0], 4));
assert.deepEqual([...read.reply], [65, 65, 0, 0x10, 0xE1, 0, 0, 0], "creator receives room assignment");
read = server.handle(request(0x52, [2, 8, 0], 5));
assert.equal(String.fromCharCode(read.reply[1]), "S", "virtual peer starts the table");

const localMove = [2, 8, 0, 65, 77, 1, 52, 36, 0, 0, 0];
server.handle(request(0x57, localMove, 6));
read = server.handle(request(0x52, [2, 8, 0], 7));
assert.deepEqual([...read.reply.slice(0, 6)], [65, 77, 1, 12, 28, 0], "virtual Black replies e7-e5");

server.handle(request(0x57, [2, 8, 0, 65, 79, 0, 0, 0, 0, 0, 0], 8));
read = server.handle(request(0x52, [2, 8, 0], 9));
assert.deepEqual([...read.reply.slice(0, 3)], [65, 68, 1], "virtual peer accepts draw offers");

server.disconnect();
status = server.handle(request(0x53, [1, 0, 1, 0], 10));
assert.equal(status.error, 1, "disconnected socket rejects traffic");
assert.ok(server.getTrace().length >= 10, "bounded transaction trace is populated");

const loopback = new FujiNetTestServer({ profile: "loopback" });
loopback.handle(request(0x4F));
loopback.handle(request(0x57, [2, 3, 0, 1, 2, 3]));
read = loopback.handle(request(0x52, [2, 3, 0]));
assert.deepEqual([...read.reply], [1, 2, 3], "loopback preserves payload bytes");

const scripted = new FujiNetTestServer({
  profile: "scripted",
  script: {
    version: 1,
    steps: [{
      expect: { device: 0x71, command: 0x4F, payloadPrefix: [1, 12] },
      response: { replyCommand: 6, connected: true, queue: [65, 83, 0, 0, 0, 0, 0, 0] },
    }],
  },
});
const scriptedReply = scripted.handle(request(0x4F, [1, 12, 1, 0]));
assert.equal(scriptedReply.error, 0, "scripted request matched");
assert.equal(scripted.connected, true);
assert.equal(scripted.incoming.length, 8, "script can queue later network data");
assert.equal(scripted.handle(request(0x53)).error, 0x7E, "exhausted scripts fail deterministically");

console.log("FujiNet deterministic test server: pass");
