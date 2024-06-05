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

export {callGPT, callGPTLite};

// chatGPT
async function callGPT(prompt) {
    if (prompt.length == 0) {
      return
    }
    const messages = await completeChat(prompt);
    
    let result = messages.choices[0].message.content;
    console.log(result);
    // remove extra spaces and newlines
    result = result.replace(/(\r\n|\n|\r)/gm, " ");
    if (result.includes("AI language model")) {
      return "";
    }
    return result;
}

async function completeChat(prompt) {
    const apiKey = "YOUR API KEY";
    const endpoint = "https://api.openai.com/v1/chat/completions";
    // const model = "gpt-3.5-turbo";
    const model = "gpt-4o";
    const messages = [{"role": "user", "content": prompt}];
    const temperature = 0.0;
  
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature
      })
    });
  
    const data = await response.json();
    return data;
  }

// // GPT3
async function callGPTLite(prompt) {
  if (prompt.length == 0) {
    return
  }
  const messages = await completeChatcallGPTLite(prompt);
  // console.log(messages)
  let result = messages.choices[0].text;
  result = result.replace(/(\r\n|\n|\r)/gm, " ");
  return result;
}

async function completeChatcallGPTLite(prompt) {
    const apiKey = "YOUR API KEY";
    const data = { "prompt": prompt,
    "max_tokens": 64,
    "temperature": 0.0,
    "frequency_penalty": 0.5,
  }
  // from slow -> fast, high ability -> low ability
  let model_davinci = "davinci-002";
  let model_curie = "text-curie-001";
  let model_babbage = "babbage-002";
  let model_ada = "text-ada-001";
	const response = await fetch(
		"https://api.openai.com/v1/engines/" + model_babbage + "/completions",
		{
      headers: {
        "Content-Type": 'application/json',
        Authorization: "Bearer " + apiKey
      },
			method: "POST",
			body: JSON.stringify(data),
		}
	);
  const result = await response.json();
	return result;
}

