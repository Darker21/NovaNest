require("dotenv").config();
const crypto = require("crypto");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

/**
 * Asynchronously retrieves the value of a secret from AWS Secrets Manager.
 *
 * @async
 * @function getSecretValue
 * @param {string} secretName - The name or ARN of the secret to retrieve.
 * @returns {Promise<string>>} The secret value json if found.
 * @throws {Error} If the secret is not found or an error occurs during retrieval.
 */
async function getSecretValue(secretName) {
  try {
    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION,
    });

    const data = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      })
    );

    if (data.SecretString) {
      return data.SecretString;
    }
    throw new Error("Secret not found");
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
}

const lambda = new LambdaClient({ region: process.env.AWS_REGION });

/**
 * Obfuscates a string by masking all characters except the last four with asterisks.
 *
 * @param {string} str - The input string to obfuscate.
 * @returns {string} The obfuscated string.
 */
function obfuscateString(str) {
  if (str.length <= 4) {
    return str;
  }

  const lastFour = str.slice(-4);
  const maskedPart = "*".repeat(str.length - 4);

  return maskedPart + lastFour;
}

exports.handler = async (event) => {
  const secretResponse = await getSecretValue("NovaNest/Discord/PublicKey");

  const secret = JSON.parse(secretResponse);
  if (!secret.NovaNestDiscordApiKey) {
    throw new Error(
      '"NovaNestDiscordApiKey" was not found in the secrets response:'
    );
  }

  const publicKey = secret.NovaNestDiscordApiKey;
  const signature = event.headers["x-signature-ed25519"];
  const timestamp = event.headers["x-signature-timestamp"];

  console.trace(
    `sig: ${signature}\ntime: ${timestamp}\npub-key:${obfuscateString(
      publicKey
    )}`
  );
  console.trace(event);

  const { body } = event;
  console.trace(body);

  const message = timestamp + body;

  const isVerified = crypto.verify(
    "sha256",
    Buffer.from(message),
    {
      key: Buffer.from(publicKey, "hex"),
      format: "der",
      type: "spki",
    },
    Buffer.from(signature, "hex")
  );

  if (!isVerified) {
    return {
      statusCode: 401,
      message: "Invalid request signature",
    };
  }

  // Prepare to invoke the EntryPointFunction
  const params = {
    FunctionName: process.env.ENTRYPOINT_FUNCTION_ARN,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify(event),
  };

  try {
    const { Payload } = await lambda.send(new InvokeCommand(params));
    const payloadString = new TextDecoder("utf-8").decode(Payload);

    console.trace("EntryPointFunction response:", payloadString);

    return JSON.parse(payloadString);
  } catch (err) {
    console.error("Error invoking EntryPointFunction:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to invoke EntryPointFunction" }),
    };
  }
};
