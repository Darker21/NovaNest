const {
  handler,
} = require("./../app");
const AWS = require("aws-sdk");
const {
  lambdaNameMap,
} = require("./../utils/config");

jest.mock("aws-sdk");

// Test 1: Successfully invokes the correct Lambda function based on command
test("successfully invokes Lambda function for a valid command", async () => {
  // Arrange
  const lambda = new AWS.Lambda();
  const mockInvoke = jest
    .fn()
    .mockReturnValue({ promise: () => Promise.resolve() });
  lambda.invoke = mockInvoke;
  const event = {
    Records: [{ body: JSON.stringify({ command: "createUser" }) }],
  };
  const expectedFunctionName = lambdaNameMap.createUser;

  // Act
  await handler(event);

  // Assert
  expect(mockInvoke).toHaveBeenCalledWith({
    FunctionName: expectedFunctionName,
    InvocationType: "Event",
    Payload: JSON.stringify({ command: "createUser" }),
  });
});

// Test 2: Handles missing command mapping gracefully
test("logs error for commands without a Lambda function mapping", async () => {
  // Arrange
  console.error = jest.fn();
  const event = {
    Records: [{ body: JSON.stringify({ command: "unknownCommand" }) }],
  };

  // Act
  await handler(event);

  // Assert
  expect(console.error).toHaveBeenCalledWith(
    `No mapped Lambda function for command: unknownCommand`
  );
});

// Test 3: Catches and logs errors when Lambda invocation fails
test("catches and logs error when Lambda invocation fails", async () => {
  // Arrange
  const lambda = new AWS.Lambda();
  const mockInvoke = jest
    .fn()
    .mockReturnValue({
      promise: () => Promise.reject(new Error("Network error")),
    });
  lambda.invoke = mockInvoke;
  console.error = jest.fn();
  const event = {
    Records: [{ body: JSON.stringify({ command: "deleteUser" }) }],
  };
  const expectedFunctionName = lambdaNameMap.deleteUser;

  // Act
  await handler(event);

  // Assert
  expect(console.error).toHaveBeenCalledWith(
    `Error invoking ${expectedFunctionName}:`,
    expect.any(Error)
  );
});

// Test 4: Processes multiple records in a single event
test("processes multiple records in a single event", async () => {
  // Arrange
  const lambda = new AWS.Lambda();
  const mockInvoke = jest
    .fn()
    .mockReturnValue({ promise: () => Promise.resolve() });
  lambda.invoke = mockInvoke;
  const event = {
    Records: [
      { body: JSON.stringify({ command: "createUser" }) },
      { body: JSON.stringify({ command: "updateUser" }) },
    ],
  };
  const expectedFunctionNames = [
    lambdaNameMap.createUser,
    lambdaNameMap.updateUser,
  ];

  // Act
  await handler(event);

  // Assert
  expect(mockInvoke).toHaveBeenCalledTimes(2);
  expect(mockInvoke).toHaveBeenCalledWith({
    FunctionName: expectedFunctionNames[0],
    InvocationType: "Event",
    Payload: JSON.stringify({ command: "createUser" }),
  });
  expect(mockInvoke).toHaveBeenCalledWith({
    FunctionName: expectedFunctionNames[1],
    InvocationType: "Event",
    Payload: JSON.stringify({ command: "updateUser" }),
  });
});

// Test 5: Correctly parses and processes a record with complex JSON body
test("correctly parses and processes a record with complex JSON body", async () => {
  // Arrange
  const lambda = new AWS.Lambda();
  const mockInvoke = jest
    .fn()
    .mockReturnValue({ promise: () => Promise.resolve() });
  lambda.invoke = mockInvoke;
  const complexMessage = {
    command: "processData",
    data: { id: 123, value: "test" },
  };
  const event = {
    Records: [{ body: JSON.stringify(complexMessage) }],
  };
  const expectedFunctionName = lambdaNameMap.processData;

  // Act
  await handler(event);

  // Assert
  expect(mockInvoke).toHaveBeenCalledWith({
    FunctionName: expectedFunctionName,
    InvocationType: "Event",
    Payload: JSON.stringify(complexMessage),
  });
});
