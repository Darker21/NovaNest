const AWS = require("aws-sdk");
const lambda = new AWS.Lambda();
const { lambdaNameMap } = require("./utils/config");

exports.handler = async (event) => {
  for (let record of event.Records) {
    const message = JSON.parse(record.body);
    const commandName = message.command;

    const lambdaFunctionName = lambdaNameMap[commandName];
    if (lambdaFunctionName) {
      try {
        const params = {
          FunctionName: lambdaFunctionName,
          InvocationType: "Event", // Asynchronous invocation
          Payload: JSON.stringify(message),
        };
        await lambda.invoke(params).promise();
        console.log(`Successfully invoked ${lambdaFunctionName}`);
      } catch (err) {
        console.error(`Error invoking ${lambdaFunctionName}:`, err);
      }
    } else {
      console.error(`No mapped Lambda function for command: ${commandName}`);
    }
  }
};
