import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');

  // Get the base URL from config
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:8888';
  const apiURL = process.env.API_BASE_URL || 'http://localhost:3000';

  // Launch browser for setup operations
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for servers to be ready
    console.log('⏳ Waiting for servers to be ready...');
    await waitForServer(baseURL, 60000);
    
    // Try to check API server, but don't fail if it's not available
    try {
      await waitForServer(`${apiURL}/api`, 10000);
      console.log('✅ API server is available, creating test users...');
      await createTestUsers(page, apiURL);
    } catch (error) {
      console.log('⚠️  API server not available, skipping test user creation...');
    }

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function waitForServer(url: string, timeout: number = 30000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        console.log(`✅ Server ready: ${url}`);
        return;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server not ready after ${timeout}ms: ${url}`);
}

async function createTestUsers(page: any, apiURL: string): Promise<void> {
  console.log('👥 Creating test users...');
  
  // Test users configuration
  const testUsers = [
    {
      email: 'professor@test.com',
      password: 'Test123!',
      fullName: 'Test Professor',
      role: 'professor'
    },
    {
      email: 'student@test.com',
      password: 'Test123!',
      fullName: 'Test Student',
      role: 'student'
    },
    {
      email: 'admin@test.com',
      password: 'Test123!',
      fullName: 'Test Admin',
      role: 'admin'
    }
  ];

  // Create test users via API
  for (const user of testUsers) {
    try {
      const response = await fetch(`${apiURL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });

      if (response.ok) {
        console.log(`✅ Created test user: ${user.email}`);
      } else if (response.status === 409) {
        console.log(`ℹ️  Test user already exists: ${user.email}`);
      } else {
        console.warn(`⚠️  Failed to create test user ${user.email}:`, response.statusText);
      }
    } catch (error) {
      console.warn(`⚠️  Error creating test user ${user.email}:`, error);
    }
  }
}

export default globalSetup; 