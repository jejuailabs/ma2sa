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

  try {
    // Nominatim (OpenStreetMap) - 무료, API 키 불필요, 한국 행정구역 검색
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('countrycodes', 'kr');
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '10');
    url.searchParams.set('accept-language', 'ko');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'MaEulAISamujang/1.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json() as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      address?: Record<string, string>;
      type?: string;
    }>;

    const results: PlaceResult[] = data.map((p) => {
      const parts = p.display_name.split(', ').reverse();
      const name = parts[parts.length - 1] || p.display_name;
      const address = parts.slice(0, -1).reverse().join(' ').replace('대한민국', '').trim();

      return {
        id: String(p.place_id),
        name: name.trim(),
        address: address || p.display_name,
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lon),
      };
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
