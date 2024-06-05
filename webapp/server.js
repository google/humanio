/*
 Copyright 2024 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

const express = require("express");
const fs = require('fs');
const https = require('https');
const app = express();

// server your css as static
app.use(express.static(__dirname));

// increase data limit
app.use(express.json({limit: '50mb'}));

// Read the private key and certificate files
const privateKey = fs.readFileSync('key.pem', 'utf8');
const certificate = fs.readFileSync('cert.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate };

// Create an HTTPS server using the credentials
const httpsServer = https.createServer(credentials, app);

// Set the HTTPS server to listen on a specific port (e.g., 3000)
httpsServer.listen(3000, () => {
  console.log('HTTPS server running on https://localhost:3000');
});

// post function to get image caption
app.post("/imageCaption", async (req, res) => {
    const image = req.body.image;
    const caption = req.body.caption;
    const question = req.body.question;
    const data = await replicateGenerateCaption(image, caption, question);
    const id = data.id;
    const result = await replicateGetCaption(id);
    res.send(result);
});


// get replicate image caption BLIP2
async function replicateGenerateCaption(image, caption, question){
    const apikey = "YOUR API KEY";
    const endpoint = "https://api.replicate.com/v1/predictions";

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${apikey}`
        },
        body: JSON.stringify({
            version: "4b32258c42e9efd4288bb9910bc532a69727f9acd26aa08e175713a0a857a608", // BLIP2

            input: {
                image: image,
                caption: caption,
                question: question
            }
        })
    });
    const data = await response.json();
    return data;
}

// get finalized replicate image caption BLIP2
async function replicateGetCaption(id){
    const apikey = "YOUR API KEY";
    const endpoint = `https://api.replicate.com/v1/predictions/${id}`;

    const response = await fetch(endpoint, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${apikey}`
        }
    });
    const data = await response.json();
    if (data.status != "succeeded"){
        console.log("Retrying...")
        return await replicateGetCaption(id);
    }
    return data;
}



app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

