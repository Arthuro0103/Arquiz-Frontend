# WebSocket Error Handling in ArQuiz

## Common Error Scenarios

### 1. Authentication Errors

| Error Message | Cause | Client Action |
|--------------|-------|--------------|
| `No authentication token provided` | Missing token in handshake | Redirect to login page |
| `Invalid authentication token` | Token is invalid or expired | Refresh token or redirect to login |
| `Unauthorized access` | User doesn't have permission | Show permission denied message |

### 2. Room Access Errors

| Error Message | Cause | Client Action |
|--------------|-------|--------------|
| `Room not found` | Room ID doesn't exist | Show error and redirect to room list |
| `You are not a participant in this room` | User not registered for room | Show error with option to join room |
| `Room is full` | Maximum participants reached | Show waiting list or alternative rooms |

### 3. Quiz Control Errors

| Error Message | Cause | Client Action |
|--------------|-------|--------------|
| `Only teachers can start a quiz` | Student trying to start quiz | Hide start button for students |
| `Only the room creator can start the quiz` | Different teacher trying to control quiz | Disable controls for non-owner teachers |
| `Cannot start a room with status: X` | Room in wrong state | Update UI to reflect current room state |

### 4. Answer Submission Errors

| Error Message | Cause | Client Action |
|--------------|-------|--------------|
| `Question not active` | Answering wrong question | Sync client with current question |
| `Time is up for this question` | Answer submitted too late | Show time expired message |
| `Answer already submitted` | Duplicate answer submission | Disable submit button after first submission |

### 5. Connection Errors

| Error Message | Cause | Client Action |
|--------------|-------|--------------|
| `Connection error` | Server unreachable | Implement reconnection strategy |
| `Max reconnection attempts reached` | Persistent connection issues | Show offline mode or fallback UI |

## Client Implementation Strategy

### 1. Centralized Error Handling

```typescript
// Set up global error handler
socket.on('exception', (response) => {
  // Log the error
  console.error(`WebSocket Error: ${response.error.message}`);
  
  // Handle based on status code
  switch (response.error.statusCode) {
    case 401: // Handle auth errors
    case 403: // Handle permission errors
    case 404: // Handle not found errors
    default:  // Handle other errors
  }
  
  // Show appropriate UI message
  showErrorToast(response.error.message);
});
```

### 2. Reconnection Strategy

```typescript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const baseDelay = 1000; // 1 second

function setupReconnection() {
  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      // Server forced disconnect, don't reconnect automatically
      showError('Disconnected by server');
    } else if (reason !== 'io client disconnect') {
      // Only reconnect if not manually disconnected
      tryReconnect();
    }
  });
}

function tryReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    showError('Unable to connect after multiple attempts');
    return;
  }
  
  // Exponential backoff
  const delay = baseDelay * Math.pow(1.5, reconnectAttempts);
  reconnectAttempts++;
  
  setTimeout(() => {
    console.log(`Reconnect attempt ${reconnectAttempts}...`);
    socket.connect();
  }, delay);
}
```

### 3. Request Timeouts

```typescript
function emitWithTimeout(event, data, timeout = 5000) {
  return new Promise((resolve, reject) => {
    // Set timeout for acknowledgment
    const timer = setTimeout(() => {
      reject(new Error(`Request timeout for ${event}`));
    }, timeout);
    
    socket.emit(event, data, (response) => {
      clearTimeout(timer);
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.message));
      }
    });
  });
}
```

## Best Practices

1. **Specific Error Messages**: Show users specific, actionable error messages

2. **Graceful Degradation**: Provide fallback options when WebSocket fails

3. **Error Tracking**: Track errors with unique IDs for easier debugging

4. **State Recovery**: After reconnection, recover to the appropriate state

5. **User Experience**: Don't break the UI flow when errors occur

6. **Error Boundaries**: Isolate WebSocket errors to prevent app crashes

7. **Connection Monitoring**: Display connection status to users

8. **Logging**: Log all errors with context for easier debugging