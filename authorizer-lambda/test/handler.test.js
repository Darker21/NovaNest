const {
  handler,
} = require("./../app");
const { getSecretValue } = require("@aws-sdk/client-secrets-manager");
const crypto = require("crypto");

jest.mock("@aws-sdk/client-secrets-manager", () => ({
  getSecretValue: jest.fn(),
}));

jest.mock("crypto", () => ({
  verify: jest.fn(),
}));

describe("handler function tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should verify signature successfully", async () => {
    // Arrange
    const publicKey = "publicKeyInHex";
    const signature = "validSignatureInHex";
    const timestamp = "1234567890";
    const body = '{"key":"value"}';
    const event = {
      headers: {
        "x-signature-ed25519": signature,
        "x-signature-timestamp": timestamp,
      },
      body,
    };

    getSecretValue.mockResolvedValue({ SecretString: publicKey });
    crypto.verify.mockReturnValue(true);

    // Act
    const response = await handler(event);

    // Assert
    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ message: "Signature verified" }),
    });
    expect(getSecretValue).toHaveBeenCalledWith("NovaNest/Discord/PublicKey");
    expect(crypto.verify).toHaveBeenCalled();
  });

  it("should return 401 for invalid signature", async () => {
    // Arrange
    const publicKey = "publicKeyInHex";
    const signature = "invalidSignatureInHex";
    const timestamp = "1234567890";
    const body = '{"key":"value"}';
    const event = {
      headers: {
        "x-signature-ed25519": signature,
        "x-signature-timestamp": timestamp,
      },
      body,
    };

    getSecretValue.mockResolvedValue({ SecretString: publicKey });
    crypto.verify.mockReturnValue(false);

    // Act
    const response = await handler(event);

    // Assert
    expect(response).toEqual({
      statusCode: 401,
      message: "Invalid request signature",
    });
  });

  it("should handle errors from getSecretValue gracefully", async () => {
    // Arrange
    const error = new Error("Failed to retrieve secret");
    const event = {
      headers: {
        "x-signature-ed25519": "anySignature",
        "x-signature-timestamp": "anyTimestamp",
      },
      body: "anyBody",
    };

    getSecretValue.mockRejectedValue(error);

    // Act
    const response = await handler(event);

    // Assert
    expect(response).toEqual({
      statusCode: 500,
      message: "Internal server error",
    });
  });

  // Add more tests here to cover edge cases and error cases
});
