import { NextResponse } from 'next/server';


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/email/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json({ success: res.ok, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to check SMTP status' },
      { status: 500 }
    );
  }
}
