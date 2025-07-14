// app/api/proxy/route.ts
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

//const BASE_URL = 'https://api.backpack.exchange/api/v1';
const BASE_URL = 'http://localhost:3000/api/v1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint");

  // Build query parameters excluding 'endpoint'
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== "endpoint") {
      params[key] = value;
    }
  });

  if (!endpoint) {
    return NextResponse.json({ error: "Missing 'endpoint' parameter" }, { status: 400 });
  }

  try {
    const { data } = await axios.get(`${BASE_URL}/${endpoint}`, { params });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.response?.data || null,
      },
      { status: error.response?.status || 500 }
    );
  }
}
