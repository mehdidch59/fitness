import { Mistral } from '@mistralai/mistralai';

const apiKey = "J4IkMEsTLcrNDhrr5IrVwZYBRGisAMGs";

const client = new Mistral({apiKey: apiKey});

const chatResponse = await client.chat.complete({
  model: 'mistral-small',
  messages: [{role: 'user', content: 'What is the best French cheese?'}],
});

console.log('Chat:', chatResponse.choices[0].message.content);