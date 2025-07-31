const OpenAI = require ('openai');
const dbm = require('./database-manager');

//Api key is in config.json, fourth element named gpt token. Grab it as constant
const apiKey = require('./config.json').gptToken;
//Format to work as gpt key
//const apiToken = "Bearer " + apiKey;


const openai = new OpenAI({apiKey: apiKey});
const Model3_5Turbo = "gpt-3.5-turbo";
const Model4o = "gpt-4o";

const modelChoice = 4.01; //Options are 3.51, 4.01

class chatGPT {
    static async pope(message, playerID) {
        //Get prevMessages from database
        let prevMessagesExist = true;
        let popeInfo = await dbm.loadFile("gptMessages", "pope");
        if (popeInfo[playerID] == undefined || popeInfo[playerID] == null) {
            popeInfo[playerID] = {};
            prevMessagesExist = false;
        }
        let prevMessages = popeInfo[playerID].prevMessages;
        if (prevMessages == undefined || prevMessages == null) {
            prevMessages = [];
            prevMessagesExist = false;
        }

        let modelInputCost;
        let modelOutputCost;
        let model;

        switch (modelChoice) {
            case 3.51:
                model = Model3_5Turbo;
                modelInputCost = 0.001;
                modelOutputCost = 0.002;
                break;
            case 4:
                model = Model4;
                modelInputCost = 0.03;
                modelOutputCost = 0.06;
                break;
            case 4.01:
                model = Model4Turbo;
                modelInputCost = 0.01;
                modelOutputCost = 0.03;
                break;
            default:
                model = Model3_5Turbo;
                modelInputCost = 0.001;
                modelOutputCost = 0.002;
                break;
        }
        
        //Set passed messages to pass to gpt
        //First message is a system message to "Players are speaking to you in a discord game. Respond as if you are the pope. Remember to moderate and avoid getting too deeply involved in the politics.
        //If prevMessages exist, also add on the previous messages in order
        let messages = [{ role: "system", content: "Players are speaking to you in a discord game. Respond as if you are the pope. Remember to moderate and avoid getting too deeply involved in the politics." }];
        messages.push()
        if (prevMessagesExist) {
            //Add previous messages to messages
            for (let i = 0; i < prevMessages.length; i++) {
                //Each message should be structured properly with role and everything
                messages.push(prevMessages[i]);
            }
        }
        messages.push({ role: "user", content: message });

        console.log(messages);

        const completion = await openai.chat.completions.create({
            messages: messages,
            model: model,
            max_tokens: 350,});
        
        console.log(completion);
        //Save message, prevMessages, and completion to database under player id

        //Initialize example completion
        // const completion = { 
        //         "choices": [
        //           {
        //             "finish_reason": "stop",
        //             "index": 0,
        //             "message": {
        //               "content": "The 2020 World Series was played in Texas at Globe Life Field in Arlington.",
        //               "role": "assistant"
        //             },
        //             "logprobs": null
        //           }
        //         ],
        //         "created": 1677664795,
        //         "id": "chatcmpl-7QyqpwdfhqwajicIEznoc6Q47XAyW",
        //         "model": "gpt-3.5-turbo-0613",
        //         "object": "chat.completion",
        //         "usage": {
        //           "completion_tokens": 17,
        //           "prompt_tokens": 57,
        //           "total_tokens": 74
        //         }
        //       }
        const dataText = completion.choices[0].message;
        const completionTokens = completion.usage.completion_tokens;
        const promptTokens = completion.usage.prompt_tokens;
        //Add message and datatext to prevMessages
        prevMessages.push({ role: "user", content: message });
        prevMessages.push({ role: "assistant", content: dataText.content });
        popeInfo[playerID].prevMessages = prevMessages;
        //Avoid no such document error with save file- TO DO
        await dbm.saveFile("gptMessages", "pope", popeInfo);
        let tokens = await dbm.loadFile("gptMessages", "tokens");
        if (!tokens.completions) {
            tokens.completions = 0;
        }
        if (!tokens.promptTokens) {
            tokens.promptTokens = 0;
        }
        if (!tokens.inputCost) {
            tokens.inputCost = 0;
        }
        if (!tokens.outputCost) {
            tokens.outputCost = 0;
        }
        if (!tokens.totalCost) {
            tokens.totalCost = 0;
        }
        tokens.completions += completionTokens;
        tokens.promptTokens += promptTokens;
        tokens.inputCost += modelInputCost * promptTokens / 1000;
        tokens.outputCost += modelOutputCost * completionTokens / 1000;
        tokens.totalCost += (modelInputCost * promptTokens + modelOutputCost * completionTokens) / 1000;
        await dbm.saveFile("gptMessages", "tokens", tokens);
        
        const returnString = dataText.content;

        return returnString;
    }

    static async demetrios(message, playerID, channelId) {
        //Get prevMessages from database
        let charInfo = await dbm.loadFile("characters", playerID);
        let charName = charInfo.name;
        let demetriosInfo = await dbm.loadFile("gptMessages", "demetrios");
        let prevMessages = demetriosInfo.prevMessages
        
        let modelInputCost;
        let modelOutputCost;
        let model;

        switch (modelChoice) {
            case 3.51:
                model = Model3_5Turbo;
                modelInputCost = 0.0005;
                modelOutputCost = 0.0015;
                break;
            case 4.01:
                model = Model4o;
                modelInputCost = 0.005;
                modelOutputCost = 0.015;
                break;
            default:
                model = Model3_5Turbo;
                modelInputCost = 0.0005;
                modelOutputCost = 0.0015;
                break;
        }

        let contextString = await chatGPT.getContextString(message, prevMessages);

        console.log(contextString);
        
        //Set passed messages to pass to gpt
        //First message is a system message to "Players are speaking to you in a discord game. Respond as if you are the pope. Remember to moderate and avoid getting too deeply involved in the politics.
        //If prevMessages exist, also add on the previous messages in order
        let messages = [{ role: "system", content: `Players are speaking to you in a discord game, but you should never reference this fact, instead acting as a mere helper who exists in the time period (and acting as if the player is also an individual of the time period). Respond with very short paragraphs, no more than 1-3 sentences. Your info is as follows: You are Demetrios, a Greek chronicler living in Massalia in 320 BC. Your role is to provide detailed and accurate accounts of life in Massalia during this period, including its history, culture, politics, daily life, and notable events. Always stay in character as an ancient Greek chronicler, speaking in a formal, historical tone. Here are some guidelines and context to help you fulfill your role:**

                        1. **Historical Context**: Massalia is a prosperous Greek colony founded by Phocaean Greeks around 600 BC. It is a thriving port city known for its trade, culture, and strategic importance.

                        2. **Culture and Society**: Discuss the Greek customs, festivals, religious practices, and daily activities in Massalia. Highlight the influence of both Greek and local cultures in the city.
                        The following specific information may be relevant to this question. If it contradicts history, trust the following information instead of what you know about Massalia:` + contextString }];
        messages.push();
        if (prevMessages != undefined && prevMessages != null) {
            //Add previous messages to messages
            for (let i = 0; i < prevMessages.length; i++) {
                //Each message should be structured properly with role and everything
                messages.push(prevMessages[i]);
            }
        }
        messages.push({ role: "user", content: charName + ", alternatively known as " + playerID + ", said " + message });
        

        const completion = await openai.chat.completions.create({
            messages: messages,
            model: model,
            max_tokens: 500,});
        
        console.log(completion);

        const dataText = completion.choices[0].message;
        const completionTokens = completion.usage.completion_tokens;
        const promptTokens = completion.usage.prompt_tokens;
        //Add message and datatext to prevMessages, remove first message- there should always be an even number of messages in prevMessages
        prevMessages.push({ role: "user", content: playerID + ", alternatively known as " + charName + ", said " + message });
        prevMessages.push({ role: "assistant", content: dataText.content });

        if (prevMessages.length > 4) {
            prevMessages.shift();
            prevMessages.shift();
        }
        demetriosInfo.prevMessages = prevMessages;
        //Avoid no such document error with save file- TO DO
        await dbm.saveFile("gptMessages", "demetrios", demetriosInfo);
        let tokens = await dbm.loadFile("gptMessages", "tokens");
        if (!tokens.completions) {
            tokens.completions = 0;
        }
        if (!tokens.promptTokens) {
            tokens.promptTokens = 0;
        }
        if (!tokens.inputCost) {
            tokens.inputCost = 0;
        }
        if (!tokens.outputCost) {
            tokens.outputCost = 0;
        }
        if (!tokens.totalCost) {
            tokens.totalCost = 0;
        }
        tokens.completions += completionTokens;
        tokens.promptTokens += promptTokens;
        tokens.inputCost += modelInputCost * promptTokens / 1000;
        tokens.outputCost += modelOutputCost * completionTokens / 1000;
        console.log(modelInputCost * promptTokens / 1000);
        console.log(modelOutputCost * completionTokens / 1000);
        console.log(tokens.totalCost);
        tokens.totalCost += (modelInputCost * promptTokens + modelOutputCost * completionTokens) / 1000;
        console.log(tokens.totalCost);
        await dbm.saveFile("gptMessages", "tokens", tokens);
        
        const returnString = dataText.content;

        return returnString;
    }

    static async getContextString(message, prevMessages) {
        try {
            // Load the information blocks
            let info = await dbm.loadFile("gptMessages", "info");

            let prevMessagesString = "";
            for (let i = 0; i < prevMessages.length; i++) {
                prevMessagesString += prevMessages[i].content + "\n";
            }
    
            // Prepare the prompt messages
            let messages = [
                {   
                    role: "system",
                    content: "You are part of a bot named Demetrios. Your job is to decide which info blocks are relevant to this user's question in the Massalia RP game. Respond with only an JSON containing an array with the key 'blocks' and containing only numbers, each corresponding to one of the following blocks: 1. Massalia Basic History, 2. Notable Characters of Massalia, 3. Noble Houses of Massalia, 4. Political Structure of Massalia, 5. Demetrios Story/Info, 6. Diplomatic Relations with Carthage and Rome, 7. The Story of Pytheas, a famous Massalian explorer, 8. Notable Professions in Massalia, 9. Current Events, 10. Massalia Stats (army/pop/income), 11. Tribes Near Massalia"
                },
                {
                    role: "user",
                    content: "Here are some previous messages that might provide context: " + prevMessagesString + "Respond with the array containing ONLY numbers for the following message: " + message
                }
            ];
    
            // Call the OpenAI API to get the structured output
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
                max_tokens: 50,
                temperature: 0,
                functions: [
                    {
                        "name": "setRelevantBlocks",
                        "description": "Select relevant blocks for a given user message",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "blocks": {
                                    "type": "array",
                                    "items": {
                                        "type": "integer"
                                    },
                                    "description": "An array of block numbers relevant to the user's question"
                                }
                            },
                            "required": ["blocks"]
                        }
                    }
                ],
                function_call: { "name": "setRelevantBlocks" }
            });
    
            // Extract the response message
            const responseFunctionCall = completion.choices[0].message.function_call;
    
            // Parse the response to get the array of numbers
            const responseArray = JSON.parse(responseFunctionCall.arguments);
    
            const blocks = responseArray.blocks;

            console.log(blocks);
            let contextString = "";
            for (let i = 0; i < blocks.length; i++) {
                console.log(info);
                console.log(blocks[i]);
                console.log(info.infoBlocks[blocks[i] - 1]);
                contextString += info.infoBlocks[blocks[i] - 1] + "\n\n";
            }

            console.log(contextString);

            return contextString;
    
        } catch (error) {
            console.error("Error getting context string:", error);
            throw error;
        }
    }
}

module.exports = chatGPT;