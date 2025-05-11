import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("Received request to /api/reports/basic-soil-analysis");
  
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization');
    console.log("Auth header:", authHeader?.substring(0, 15) + "...");
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid authorization header" },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];

    const body = await req.json();
    console.log("Request body:", body);
    
    const { serial_number, start_date, end_date } = body;

    if (!serial_number || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required parameters: serial_number, start_date, and end_date are required" },
        { status: 400 }
      );
    }

    // Check if FIELD_EYES_API_URL is configured
    const apiUrl = process.env.FIELD_EYES_API_URL;
    console.log("API URL:", apiUrl);
    
    if (!apiUrl) {
      console.error("FIELD_EYES_API_URL environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const url = `${apiUrl}/reports/basic-soil-analysis`;
    console.log("Making request to:", url);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        serial_number,
        start_date,
        end_date,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `Failed to generate report: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Successfully received data from API");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating basic soil analysis report:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 }
    );
  }
} 