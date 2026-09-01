import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: [], error: 'API key not configured' }, { status: 500 });
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery: `${q} 마을`,
        languageCode: 'ko',
        regionCode: 'KR',
        maxResultCount: 8,
        locationBias: {
          rectangle: {
            low: { latitude: 33.0, longitude: 124.0 },
            high: { latitude: 38.6, longitude: 132.0 },
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Places API error:', res.status, err);
      return NextResponse.json({ results: [], error: 'Places API error' }, { status: 502 });
    }

    const data = await res.json();
    const results: PlaceResult[] = (data.places ?? []).map((p: any) => ({
      id: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
    }));

    return NextResponse.json({ results });
  } catch (e) {
    console.error('Village search error:', e);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}
