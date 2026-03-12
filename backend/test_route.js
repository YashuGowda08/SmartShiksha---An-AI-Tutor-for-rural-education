const http = require('http');

http.get('http://localhost:8000/content/subjects', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(JSON.parse(data)[0]);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
