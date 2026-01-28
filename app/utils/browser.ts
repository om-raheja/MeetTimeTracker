import { NextRequest, NextResponse } from "next/server";
import { chromium, firefox, Browser } from 'playwright-core';
import chromiumBinary from '@sparticuz/chromium-min';

export async function getBrowser(): Promise<Browser> {
  if (process.env.VERCEL_ENV) {
    // Vercel: Use puppeteer-core with downloaded Chromium binary

    const executablePath = await chromiumBinary.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar"
    );

    // launch browser with external Chromium
    const browser = await chromium.launch({
        args: chromiumBinary.args,
        executablePath: executablePath,
        headless: true,
    });

    return browser;
  } else {
    console.log('Launching local browser...');

    return await firefox.launch({ headless: false }); // Visible for debugging
  } 
}
