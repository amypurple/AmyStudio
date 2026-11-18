// Shared rig for the FujiNet runtime tests: the Amy program, its expected
// results, local HTTP/TCP fixtures and a private fujinet-pc copy.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { join } from "node:path";

export const RUNTIME_SOURCE = (httpPort, tcpPort) => `appkey creator $B0C1 app 7
u8 Present = 0
u8 OpenS = 9
u8 ReadS = 9
u16 Got = 0
u8 Tries = 0
u8 Page[64]
u8 CloseS = 9
u8 JOpenS = 9
u8 StatS = 9
FujiNetStatus Info
u8 JsonS = 9
u8 Q1S = 9
u16 Q1 = 0
u8 Name[24]
u8 Q2S = 9
u16 Q2 = 0
u8 Short[8]
u8 Q3S = 9
u16 Q3 = 0
u8 After[24]
u8 POpenS = 9
u8 PModeS = 9
u8 PWriteS = 9
u8 PBodyS = 9
u8 PReadS = 9
u16 PGot = 0
u8 Echo[32]
u8 TOpenS = 9
u8 TWriteS = 9
u8 TReadS = 9
u16 TGot = 0
u8 Two[2]
u8 Guard = $5A
u8 TRestS = 9
u16 TRest = 0
u8 Back[16]
u8 KeyW = 9
u8 KeyR = 9
u16 KeyLen = 0
u8 KeyOut[16]
u8 KeyIn[16]
u8 MissR = 9
u16 MissLen = 99
u8 Miss[8]
u8 TimeS = 9
FujiNetTime Clock
u8 VerS = 9
u16 VerLen = 0
u8 Version[20]
u8 BadUnit = 9
u8 BadS = 9
u8 Done = 0

Present = fujinet present

network open 1 "N:HTTP://127.0.0.1:${httpPort}/hello.txt" read status OpenS
Tries = 0
do
  Got = network read 1 into Page status ReadS
  inc Tries
  if Got <> 0 then
    exit do
  end if
  if ReadS <> 0 then
    exit do
  end if
loop until Tries = 200
network close 1 status CloseS

network open 2 "N:HTTP://127.0.0.1:${httpPort}/data.json" read status JOpenS
network status 2 as Info status StatS
network json 2 status JsonS
Q1 = network query 2 "/name" into Name status Q1S
Q2 = network query 2 "/long" into Short status Q2S
Q3 = network query 2 "/after" into After status Q3S
network close 2

network open 1 "N:HTTP://127.0.0.1:${httpPort}/echo" post status POpenS
network http mode 1 post data status PModeS
network write 1 "amy says hi" status PWriteS
network http mode 1 body status PBodyS
Tries = 0
do
  PGot = network read 1 into Echo status PReadS
  inc Tries
  if PGot <> 0 then
    exit do
  end if
  if PReadS <> 0 then
    exit do
  end if
loop until Tries = 200
network close 1

network open 2 "N:TCP://127.0.0.1:${tcpPort}/" read write status TOpenS
network write 2 "ABCDEF" status TWriteS
Tries = 0
do
  TGot = network read 2 into Two status TReadS
  inc Tries
  if TGot <> 0 then
    exit do
  end if
  if TReadS <> 0 then
    exit do
  end if
loop until Tries = 250
Tries = 0
do
  TRest = network read 2 into Back status TRestS
  inc Tries
  if TRest <> 0 then
    exit do
  end if
  if TRestS <> 0 then
    exit do
  end if
loop until Tries = 250
network close 2

KeyOut = "AMY-KEY-1"
appkey write 5 from KeyOut count 9 status KeyW
KeyLen = appkey read 5 into KeyIn status KeyR
MissLen = appkey read 200 into Miss status MissR

fujinet time into Clock status TimeS
VerLen = fujinet version into Version status VerS
network close BadUnit status BadS
Done = 1
loop forever
`;

// name -> [length, expected bytes or predicate]
const text = (value, size) => [...Buffer.from(value, "latin1"), ...Array(Math.max(0, size - value.length)).fill(null)];
export const EXPECTATIONS = {
  Present: [1, [1]], OpenS: [1, [0]], ReadS: [1, [0]], Got: [2, [10, 0]], Page: [10, text("HELLO AMY\n", 10)],
  CloseS: [1, [0]], JOpenS: [1, [0]], StatS: [1, [0]], JsonS: [1, [0]],
  Q1S: [1, [0]], Q1: [2, [3, 0]], Name: [4, text("Amy\0", 4)],
  Q2S: [1, [0]], Q2: [2, [8, 0]], Short: [8, text("ABCDEFGH", 8)],
  Q3S: [1, [0]], Q3: [2, [2, 0]], After: [3, text("OK\0", 3)],
  POpenS: [1, [0]], PModeS: [1, [0]], PWriteS: [1, [0]], PBodyS: [1, [0]], PReadS: [1, [0]],
  PGot: [2, [11, 0]], Echo: [11, text("AMY SAYS HI", 11)],
  TOpenS: [1, [0]], TWriteS: [1, [0]], TReadS: [1, [0]], TGot: [2, [2, 0]], Two: [2, text("FE", 2)], Guard: [1, [0x5A]],
  TRestS: [1, [0]], TRest: [2, [4, 0]], Back: [4, text("DCBA", 4)],
  KeyW: [1, [0]], KeyR: [1, [0]], KeyLen: [2, [9, 0]], KeyIn: [9, text("AMY-KEY-1", 9)],
  MissR: [1, [0]], MissLen: [2, [0, 0]],
  TimeS: [1, [0]], Clock: [7, (bytes) => bytes[0] >= 20 && bytes[2] >= 1 && bytes[2] <= 12 && bytes[3] >= 1 && bytes[3] <= 31],
  VerS: [1, [0]], VerLen: [2, (bytes) => bytes[0] > 0 && bytes[1] === 0],
  BadS: [1, [1]], Done: [1, [1]]
};

export function startFixtures() {
  const data = JSON.stringify({ name: "Amy", long: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", after: "OK" });
  const server = http.createServer((request, response) => {
    if (request.method === "POST") {
      const chunks = [];
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => response.end(Buffer.concat(chunks).toString("latin1").toUpperCase()));
      return;
    }
    if (request.url === "/hello.txt") return response.end("HELLO AMY\n");
    if (request.url === "/data.json") {
      response.setHeader("Content-Type", "application/json");
      return response.end(data);
    }
    response.statusCode = 404;
    response.end();
  });
  const echo = net.createServer((socket) => socket.on("data", (chunk) => socket.write(Buffer.from([...chunk].reverse()))));
  return Promise.all([
    new Promise((ready) => server.listen(0, "127.0.0.1", () => ready(server.address().port))),
    new Promise((ready) => echo.listen(0, "127.0.0.1", () => ready(echo.address().port)))
  ]).then(([httpPort, tcpPort]) => ({ httpPort, tcpPort, close: () => { server.close(); echo.close(); } }));
}

export function freePort() {
  return new Promise((ready) => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => ready(port));
    });
  });
}

export async function waitForListener(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((done) => {
      const socket = net.connect(port, "127.0.0.1", () => { socket.destroy(); done(true); });
      socket.on("error", () => done(false));
    });
    if (ok) return;
    await new Promise((wait) => setTimeout(wait, 200));
  }
  throw new Error(`nothing listening on ${port}`);
}

// Copy fujinet-pc and change only the [BOIP] port (a blanket edit would also hit [Serial] port=).
export function privateFujinet(dist, dir, boipPort) {
  cpSync(dist, dir, { recursive: true });
  const configPath = join(dir, "fnconfig.ini");
  const lines = readFileSync(configPath, "utf8").split(/\r?\n/);
  let section = "";
  const edited = lines.map((line) => {
    const header = line.match(/^\[(.+)\]$/);
    if (header) section = header[1];
    if (section === "BOIP" && /^port=/.test(line)) return `port=${boipPort}`;
    if (section === "BOIP" && /^enabled=/.test(line)) return "enabled=1";
    return line;
  });
  writeFileSync(configPath, edited.join("\n"));
  mkdirSync(join(dir, "SD", "FujiNet"), { recursive: true });
  rmSync(join(dir, "SD", "FujiNet"), { recursive: true, force: true });
  mkdirSync(join(dir, "SD", "FujiNet"), { recursive: true });
}

// Like spawnSync, but leaves the event loop free for the fixture servers.
// The returned promise carries the process as `.child`.
export function runProcess(command, args, { cwd, env, timeoutMs }) {
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  const finished = new Promise((done) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("close", (status, signal) => {
      clearTimeout(timer);
      done({ status, signal, stdout, stderr });
    });
  });
  finished.child = child;
  return finished;
}

export function readSymbols(path) {
  const symbols = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_0-9.]+):\s*equ\s*\$([0-9A-F]+)/i);
    if (match) symbols.set(match[1], Number.parseInt(match[2], 16));
  }
  return symbols;
}

export function checkResults(values, label) {
  const failures = [];
  for (const [name, [, expected]] of Object.entries(EXPECTATIONS)) {
    const bytes = values[name];
    const ok = typeof expected === "function"
      ? expected(bytes)
      : expected.every((value, index) => value === null || bytes[index] === value);
    if (!ok) failures.push(`${name}=${Buffer.from(bytes).toString("hex")} (${JSON.stringify(Buffer.from(bytes).toString("latin1"))})`);
  }
  assert.deepEqual(failures, [], `${label}: unexpected results`);
}
