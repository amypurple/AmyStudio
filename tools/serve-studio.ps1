param(
  [int]$Port = 8080,
  [string]$Root = "",
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = if ($Root) { Resolve-Path -LiteralPath $Root } else { Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..") }

Write-Host "Serving Amy Studio at http://localhost:$Port/studio/"
Write-Host "Root: $root"
Write-Host "Cache-Control: no-store"

$pythonLauncher = if (Get-Command py -ErrorAction SilentlyContinue) {
  "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  "python"
} else {
  throw "Python 3 was not found. Install it from https://www.python.org/downloads/ and retry."
}

$serverCode = @'
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, required=True)
parser.add_argument("--directory", required=True)
args = parser.parse_args()
handler = partial(NoCacheHandler, directory=args.directory)
with ThreadingHTTPServer(("", args.port), handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
'@

$tmp = Join-Path $env:TEMP "amy-studio-no-cache-server.py"
Set-Content -LiteralPath $tmp -Value $serverCode -Encoding UTF8
if (-not $NoBrowser) {
  Start-Process "http://localhost:$Port/studio/"
}
if ($pythonLauncher -eq "py") {
  & py -3 $tmp --port $Port --directory $root
} else {
  & python $tmp --port $Port --directory $root
}
