import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const headline = searchParams.get('headline') || 'Breaking News';
    const source = searchParams.get('source') || 'News';
    const handle = searchParams.get('handle') || source.toLowerCase().replace(/\s+/g, '');
    const impact = searchParams.get('impact') || 'Medium';
    const country = searchParams.get('country') || 'Global';
    const summary = searchParams.get('summary') || '';
    const assetsParam = searchParams.get('assets') || '';
    
    // Parse assets: "BTC:Bullish:rationale:Crypto,Gold:Bearish:rationale:Metals"
    const assets = assetsParam.split(',').filter(Boolean).slice(0, 3).map(a => {
      const parts = a.split(':');
      return { 
        asset: parts[0] || '', 
        direction: parts[1] || 'Neutral',
        rationale: parts[2] || '',
        assetClass: parts[3] || ''
      };
    });

    // Impact colors
    const getImpactColors = (level: string) => {
      if (level === 'Severe' || level === 'High') return { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' };
      if (level === 'Low') return { bg: '#f0fdf4', border: '#86efac', text: '#16a34a' };
      return { bg: '#fffbeb', border: '#fcd34d', text: '#d97706' };
    };

    const getDirectionColors = (dir: string) => {
      if (dir === 'Bullish') return { bg: '#dcfce7', border: '#86efac', text: '#16a34a' };
      if (dir === 'Bearish') return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' };
      return { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280' };
    };

    const impactColors = getImpactColors(impact);
    const displayImpact = impact === 'Severe' ? 'High' : impact;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            padding: 24,
            borderRadius: 24,
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                backgroundColor: '#f3f4f6',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                border: '1px solid #e5e7eb',
              }}
            >
              <span style={{ color: '#6b7280', fontSize: 16, fontWeight: 700 }}>{source.charAt(0).toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#111827', fontSize: 14, fontWeight: 600 }}>{source}</span>
              <span style={{ color: '#6b7280', fontSize: 12 }}>{`@${handle}`}</span>
            </div>
          </div>

          {/* Headline */}
          <div style={{ display: 'flex', marginBottom: 12 }}>
            <span style={{ color: '#1f2937', fontSize: 16, lineHeight: 1.4 }}>{headline}</span>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 16 }}>
            {/* Country tag */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: '4px 10px',
                marginRight: 8,
                marginBottom: 6,
              }}
            >
              <span style={{ color: '#4b5563', fontSize: 11 }}>{country}</span>
            </div>
            {/* Impact tag */}
            <div
              style={{
                display: 'flex',
                backgroundColor: impactColors.bg,
                border: `1px solid ${impactColors.border}`,
                borderRadius: 12,
                padding: '4px 10px',
                marginRight: 8,
                marginBottom: 6,
              }}
            >
              <span style={{ color: impactColors.text, fontSize: 11, fontWeight: 600 }}>{`${displayImpact} Impact`}</span>
            </div>
            {/* Asset tags */}
            {assets.map((asset, i) => {
              const colors = getDirectionColors(asset.direction);
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: '4px 10px',
                    marginRight: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: colors.text, fontSize: 11 }}>{`${asset.asset}: ${asset.direction}`}</span>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', width: '100%', height: 1, backgroundColor: '#e5e7eb', marginBottom: 12 }} />

          {/* Impact Breakdown header */}
          <div style={{ display: 'flex', marginBottom: 10 }}>
            <span style={{ color: '#374151', fontSize: 12, fontWeight: 600 }}>Impact Breakdown</span>
          </div>

          {/* Asset cards */}
          {assets.length > 0 && (
            <div style={{ display: 'flex', marginBottom: 12 }}>
              {assets.map((asset, i) => {
                const colors = getDirectionColors(asset.direction);
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      padding: 10,
                      marginRight: i < assets.length - 1 ? 8 : 0,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ color: '#111827', fontSize: 12, fontWeight: 600 }}>{asset.asset}</span>
                      <div
                        style={{
                          display: 'flex',
                          backgroundColor: colors.bg,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 8,
                          padding: '2px 6px',
                        }}
                      >
                        <span style={{ color: colors.text, fontSize: 9 }}>{asset.direction}</span>
                      </div>
                    </div>
                    {asset.rationale && (
                      <div style={{ display: 'flex', marginBottom: 4 }}>
                        <span style={{ color: '#4b5563', fontSize: 10, lineHeight: 1.3 }}>{asset.rationale.substring(0, 60)}</span>
                      </div>
                    )}
                    {asset.assetClass && (
                      <div style={{ display: 'flex' }}>
                        <span style={{ color: '#9ca3af', fontSize: 9 }}>{`Class: ${asset.assetClass}`}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#faf5ff',
                border: '1px solid #d8b4fe',
                borderRadius: 12,
                padding: 10,
                marginBottom: 12,
              }}
            >
              <span style={{ color: '#9333ea', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>SUMMARY</span>
              <span style={{ color: '#374151', fontSize: 11, lineHeight: 1.4 }}>{summary}</span>
            </div>
          )}

          {/* Footer - Powered by */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
            <span style={{ color: '#6b7280', fontSize: 11 }}>Powered by Sistine.ai</span>
          </div>
        </div>
      ),
      { width: 600, height: 500 }
    );
  } catch (e) {
    return new Response(`Error: ${e}`, { status: 500 });
  }
}
