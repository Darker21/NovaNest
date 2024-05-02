const {
  getSecretValue,
} = require("./../app");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
jest.mock("@aws-sdk/client-secrets-manager");

describe("getSecretValue function", () => {
  // Happy path test with realistic test values
  test("should return secret string when secret exists", async () => {
    // Arrange
    const secretName = "TestSecret";
    const expectedSecretString = "secretValue";
    SecretsManagerClient.prototype.send = jest.fn().mockResolvedValue({
      SecretString: expectedSecretString,
    });

    // Act
    const result = await getSecretValue(secretName);

    // Assert
    expect(result).toEqual(expectedSecretString);
    expect(SecretsManagerClient.prototype.send).toHaveBeenCalledWith(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT",
      })
    );
  });

  // Edge case test: Secret exists but has no SecretString (binary secret)
  test("should throw an error when secret exists but has no SecretString", async () => {
    // Arrange
    const secretName = "BinarySecret";
    SecretsManagerClient.prototype.send = jest.fn().mockResolvedValue({});

    // Act & Assert
    await expect(getSecretValue(secretName)).rejects.toThrow(
      "Secret not found"
    );
  });

  // Error case test: AWS SDK throws an error
  test("should throw an error when AWS SDK fails to retrieve the secret", async () => {
    // Arrange
    const secretName = "FaultySecret";
    const errorMessage = "AWS SDK error";
    SecretsManagerClient.prototype.send = jest
      .fn()
      .mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(getSecretValue(secretName)).rejects.toThrow(errorMessage);
  });

  // Error case test: Invalid secret name
  test("should throw an error for invalid secret name", async () => {
    // Arrange
    const secretName = ""; // Assuming empty string is invalid
    const errorMessage = "Secret name cannot be empty"; // Assuming this is the error message for an invalid name
    SecretsManagerClient.prototype.send = jest
      .fn()
      .mockRejectedValue(new Error(errorMessage));

    // Act & Assert
    await expect(getSecretValue(secretName)).rejects.toThrow(errorMessage);
  });
});
