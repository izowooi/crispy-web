import http from "node:http";
import { zipSync } from "fflate";

// 1x1 opaque PNG. Local integration tests only.
const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
const archive = zipSync({ "0.png": png, "1.png": png, "2.png": png, "3.png": png });

http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/ai/generate-image") {
    response.writeHead(200, { "content-type": "application/zip" });
    response.end(archive);
    return;
  }
  response.writeHead(404); response.end();
}).listen(8788, "127.0.0.1", () => console.log("mock NAI listening on 8788"));
