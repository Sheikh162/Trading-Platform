import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

//const BASE_URL = 'https://api.backpack.exchange/api/v1';
//const BASE_URL = process.env.NEXT_PUBLIC_API_URL; // make sure if the url has api or localhost
const BASE_URL = process.env.HTTP_PROXY_URL || process.env.NEXT_PUBLIC_API_URL;

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
    return NextResponse.json(
      { error: "Missing 'endpoint' parameter" },
      { status: 400 },
    );
  }

  try {
    const { data } = await axios.get(`${BASE_URL}/${endpoint}`, {
      params,
      headers: { Authorization: req.headers.get("authorization") || "" }
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, details: error.response?.data },
      { status: error.response?.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint"); // e.g., "order"
    
    // Read the JSON body from the incoming request
    const body = await req.json();

    if (!endpoint) {
        return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    try {
        const { data } = await axios.post(`${BASE_URL}/${endpoint}`, body, {
            headers: { Authorization: req.headers.get("authorization") || "" }
        });
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message, details: error.response?.data },
            { status: error.response?.status || 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");
    // Some delete requests might have a body (e.g. canceling specific orders)
    let body = {};
    try { body = await req.json(); } catch (e) {}

    if (!endpoint) {
        return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    try {
        const { data } = await axios.delete(`${BASE_URL}/${endpoint}`, {
            data: body,
            headers: { Authorization: req.headers.get("authorization") || "" }
        });
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message, details: error.response?.data },
            { status: error.response?.status || 500 }
        );
    }
}
