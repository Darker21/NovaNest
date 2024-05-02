require("dotenv").config();
const AWS = require("aws-sdk");
const sqs = new AWS.SQS({region: process.env.AWS_REGION});

exports.handler = async (event) => {
  try {
    const interaction = JSON.parse(event.body);
    console.log("Received interaction:", interaction);

    // Check if it's a Discord ping (verification challenge)
    if (interaction.type === 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({ type: 1 }),
      };
    }

    // Check if it's a command interaction (type: 2)
    if (interaction.type === 2) {
      const params = {
        MessageBody: JSON.stringify({
          command: interaction.data.name,
          options: interaction.data.options,
          user: interaction.member.user,
          guild_id: interaction.guild_id,
          channel_id: interaction.channel_id,
          token: interaction.token,
        }),
        QueueUrl: process.env.SQS_QUEUE_URL,
      };

      await sqs.sendMessage(params).promise();
      return {
        statusCode: 200,
        body: JSON.stringify({
          type: 4,
          data: { content: "Command received and processing!" },
        }),
      };
    }

    return {
      statusCode: 400,
      body: "Unsupported interaction type",
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: "Failed to process interaction",
    };
  }
};
