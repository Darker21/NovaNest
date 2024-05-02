require('dotenv').config();
const crypto = require('crypto');
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

/**
 * Asynchronously retrieves the value of a secret from AWS Secrets Manager.
 *
 * @async
 * @function getSecretValue
 * @param {string} secretName - The name or ARN of the secret to retrieve.
 * @returns {Promise<string>} The secret value if found.
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
        VersionStage: process.env.VERSION_STAGE,
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

exports.handler = async (event) => {
  const publicKey = await getSecretValue('NovaNest/Discord/PublicKey');

  const signature = event.headers['x-signature-ed25519'];
  const timestamp = event.headers['x-signature-timestamp'];
  const { body } = event;

  const message = timestamp + body;

  const isVerified = crypto.verify(
    "sha256",
    Buffer.from(message),
    {
      key: Buffer.from(publicKey, 'hex'),
      format: 'der',
      type: 'spki'
    },
    Buffer.from(signature, 'hex')
  );

  if (!isVerified) {
    return {
      statusCode: 401,
      message: 'Invalid request signature',
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Signature verified' }),
  };
};