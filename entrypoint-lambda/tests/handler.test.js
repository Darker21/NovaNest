// Import dependencies for testing
const {
  handler,
} = require("./../app");
const AWS = require("aws-sdk");
const AWSMock = require("aws-sdk-mock");

// Setup AWS Mock
AWSMock.setSDKInstance(AWS);

// Test 1: Discord Ping (Verification Challenge)
test("handles Discord ping interaction correctly", async () => {
  // Arrange
  const event = {
    body: JSON.stringify({ type: 1 }),
  };

  // Act
  const result = await handler(event);

  // Assert
  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body)).toEqual({ type: 1 });
});

// Test 2: Command Interaction
test("handles command interaction correctly", async () => {
  // Arrange
  AWSMock.mock("SQS", "sendMessage", Promise.resolve("SQS message sent"));
  const event = {
    body: JSON.stringify({
      type: 2,
      data: { name: "testCommand", options: [] },
      member: { user: { id: "123", username: "testUser" } },
      guild_id: "guild123",
      channel_id: "channel123",
      token: "token123",
    })
  };

  // Act
  const result = await handler(event);

  // Assert
  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body)).toEqual({
    type: 4,
    data: { content: "Command received and processing!" },
  });
  AWSMock.restore("SQS");
});

// Test 3: Unsupported Interaction Type
test("returns error for unsupported interaction types", async () => {
  // Arrange
  const event = {
    body: JSON.stringify({ type: 99 }),
  };

  // Act
  const result = await handler(event);

  // Assert
  expect(result.statusCode).toBe(400);
  expect(result.body).toBe("Unsupported interaction type");
});

// Test 4: JSON Parse Error
test("handles JSON parse error gracefully", async () => {
  // Arrange
  const event = {
    body: "not a valid json",
  };

  // Act
  const result = await handler(event);

  // Assert
  expect(result.statusCode).toBe(500);
  expect(result.body).toBe("Failed to process interaction");
});

// Test 5: SQS sendMessage Error
test("handles SQS sendMessage error gracefully", async () => {
  // Arrange
  AWSMock.mock("SQS", "sendMessage", Promise.reject(new Error("SQS error")));
  const event = {
    body: JSON.stringify({
      type: 2,
      data: { name: "testCommand", options: [] },
      member: { user: { id: "123", username: "testUser" } },
      guild_id: "guild123",
      channel_id: "channel123",
      token: "token123",
    })
  };

  // Act
  const result = await handler(event);

  // Assert
  expect(result.statusCode).toBe(500);
  expect(result.body).toBe("Failed to process interaction");
  AWSMock.restore("SQS");
});
