import { NextRequest, NextResponse } from 'next/server';
import { firefox } from 'playwright';
import { Client } from 'pg';

import { RaceResults, ResultItem, SubmitResultsRequest } from '@/app/types';
import { getBrowser } from '@/app/utils/browser';

function formatSwimTime(timeString: string, eventName: string) {
    if (!timeString) return '';
    
    // Remove all non-digits (remove ':' and '.')
    const digitsOnly = timeString.replace(/[^\d]/g, '');
    
    // Check if it's 500 Free event
    const is500Free = eventName.toLowerCase().includes('500');
    
    if (is500Free) {
        // For 500 Free: needs 6 digits
        return digitsOnly.padStart(6, '0');
    } else {
        // For all other events: needs 5 digits
        return digitsOnly.padStart(5, '0');
    }
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitResultsRequest = await request.json();
    const { username, password, sport, 
        eventDate, data, requestId } = body;

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

      const dateParts = eventDate.split(' ');
      const rowLocator2 = page.locator(`//tr[td[1][contains(., "${dateParts[0]}")] and td[1][contains(., "${dateParts[1]}")]]`);
      const count2 = await rowLocator2.count();
      console.log(`Option 2 (contains both parts): Found ${count2} rows`);

      const button = page.locator(`//tr[td[1][contains(., "${dateParts[0]}")] and td[1][contains(., "${dateParts[1]}")]]//a[contains(@class,'btn-default')]`);

      console.log(`Found ${await button.count()} buttons`);
      if (await button.count() <= 0) {
          throw new Error('Game not found');
      }

      await button.first().click();


      await page.waitForLoadState();
      console.log(`Navigated to edit page.`);

      // Wait for the navigation tabs to be present
      await page.waitForSelector('ul.nav');

      // Click the "Event Results" link
      await page.locator('ul.nav a.nav-link:has-text("Event Results")').click();

      // Wait for navigation to complete
      await page.waitForLoadState();
      console.log('Navigated to Event Results page.');

      // Wait for event sections to load
      await page.waitForSelector('.mb-3');

      // Get all event sections
      const eventSections = await page.locator('.mb-3').all();

      console.log('Processing empty lanes in each event...\n');

      // Process each event section
      for (const eventSection of eventSections) {
          // Get the event name from the h3 tag
          const eventName = (await eventSection.locator('h3').innerText()
              .catch(() => 'Unknown Event')).trim();

          // Check if we have any data we need to put in for that event
          let eventResults: ResultItem[] = []

          for (const i in data) {
              if (data[i].race === eventName) {
                  console.log(`Found data for ${eventName.trim()}`);
                  eventResults  = data[i].results;
                  break;
              }
          }

          // it'll skip the loop if there's no data to put in
          for (let i = 0; i < eventResults.length; i++) {
              // Get all lane cards within this event
              const laneCards = await eventSection.locator('.card.event-scoring.mb-2').all();
              
              if (laneCards.length === 0) {
                  console.log(`${eventName}: No lane cards found.`);
                  continue;
              }
              
              // Get the LAST lane card (empty lane for new entry)
              const lastLaneCard = laneCards[laneCards.length - 1];
              
              // Count swimmer inputs in this lane card
              const swimmerInputs = await lastLaneCard.locator('.autocomplete input[type="text"]').all();
              
              console.log(`${eventName}:`);
              console.log(`  Found ${laneCards.length} lane cards, processing last (empty) one`);
              console.log(`  This lane has ${swimmerInputs.length} swimmer slot(s)`);
              
              // Fill each swimmer input with "joe"
              for (let j = 0; j < swimmerInputs.length; j++) {
                  const input = swimmerInputs[j];
                  const swimmerNameRaw = eventResults[i].swimmers[j].split(" ");
                  const swimmerName = `${swimmerNameRaw[1]}, ${swimmerNameRaw[0]}`;
                  
                  // Clear the input first (in case there's placeholder text)
                  await input.clear();
                  
                  await input.fill(swimmerName);
                  
                  console.log(`  Swimmer ${j + 1}: filled with ${swimmerName}`);
                  
                  // Optional: add a small delay to see it happening
                  await page.keyboard.press('ArrowDown');
                  await page.keyboard.press('Enter');

              }

              // Fill Time field (input with id containing "eventresultStat")
              const timeInput = await lastLaneCard
                  .locator('.input-number-mid input[type="text"]').first();

              if (timeInput && eventResults[i]?.time) {
                  const formattedTime = formatSwimTime(eventResults[i].time, eventName);
                  await timeInput.clear();
                  await timeInput.type(formattedTime);
                  console.log(`  Time: formatted ${eventResults[i].time} → ${formattedTime}`);
              }
              
              // Fill Place field (input with id containing "eventresultIndplace")
              const placeInput = await lastLaneCard
                  .locator('.input-number input[type="text"]').first();

              if (placeInput && eventResults[i]?.place) {
                  await placeInput.clear();
                  await placeInput.fill(eventResults[i].place.toString()); // Ensure it's a string
                  console.log(`  Place: filled with ${eventResults[i].place}`);
              }

              const saveButton = await lastLaneCard.locator('button:has-text("Save")').first();
              if (saveButton && await saveButton.isVisible()) {
                  await saveButton.click();
                  console.log(`  ✓ Saved ${eventName}`);
              } 

              // WAIT FOR NEW EMPTY CARD TO APPEAR
              try {
                  // Wait for the last card in the event section to have hidden inputs with value="0"
                  await eventSection.locator('.card.event-scoring.mb-2:last-of-type input[type="hidden"][value="0"]')
                      .first()
                      .waitFor({ state: 'attached', timeout: 10000 });
                  
                  console.log(`  ✓ New empty card appeared for ${eventName}`);
              } catch (error) {
                  console.log(`  ⚠️  Timeout waiting for new empty card for ${eventName}`);
                  // Fallback: wait a bit and hope the card appeared
                  await page.waitForTimeout(500);
              }
          }
          console.log(`--- Finished processing ${eventName} ---\n`);
      }

      await browser.close();

      const client = new Client({
        connectionString: process.env.DB_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });

      await client.connect();
      await client.query('INSERT INTO browser_request (requestId, username, request, response) VALUES ($1, $2, $3, $4)', [requestId, username, JSON.stringify(request), "submitted lol"]);
      await client.end();

      return NextResponse.json({
        success: true          
      });

    } catch (browserError) {
      //await browser.close();
      throw browserError;
    }

  } catch (error: any) {
    console.error('Automation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit results',
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
