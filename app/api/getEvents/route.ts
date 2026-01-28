import { NextRequest, NextResponse } from 'next/server';
import { firefox } from 'playwright';
import { getBrowser } from '@/app/utils/browser';
import { Client } from 'pg';

interface EventRequestBody {
  username: string;
  password: string;
  sport: string;
  requestId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EventRequestBody = await request.json();
    const { username, password, sport, requestId } = body;

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
      const targetCard = await page.locator(`.card:has(.card-header strong:has-text("${sport}"))`).first();

      if (await targetCard.count() <= 0) {
        throw new Error('Sport not found'); 
      }
      
      await targetCard.locator('a.btn-primary').click();

      await page.waitForLoadState();

      // Wait for the schedule table to load
      await page.waitForSelector('table.table');

      // Get all game rows from the table body
      const gameRows = await page.locator('table.table tbody tr').all();

      let gameInfo = [];


      for (let i = 0; i < gameRows.length; i++) {
        const row = gameRows[i];
        
        // Extract data from columns
        const date = await row.locator('td').nth(0).innerText();
        const result = await row.locator('td').nth(1).innerText();
        const opponent = await row.locator('td').nth(3).innerText();
        
        // Clean up the text (remove extra whitespace/newlines)
        const cleanDate = date.replace(/\n/g, ' ').trim();
        const cleanResult = result.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        const cleanOpponent = opponent.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Store game info
        gameInfo.push({
            date: cleanDate,
            result: cleanResult,
            opponent: cleanOpponent
        });
        
        // Display in format: (0) 12/4 4:00pm vs. Robbinsville (W 123-47)
        console.log(`(${i}) ${cleanDate} vs. ${cleanOpponent.split('Power Points')[0].trim()} ${cleanResult}`);
      }

      await browser.close();

      const client = new Client({
        connectionString: process.env.DB_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });

      await client.connect();
      await client.query('INSERT INTO browser_request (requestId, username, request, response) VALUES ($1, $2, $3, $4)', [requestId, username, JSON.stringify(request), JSON.stringify(gameInfo)]);
      await client.end();

      return NextResponse.json(gameInfo);

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
