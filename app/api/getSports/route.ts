import { NextRequest, NextResponse } from 'next/server';
import { firefox } from 'playwright';
import { Client } from 'pg';

import { getBrowser } from '@/app/utils/browser';

interface RequestBody {
  username: string;
  password: string;
  requestId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { username, password, requestId } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Launch browser (local or BrowserCat)
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      // Navigate and login
      await page.goto('https://www.njschoolsports.com');
      await page.getByLabel('Username').fill(username);
      await page.getByLabel('Password').fill(password);
      await page.locator('button:has-text("Login")').click();
      
      // Wait for navigation and content
      await page.waitForLoadState();
      await page.waitForSelector('.card', { timeout: 10000 });

      // Extract sport names
      const cards = await page.locator('.card:has(a[href^="/Teams/"])').all();
      const sportOptions = [];

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const sportName = await card.locator('.card-header strong').innerText();
        sportOptions.push(sportName.trim());
      }

      await browser.close();

      const client = new Client({
        connectionString: process.env.DB_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });

      await client.connect();
      await client.query('INSERT INTO browser_request (requestId, username, request, response) VALUES ($1, $2, $3, $4)', [requestId, username, JSON.stringify(request), JSON.stringify(sportOptions)]);
      await client.end();

      return NextResponse.json(sportOptions);

    } catch (browserError) {
      await browser.close();
      throw browserError;
    }

  } catch (error: any) {
    console.error('Automation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sports',
        details: error.message,
        suggestion: 'Check credentials and network connection'
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Send POST with {username, password} to get sports list',
    environment: process.env.NODE_ENV,
    hasBrowserCat: !!process.env.BROWSERCAT_URL
  });
}
