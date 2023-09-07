import { performance } from "perf_hooks";
import supertest from "supertest";
import { buildApp } from "./app";
import assert from 'assert'; 

const app = supertest(buildApp());

async function basicLatencyTest() {
    await app.post("/reset").expect(204);
    const start = performance.now();
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    console.log(`Latency: ${performance.now() - start} ms`);
}

async function doubleSynchronousRequests() {
    await app.post("/reset");

    for (let i = 0; i < 20; i += 2) { 
        const [response1, response2] = await Promise.all([
            app.post("/charge"),
            app.post("/charge")
        ]);

        const responseBody1 = JSON.parse(response1.text);
        const responseBody2 = JSON.parse(response2.text);
        const expectedRemainingBalance = responseBody1.remainingBalance - responseBody2.charges;
        assert.strictEqual(responseBody2.remainingBalance, expectedRemainingBalance,`the current remainingBalance after simultaneous requests is ${responseBody2.remainingBalance} when it's supposed to be ${expectedRemainingBalance}`); 
    }
}

async function delayedResponsesTest() {
    // This code examines the charges of two requests sent with a slight delay in between. The test encompasses delays ranging from 0ms(simultanious requests) to 1000ms.
    for (let delay: number = 0; delay<=1000 ; delay+=50){
        await app.post("/reset");

        const [response1Promise, response2Promise] = [
            app.post("/charge"),
            new Promise(resolve => setTimeout(resolve, delay)).then(() => app.post("/charge"))
          ];
          const [response1, response2] = await Promise.all([response1Promise, response2Promise]);
          const response1Body=JSON.parse(response1.text);
          const response2Body=JSON.parse(response2.text);
          const expectedRemainingBalance = response1Body.remainingBalance-response2Body.charges;

          assert.strictEqual(response2Body.remainingBalance,expectedRemainingBalance,`the current remaining balance after running requests separated with ${delay}ms is ${response2Body.remainingBalance}$ when it's supposed to be ${expectedRemainingBalance}$`); 
          
    }
    console.log('Responses that are sent simulataniously or quickly after each other are giving the correct results');
}


async function runTests() {
    await basicLatencyTest();
}

runTests().catch(console.error);
